import os
import re
import json
import PyPDF2
from typing import Dict, Any, List

def extract_text_from_pdf(pdf_path: str) -> str:
    """PDF에서 텍스트를 추출하고 페이지 헤더/푸터를 정리합니다."""
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        all_text = ""
        for page in reader.pages:
            all_text += page.extract_text()
    return all_text

def extract_claims(text: str) -> Dict[str, str]:
    """청구범위 섹션에서 청구항을 추출합니다."""
    claims = {}
    
    # 청구범위 섹션 먼저 추출
    claims_section = re.search(r'청구범위\s+(.*?)(?=발명의 설명|$)', text, re.DOTALL)
    if not claims_section:
        claims_section = re.search(r'특허청구의\s*범위\s*(.*?)(?=발명의\s*설명|$)', text, re.DOTALL)
    
    claims_text = claims_section.group(1) if claims_section else text
    
    # 청구항 추출 패턴
    pattern = re.compile(r'(?:^|\n)[ \t]*청구항\s*(\d+)[.\s\n]*(.*?)(?=(?:^|\n)[ \t]*청구항\s*\d+|$)', re.DOTALL)
    matches = pattern.findall(claims_text)
    
    for claim_num, claim_text in matches:
        claims[f'청구항_{claim_num}'] = claim_text.strip()
    
    # 청구항이 없으면 다른 방법 시도
    if not claims:
        lines = claims_text.split('\n')
        current_claim = None
        current_content = []
        
        for i, line in enumerate(lines):
            claim_match = re.search(r'^[ \t]*청구항\s*(\d+)', line)
            is_new_claim = False
            
            if i > 0 and not lines[i-1].strip() and claim_match:
                is_new_claim = True
            elif claim_match and claim_match.start() == 0:
                is_new_claim = True
                
            if is_new_claim:
                # 이전 청구항 저장
                if current_claim and current_content:
                    claims[f'청구항_{current_claim}'] = ' '.join(current_content).strip()
                
                # 새 청구항 시작
                current_claim = claim_match.group(1)
                content_start = line[claim_match.end():].strip()
                current_content = [content_start] if content_start else []
            elif current_claim:
                if line.strip():
                    current_content.append(line.strip())
        
        # 마지막 청구항 저장
        if current_claim and current_content:
            claims[f'청구항_{current_claim}'] = ' '.join(current_content).strip()
    
    return claims

def normalize_text(text: str) -> str:
    """텍스트에서 줄바꿈을 공백으로 변환하고, 연속된 공백을 하나로 줄입니다."""
    normalized = re.sub(r'\n', '', text)
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized.strip()

def is_section_header(line: str) -> bool:
    """텍스트가 섹션 헤더인지 확인합니다."""
    headers = ['요약', '기술분야', '배경기술', '발명의 내용', '해결하려는 과제', 
               '과제의 해결 수단', '발명의 효과', '도면의 간단한 설명', 
               '발명을 실시하기 위한 구체적인 내용']
    
    line = line.strip()
    for header in headers:
        if re.search(fr'{header}', line, re.IGNORECASE):
            return True
    return False

def extract_paragraphs_from_section(section_text: str) -> List[str]:
    """섹션 내용을 문단 단위로 추출합니다."""
    # 먼저 섹션 텍스트를 정규화 (줄바꿈 통일)
    section_text = re.sub(r'\r\n', '\n', section_text)
    
    # 빈 줄이나 [숫자] 패턴을 기준으로 문단 분리
    raw_paragraphs = []
    current_paragraph = []
    
    for line in section_text.split('\n'):
        line = line.strip()
        if not line:  # 빈 줄
            if current_paragraph:
                raw_paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
        elif re.match(r'^\[\d+\]', line):  # [숫자] 패턴
            if current_paragraph:
                raw_paragraphs.append(' '.join(current_paragraph))
            current_paragraph = [line]
        else:
            # 섹션 헤더는 새로운 문단 시작
            if is_section_header(line) and current_paragraph:
                raw_paragraphs.append(' '.join(current_paragraph))
                current_paragraph = []
            current_paragraph.append(line)
    
    # 마지막 문단 추가
    if current_paragraph:
        raw_paragraphs.append(' '.join(current_paragraph))
    
    # 결과 정규화
    paragraphs = []
    for p in raw_paragraphs:
        if p.strip():
            # 공백 정규화
            normalized_p = normalize_text(p)
            paragraphs.append(normalized_p)
    
    # 문단이 추출되지 않으면 전체를 하나의 문단으로 처리
    if not paragraphs and section_text.strip():
        paragraphs = [normalize_text(section_text)]
    
    return paragraphs

