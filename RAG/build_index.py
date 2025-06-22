#!/usr/bin/env python
# build_index.py
"""
vectordb → FAISS 인덱스 빌드 (GPU 가속, OPQ+IVF+HNSW+PQ)
– embedding_complete.done 체크
– 샘플링 기반 train
– nlist, pq_bytes, nprobe, hnsw 층 등 튜닝 옵션
"""

import os
import argparse
import warnings
from pathlib import Path

import numpy as np
import faiss

# ──────────────── 기본 파라미터 ────────────────
DEFAULT_NLIST     = 1280      # IVF 클러스터 수(변경 가능) -> 1024
DEFAULT_PQ_BYTES  = 64       # PQ 코딩 바이트 수
DEFAULT_NPROBE    = 32       # 검색 시 탐색할 IVF 셀 수
MIN_TRAIN_VECS    = 50000    # 최소 훈련용 벡터 수
MAX_SAMPLE_VECS   = 500000  # train 시 최대 샘플링 벡터 수
HNSW_M            = 64         # HNSW 그래프 연결 수

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--out_dir",    default="embeddb",
                   help="벡터(.npy) 파일들과 embedding_complete.done 이 있는 디렉터리")
    p.add_argument("--nlist",      type=int,   default=DEFAULT_NLIST,
                   help="IVF 클러스터 수 (default: %(default)s)")
    p.add_argument("--pq_bytes",   type=int,   default=DEFAULT_PQ_BYTES,
                   help="PQ 인코딩 바이트 수 (default: %(default)s)")
    p.add_argument("--nprobe",     type=int,   default=DEFAULT_NPROBE,
                   help="검색 시 탐색할 IVF 셀 수 (default: %(default)s)")
    p.add_argument("--use_gpu",    action="store_true",
                   help="GPU 에서 train/add 를 수행합니다")
    p.add_argument("--no_hnsw",    action="store_true",
                   help="HNSW 레이어를 생략합니다")
    return p.parse_args()

def main():
    args = parse_args()
    out = Path(args.out_dir)

    # 1) embedding 완료 플래그 확인
    if not (out/"embedding_complete.done").exists():
        print("❌ embedding_complete.done 이 없습니다. 먼저 `embed.py` 를 실행하세요.")
        return

    # 2) 벡터 로딩
    vec_files = sorted(out.glob("vecs_gpu*.npy"))
    if not vec_files:
        print("❌ vecs_gpu*.npy 파일을 찾을 수 없습니다.")
        return

    print("[INDEX] 벡터 로딩 중…")
    mats = [np.load(p, mmap_mode="r") for p in vec_files]
    X = np.vstack(mats).astype("float32")
    num_vec, dim = X.shape
    print(f"[INDEX] 총 {num_vec:,}개 벡터, 차원 {dim}")

    # 3) nlist 조정 (옵션값 또는 √N)
    eff_nlist = min(args.nlist, max(1, int(np.sqrt(num_vec))))
    print(f"[INDEX] effective nlist: {eff_nlist} (requested {args.nlist})")

    # 4) 샘플링 기반 train
    train_size = min(num_vec, max(MIN_TRAIN_VECS, MAX_SAMPLE_VECS))
    if num_vec > train_size:
        np.random.seed(1234)
        perm = np.random.permutation(num_vec)[:train_size]
        train_vecs = X[perm]
        print(f"[INDEX] train 용 샘플링 벡터: {train_size:,}/{num_vec:,}")
    else:
        train_vecs = X
        print(f"[INDEX] train 용 벡터: 전체 사용 ({num_vec:,})")

    # 5) 인덱스 팩토리 스트링 구성 (중복 없이)
    parts = []
    # OPQ
    parts.append("OPQ16")
    # IVF + HNSW (언더스코어로 결합)
    ivf_part = f"IVF{eff_nlist}"
    if not args.no_hnsw:
        ivf_part += f"_HNSW{HNSW_M}"
    parts.append(ivf_part)
    # PQ
    parts.append(f"PQ{args.pq_bytes}")

    factory_str = ",".join(parts)
    print(f"[INDEX] index_factory: {factory_str}")

    # 6) CPU 인덱스 생성
    idx_cpu = faiss.index_factory(dim, factory_str)
    idx_cpu.nprobe = args.nprobe

    # 7) (선택) GPU 리소스
    if args.use_gpu:
        print("[INDEX] GPU 리소스 확보 및 CPU→GPU 인덱스 복사 (단일 GPU)")
        # 1) GPU 리소스 초기화
        res = faiss.StandardGpuResources()
        # 2) 복제 옵션 설정 (CPU 코어스 퀀타이저 폴백 허용)
        co = faiss.GpuClonerOptions()
        co.allowCpuCoarseQuantizer = True
        # 3) GPU 0번에만 인덱스 복제
        idx = faiss.index_cpu_to_gpu(res, 0, idx_cpu, co)
    else:
        idx = idx_cpu

    # 8) train → add
    print(f"[INDEX] train 시작 (n={len(train_vecs):,})")
    idx.train(train_vecs)
    print("[INDEX] add 시작")
    idx.add(X)

    # 9) GPU→CPU 인덱스 복원
    if args.use_gpu:
        print("[INDEX] GPU→CPU 인덱스 복원")
        idx_cpu = faiss.index_gpu_to_cpu(idx)

    # 10) 저장
    out_path = out/"index_cpu.faiss"
    print(f"[INDEX] index 저장 → {out_path}")
    faiss.write_index(idx_cpu, str(out_path))

    print("[INDEX] 완료!")

if __name__=="__main__":
    warnings.filterwarnings("ignore")
    main()
