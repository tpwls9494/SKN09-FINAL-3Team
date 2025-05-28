import os
import json
import time
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

# 디렉토리 경로 자동 생성
os.makedirs("vectordb", exist_ok=True)

# 파일 경로 설정
file_path = "data/cleaned_patent_laws.jsonl"
index_path = "vectordb/cleaned_law_bge_m3_index.faiss"
meta_path = "vectordb/cleaned_law_bge_m3_metadata.jsonl"

# 데이터 불러오기
print("[1] Loading cleaned law data...")
documents = []
with open(file_path, "r", encoding="utf-8") as f:
    for line in f:
        item = json.loads(line.strip())
        combined = f"{item['input']} {item['output']}"  # input + output 결합
        documents.append(combined)
print(f"총 {len(documents)}개 문서 로드 완료")

# 모델 로드
print("[2] Loading embedding model: BAAI/bge-m3")
model = SentenceTransformer("BAAI/bge-m3")

# 임베딩 수행
print("[3] Embedding in progress...")
start = time.time()
embeddings = model.encode(documents, normalize_embeddings=True, show_progress_bar=True)
elapsed = time.time() - start
print(f"    → 임베딩 완료: {elapsed:.1f}초 소요 (~{elapsed/60:.1f}분)")

# FAISS 인덱스 생성
dimension = embeddings.shape[1]
index = faiss.IndexFlatIP(dimension)
index.add(np.array(embeddings))
print(f"[4] FAISS index 생성 완료: 차원={dimension}, 벡터 수={index.ntotal}")

# FAISS 저장
faiss.write_index(index, index_path)

# 메타데이터를 JSONL로 저장
with open(meta_path, "w", encoding="utf-8") as f:
    for doc in documents:
        json.dump({"text": doc}, f, ensure_ascii=False)
        f.write("\n")

print(f"[5] 저장 완료 → index: '{index_path}', metadata(jsonl): '{meta_path}'")
