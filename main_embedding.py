
import os
import json
import gc
import time
import math
import faiss
import torch
import traceback
import numpy as np
from tqdm import tqdm
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer
from huggingface_hub import login

# ========== 설정 ==========
hf_token = "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"
EMBED_MODEL = "BAAI/bge-m3"
DATA_DIR = "data"
OUTPUT_DIR = "vectordb"
INDEX_PATH = os.path.join(OUTPUT_DIR, "full_patent_index_bge_m3.faiss")
META_PATH = os.path.join(OUTPUT_DIR, "full_patent_metadata.jsonl")
PROGRESS_PATH = os.path.join(OUTPUT_DIR, "progress.txt")
FAILED_PATH = os.path.join(OUTPUT_DIR, "failed_files.txt")
ERROR_LOG_PATH = os.path.join(OUTPUT_DIR, "error_log.txt")
CHUNK_SIZE = 256
BATCH_SIZE = 32
MAX_TOKEN_LENGTH = 512
STRIDE = 256
SAVE_INTERVAL = 10000

# ========== 초기화 ==========
login(token=hf_token)
device = "cuda" if torch.cuda.is_available() else "cpu"
os.makedirs(OUTPUT_DIR, exist_ok=True)
model = SentenceTransformer(EMBED_MODEL, device=device)
tokenizer = AutoTokenizer.from_pretrained(EMBED_MODEL)

# ========== 유틸리티 ==========
def sliding_chunks(text, max_len=MAX_TOKEN_LENGTH, stride=STRIDE):
    tokens = tokenizer.encode(text)
    chunks = []
    for i in range(0, len(tokens), stride):
        chunk_tokens = tokens[i:i+max_len]
        if not chunk_tokens:
            continue
        chunk_text = tokenizer.decode(chunk_tokens, skip_special_tokens=True)
        chunks.append(chunk_text)
    return chunks

def encode_with_retry(texts):
    global model
    cur_bs = BATCH_SIZE
    while cur_bs >= 1:
        try:
            return model.encode(texts, batch_size=cur_bs, normalize_embeddings=True)
        except RuntimeError as e:
            if "CUDA out of memory" in str(e):
                cur_bs = cur_bs // 2
                torch.cuda.empty_cache()
                gc.collect()
            else:
                raise e
    print("[🔥 OOM: 모델 재로딩 시도]")
    torch.cuda.empty_cache()
    gc.collect()
    model = SentenceTransformer(EMBED_MODEL, device=device)
    return model.encode(texts, batch_size=1, normalize_embeddings=True)

def save_faiss_index(index):
    if index is not None and index.ntotal > 0:
        faiss.write_index(index, INDEX_PATH)
        print(f"[💾 저장] {index.ntotal} 벡터 저장됨")

# ========== 파일 준비 ==========
processed_files = set()
if os.path.exists(PROGRESS_PATH):
    with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
        processed_files = set(line.strip() for line in f)

jsonl_files = [
    os.path.join(root, fname)
    for root, _, files in os.walk(DATA_DIR)
    for fname in files if fname.endswith(".jsonl")
]
print(f"총 {len(jsonl_files)}개 파일 발견됨")

index = None
dimension = None
total_docs = 0
chunk, meta_chunk = [], []

meta_f = open(META_PATH, "a", encoding="utf-8")
progress_f = open(PROGRESS_PATH, "a", encoding="utf-8")
fail_f = open(FAILED_PATH, "a", encoding="utf-8")
error_log = open(ERROR_LOG_PATH, "a", encoding="utf-8")

# ========== 처리 루프 ==========
for path in tqdm(jsonl_files):
    fname = os.path.basename(path)
    if fname in processed_files:
        continue
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                try:
                    item = json.loads(line.strip())

                    if fname == "patent_laws_merged.jsonl":
                        input_text = item.get("input", "")
                        output_text = item.get("output", "")
                        full_text = f"{input_text} {output_text}".strip()
                        base_meta = {
                            "source_file": fname,
                            "type": "법령",
                            "input": input_text,
                            "output": output_text
                        }
                    elif fname == "ai_section_judge_guide.jsonl":
                        gubun = item.get("gubun", "")
                        text = item.get("text", "")
                        full_text = f"{gubun} {text}".strip()
                        base_meta = {
                            "source_file": fname,
                            "type": "가이드",
                            "id": item.get("id", ""),
                            "gubun": gubun
                        }
                    else:
                        full_text = " ".join(str(v) for v in item.values() if isinstance(v, str)).strip()
                        base_meta = {
                            "source_file": fname,
                            "type": "특허",
                            "patent_id": item.get("patent_id", ""),
                            "section": item.get("section", ""),
                            "subsection": item.get("subsection", ""),
                            "claim_number": item.get("claim_number", ""),
                            "paragraph": item.get("paragraph", "")
                        }

                    for chunk_text in sliding_chunks(full_text):
                        chunk.append(chunk_text)
                        meta_chunk.append(base_meta)

                        if len(chunk) >= CHUNK_SIZE:
                            emb = encode_with_retry(chunk)
                            emb = np.array(emb, dtype=np.float32)
                            if index is None:
                                dimension = emb.shape[1]
                                index = faiss.IndexFlatIP(dimension)
                            index.add(emb)
                            for m in meta_chunk:
                                json.dump(m, meta_f, ensure_ascii=False)
                                meta_f.write("\n")
                            total_docs += len(chunk)
                            if total_docs % SAVE_INTERVAL < CHUNK_SIZE:
                                save_faiss_index(index)
                            chunk, meta_chunk = [], []
                            torch.cuda.empty_cache()
                            gc.collect()
                except Exception as e:
                    error_log.write(f"[JSON Error] {fname}\n{str(e)}\n{'-'*60}\n")
        print(f"[📄 완료] {fname}")
        progress_f.write(fname + "\n")
        progress_f.flush()
    except Exception as file_error:
        fail_f.write(fname + "\n")
        error_log.write(f"[File Error] {fname}\n{traceback.format_exc()}\n{'='*60}\n")
        fail_f.flush()

# ========== 마지막 청크 처리 ==========
if chunk:
    emb = encode_with_retry(chunk)
    emb = np.array(emb, dtype=np.float32)
    if index is None:
        dimension = emb.shape[1]
        index = faiss.IndexFlatIP(dimension)
    index.add(emb)
    for m in meta_chunk:
        json.dump(m, meta_f, ensure_ascii=False)
        meta_f.write("\n")
    total_docs += len(chunk)

# ========== 저장 및 종료 ==========
save_faiss_index(index)
meta_f.close()
progress_f.close()
fail_f.close()
error_log.close()
print(f"[✅ 완료] 총 {total_docs} 문서 임베딩 완료됨.")
