import os, json, time, gc
import numpy as np
import faiss
import torch
from tqdm import tqdm
from huggingface_hub import login
from sentence_transformers import SentenceTransformer

# Hugging Face 로그인
hf_token = "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"  # 직접 입력
if hf_token:
    login(token=hf_token)

# 설정
DATA_DIR = "data"
OUTPUT_DIR = "vectordb"
INDEX_PATH = os.path.join(OUTPUT_DIR, "full_patent_index_bge_m3.faiss")
META_PATH = os.path.join(OUTPUT_DIR, "full_patent_metadata.jsonl")
PROGRESS_PATH = os.path.join(OUTPUT_DIR, "progress.txt")
EMBED_MODEL = "BAAI/bge-m3"
BATCH_SIZE = 1
CHUNK_SIZE = 64
MAX_CHAR_LENGTH = 2048

os.makedirs(OUTPUT_DIR, exist_ok=True)
device = "cuda" if torch.cuda.is_available() else "cpu"
os.environ["PYTORCH_CUDA_ALLOC_CONF"] = "max_split_size_mb:64"
print(f"[INFO] Using device: {device}")

# 이전 처리된 파일 추적
processed_files = set()
if os.path.exists(PROGRESS_PATH):
    with open(PROGRESS_PATH, "r", encoding="utf-8") as f:
        processed_files = set(line.strip() for line in f)

# 파일 수집
jsonl_files = [os.path.join(root, f)
               for root, _, files in os.walk(DATA_DIR)
               for f in files if f.endswith(".jsonl")]
print(f"    → 총 {len(jsonl_files)}개 파일 탐색됨")

# 모델 로딩
model = SentenceTransformer(EMBED_MODEL, device=device)

# FAISS 준비
index = None
dimension = None
meta_f = open(META_PATH, "a", encoding="utf-8")
progress_f = open(PROGRESS_PATH, "a", encoding="utf-8")

# 안전한 임베딩 함수
def safe_encode(model, texts):
    try:
        return model.encode(texts, batch_size=BATCH_SIZE, normalize_embeddings=True)
    except RuntimeError as e:
        if "out of memory" in str(e).lower() and len(texts) > 1:
            torch.cuda.empty_cache()
            gc.collect()
            mid = len(texts) // 2
            return np.concatenate([
                safe_encode(model, texts[:mid]),
                safe_encode(model, texts[mid:])
            ])
        raise e

# 임베딩 수행
total_docs = 0
chunk, meta_chunk = [], []

for path in tqdm(jsonl_files):
    filename = os.path.basename(path)
    if filename in processed_files:
        continue

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                item = json.loads(line.strip())

                # 파일 타입 분기
                if filename == "patent_laws_merged.jsonl":
                    input_text = item.get("input", "")
                    output_text = item.get("output", "")
                    combined = f"{input_text} {output_text}".strip()
                    meta = {"source_file": filename, "input": input_text, "output": output_text, "type": "법령"}

                elif filename == "ai_section_judge_guide.jsonl":
                    gubun = item.get("gubun", "")
                    text = item.get("text", "")
                    combined = f"{gubun} {text}".strip()
                    meta = {"source_file": filename, "gubun": gubun, "id": item.get("id", ""), "type": "가이드"}

                else:
                    combined = " ".join(str(v) for v in item.values() if isinstance(v, str)).strip()
                    meta = {
                        "source_file": filename, "type": "특허",
                        "patent_id": item.get("patent_id", ""),
                        "section": item.get("section", ""),
                        "subsection": item.get("subsection", ""),
                        "claim_number": item.get("claim_number", ""),
                        "paragraph": item.get("paragraph", "")
                    }

                if combined and len(combined) <= MAX_CHAR_LENGTH:
                    chunk.append(combined)
                    meta_chunk.append(meta)

                if len(chunk) >= CHUNK_SIZE:
                    print(f"    → Embedding chunk of size {len(chunk)}...")
                    embeddings = safe_encode(model, chunk)
                    embeddings = np.array(embeddings, dtype=np.float32)
                    if index is None:
                        dimension = embeddings.shape[1]
                        index = faiss.IndexFlatIP(dimension)
                    index.add(embeddings)
                    for m in meta_chunk:
                        json.dump(m, meta_f, ensure_ascii=False)
                        meta_f.write("\n")
                    total_docs += len(chunk)
                    chunk, meta_chunk = [], []
                    torch.cuda.empty_cache()
                    gc.collect()

            except Exception as e:
                print(f"    → JSON 파싱 오류 in {filename}: {e}")

    progress_f.write(filename + "\n")
    progress_f.flush()

# 남은 청크 처리
if chunk:
    print(f"    → Final embedding chunk of size {len(chunk)}...")
    try:
        embeddings = safe_encode(model, chunk)
        embeddings = np.array(embeddings, dtype=np.float32)
        if index is None:
            dimension = embeddings.shape[1]
            index = faiss.IndexFlatIP(dimension)
        index.add(embeddings)
        for m in meta_chunk:
            json.dump(m, meta_f, ensure_ascii=False)
            meta_f.write("\n")
        total_docs += len(chunk)
    except Exception as e:
        print(f"    → 마지막 청크 처리 오류: {e}")

meta_f.close()
progress_f.close()
faiss.write_index(index, INDEX_PATH)

print(f"[✅ 완료] 총 {total_docs}개 문서 임베딩 완료")
print(f"        → FAISS 저장 위치: {INDEX_PATH}")
print(f"        → 메타데이터 저장 위치: {META_PATH}")
