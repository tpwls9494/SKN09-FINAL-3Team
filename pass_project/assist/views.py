from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.db import transaction
from django.db.models.functions import Substr, Cast
from django.db.models import IntegerField
from django.utils import timezone
from django.http import HttpResponse, JsonResponse
from django.conf import settings
from .forms import TemplateForm
from core.models import Template, Draft, User, Evaluation
from django.template.loader import get_template
from weasyprint import HTML, CSS
from docx import Document
from bs4 import BeautifulSoup, NavigableString
from io import BytesIO
import os
import json

# Mock AI 함수 (FastAPI로 교체 예정)
def mock_ai_edit(draft_text, prompt):
    return f"[Edited by AI based on: '{prompt}']\n\n{draft_text}"

def mock_ai_evaluate(draft_text):
    return "🧠 AI 평가 결과: 이 초안은 기술적 진보성이 우수합니다."

def mock_ai_generate_draft(template_data):
    """템플릿 데이터를 기반으로 마크다운 초안 생성"""
    tech_name = template_data.get('tech_name', '혁신적인 기술 시스템')
    newline = "\n"
    
    draft_content = f"""# 발명의 명칭
{tech_name}

## 기술분야
{template_data.get('tech_description', '')}

## 배경기술
{template_data.get('problem_solved', '')}

기존 기술들은 다양한 한계점을 가지고 있었습니다. 특히 효율성, 정확성, 경제성 측면에서 개선이 필요한 상황이었으며, 이러한 문제점들을 해결하기 위한 혁신적인 접근 방법이 요구되었습니다.

## 해결하려는 과제
{template_data.get('problem_solved', '')}

본 발명은 **{tech_name}**을 통해 기존 기술의 한계를 극복하고, 더 나은 솔루션을 제공하는 것을 주요 목표로 합니다.

## 과제의 해결 수단
{template_data.get('tech_differentiation', '')}

본 발명은 다음과 같은 혁신적인 방법론을 통해 기존 문제를 해결합니다:
- 체계적이고 효율적인 접근 방식
- 사용자 중심의 설계 철학
- 확장 가능한 아키텍처 구현

{f"## 활용 분야{newline}{template_data.get('application_field', '')}{newline}" if template_data.get('application_field') else ''}

## 발명의 효과
본 발명을 통해 다음과 같은 효과를 얻을 수 있습니다:

- **성능 향상**: 기존 기술 대비 현저히 향상된 성능 및 효율성
- **경제성 개선**: 비용 효율적인 솔루션 제공
- **사용자 편의성**: 직관적이고 사용하기 쉬운 인터페이스
- **확장성**: 다양한 분야에서의 실용적 활용 가능성
- **안정성**: 기술적 안정성 및 신뢰성 확보

## 발명을 실시하기 위한 구체적인 내용

### 주요 구성 요소
{template_data.get('components_functions', '')}

### 구현 방식
{template_data.get('implementation_example', '')}

본 발명의 주요 구성 요소들이 유기적으로 연동하여 혁신적인 솔루션을 제공합니다.

{f"### 도면의 간단한 설명{newline}{template_data.get('drawing_description', '')}{newline}" if template_data.get('drawing_description') else ''}

## 특허청구범위

**청구항 1**: {tech_name}에 있어서,
상기 기술의 핵심 구성을 포함하여 혁신적인 기능을 제공하는 것을 특징으로 하는 시스템.

**청구항 2**: 제1항에 있어서,
{template_data.get('components_functions', '').split('.')[0] if template_data.get('components_functions') else '효율적인 데이터 처리 및 분석 기능'}을 추가로 포함하는 것을 특징으로 하는 시스템.

**청구항 3**: 제1항 또는 제2항에 있어서,
사용자 친화적인 인터페이스를 통해 직관적인 조작이 가능한 것을 특징으로 하는 시스템.

**청구항 4**: 제1항 내지 제3항 중 어느 한 항에 있어서,
{template_data.get('tech_differentiation', '').split('.')[0] if template_data.get('tech_differentiation') else '보안 기능을 강화하여 안전한 시스템 운영을 보장'}하는 것을 특징으로 하는 시스템.

---

### 출원인 및 발명자 정보
- **출원인**: {template_data.get('application_info', '')}
- **발명자**: {template_data.get('inventor_info', '')}

---
*※ 본 특허청구범위는 특허법 제42조 제2~5항 및 시행규칙 제21조에 따라 작성되었습니다.*
*※ 모든 기술적 내용은 모범명세서 가이드에 따라 체계적으로 기술되어 있습니다.*"""

    return draft_content

