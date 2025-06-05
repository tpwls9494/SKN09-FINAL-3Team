// 템플릿 관련 기능
App.template = {
  // 새 템플릿 생성
  createNew() {
    this.resetForm();
    App.utils.showNotification('새 템플릿을 작성할 수 있습니다.');
  },
  
  // Django 백엔드로 데이터 전송
  async submitToBackend(formData) {
    try {
      App.utils.showNotification('🤖 AI가 특허 초안을 생성하고 있습니다...');
      
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': this.getCSRFToken()
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // 생성된 초안을 화면에 표시
        if (App.draft) {
          App.draft.display(result.draft_content);
        }
        App.data.currentDraftContent = result.draft_content;
        App.data.currentDraftId = result.draft_id;
        
        // 히스토리에 추가
        if (App.history) {
          App.history.addToHistory(formData.tech_name);
        }
        
        App.utils.showNotification('✅ ' + result.message);
      } else {
        App.utils.showNotification('❌ ' + result.message);
        console.error('Error:', result.error);
      }
      
    } catch (error) {
      console.error('Network error:', error);
      App.utils.showNotification('❌ 네트워크 오류가 발생했습니다.');
    }
  },
  
  // CSRF 토큰 가져오기
  getCSRFToken() {
    const csrfCookie = document.cookie.split(';')
      .find(row => row.trim().startsWith('csrftoken='));
    
    if (csrfCookie) {
      return csrfCookie.split('=')[1];
    }
    
    // meta 태그에서 CSRF 토큰 찾기
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
      return csrfMeta.getAttribute('content');
    }
    
    // hidden input에서 CSRF 토큰 찾기
    const csrfInput = document.querySelector('input[name="csrfmiddlewaretoken"]');
    if (csrfInput) {
      return csrfInput.value;
    }
    
    return '';
  },
  
  // 폼 제출 처리
  handleSubmit(event) {
    event.preventDefault();
    
    const formData = this.getFormData();
    
    // 필수 항목 검증
    const requiredFields = [
      { field: 'tech_description', name: '기술 설명' },
      { field: 'problem_solved', name: '해결 문제' },
      { field: 'tech_differentiation', name: '기술 차별성' },
      { field: 'components_functions', name: '구성 요소 및 기능' },
      { field: 'implementation_example', name: '구현 방식 예' },
      { field: 'applicant_name', name: '출원인 이름' },
      { field: 'applicant_nationality', name: '출원인 국적' },
      { field: 'applicant_address', name: '출원인 주소' },
      { field: 'inventor_name', name: '발명자 이름' },
      { field: 'inventor_nationality', name: '발명자 국적' },
      { field: 'inventor_address', name: '발명자 주소' }
    ];
    
    for (let required of requiredFields) {
      if (!formData[required.field] || !formData[required.field].trim()) {
        alert(`${required.name}을(를) 입력해주세요.`);
        return;
      }
    }
    
    // Django 백엔드로 AJAX 요청
    this.submitToBackend(formData);
  },
  
  // 폼 데이터 수집 (Django 모델에 맞게 수정)
  getFormData() {
    return {
      tech_name: document.querySelector('input[name="tech_name"]')?.value || '',
      tech_description: document.querySelector('textarea[name="tech_description"]')?.value || '',
      problem_solved: document.querySelector('textarea[name="problem_solved"]')?.value || '',
      tech_differentiation: document.querySelector('textarea[name="tech_differentiation"]')?.value || '',
      application_field: document.querySelector('textarea[name="application_field"]')?.value || '',
      components_functions: document.querySelector('textarea[name="components_functions"]')?.value || '',
      implementation_example: document.querySelector('textarea[name="implementation_example"]')?.value || '',
      drawing_description: document.querySelector('textarea[name="drawing_description"]')?.value || '',
      applicant_name: document.querySelector('input[name="applicant_name"]')?.value || '',
      applicant_nationality: document.querySelector('select[name="applicant_nationality"]')?.value || '',
      applicant_address: document.querySelector('input[name="applicant_address"]')?.value || '',
      inventor_name: document.querySelector('input[name="inventor_name"]')?.value || '',
      inventor_nationality: document.querySelector('select[name="inventor_nationality"]')?.value || '',
      inventor_address: document.querySelector('input[name="inventor_address"]')?.value || ''
    };
  },
  
  // 마크다운 형식으로 특허 초안 생성
  generatePatentDraft(formData) {
    const techName = formData.techName.trim() || '혁신적인 기술 시스템';
    const englishTitle = App.utils.generateEnglishTitle(techName);
    
    const draftContent = `# 발명의 명칭
${techName}
*${englishTitle}*

## 기술분야
${formData.techDescription}

## 배경기술
${formData.problemSolved}

기존 기술들은 다양한 한계점을 가지고 있었습니다. 특히 효율성, 정확성, 경제성 측면에서 개선이 필요한 상황이었으며, 이러한 문제점들을 해결하기 위한 혁신적인 접근 방법이 요구되었습니다.

## 해결하려는 과제
${formData.problemSolved}

본 발명은 **${techName}**을 통해 기존 기술의 한계를 극복하고, 더 나은 솔루션을 제공하는 것을 주요 목표로 합니다.

## 과제의 해결 수단
${formData.techDifferentiation}

본 발명은 다음과 같은 혁신적인 방법론을 통해 기존 문제를 해결합니다:
- 체계적이고 효율적인 접근 방식
- 사용자 중심의 설계 철학
- 확장 가능한 아키텍처 구현

${formData.applicationField ? `\n## 활용 분야\n${formData.applicationField}\n` : ''}

## 발명의 효과
본 발명을 통해 다음과 같은 효과를 얻을 수 있습니다:

- **성능 향상**: 기존 기술 대비 현저히 향상된 성능 및 효율성
- **경제성 개선**: 비용 효율적인 솔루션 제공
- **사용자 편의성**: 직관적이고 사용하기 쉬운 인터페이스
- **확장성**: 다양한 분야에서의 실용적 활용 가능성
- **안정성**: 기술적 안정성 및 신뢰성 확보

## 발명을 실시하기 위한 구체적인 내용

### 주요 구성 요소
${formData.componentsFunctions}

### 구현 방식
${formData.implementationExample}

본 발명의 주요 구성 요소들이 유기적으로 연동하여 혁신적인 솔루션을 제공합니다.

${formData.drawingDescription ? `\n### 도면의 간단한 설명\n${formData.drawingDescription}\n` : ''}

## 특허청구범위

**청구항 1**: ${techName}에 있어서,
상기 기술의 핵심 구성을 포함하여 혁신적인 기능을 제공하는 것을 특징으로 하는 시스템.

**청구항 2**: 제1항에 있어서,
${formData.componentsFunctions.split('.')[0] || '효율적인 데이터 처리 및 분석 기능'}을 추가로 포함하는 것을 특징으로 하는 시스템.

**청구항 3**: 제1항 또는 제2항에 있어서,
사용자 친화적인 인터페이스를 통해 직관적인 조작이 가능한 것을 특징으로 하는 시스템.

**청구항 4**: 제1항 내지 제3항 중 어느 한 항에 있어서,
${formData.techDifferentiation.split('.')[0] || '보안 기능을 강화하여 안전한 시스템 운영을 보장'}하는 것을 특징으로 하는 시스템.

---

### 출원인 정보
- **이름**: ${formData.applicantName}
- **국적**: ${formData.applicantNationality}
- **주소**: ${formData.applicantAddress}

### 발명자 정보
- **이름**: ${formData.inventorName}
- **국적**: ${formData.inventorNationality}
- **주소**: ${formData.inventorAddress}

---
*※ 본 특허청구범위는 특허법 제42조 제2~5항 및 시행규칙 제21조에 따라 작성되었습니다.*
*※ 모든 기술적 내용은 모범명세서 가이드에 따라 체계적으로 기술되어 있습니다.*`;

    if (App.draft) {
      App.draft.display(draftContent);
    }
    App.data.currentDraftContent = draftContent;
  },
  
  // 폼 초기화
  resetForm() {
    const form = document.getElementById('templateForm');
    if (form) {
      form.reset();
      
      // 글자 수 카운터 초기화
      const counters = form.querySelectorAll('.char-counter .current-count');
      counters.forEach(counter => {
        counter.textContent = '0';
      });
      
      // 제한 도달 클래스 제거
      const charCounters = form.querySelectorAll('.char-counter');
      charCounters.forEach(counter => {
        counter.classList.remove('limit-reached');
      });
    }
    
    // 초안 패널 초기화
    const noDraftMessage = document.getElementById('noDraftMessage');
    const draftContent = document.getElementById('draftContent');
    
    if (noDraftMessage) noDraftMessage.style.display = 'block';
    if (draftContent) draftContent.style.display = 'none';
    
    App.data.currentDraftContent = '';
    
    App.utils.showNotification('🔄 폼이 초기화되었습니다.');
  }
};

// 페이지 로드 시 템플릿 폼 초기화
document.addEventListener('DOMContentLoaded', function() {
  const templateForm = document.getElementById('templateForm');
  if (templateForm) {
    templateForm.addEventListener('submit', function(e) {
      App.template.handleSubmit(e);
    });
  }
});