from sentence_transformers import SentenceTransformer
import faiss
import numpy as np
import json

# JSONL 로드
with open('patent_laws_merged.jsonl', 'r', encoding='utf-8') as f:
    data = [json.loads(line) for line in f]

documents = [f"{item['input']} {item['output']}" for item in data]

# bge-m3 임베딩
model = SentenceTransformer("BAAI/bge-m3")
embeddings = model.encode(documents, normalize_embeddings=True, show_progress_bar=True)

# FAISS 벡터 DB 구축
index = faiss.IndexFlatIP(embeddings.shape[1])
index.add(np.array(embeddings))

# 저장
faiss.write_index(index, "patent_law_bge_m3_index.faiss")
with open("patent_law_bge_m3_metadata.json", "w", encoding="utf-8") as f:
    json.dump({"documents": documents}, f, ensure_ascii=False, indent=2)
