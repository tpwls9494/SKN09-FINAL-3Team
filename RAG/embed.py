#!/usr/bin/env python
# embed_with_eta.py
"""
JSONL → 문장 단위 청크 → GPU별 임베딩
- 중간 종료 시 재시작(resume) 지원
- KSS로 한글 문장 분리, MAX_LEN 초과 시 슬라이딩 윈도우
- tqdm으로 개별 GPU 속도(it/s) 기반 남은 ETA 가늠
- 성공 시 out_dir/embedding_complete.done 생성
"""
import os, json, argparse, warnings, time
from pathlib import Path
from typing import List

import numpy as np
import torch
from torch.multiprocessing import spawn
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer
from tqdm import tqdm
import kss  # Korean Sentence Splitter
# import mecab

# ──────────────── 파라미터 ────────────────
EMBED_MODEL  = "BAAI/bge-m3"
MAX_LEN      = 2048
STRIDE       = 512
CHKPT_EVERY  = 1000  # 청크 단위로 체크포인트

os.environ["TOKENIZERS_PARALLELISM"] = "false"
torch.backends.cudnn.benchmark = True

# ──────────────── 청크 유틸 ────────────────
from transformers import PreTrainedTokenizer

def split_paragraphs(text: str) -> List[str]:
    paras = [p.strip() for p in text.split("\n\n") if p.strip()]
    return paras or [text]

def slide_if_needed(text: str, tokenizer: PreTrainedTokenizer) -> List[str]:
    ids = tokenizer.encode(text, add_special_tokens=False)
    if len(ids) <= MAX_LEN:
        return [text]
    chunks = []
    for i in range(0, len(ids), STRIDE):
        seg = ids[i:i+MAX_LEN]
        if not seg:
            break
        chunks.append(tokenizer.decode(seg, skip_special_tokens=True))
        if len(seg) < MAX_LEN:
            break
    return chunks

def chunk_by_sentences(text: str, tokenizer: PreTrainedTokenizer) -> List[str]:
    ids = tokenizer.encode(text, add_special_tokens=False)
    try:
        sents = kss.split_sentences(text)
    except Exception:
        sents = [text]
    chunks, current = [], ""
    for sent in sents:
        combined = (current + " " + sent).strip()
        tok_comb = tokenizer.encode(combined, add_special_tokens=False)
        if len(tok_comb) <= MAX_LEN:
            current = combined
        else:
            if current:
                chunks.append(current)
            # 문장 자체가 너무 길면 슬라이드
            if len(tokenizer.encode(sent, add_special_tokens=False)) > MAX_LEN:
                chunks.extend(slide_if_needed(sent, tokenizer))
                current = ""
            else:
                current = sent
    if current:
        chunks.append(current)
    return chunks

def append_numpy(path: Path, arr: np.ndarray):
    if arr.size == 0:
        return
    if not path.exists():
        np.save(path, arr)
    else:
        old = np.load(path, mmap_mode="r")
        mp = np.lib.format.open_memmap(str(path),
    mode='w+', dtype='float32',
    shape=(total_chunks, dim))
        # chunk 단위로
        mp[offset:offset+len(arr)] = arr


