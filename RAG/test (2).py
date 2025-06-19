import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer, CrossEncoder

# ────────────────────────────────────────────────
# 설정
# ────────────────────────────────────────────────
EMBED_MODEL   = "BAAI/bge-m3"
RERANK_MODEL  = "cross-encoder/ms-marco-MiniLM-L-6-v2"
INDEX_PATH    = "embeddb/index_cpu.faiss"
META_PATH     = "embeddb/metadata.jsonl"

# 1차 FAISS 검색 시도할 top_n, rerank할 rerank_n
TOP_K         = 5
INITIAL_K     = 50    # first-pass FAISS 에서 뽑아올 개수
NP            = 64    # IVF.nprobe

# ────────────────────────────────────────────────
# 1. 모델 & 인덱스 로드
# ────────────────────────────────────────────────
print("🔄  로드 중…")
embedder    = SentenceTransformer(EMBED_MODEL, device="cpu")
reranker    = CrossEncoder(RERANK_MODEL, device="cpu")
index       = faiss.read_index(INDEX_PATH)
index.nprobe = NP

# 메타 전체를 미리 읽어 두면 빠릅니다
with open(META_PATH, encoding="utf-8") as f:
    metas = [json.loads(line) for line in f]

print(f"✅  인덱스 로드 완료: {index.ntotal} vectors, nprobe={NP}")
print("메타 데이터 개수:", len(metas))


# ────────────────────────────────────────────────
# 2. 검색+리랭크 함수
# ────────────────────────────────────────────────
def search_and_rerank(query: str, top_k: int = TOP_K, init_k: int = INITIAL_K):
    # 1) 쿼리 임베딩
    qv = embedder.encode([query], normalize_embeddings=True).astype(np.float32)

    # 2) FAISS 검색
    D0, I0 = index.search(qv, init_k)
    idxs0 = I0[0].tolist()

    # 3) Cross-Encoder rerank
    rerank_inputs = [(query, metas[i]['content']) for i in idxs0]
    scores_rerank = reranker.predict(rerank_inputs)
    # 정렬
    reranked = sorted(zip(idxs0, scores_rerank), key=lambda x: x[1], reverse=True)[:top_k]

    # 4) 결과
    results = []
    for idx, sc in reranked:
        meta = metas[idx].copy()
        results.append((float(sc), meta))
    return results

# ────────────────────────────────────────────────
# 3. 대화형 테스트
# ────────────────────────────────────────────────
if __name__ == "__main__":
    print("🎯 검색 테스트—원하는 문장을 입력하고 엔터를 눌러 보세요. 빈 입력 시 종료합니다.")
    while True:
        query = input("\n검색어 ▶ ").strip()
        if not query:
            print("종료합니다.")
            break

        hits = search_and_rerank(query)
        print(f"\n🔍 Top-{len(hits)} 결과:")
        for rank, (score, meta) in enumerate(hits, start=1):
            print(f"\n{rank:>2}. score={score:.4f}")
            print(f"   • source_file: {meta['source_file']}")
            print(f"   • type       : {meta['type']}")
            if meta['type']=="특허":
                print(f"   • patent_id  : {meta['patent_id']}")
                print(f"   • section    : {meta['section']} / {meta['subsection']}")
                print(f"   • claim#     : {meta['claim_number']}")
                print(f"   • status     : {meta['status']}")
            print(f"   • title      : {meta.get('발명의_명칭','')}")
            print(f"   • content    : {meta['content'][:200]}...")  # 앞 200자만



import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# 1) FAISS 인덱스 로드
index = faiss.read_index("embeddb/index_cpu.faiss")
index.nprobe = 64  # 검색 속도/정확도 밸런스

# 2) Bi-Encoder (BGE-M3) 모델 로드
be_model = SentenceTransformer("BAAI/bge-m3", device="cuda")
be_model.eval()

# 3) Cross-Encoder 모델 로드
ce_tokenizer = AutoTokenizer.from_pretrained("cross-encoder/ms-marco-MiniLM-L-12-v2")
ce_model     = AutoModelForSequenceClassification.from_pretrained("cross-encoder/ms-marco-MiniLM-L-12-v2")
ce_model.to("cuda").eval()

def retrieve_and_rerank(query: str,
                        top_k_faiss: int = 100,
                        top_n_final: int = 10):
    # (1) Bi-Encoder 임베딩
    q_emb = be_model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
    # (2) FAISS 검색
    D, I = index.search(q_emb, top_k_faiss)  # distances, indices

    # (3) 후보 문장들 로드
    #    — 미리 meta_gpu*.jsonl 에서 line 단위로 읽어서 배열로 메모리에 캐시해 두세요
    #    meta_lines[i] = 검색 결과 i번 벡터의 원문 텍스트
    candidates = [ meta_lines[idx] for idx in I[0] ]

    # (4) Cross-Encoder 재순위
    inputs = ce_tokenizer(
        [query]*len(candidates),
        candidates,
        padding=True, truncation=True, return_tensors="pt"
    ).to("cuda")
    with torch.no_grad():
        scores = ce_model(**inputs).logits.squeeze(-1)  # [batch]
    topk = torch.topk(scores, k=top_n_final)

    return [(candidates[i], float(scores[i])) for i in topk.indices.cpu().numpy()]

# 사용 예
if __name__ == "__main__":
    # — 미리 메타 로드
    with open("embeddb/meta_all.jsonl", encoding="utf-8") as f:
        meta_lines = [json.loads(l)["text"] for l in f]

    query = "인공지능 기반 안구질병 진단 방법"
    results = retrieve_and_rerank(query, top_k_faiss=200, top_n_final=5)
    for text, score in results:
        print(f"{score:.3f}\t{text}")

