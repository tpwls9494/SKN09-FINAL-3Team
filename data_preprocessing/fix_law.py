import json

# 파일 경로
input_path = "data/patent_laws_merged.jsonl"
output_path = "data/patent_laws_merged_fixed.jsonl"

# 고쳐서 저장할 리스트
valid_lines = []

# 파일을 한 줄씩 읽어 유효한 JSON 객체만 저장
with open(input_path, "r", encoding="utf-8") as infile:
    for line in infile:
        try:
            obj = json.loads(line.strip().rstrip(","))
            valid_lines.append(obj)
        except json.JSONDecodeError:
            continue  # 잘못된 줄은 무시

# 유효한 JSON 객체들을 jsonl 형식으로 저장
with open(output_path, "w", encoding="utf-8") as outfile:
    for obj in valid_lines:
        json.dump(obj, outfile, ensure_ascii=False)
        outfile.write("\n")

output_path