def extract_sections(text: str) -> Dict[str, Dict[str, List[str]]]:
    """전체 텍스트에서 섹션과 서브섹션별로 추출합니다."""
    sections = {
        "특허_기본정보": {},
        "발명의_설명": {},
        "청구범위": {},
        "도면": {}
    }

    # "발명의 내용" 헤더 제거
    text = re.sub(r'\n발명의\s+내용\s*\n', '\n', text)
    
    # 서브섹션 패턴 정의
    subsection_patterns = [
        ('발명의_설명', '요약', r'요\s*약\s*(.*?)(?=대\s*표\s*도|(?:기\s*술\s*분\s*야|배\s*경\s*기\s*술|해결하려는\s*과제|과제의\s*해결\s*수단|발명의\s*효과|도면의\s*간단한\s*설명|발명을\s*실시하기))', re.DOTALL),
        ('발명의_설명', '기술분야', r'기\s*술\s*분\s*야\s*(.*?)(?=(?:배\s*경\s*기\s*술|해결하려는\s*과제|과제의\s*해결\s*수단|발명의\s*효과|도면의\s*간단한\s*설명|발명을\s*실시하기))', re.DOTALL),
        ('발명의_설명', '배경기술', r'배\s*경\s*기\s*술\s*(.*?)(?=(?:해결하려는\s*과제|과제의\s*해결\s*수단|발명의\s*효과|도면의\s*간단한\s*설명|발명을\s*실시하기))', re.DOTALL),
        ('발명의_설명', '해결하려는과제', r'해결하려는\s*과제\s*(.*?)(?=(?:과제의\s*해결\s*수단|발명의\s*효과|도면의\s*간단한\s*설명|발명을\s*실시하기))', re.DOTALL),
        ('발명의_설명', '과제의해결수단', r'과제의\s*해결\s*수단\s*(.*?)(?=(?:발명의\s*효과|도면의\s*간단한\s*설명|발명을\s*실시하기))', re.DOTALL),
        ('발명의_설명', '발명의효과', r'발명의\s*효과\s*(.*?)(?=(?:도면의\s*간단한\s*설명|발명을\s*실시하기))', re.DOTALL),
        ('도면', '도면설명', r'도면의\s*간단한\s*설명\s*(.*?)(?=(?:발명을\s*실시하기))', re.DOTALL),
        ('발명의_설명', '발명을실시하기위한구체적인내용', r'발명을\s*실시하기\s*위한\s*구체적인\s*내용\s*(.*?)(?=(?:(?:^|\n)\s*도\s*면\s*(?:\n|$)|(?:^|\n)\s*부호의\s*설명\s*(?:\n|$)|$))', re.DOTALL)
    ]
    
    for section_name, subsection_name, pattern, flags in subsection_patterns:
        section_match = re.search(pattern, text, flags)
        if section_match:
            content = section_match.group(1).strip()

            # 섹션 내에서 불필요한 부분 제거
            content = re.sub(r'공개특허\s+\d+-\d+-\d+\s*\n*-\d+-', '', content)
            content = re.sub(r'등록특허\s+제\d+-\d+-\d+\s*\(.*?\)', '', content)
            content = re.sub(r'\n-\d+-\n', '\n', content)
            content = re.sub(r'\[\d{4}\]', '', content)
            content = re.sub(r'\(\d+\)', '', content)

            # 각 섹션의 문단을 추출
            paragraphs = extract_paragraphs_from_section(content)
            if paragraphs:
                if section_name not in sections:
                    sections[section_name] = {}
                sections[section_name][subsection_name] = paragraphs
    
    return sections

def process_patent_pdf(pdf_path: str) -> Dict[str, Any]:
    """특허 PDF를 처리하고 구조화된 정보를 추출합니다."""
    # 텍스트 추출
    full_text = extract_text_from_pdf(pdf_path)
    
    # 특허 정보 추출
    patent_info = {}
    info_patterns = {
        '공개번호': r'공개번호\s+(\d+-\d+-\d+)',
        '출원번호': r'출원번호\s+(\d+-\d+-\d+)',
        '발명의 명칭': r'발명의 명칭\s+(.+?)(?=\n|\()',
        '출원인': r'출원인\s+(.+?)(?=\n|\()',
        '발명자': r'발명자\s+(.+?)(?=\n|\()'
    }
    
    for key, pattern in info_patterns.items():
        match = re.search(pattern, full_text)
        if match:
            patent_info[key] = match.group(1).strip()
    
    # 청구항 추출
    claims_section = extract_claims(full_text)
    
    # 섹션 추출 - 이제 섹션과 서브섹션으로 구조화됨
    sections = extract_sections(full_text)
    
    return {
        'patent_info': patent_info,
        'claims': claims_section,
        'sections': sections
    }

