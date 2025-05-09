import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# 파일 경로 설정
index_path = "vectordb/cleaned_law_bge_m3_index.faiss"
meta_path = "vectordb/cleaned_law_bge_m3_metadata.jsonl"
model_name = "BAAI/bge-m3"

# 모델 로드
print("[1] 임베딩 모델 로드 중...")
model = SentenceTransformer(model_name)

# FAISS 인덱스 로드
print("[2] FAISS 인덱스 로딩...")
index = faiss.read_index(index_path)

# 메타데이터 로드
print("[3] 메타데이터 로딩...")
texts = []
with open(meta_path, "r", encoding="utf-8") as f:
    for line in f:
        item = json.loads(line.strip())
        texts.append(item["text"])

# 사용자 입력
query = "등록 원부 작성에 필요한 서식은?"
print(f"[4] 쿼리 입력: {query}")

# 쿼리 임베딩
query_vec = model.encode([query], normalize_embeddings=True)

# Top-K 유사한 결과 검색
k = 5
scores, indices = index.search(np.array(query_vec), k)

print("\n[5] 🔍 검색 결과 (Top 5)")
for i, idx in enumerate(indices[0]):
    print(f"\n[{i+1}] 유사도: {scores[0][i]:.4f}")
    print(texts[idx])
