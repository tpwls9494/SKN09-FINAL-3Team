import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer

# 기본 설정
model_name = "BAAI/bge-m3"
meta_path = "vectordb/cleaned_law_bge_m3_metadata.jsonl"
query = "등록 원부 작성에 필요한 서식은?"
top_k = 5

# 모델 로드
print("[1] 임베딩 모델 로드 중...")
model = SentenceTransformer(model_name)

# 메타데이터 로드
print("[2] 메타데이터 로딩 중...")
texts = []
with open(meta_path, "r", encoding="utf-8") as f:
    for line in f:
        item = json.loads(line.strip())
        texts.append(item["text"])

# 쿼리 임베딩
query_vec_cosine = model.encode([query], normalize_embeddings=True)
query_vec_l2 = model.encode([query], normalize_embeddings=False)

# 전체 문서 임베딩
doc_embeddings_cosine = model.encode(texts, normalize_embeddings=True)
doc_embeddings_l2 = model.encode(texts, normalize_embeddings=False)

# -------------------------
# 1. Inner Product (Cosine)
# -------------------------
index_ip = faiss.IndexFlatIP(doc_embeddings_cosine.shape[1])
index_ip.add(np.array(doc_embeddings_cosine))
scores_ip, indices_ip = index_ip.search(np.array(query_vec_cosine), top_k)

print("\n✅ [3] Inner Product (Cosine 유사도 기준)")
for i, idx in enumerate(indices_ip[0]):
    print(f"\n[{i+1}] 유사도: {scores_ip[0][i]:.4f}")
    print(texts[idx])

# -------------------------
# 2. L2 거리 (Euclidean)
# -------------------------
index_l2 = faiss.IndexFlatL2(doc_embeddings_l2.shape[1])
index_l2.add(np.array(doc_embeddings_l2))
scores_l2, indices_l2 = index_l2.search(np.array(query_vec_l2), top_k)

print("\n✅ [4] L2 거리 (작을수록 유사)")
for i, idx in enumerate(indices_l2[0]):
    print(f"\n[{i+1}] 거리: {scores_l2[0][i]:.4f}")
    print(texts[idx])