# ──────────────── 워커 ────────────────
@torch.no_grad()
def worker(rank: int, world: int, files: List[Path], args):
    start = time.time()
    device = f"cuda:{rank}" if torch.cuda.is_available() else "cpu"
    print(f"[GPU{rank}] Start on {device}")

    # 모델/토크나이저
    model     = SentenceTransformer(args.model, device=device)
    model.eval()
    tokenizer = AutoTokenizer.from_pretrained(args.model)
    tokenizer.model_max_length = MAX_LEN * 10
    warnings.filterwarnings("ignore", category=UserWarning, module="faiss")

    out_dir   = Path(args.out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    vec_file  = out_dir / f"vecs_gpu{rank}.npy"
    meta_file = out_dir / f"meta_gpu{rank}.jsonl"

    # # ── resume 로직 ──
    resume = 0
    # if vec_file.exists() and meta_file.exists():
    #     resume = np.load(vec_file, mmap_mode="r").shape[0]
    #     if sum(1 for _ in meta_file.open()) != resume:
    #         print(f"[GPU{rank}] vec/meta 불일치 → reset resume")
    #         resume = 0
    #     else:
    #         print(f"[GPU{rank}] resume from {resume}")

    # tqdm: 총량 미지정, 속도(it/s) 기반 ETA 가늠
    pbar = tqdm(desc=f"GPU{rank}", position=rank, unit="chunk", total=None)
    pbar.update(resume)

    buf_vec, buf_meta = [], []
    idx_global = skip = processed = 0

    for path in files:
        fname = path.name
        if "guide" in fname.lower():
            txt_key, meta_keys, typ = "text", ["id","source","gubun"], "guide"
        elif "laws" in fname.lower():
            txt_key, meta_keys, typ = "output", ["input"], "law"
        else:
            txt_key, meta_keys, typ = "content", ["patent_id","section","subsection","claim_number","paragraph"], "patent"

        for ln in path.open(encoding="utf-8"):
            # 분산 처리 분기
            if idx_global % world != rank:
                idx_global += 1
                continue
            idx_global += 1
            if skip < resume:
                skip += 1
                continue

            try:
                obj = json.loads(ln, strict=False)
            except json.JSONDecodeError:
                continue
            if typ == "patent" and obj.get("section") == "특허_기본정보":
                continue

            content = obj.get(txt_key)
            if not content or isinstance(content, dict):
                continue
            txt = str(content).strip()
            if not txt:
                continue

            base = {"type": typ, "source_file": fname}
            for k in meta_keys:
                if k in obj:
                    base[k] = obj[k]

            for para in split_paragraphs(txt):
                for chunk in chunk_by_sentences(para, tokenizer):
                    emb = model.encode(
                        [chunk],
                        convert_to_numpy=True,
                        normalize_embeddings=True,
                    )
                    buf_vec.append(emb.astype("float32"))

                    meta = base.copy()
                    meta["text"] = chunk
                    buf_meta.append(json.dumps(meta, ensure_ascii=False) + "\n")

                    processed += 1
                    pbar.update(1)

                    if processed % CHKPT_EVERY == 0:
                        numpy.lib.format.open_memmap
                        #append_numpy(vec_file, np.vstack(buf_vec))
                        with meta_file.open("a", encoding="utf-8") as mf:
                            mf.writelines(buf_meta)
                        buf_vec.clear(); buf_meta.clear()
                        elapsed = time.time() - start
                        speed = processed / elapsed
                        print(f"[GPU{rank}] checkpoint +{processed} chunks | {speed:.2f} it/s")

    # 마지막 flush
    if buf_vec:
        numpy.lib.format.open_memmap
        #append_numpy(vec_file, np.vstack(buf_vec))
        with meta_file.open("a", encoding="utf-8") as mf:
            mf.writelines(buf_meta)

    pbar.close()
    elapsed = time.time() - start
    avg_speed = processed / elapsed if elapsed > 0 else 0
    print(f"[GPU{rank}] done – 추가 {processed} chunks, elapsed {elapsed:.1f}s, avg {avg_speed:.2f} it/s")

# ──────────────── Main ────────────────
def main():

    if meta_file.exists():
        meta_file.unlink()

    ap = argparse.ArgumentParser()
    ap.add_argument("--data_dir", default="data")
    ap.add_argument("--out_dir",  default="finaldb")
    ap.add_argument("--model",    default=EMBED_MODEL)
    ap.add_argument("--gpus",     type=int, default=torch.cuda.device_count())
    args = ap.parse_args()

    files = sorted(Path(args.data_dir).glob("*.jsonl"))
    print(f"Files: {len(files)} | GPUs: {args.gpus}")

    start_all = time.time()
    spawn(worker, args=(args.gpus, files, args), nprocs=args.gpus, join=True)
    total_elapsed = time.time() - start_all
    print(f"[MASTER] 전체 elapsed {total_elapsed:.1f}s")

    Path(args.out_dir, "embedding_complete.done").write_text("")

if __name__ == "__main__":
    main()
