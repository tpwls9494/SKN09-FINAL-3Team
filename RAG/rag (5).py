#!/usr/bin/env python
"""multi_gpu_rag.py (refactored v3)
──────────────────────────────────────────────────────────────────────
✓  JSONL 파일별로 ‘텍스트 필드’만 청크화, 나머지는 메타데이터로만 보존  
✓  문단 단위 분리 후 MAX_LEN 초과 시에만 슬라이딩 윈도우 적용  
✓  특허·법령·가이드·규칙 등 파일 유형별 텍스트 필드/메타 필드 자동 처리  
✓  CHKPT_EVERY 청크마다 GPU별 NumPy 체크포인트 → 중도종료 안전  
✓  완료 후 vecs 병합 및 IVF-OPQ-PQ 인덱스 빌드  
"""
from __future__ import annotations
import os, json, argparse, warnings
from pathlib import Path
from typing import List, Dict

import numpy as np
import faiss, torch
from torch.multiprocessing import spawn
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer
from tqdm import tqdm
import nltk
from nltk.tokenize import sent_tokenize

# 워커 프로세스가 시작될 때 한 번만 실행되도록
nltk.download('punkt', quiet=True)
nltk.download("punkt_tab", quiet=True)

# ──────────────── 파라미터 ────────────────
EMBED_MODEL  = "BAAI/bge-m3"
MAX_LEN      = 2048
STRIDE       = 512
CHKPT_EVERY  = 1_000
MIN_TRAIN    = 2_500
N_LIST       = 512
PQ_BYTES     = 64
NPROBE       = 32

os.environ["TOKENIZERS_PARALLELISM"] = "false"
torch.backends.cudnn.benchmark = True

# ──────────────── 청크 유틸 ────────────────
def split_paragraphs(text: str) -> List[str]:
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    return paras or [text]

def chunk_by_sentences(text: str, tokenizer) -> List[str]:
    sents = sent_tokenize(text)
    chunks = []
    current = ""
    for sent in sents:
        # 현재 청크에 이 문장을 붙였을 때 토큰 수
        tokens = tokenizer.encode((current + " " + sent).strip(), add_special_tokens=False)
        if len(tokens) <= MAX_LEN:
            # 문제 없으면 합치기
            current = (current + " " + sent).strip()
        else:
            # 현재 청크를 확정
            if current:
                chunks.append(current)
            # 이 문장 자체가 너무 길면 슬라이드 윈도우
            if len(tokenizer.encode(sent, add_special_tokens=False)) > MAX_LEN:
                chunks.extend(slide_if_needed(sent, tokenizer))
                current = ""
            else:
                current = sent
    # 마지막 남은 문장
    if current:
        chunks.append(current)
    return chunks

def slide_if_needed(text: str, tokenizer) -> List[str]:
    ids = tokenizer.encode(text, add_special_tokens=False)
    if len(ids) <= MAX_LEN:
        return [text]
    chunks = []
    for i in range(0, len(ids), STRIDE):
        seg = ids[i:i + MAX_LEN]
        if not seg: break
        chunks.append(tokenizer.decode(seg, skip_special_tokens=True))
        if len(seg) < MAX_LEN: break
    return chunks

def append_numpy(path: Path, arr: np.ndarray):
    if arr.size == 0: return
    if not path.exists():
        np.save(path, arr)
    else:
        old = np.load(path, mmap_mode="r")
        np.save(path, np.vstack((old, arr)))