def merge_fragments_in_paragraph(paragraph: str) -> str:
    """문단 내의 부자연스러운 분할을 수정합니다."""
    # 특정 패턴으로 연결되지 않은 부분을 찾아서 연결
    patterns = [
        (r'것\s+으로', r'것으로'),
        (r'다\.\s+또한', r'다. 또한'),
        (r'AI\s+기', r'AI 기'),
        (r'것이\s+다', r'것이다')
    ]
    
    result = paragraph
    for pattern, replacement in patterns:
        result = re.sub(pattern, replacement, result)
    
    return result

def save_as_hybrid_jsonl(data: Dict[str, Any], output_path: str) -> None:
    """사람이 읽기 쉬운 JSONL 형식으로 저장합니다."""
    with open(output_path, 'w', encoding='utf-8') as file:
        # 특허 ID 가져오기
        patent_id = data.get('patent_info', {}).get('출원번호', 
                  data.get('patent_info', {}).get('공개번호', 'unknown_patent'))
        
        # 1. 특허 정보 저장
        if 'patent_info' in data and data['patent_info']:
            patent_info_obj = {
                "patent_id": patent_id,
                "section": "특허_기본정보",
                "subsection": "특허정보",
                "content": data['patent_info']
            }
            file.write(json.dumps(patent_info_obj, ensure_ascii=False) + '\n')
        
        # 2. 청구항 저장
        if 'claims' in data and data['claims']:
            for claim_num, claim_text in data['claims'].items():
                claim_text = normalize_text(claim_text)
                claim_text = merge_fragments_in_paragraph(claim_text)
                
                claim_obj = {
                    "patent_id": patent_id,
                    "section": "청구범위",
                    "subsection": "청구항",
                    "claim_number": claim_num,
                    "content": claim_text
                }
                file.write(json.dumps(claim_obj, ensure_ascii=False) + '\n')
        
        # 3. 다른 섹션 저장
        if 'sections' in data and data['sections']:
            for section_name, subsections in data['sections'].items():
                for subsection_name, paragraphs in subsections.items():
                    for p_idx, paragraph in enumerate(paragraphs):
                        paragraph = normalize_text(paragraph)
                        paragraph = merge_fragments_in_paragraph(paragraph)
                        
                        # 내용이 있는 경우만 저장
                        if paragraph.strip():
                            # 도면 설명인 경우 item으로 처리
                            is_drawing = "도면" in subsection_name
                            is_figure_desc = re.match(r'^도\s*\d+', paragraph)
                            
                            section_obj = {
                                "patent_id": patent_id,
                                "section": section_name,
                                "subsection": subsection_name
                            }
                            
                            if is_drawing or is_figure_desc:
                                section_obj["item"] = p_idx + 1
                            else:
                                section_obj["paragraph"] = p_idx + 1
                                
                            section_obj["content"] = paragraph
                            file.write(json.dumps(section_obj, ensure_ascii=False) + '\n')

def process_patent_folder(folder_path: str, output_dir: str) -> None:
    """폴더 내의 모든 PDF를 처리하고 사람이 읽기 쉬운 JSONL 파일로 저장합니다."""
    os.makedirs(output_dir, exist_ok=True)
    
    for filename in os.listdir(folder_path):
        if filename.endswith('.pdf'):
            pdf_path = os.path.join(folder_path, filename)
            base_name = os.path.splitext(filename)[0]
            
            print(f"Processing {filename}...")
            
            try:
                data = process_patent_pdf(pdf_path)
                claims_count = len(data.get('claims', {}))
                print(f"Found {claims_count} claims")
                
                data['file_name'] = filename
                
                # 사람이 읽기 쉬운 JSONL 형식으로 저장
                jsonl_path = os.path.join(output_dir, f"{base_name}.jsonl")
                save_as_hybrid_jsonl(data, jsonl_path)
                
                print(f"Successfully processed {filename}")
                print(f"Saved to {jsonl_path}")
                
            except Exception as e:
                print(f"Error processing {filename}: {str(e)}")

if __name__ == "__main__":
    input_folder = "./data/pdfs_등록_공개"
    output_folder = "./processed_patents_jsonl"
    
    process_patent_folder(input_folder, output_folder)