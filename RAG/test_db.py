import faiss
import json
import os
import numpy as np
from sentence_transformers import SentenceTransformer

# 설정
EMBED_MODEL = "BAAI/bge-m3"
INDEX_PATH = "vectordb/full_patent_index_bge_m3.faiss"
META_PATH = "vectordb/full_patent_metadata.jsonl"
DATA_DIR = "data"

# 모델 및 인덱스 로드
model = SentenceTransformer(EMBED_MODEL)
index = faiss.read_index(INDEX_PATH)

# 메타데이터 로딩
with open(META_PATH, "r", encoding="utf-8") as f:
    metadata = [json.loads(line) for line in f]

def get_original_text(source_file, meta):
    try:
        if meta["type"] == "특허":
            path = os.path.join(DATA_DIR, "processed_patents_jsonl", source_file)
        else:
            path = os.path.join(DATA_DIR, source_file)

        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                item = json.loads(line.strip())

                if meta["type"] == "특허":
                    if item.get("patent_id") == meta.get("patent_id") and item.get("section") == meta.get("section"):
                        if meta.get("subsection") and item.get("subsection") != meta.get("subsection"):
                            continue
                        content = " ".join(str(v) for v in item.values() if isinstance(v, str)).strip()
                        return f"[📌 특허 ID: {item.get('patent_id')}]\n[🔖 항목: {item.get('section')} - {item.get('subsection')}]\n{content}"

                elif meta["type"] == "법령":
                    if item.get("input") == meta.get("input") and item.get("output") == meta.get("output"):
                        return f"[📜 법령 Input: {item.get('input')}]\n[📘 법령 Output: {item.get('output')}]\n{item.get('input')} {item.get('output')}"

                elif meta["type"] == "가이드":
                    if item.get("gubun") == meta.get("gubun"):
                        return f"[📘 가이드 구분: {item.get('gubun')}]\n[📄 가이드 ID: {item.get('id')}]\n{item.get('text')}"

    except Exception as e:
        return f"[본문 추출 실패: {str(e)}]"

    return "[본문 없음]"

def search_batch(queries, top_k=5):
    query_vecs = model.encode(queries, normalize_embeddings=True)
    results = []

    for i, query_vec in enumerate(query_vecs):
        query = queries[i]
        D, I = index.search(np.array([query_vec], dtype=np.float32), top_k)
        scores = D[0]
        indices = I[0]

        print(f"\n[🔍 질의 {i+1}: {query}]")
        avg_score = np.mean(scores)
        print(f"[📊 평균 유사도 점수: {avg_score:.4f}]")

        for rank, idx in enumerate(indices):
            score = scores[rank]
            meta = metadata[idx]
            content = get_original_text(meta["source_file"], meta)

            print(f"\n📌 Top {rank+1}: (score: {score:.4f})")
            print(json.dumps(meta, ensure_ascii=False, indent=2))
            print(f"📄 본문:\n{content}")

        results.append({"query": query, "avg_score": avg_score})

    return results

# 실행
if __name__ == "__main__":
    query_list = [
        "고객 자동 추천 알고리즘",
        "인공지능 발명과 실시 가능 요건",
        "특허 명세서의 청구항 작성 방법",
        "특허청 소속기관 정원 기준"
    ]
    search_batch(query_list)