# ──────────────── 워커 프로세스 ────────────────
@torch.no_grad()
def worker(rank: int, world: int, files: List[Path], args):
    device = f"cuda:{rank}" if torch.cuda.is_available() else "cpu"
    print(f"[GPU{rank}] Start on {device}")

    # 모델/토크나이저
    model     = SentenceTransformer(args.model, device=device)
    model.eval()
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    tokenizer.model_max_length = 10_000
    warnings.filterwarnings("ignore", category=UserWarning, module="faiss")

    out_dir   = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    vec_file  = out_dir / f"vecs_gpu{rank}.npy"
    meta_file = out_dir / f"meta_gpu{rank}.jsonl"

    # 특허 기본정보만 뽑아두기
    patent_basic: Dict[str, Dict] = {}
    for p in files:
        if p.name.startswith("patents") or p.name.startswith("patent_basic"):
            for ln in p.open(encoding="utf-8"):
                obj = json.loads(ln, strict=False)
                if obj.get("section") == "특허_기본정보":
                    patent_basic[obj.get("patent_id","")] = obj.get("content", {})

    # 기존 체크포인트 복구
    done = 0
    if vec_file.exists() and meta_file.exists():
        done = np.load(vec_file, mmap_mode="r").shape[0]
        if done != sum(1 for _ in meta_file.open()):
            print(f"[GPU{rank}] vec/meta 불일치 → 리셋")
            done = 0
    if done:
        print(f"[GPU{rank}] resume at {done:,} chunks")

    buf_vec, buf_meta = [], []
    idx_global, skipped = 0, 0
    pbar = tqdm(desc=f"GPU{rank}", position=rank, leave=False)

    for path in files:
        fname = path.name
        # 파일 유형별 청크 전략 정의
        if "guide" in fname.lower():        # 심사실무가이드
            txt_key, meta_keys, typ = "text", ["id","source","gubun"], "guide"
        elif "laws" in fname.lower():       # 법령 정의 파일
            txt_key, meta_keys, typ = "output", ["input"], "law"
        else:                                # 특허 JSONL
            txt_key, meta_keys, typ = "content", ["patent_id","section","subsection","claim_number","paragraph"], "patent"

        for ln in path.open(encoding="utf-8"):
            if (idx_global % world) != rank:
                idx_global += 1
                continue
            idx_global += 1
            if skipped < done:
                skipped += 1
                continue

            item = json.loads(ln, strict=False)
            # 특허 기본정보는 메타로만 쓰고 청크 건너뜀
            if typ=="patent" and item.get("section")=="특허_기본정보":
                continue

            # 텍스트 추출 (딕셔너리면 값으로, 문자열이면 그대로)
            content = item.get(txt_key)
            if isinstance(content, dict):
                # e.g. 특허 기본정보가 dict일 경우는 이미 skip 했으니 패스
                continue
            txt = str(content or "").strip()
            if not txt:
                continue

            # 메타 구성
            base = {"type": typ, "source_file": fname}
            for k in meta_keys:
                if k in item:
                    base[k] = item[k]
            # 특허의 경우, 추가 메타(상태, 발명의 명칭)
            if typ=="patent":
                info = patent_basic.get(item.get("patent_id",""), {})
                base["status"]        = info.get("상태","")
                base["발명의_명칭"]    = info.get("발명의 명칭","")

            # 문단 분리 + 슬라이드
            # 문단 단위로 분리 → 필요할 때만 슬라이드 윈도우
            for para in split_paragraphs(txt):
                for chunk in chunk_by_sentences(para, tokenizer):
                    emb = model.encode([chunk],
                                       convert_to_numpy=True,
                                       normalize_embeddings=True)
                    buf_vec.append(emb.astype("float32"))
            
                    m = base.copy()
                    m["text"] = chunk
                    buf_meta.append(json.dumps(m, ensure_ascii=False) + "\n")
            
                    pbar.update(1)
            
                    # 체크포인트
                    if len(buf_vec) >= CHKPT_EVERY:
                        append_numpy(vec_file, np.vstack(buf_vec))
                        with meta_file.open("a", encoding="utf-8") as mf:
                            mf.writelines(buf_meta)
                        done += len(buf_vec)
                        print(f"[GPU{rank}] checkpoint {done:,} chunks")
                        buf_vec.clear()
                        buf_meta.clear()


    # 마지막 flush
    if buf_vec:
        append_numpy(vec_file, np.vstack(buf_vec))
        with meta_file.open("a", encoding="utf-8") as mf:
            mf.writelines(buf_meta)
        done += len(buf_vec)
    pbar.close()
    print(f"[GPU{rank}] done – {done:,} chunks")

# ──────────────── 마스터 인덱스 빌드 ────────────────
def build_master_index(out_dir: str):
    print("[MASTER] build index")
    out = Path(out_dir)
    mats = [np.load(p, mmap_mode="r") for p in sorted(out.glob("vecs_gpu*.npy"))]
    X   = np.vstack(mats)
    dim = X.shape[1]

    # --- (B) 데이터에 맞춰 클러스터 수 조정 ---
    num_vec    = len(X)
    max_nlist  = max(1, num_vec // 20)
    eff_nlist  = min(N_LIST, max_nlist)
    print(f"[MASTER] effective nlist: {eff_nlist} (original {N_LIST}), total vectors: {num_vec:,}")

    idx = faiss.index_factory(dim, f"OPQ16_{PQ_BYTES},IVF{eff_nlist},PQ{PQ_BYTES}")
    idx.nprobe = NPROBE

    # --- (A) 충분한 학습용 벡터 사용 ---
    print(f"[MASTER] training on {num_vec:,} vectors")
    idx.train(X)

    idx.add(X)
    # 문자열 경로로 저장
    faiss.write_index(idx, str(out/"index_cpu.faiss"))
    print(f"[MASTER] index_cpu.faiss with {len(X):,} vectors")

    # 메타 합치기
    with (out/"metadata.jsonl").open("w", encoding="utf-8") as wf:
        for mf in sorted(out.glob("meta_gpu*.jsonl")):
            wf.write(mf.read_text(encoding="utf-8"))
    print("[MASTER] metadata.jsonl saved")

    # GPU 인덱스
    try:
        res     = faiss.StandardGpuResources()
        gpu_idx = faiss.index_cpu_to_gpu(res, 0, idx)
        print("[MASTER] GPU index ready")
    except Exception as e:
        print("[MASTER] GPU index failed:", e)


# ──────────────── Main ────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data_dir", default="data")
    ap.add_argument("--out_dir",  default="newvectordb")
    ap.add_argument("--model",    default=EMBED_MODEL)
    ap.add_argument("--gpus",     type=int, default=torch.cuda.device_count())
    args = ap.parse_args()

    files = sorted(Path(args.data_dir).glob("*.jsonl"))
    print(f"Files: {len(files)} | GPUs: {args.gpus}")
    spawn(worker, args=(args.gpus, files, args), nprocs=args.gpus, join=True)
    build_master_index(args.out_dir)

if __name__=="__main__":
    main()
