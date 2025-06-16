// 템플릿 관리 전용 모듈
(function() {
  'use strict';

  const buttons = document.querySelectorAll(
    '.draft_self_modifybutton, .draft_request_aibutton, .draft_evalbutton, .draft_downloadbutton'
  );

  window.addEventListener('DOMContentLoaded', ()=> {
    buttons.forEach(button => {
      button.disabled = true;
    });
  });
  
  let inventorCount = 1;
  window.CURRENT_TEMPLATE_ID = null;
  
  // 전역 변수 초기화
  if (typeof window.currentDraftContent === 'undefined') {
    window.currentDraftContent = '';
  }
  
  // DOM 로드 후 실행
  document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    initializeTemplate();
  });
  
  // App 객체 초기화
  function initializeApp() {
    if (typeof window.App === 'undefined') {
      window.App = {
        data: { currentDraftContent: '' },
        history: null,
        template: null,
        utils: { showNotification: console.log }
      };
    }
    if (!window.App.data) {
      window.App.data = { currentDraftContent: '' };
    }
  }
  
  // 템플릿 초기화
  function initializeTemplate() {
    const templateForm = document.getElementById('templateForm');
    if (!templateForm) return;
    
    // 이벤트 리스너 등록
    templateForm.addEventListener('submit', handleFormSubmit);
    
    // 출원인 구분 이벤트
    document.querySelectorAll('input[name="applicant_type"]').forEach(radio => {
      radio.addEventListener('change', toggleApplicantType);
    });
    
    // 발명자 추가 버튼
    const addBtn = document.getElementById('addInventorBtn');
    if (addBtn) addBtn.addEventListener('click', addInventor);
    
    // 글자 수 카운터
    document.querySelectorAll('.text-input, .textarea-input').forEach(input => {
      input.addEventListener('input', () => updateCharCounter(input));
      updateCharCounter(input);
    });
    
    toggleApplicantType();
  }

  // ========== 새로운 템플릿 생성 (핵심 기능) ==========
  function createNewTemplate() {
    const currentContent = getCurrentContent();
    
    if (currentContent?.trim()) {
      if (!confirm('현재 작성 중인 특허 명세서가 있습니다. 히스토리에 저장하고 새로 시작하시겠습니까?')) {
        return;
      }
      saveToHistory();
    }
    
    resetAll();
    showMessage('🆕 새로운 템플릿 작성을 시작합니다.');
    focusFirst();
  }

  // 현재 내용 가져오기
  function getCurrentContent() {
    return window.currentDraftContent || App.data?.currentDraftContent || '';
  }

  // 히스토리에 저장
  function saveToHistory() {
    const title = document.getElementById('tech_name')?.value?.trim() || '저장된 특허 명세서';
    
    if (App.data) App.data.currentDraftContent = getCurrentContent();
    
    if (App.history?.addToHistory) {
      App.history.addToHistory(title);
      showMessage('현재 작업이 히스토리에 저장되었습니다.');
    }
  }

  // 전체 초기화
  function resetAll() {
    // 상태 초기화
    window.currentDraftContent = '';
    if (App.data) {
      App.data.currentDraftContent = '';
      App.data.currentDraftId = null;
    }
    
    // UI 초기화
    resetForm();
    resetDraft();
    resetInventors();
  }

  // 폼 초기화
  function resetForm() {
    const form = document.getElementById('templateForm');
    if (form) {
      form.reset();
      // 글자 수 카운터 초기화
      form.querySelectorAll('.current-count').forEach(el => el.textContent = '0');
      form.querySelectorAll('.limit-reached').forEach(el => el.classList.remove('limit-reached'));
      // 법인 기본 선택
      const corp = document.querySelector('input[name="applicant_type"][value="corporation"]');
      if (corp) {
        corp.checked = true;
        toggleApplicantType();
      }
    }
  }

  // Draft 초기화
  function resetDraft() {
    const noMsg = document.getElementById('noDraftMessage');
    const draft = document.getElementById('draftContent');
    
    if (noMsg) noMsg.style.display = 'block';
    if (draft) {
      draft.style.display = 'none';
      draft.querySelectorAll('.markdown-content, #draft_text').forEach(el => el.remove());
    }
  }

  // 발명자 초기화
  function resetInventors() {
    const container = document.getElementById('inventors-container');
    if (container) {
      container.innerHTML = createInventorHTML(1);
      inventorCount = 1;
    }
  }

  // 첫 입력 필드로 포커스
  function focusFirst() {
    setTimeout(() => {
      const first = document.getElementById('tech_name');
      if (first) {
        first.focus();
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }

  // 메시지 표시
  function showMessage(msg) {
    if (App.utils?.showNotification) {
      App.utils.showNotification(msg);
    } else {
      console.log(msg);
    }
  }

  // ========== 기존 기능들 (최소화) ==========
  
  // 폼 제출
  function handleFormSubmit(event) {
    event.preventDefault();
    const formData = collectFormData();
    if (validateForm(formData)) {
      generateDraft(formData);
    }
  }

  // 폼 데이터 수집
  function collectFormData() {
    const type = document.querySelector('input[name="applicant_type"]:checked')?.value || 'corporation';
    
    const data = {
      tech_name: getVal('tech_name'),
      tech_description: getVal('tech_description'),
      problem_solved: getVal('problem_solved'),
      tech_differentiation: getVal('tech_differentiation'),
      application_field: getVal('application_field'),
      components_functions: getVal('components_functions'),
      implementation_example: getVal('implementation_example'),
      drawing_description: getVal('drawing_description'),
      applicant_type: type,
      applicant_info: getApplicantInfo(type),
      inventors: getInventors()
    };
    
    return data;
  }

  // db 저장 로직 추가
  function saveTemplates(formData) {
    fetch('/assist/insert_patent_report/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': App.draft.getCSRFToken(),
        },
        body: JSON.stringify(formData)
    })
    .then(response => {
      if(!response.ok) {
        throw new Error('서버 응답 오류');
      }
      return response.json();
    })
    .then(data => {
      window.CURRENT_TEMPLATE_ID = data.template_id;
      App.data.currentDraftId = data.draft_id;
      App.utils.showNotification(`특허명세서로 변환 되었습니다.`);

      const buttons = document.querySelectorAll(
        '.draft_self_modifybutton, .draft_request_aibutton, .draft_evalbutton, .draft_downloadbutton'
      );

      buttons.forEach(button => {
        button.classList.add('dynamic-hover');
        button.disabled = false;
      });
    })
    .catch(error => {
      console.error('저장 중 오류 발생:', error);
      App.utils.showNotification('저장 중 오류가 발생했습니다.');
    })
  }

  function getVal(id) {
    return document.getElementById(id)?.value || '';
  }

  function getApplicantInfo(type) {
    if (type === 'corporation') {
      return {
        type: 'corporation',
        corporation_name: getVal('corporation_name'),
        representative_name: getVal('representative_name'),
        address: getVal('corporation_address'),
        nationality: getVal('corporation_nationality')
      };
    }
    return {
      type: 'individual',
      name: getVal('individual_name'),
      address: getVal('individual_address'),
      nationality: getVal('individual_nationality')
    };
  }

  function getInventors() {
    const inventors = [];
    document.querySelectorAll('.inventor-item').forEach((item, i) => {
      const name = getVal(`inventor_name_${i + 1}`);
      if (name.trim()) {
        inventors.push({
          name: name.trim(),
          address: getVal(`inventor_address_${i + 1}`).trim(),
          nationality: getVal(`inventor_nationality_${i + 1}`)
        });
      }
    });
    return inventors;
  }

  // 간단한 검증
  function validateForm(data) {
    const required = ['tech_description', 'problem_solved', 'tech_differentiation', 'components_functions', 'implementation_example'];
    
    for (const field of required) {
      if (!data[field]?.trim()) {
        alert(`${field}을(를) 입력해주세요.`);
        return false;
      }
    }
    
    if (!data.inventors.length) {
      alert('최소 1명의 발명자 정보를 입력해주세요.');
      return false;
    }
    
    return true;
  }

  // Draft 생성 (다른 모듈 활용)
  function generateDraft(formData) {
    const content = createContent(formData);

    formData['sc_flag'] = 'create';
    formData['version'] = 'v0';
    formData['create_draft'] = content;
    
    window.currentDraftContent = content;
    if (App.data) App.data.currentDraftContent = content;
    
    // App.draft.display 우선 사용
    if (App.draft?.display) {
      App.draft.display(content);
    } else {
      showSimpleDraft(content);
    }
    
    saveTemplates(formData);

    // 히스토리에 추가
    if (App.history?.addToHistory) {
      App.history.addToHistory(formData.tech_name);
    }
    
    showMessage('특허 명세서 초안이 생성되었습니다.');
  }

  // 간단한 Draft 표시 (fallback)
  function showSimpleDraft(content) {
    const noMsg = document.getElementById('noDraftMessage');
    const draft = document.getElementById('draftContent');
    
    if (noMsg) noMsg.style.display = 'none';
    if (draft) {
      draft.style.display = 'block';
      const div = document.createElement('div');
      div.className = 'markdown-content';
      div.innerHTML = content.replace(/\n/g, '<br>');
      const existing = draft.querySelector('.markdown-content');
      if (existing) existing.remove();
      const buttons = draft.querySelector('.button-row');
      draft.insertBefore(div, buttons);
    }
  }

  // 간단한 콘텐츠 생성
  function createContent(data) {
    const title = data.tech_name.trim() || '혁신적인 기술 시스템';
    return `# 발명의 명칭
${title}

## 기술분야
${data.tech_description}

## 배경기술
${data.problem_solved}

## 해결하려는 과제
${data.problem_solved}

## 과제의 해결 수단
${data.tech_differentiation}

${data.application_field ? `\n## 활용 분야\n${data.application_field}\n` : ''}

## 발명의 효과
본 발명을 통해 다음과 같은 효과를 얻을 수 있습니다:
- 성능 향상: 기존 기술 대비 현저히 향상된 성능 및 효율성
- 경제성 개선: 비용 효율적인 솔루션 제공
- 사용자 편의성: 직관적이고 사용하기 쉬운 인터페이스

## 발명을 실시하기 위한 구체적인 내용

### 주요 구성 요소
${data.components_functions}

### 구현 방식
${data.implementation_example}

${data.drawing_description ? `\n### 도면의 간단한 설명\n${data.drawing_description}\n` : ''}

## 특허청구범위
**청구항 1**: ${title}에 있어서, 상기 기술의 핵심 구성을 포함하여 혁신적인 기능을 제공하는 것을 특징으로 하는 시스템.

---
### 출원인
${data.applicant_info.type === 'corporation' ? 
  `**법인명**: ${data.applicant_info.corporation_name}\n**대표자**: ${data.applicant_info.representative_name}` :
  `**성명**: ${data.applicant_info.name}`}

### 발명자
${data.inventors.map((inv, i) => `**발명자 ${i+1}**: ${inv.name} **주소**: ${inv.address}`).join('\n')}`;
  }

  // 출원인 구분 토글
  function toggleApplicantType() {
    const type = document.querySelector('input[name="applicant_type"]:checked')?.value;
    const corp = document.getElementById('corporationInfo');
    const ind = document.getElementById('individualInfo');
    
    if (corp && ind) {
      if (type === 'corporation') {
        corp.style.display = 'block';
        ind.style.display = 'none';
      } else {
        corp.style.display = 'none';
        ind.style.display = 'block';
      }
    }
  }

  // 발명자 추가
  function addInventor() {
    const container = document.getElementById('inventors-container');
    const count = document.querySelectorAll('.inventor-item').length;
    
    if (count >= 10) {
      showMessage('최대 10명까지만 발명자를 추가할 수 있습니다.');
      return;
    }
    
    inventorCount = count + 1;
    container.insertAdjacentHTML('beforeend', createInventorHTML(inventorCount));
    showMessage(`발명자 ${inventorCount}이 추가되었습니다.`);
  }

  // 발명자 HTML 생성
  function createInventorHTML(num) {
    return `
      <div class="inventor-item" data-inventor="${num}">
        <div class="inventor-header">
          <h4>발명자 ${num}</h4>
          <button type="button" class="remove-inventor-btn" onclick="removeInventor(${num})" ${num === 1 ? 'style="display:none"' : ''}>
            <span class="remove-icon">×</span>
          </button>
        </div>
        <div class="inventor-info">
          <div class="info-row">
            <label>성명</label>
            <input type="text" name="inventor_name_${num}" id="inventor_name_${num}" class="text-input" placeholder="홍길동" required maxlength="50">
          </div>
          <div class="info-row">
            <label>주소</label>
            <input type="text" name="inventor_address_${num}" id="inventor_address_${num}" class="text-input" placeholder="서울특별시 강남구..." required maxlength="200">
          </div>
          <div class="info-row">
            <label>국적</label>
            <select name="inventor_nationality_${num}" id="inventor_nationality_${num}" class="select-input" required>
              <option value="대한민국">대한민국</option>
              <option value="미국">미국</option>
              <option value="일본">일본</option>
              <option value="중국">중국</option>
              <option value="독일">독일</option>
              <option value="기타">기타</option>
            </select>
          </div>
        </div>
      </div>
    `;
  }

  // 발명자 제거
  window.removeInventor = function(num) {
    const item = document.querySelector(`.inventor-item[data-inventor="${num}"]`);
    if (item) {
      item.remove();
      reorderInventors();
      showMessage('발명자가 제거되었습니다.');
    }
  };

  // 발명자 번호 재정렬
  function reorderInventors() {
    document.querySelectorAll('.inventor-item').forEach((item, i) => {
      const newNum = i + 1;
      item.setAttribute('data-inventor', newNum);
      item.querySelector('h4').textContent = `발명자 ${newNum}`;
      
      const btn = item.querySelector('.remove-inventor-btn');
      btn.setAttribute('onclick', `removeInventor(${newNum})`);
      btn.style.display = newNum === 1 ? 'none' : 'inline-block';
      
      ['name', 'address', 'nationality'].forEach(field => {
        const input = item.querySelector(`[name^="inventor_${field}_"]`);
        if (input) {
          input.name = `inventor_${field}_${newNum}`;
          input.id = `inventor_${field}_${newNum}`;
        }
      });
    });
    inventorCount = document.querySelectorAll('.inventor-item').length;
  }

  // 글자 수 카운터
  function updateCharCounter(input) {
    const counter = input.nextElementSibling;
    if (counter?.classList.contains('char-counter')) {
      const count = input.value.length;
      const max = input.getAttribute('maxlength');
      const display = counter.querySelector('.current-count');
      if (display) display.textContent = count;
      counter.classList.toggle('limit-reached', count >= max * 0.9);
    }
  }

  // App.template 노출
  if (typeof window.App !== 'undefined') {
    if (!window.App.template) window.App.template = {};
    window.App.template.createNew = createNewTemplate;
  }
  
})();