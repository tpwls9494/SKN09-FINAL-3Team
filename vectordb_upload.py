from huggingface_hub import login, create_repo, upload_file
import os

# ====== 사용자 설정 ======
HF_TOKEN = "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"  # 👉 Hugging Face에서 발급받은 토큰
USERNAME = "qkrdbwls"  # 👉 Hugging Face 사용자명 또는 조직명
REPO_NAME = "pass-vector-db"       # 👉 원하는 데이터셋 이름
REPO_ID = f"{USERNAME}/{REPO_NAME}"

LOCAL_FAISS_PATH = "vectordb/full_patent_index_bge_m3.faiss"
LOCAL_META_PATH = "vectordb/full_patent_metadata.jsonl"
LOCAL_PROGRESS_PATH = "vectordb/progress.txt"

IS_PRIVATE = True  # True면 비공개 repo로 업로드

# ====== 로그인 ======
login(token=HF_TOKEN)

# ====== 데이터셋 repo 생성 ======
create_repo(
    repo_id=REPO_NAME,
    token=HF_TOKEN,
    repo_type="dataset",
    private=IS_PRIVATE,
    exist_ok=True  # 이미 존재해도 OK
)

# ====== 업로드 함수 ======
def upload_local_file(file_path):
    upload_file(
        path_or_fileobj=file_path,
        path_in_repo=os.path.basename(file_path),
        repo_id=REPO_ID,
        repo_type="dataset"
    )
    print(f"[✅ 업로드 완료] {file_path}")

# ====== 실제 업로드 실행 ======
upload_local_file(LOCAL_FAISS_PATH)
upload_local_file(LOCAL_META_PATH)
upload_local_file(LOCAL_PROGRESS_PATH)