def editor_view(request):
    return render(request, 'assist/editor.html')
    # if request.method == 'POST':
    #     # 템플릿 → 초안 생성 (AJAX 요청 처리)
    #     if request.headers.get('Content-Type') == 'application/json':
    #         try:
    #             data = json.loads(request.body)
                
    #             # Template 저장
    #             template = Template(
    #                 user_code=request.user if request.user.is_authenticated else None,
    #                 tech_name=data.get('tech_name', ''),
    #                 tech_description=data.get('tech_description', ''),
    #                 problem_solved=data.get('problem_solved', ''),
    #                 tech_differentiation=data.get('tech_differentiation', ''),
    #                 application_field=data.get('application_field', ''),
    #                 components_functions=data.get('components_functions', ''),
    #                 implementation_example=data.get('implementation_example', ''),
    #                 drawing_description=data.get('drawing_description', ''),
    #                 application_info=data.get('applicant_name', '') + ', ' + 
    #                                data.get('applicant_nationality', '') + ', ' + 
    #                                data.get('applicant_address', ''),
    #                 inventor_info=data.get('inventor_name', '') + ', ' + 
    #                             data.get('inventor_nationality', '') + ', ' + 
    #                             data.get('inventor_address', ''),
    #                 template_title=data.get('tech_name', '')[:50],
    #                 date=timezone.now()
    #             )
    #             template.save()

    #             # AI로 초안 생성
    #             draft_content = mock_ai_generate_draft(data)
                
    #             # Draft 저장
    #             draft = Draft.objects.create(
    #                 template_id=template,
    #                 draft_name=f"{template.tech_name}_draft",
    #                 create_draft=draft_content,
    #                 create_time=timezone.now()
    #             )
                
    #             return JsonResponse({
    #                 'success': True,
    #                 'draft_content': draft_content,
    #                 'draft_id': draft.draft_id,
    #                 'message': '특허 초안이 성공적으로 생성되었습니다.'
    #             })
                
    #         except Exception as e:
    #             return JsonResponse({
    #                 'success': False,
    #                 'error': str(e),
    #                 'message': '초안 생성 중 오류가 발생했습니다.'
    #             })
        
    #     # 기존 폼 처리 (하위 호환성)
    #     elif 'submit_template' in request.POST:
    #         form = TemplateForm(request.POST)
    #         if form.is_valid():
    #             template = form.save(commit=False)
    #             if request.user.is_authenticated:
    #                 template.user_code = request.user
    #             template.date = timezone.now()
    #             template.save()

    #             # 기존 로직으로 초안 생성
    #             template_data = {
    #                 'tech_name': template.tech_name,
    #                 'tech_description': template.tech_description,
    #                 'problem_solved': template.problem_solved,
    #                 'tech_differentiation': template.tech_differentiation,
    #                 'application_field': template.application_field,
    #                 'components_functions': template.components_functions,
    #                 'implementation_example': template.implementation_example,
    #                 'drawing_description': template.drawing_description,
    #                 'application_info': template.application_info,
    #                 'inventor_info': template.inventor_info,
    #             }
                
    #             draft_content = mock_ai_generate_draft(template_data)
                
    #             draft = Draft.objects.create(
    #                 template_id=template,
    #                 draft_name=f"{template.tech_name}_draft",
    #                 create_draft=draft_content,
    #                 create_time=timezone.now()
    #             )
    #             return redirect('assist:editor')

    #     # 직접 수정 저장
    #     elif 'save_draft' in request.POST:
    #         draft_id = request.POST.get('draft_id')
    #         new_text = request.POST.get('draft_text')
    #         draft = Draft.objects.get(draft_id=draft_id)
    #         draft.create_draft = new_text
    #         draft.save()

    #     # AI 수정
    #     elif 'ai_edit' in request.POST:
    #         draft_id = request.POST.get('draft_id')
    #         prompt = request.POST.get('prompt')
    #         draft = Draft.objects.get(draft_id=draft_id)
    #         draft.create_draft = mock_ai_edit(draft.create_draft, prompt)
    #         draft.save()

    #     # AI 평가
    #     elif 'ai_evaluate' in request.POST:
    #         draft_id = request.POST.get('draft_id')
    #         draft = Draft.objects.get(draft_id=draft_id)
    #         request.session['ai_feedback'] = mock_ai_evaluate(draft.create_draft)
    #         request.session['active_draft'] = draft.draft_id

    #     return redirect('assist:editor')

    # # GET 요청 처리
    # template = Template.objects.last()
    # draft = Draft.objects.last()
    # feedback = request.session.pop('ai_feedback', None) if draft else None
    
    # return render(request, 'assist/editor.html', {
    #     'form': TemplateForm(),
    #     'template': template,
    #     'draft': draft,
    #     'feedback': feedback
    # })

@csrf_exempt
def insert_patent_report(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        # user 테이블 연동
        users = User.objects.all()

        if data['sc_flag'] == 'create':
            try:
                with transaction.atomic():
                    template = Template.objects.create(
                        tech_name=data.get("tech_name"),
                        tech_description=data.get("tech_description"),
                        problem_solved=data.get("problem_solved"),
                        tech_differentiation=data.get("tech_differentation", "tech_differentiation"),
                        application_field=data.get("application_field"),
                        components_functions=data.get("components_functions"),
                        implementation_example=data.get("implementation_example"),
                        drawing_description=data.get("drawing_description"),
                        application_info=data.get("application_info", "applicant_info"),
                        inventor_info=data.get("inventor_info", "inventors"),
                        date=timezone.now(),
                        template_title=data.get("tech_name")
                    )

                    draft = Draft.objects.create(
                        draft_name = data.get("tech_name"),
                        draft_title = data.get("tech_name"),
                        version = data.get("version"),
                        template_id = template.template_id,
                        create_draft = data.get("create_draft"),
                        create_time = timezone.now()
                    )
                    
                    return JsonResponse({'status': "success", 'message': '저장 완료', 'template_id': template.template_id, 'draft_id': draft.draft_id})
            except Exception as e:
                return JsonResponse({"status": 'error', 'message': str(e)})
        elif data['sc_flag'] == 'update':
            try:
                drafts = Draft.objects.filter(template_id=data['template_id'])

                if not drafts:
                    return JsonResponse({'status': 'error', 'message': 'No drafts found[404]'}, status=404)
                
                latest_draft = sorted(drafts, key=lambda d: int(d.version[1:]), reverse=True)[0]

                draft_obj = {}
                for key, value in latest_draft.__dict__.items():
                    if not key.startswith('_'):  # _state 등 내부 속성 제외
                        draft_obj[key] = value
                
                if str(draft_obj.get("create_draft")) == str(data['create_draft']):
                    return JsonResponse({'status': 'error', 'meassge': "수정 내용이 없습니다."})
                
                print("before::", draft_obj.get("version"))

                version = str(draft_obj.get("version")).replace("v", "").strip()
                print("number::", version)
                latest_version = f"v{int(version) + 1}"

                draft_obj['version'] = latest_version

                print(draft_obj.get("version"))

                draft = Draft.objects.create(
                    draft_name = draft_obj.get("draft_name"), # 기존거 넣어야함..
                    draft_title = data.get("tech_name"),
                    version = draft_obj.get("version"),
                    template_id = draft_obj.get("template_id"),
                    create_draft = data.get("create_draft"),
                    create_time = timezone.now()
                )
                return JsonResponse({'status': "success", 'message': '저장 완료', 'draft_id': draft.draft_id})
            except Exception as e:
                print("?")
                return JsonResponse({"status": 'error', 'message': str(e)})
        
    return JsonResponse({'status': 'error', "message": "Invalid request [400]"})

@csrf_exempt
def insert_evaluation_result(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        tech_title = data.get("tech_title")
        try:
            template = Template.objects.get(template_title=tech_title)

            latest_version = Draft.objects.filter(template_id=template.template_id).annotate(version_number=Cast(Substr('version', 2), IntegerField())).order_by('-version_number').first()
            
            if latest_version is not None:
                draft = Draft.objects.get(template_id=template.template_id, version=latest_version.__dict__.get("version"))
                draft_id = draft.__dict__.get("draft_id")
                
                evaluation_exist = Evaluation.objects.filter(draft_id=draft_id).first()

                if evaluation_exist:
                    JsonResponse({'status': 'success', 'message': '이미 데이터가 존재하므로 따로 동작하지 않습니다.'})
                else:
                    evaluation = Evaluation.objects.create(
                        content = data.get('content'),
                        created_at = timezone.now(),
                        draft_id = draft_id
                    )
                return JsonResponse({'status': 'success', 'message': '평가 정보가 저장되었습니다.'})
            else:
                return JsonResponse({'status': 'error', 'message': 'Draft not found [404]'})
        except Template.DoesNotExist:
            return JsonResponse({'status':'error', 'message': 'Template not found'})
    return JsonResponse({'status':'error', 'message': "Invalid request [400]"})

def qa_view(request):
    """AI Q&A 페이지"""
    if request.method == 'POST' and request.headers.get('Content-Type') == 'application/json':
        try:
            data = json.loads(request.body)
            question = data.get('question', '')
            
            # Mock AI 답변 생성 (실제로는 AI 모델 호출)
            answer = mock_qa_answer(question)
            
            return JsonResponse({
                'success': True,
                'answer': answer,
                'message': '답변이 생성되었습니다.'
            })
            
        except Exception as e:
            return JsonResponse({
                'success': False,
                'error': str(e),
                'message': '답변 생성 중 오류가 발생했습니다.'
            })
    
    return render(request, 'assist/qa.html')

def mock_qa_answer(question):
    """Q&A 답변 생성 (Mock)"""
    qa_responses = {
        "특허 출원 절차와 필요 서류는 무엇인가요?": """
        <h3>특허 출원 절차</h3>
        <p>특허 출원은 다음과 같은 단계로 진행됩니다:</p>
        <ol>
          <li><strong>발명의 완성</strong> - 실제로 구현 가능한 발명이어야 함</li>
          <li><strong>선행기술조사</strong> - 출원하려는 발명이 이미 공개되었는지 확인</li>
          <li><strong>특허명세서 작성</strong> - 발명의 내용을 상세히 기술</li>
          <li><strong>출원서류 제출</strong> - 특허청에 필요 서류와 함께 출원</li>
          <li><strong>심사청구</strong> - 출원일로부터 3년 이내에 심사 요청</li>
          <li><strong>특허심사</strong> - 특허청 심사관의 신규성, 진보성 등 검토</li>
          <li><strong>특허등록</strong> - 심사 통과 시 특허권 부여</li>
        </ol>
        """,
        
        "선출원주의는 어떤 적용원리는 무엇인가요?": """
        <h3>선출원주의 개념과 적용원리</h3>
        <p><strong>선출원주의</strong>는 동일한 발명에 대해 여러 출원이 있을 경우, 가장 먼저 출원한 자에게 특허권을 부여하는 제도입니다.</p>
        
        <h4>적용 원리</h4>
        <ul>
          <li><strong>출원일 우선</strong> - 동일한 발명에 대해 출원일이 빠른 것이 우선권을 가집니다</li>
          <li><strong>공개원칙</strong> - 출원일을 기준으로 기술 공개를 촉진합니다</li>
          <li><strong>신속성 장려</strong> - 발명 후 빠른 출원을 유도합니다</li>
        </ul>
        """,
    }
    
    return qa_responses.get(question, f"""
    <h3>답변</h3>
    <p>귀하의 질문 "{question}"에 대해 답변드리겠습니다.</p>
    <p>더 구체적인 질문을 해주시면 더 정확한 답변을 제공할 수 있습니다.</p>
    """)

def download_pdf(request, draft_id):
    data = json.loads(request.body)
    draft = get_object_or_404(Draft, draft_id=draft_id)
    
    # html_content = markdown.markdown(draft.create_draft, extensions=['fenced_code', 'codehilite'])
    html_content = data.get("html")
    template = get_template('assist/includes/draft_pdf_template.html')
    html = template.render({'draft': draft, 'create_draft_html': html_content})

    font_path = os.path.join(settings.BASE_DIR, 'assist', 'static', 'assist', 'fonts', 'malgun.ttf')

    css = CSS(string=f'''
        @font-face {{
              font-family: 'MalgunGothic';
              src: url('file:///{font_path.replace(os.sep,"/")}');
        }}
        body {{
            font-family: 'MalgunGothic';
            font-size: 12pt;
            line-height: 1.6;
        }}
        h1, h2, h3, h4 {{
            font-weigth: bold;
            margin-top: 20px;
            margin-bottom: 10px;
        }}
        p {{
            margin: 5px 0;
        }}
        code {{
            font-family: monospace;
            background-color: #f2f2f2;
            padding: 2px 4px;
            border-radius: 4px;
        }}
        pre {{
            background-color: #f5f5f5;
            padding: 10px;
            border-left: 4px solid #ccc;
            overflow-x: auto;
        }}
        ul, ol {{
            margin-left: 20px;
        }}
        table {{
            border-collapse: collapse;
            width: 100%;
            margin-top: 10px;
        }}
        th, td {{
            border: 1px solid #ccc;
            padding: 8px;
        }}
        blockquote {{
            border-left: 4px solid #ccc;
            padding-left: 10px;
            color: #666;
            margin: 10px 0;
        }}
    ''')

    pdf_file = HTML(string=html).write_pdf(stylesheets=[css])
    
    response = HttpResponse(pdf_file, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{draft.draft_title}.pdf"'
    return response

# from xhtml2pdf import pisa
# from xhtml2pdf.default import DEFAULT_FONT
# from reportlab.pdfbase import pdfmetrics
# from reportlab.pdfbase.ttfonts import TTFont
# from reportlab.lib.fonts import addMapping
# def download_pdf(request, draft_id):
#     draft = get_object_or_404(Draft, draft_id=draft_id)
#     template = get_template('assist\includes\draft_pdf_template.html')  # 경로 수정
#     html_content = markdown.markdown(draft.__dict__['create_draft'])

#     font_path = os.path.join(settings.BASE_DIR, 'assist', 'static', 'assist', 'fonts', 'malgun.ttf')
#     font_url = f'file://{font_path.replace(os.sep, "/")}'
#     html = template.render({'draft': draft, 'create_draft_html': html_content, 'font_path': font_url})

#     response = HttpResponse(content_type='application/pdf')
#     response['Content-Disposition'] = f'attachment; filename="{draft.__dict__['draft_title']}.pdf"'
#     pisa.CreatePDF(io.BytesIO(html.encode('utf-8')), dest=response, encoding='utf-8')
#     return response

def add_paragraph_with_breaks(doc, text):
    if text.strip():
        doc.add_paragraph(text.strip())

def download_docx(request, draft_id):
    data = json.loads(request.body)
    draft = get_object_or_404(Draft, draft_id=draft_id)
    html_content = data.get("html")
    print(html_content)

    soup = BeautifulSoup(html_content, "html.parser")
    doc = Document()
    last_heading = None

    for elem in soup.contents:
        # 제목 처리
        if elem.name in ['h1', 'h2', 'h3']:
            level = int(elem.name[1])
            heading_text = elem.get_text(strip=True)
            doc.add_heading(heading_text, level=level)
            last_heading = heading_text

        # 리스트 처리
        elif elem.name == 'ul':
            for li in elem.find_all('li', recursive=False):
                doc.add_paragraph(li.get_text(strip=True), style='ListBullet')

        # 강조 포함 텍스트 (<strong>청구항 1</strong>: 내용)
        elif elem.name == 'strong':
            text = elem.get_text(strip=True)
            if ':' in text:
                title, content = text.split(':', 1)
                doc.add_heading(title.strip(), level=3)
                add_paragraph_with_breaks(doc, content.strip())
            else:
                doc.add_heading(text.strip(), level=3)

        # 텍스트 노드 (본문으로 취급)
        elif isinstance(elem, NavigableString):
            text = elem.strip()
            if text:  # 중복 방지
                add_paragraph_with_breaks(doc, text)

    buffer = BytesIO()
    doc.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        buffer.read(),
        content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    response['Content-Disposition'] = f'attachment; filename="{draft.draft_title}.docx"'
    return response

# def download_docx(request, draft_id):
#     draft = get_object_or_404(Draft, draft_id=draft_id)
#     document = Document()
#     document.add_heading(draft.draft_name, level=1)
#     document.add_paragraph(draft.create_draft)

#     response = HttpResponse(
#         content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
#     )
#     response['Content-Disposition'] = f'attachment; filename="{draft.draft_name}.docx"'
#     document.save(response)
#     return response

def download_hwp(request, draft_id):
    """HWP 다운로드 (현재는 텍스트 파일로 대체)"""
    draft = get_object_or_404(Draft, draft_id=draft_id)
    
    # HWP 라이브러리가 없으므로 텍스트 파일로 대체
    content = f"{draft.__dict__["draft_name"]}\n\n{draft.__dict__["create_draft"]}"
    
    response = HttpResponse(content, content_type='text/plain; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{draft.__dict__["draft_title"]}.txt"'
    return response
    