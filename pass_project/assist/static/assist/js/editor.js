// ========== 전역 상수 및 설정 ==========
const CONFIG = {
  MAX_INVENTORS: 10,
  NOTIFICATION_DURATION: 3000,
  AI_RESPONSE_DELAY: 1500,
  EVALUATION_DELAY: 2000
};

const SELECTORS = {
  templateForm: '#templateForm',
  addInventorBtn: '#addInventorBtn',
  inventorsContainer: '.inventors-container',
  inventorItem: '.inventor-item',
  draftContent: '#draftContent',
  noDraftMessage: '#noDraftMessage',
  markdownContent: '.markdown-content'
};

// ========== 전역 상태 관리 ==========
const AppState = {
  currentDraftContent: '',
  isEvaluationMode: false,
  historyData: {
    teamHistory: [
      {
        id: 1,
        name: 'dbwlsdl01 님',
        items: [
          { id: 11, title: '항공편 자동 예약 시스템', content: '...' },
          { id: 12, title: '특허 명세서 초안 33333', content: '...' },
          { id: 13, title: '특허허허 명세서 초안', content: '...' }
        ],
        expanded: true
      },
      { id: 2, name: 'rodnfl02 님', items: [], expanded: false },
      { id: 3, name: 'tpwlsdl98 님', items: [], expanded: false }
    ]
  }
};

// ========== 유틸리티 함수들 ==========
const Utils = {
  // DOM 요소 선택
  $(selector) {
    return document.querySelector(selector);
  },
  
  $$(selector) {
    return document.querySelectorAll(selector);
  },

  // 알림 표시
  showNotification(message) {
    const existing = this.$('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, CONFIG.NOTIFICATION_DURATION);
  },

  // 영어 제목 생성
  generateEnglishTitle(koreanTitle) {
    if (!koreanTitle?.trim()) return 'Innovative Technology System and Method';
    
    const keywordMap = {
      '시스템': 'System', '방법': 'Method', '장치': 'Apparatus',
      '서비스': 'Service', '플랫폼': 'Platform', '솔루션': 'Solution',
      '기술': 'Technology', '인공지능': 'Artificial Intelligence',
      'AI': 'AI', '빅데이터': 'Big Data', '블록체인': 'Blockchain',
      '클라우드': 'Cloud', '모바일': 'Mobile', '스마트': 'Smart',
      '자동': 'Automatic', '통합': 'Integrated', '관리': 'Management',
      '분석': 'Analysis', '검색': 'Search', '추천': 'Recommendation',
      '보안': 'Security', '네트워크': 'Network'
    };
    
    let result = koreanTitle;
    Object.entries(keywordMap).forEach(([korean, english]) => {
      result = result.replace(new RegExp(korean, 'g'), english);
    });
    
    return /[가-힣]/.test(result) ? 'Innovative Technology System and Method' : result;
  },

  // 타임스탬프 생성
  getTimestamp() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }
};

// ========== 폼 관리 ==========
const FormManager = {
  // 폼 데이터 수집
  getFormData() {
    const applicantType = Utils.$('input[name="applicant_type"]:checked')?.value || 'corporation';
    
    return {
      techName: Utils.$('input[name="tech_name"]')?.value || '',
      techDescription: Utils.$('textarea[name="tech_description"]')?.value || '',
      problemSolved: Utils.$('textarea[name="problem_solved"]')?.value || '',
      techDifferentiation: Utils.$('textarea[name="tech_differentiation"]')?.value || '',
      applicationField: Utils.$('textarea[name="application_field"]')?.value || '',
      componentsFunctions: Utils.$('textarea[name="components_functions"]')?.value || '',
      implementationExample: Utils.$('textarea[name="implementation_example"]')?.value || '',
      drawingDescription: Utils.$('textarea[name="drawing_description"]')?.value || '',
      applicantType,
      applicantInfo: this.getApplicantInfo(applicantType),
      inventors: this.getInventorsInfo()
    };
  },

  getApplicantInfo(type) {
    if (type === 'corporation') {
      return {
        type: 'corporation',
        corporation_name: Utils.$('input[name="corporation_name"]')?.value || '',
        representative_name: Utils.$('input[name="representative_name"]')?.value || '',
        address: Utils.$('input[name="corporation_address"]')?.value || '',
        nationality: Utils.$('select[name="corporation_nationality"]')?.value || ''
      };
    }
    return {
      type: 'individual',
      name: Utils.$('input[name="individual_name"]')?.value || '',
      address: Utils.$('input[name="individual_address"]')?.value || '',
      nationality: Utils.$('select[name="individual_nationality"]')?.value || ''
    };
  },

  getInventorsInfo() {
    const inventors = [];
    Utils.$$(SELECTORS.inventorItem).forEach((item, index) => {
      const num = index + 1;
      const name = Utils.$(`input[name="inventor_name_${num}"]`)?.value?.trim();
      if (name) {
        inventors.push({
          name,
          address: Utils.$(`input[name="inventor_address_${num}"]`)?.value?.trim() || '',
          nationality: Utils.$(`select[name="inventor_nationality_${num}"]`)?.value || ''
        });
      }
    });
    return inventors;
  },

  // 폼 검증
  validateForm(formData) {
    const requiredFields = [
      { field: 'techDescription', name: '기술 설명' },
      { field: 'problemSolved', name: '해결 문제' },
      { field: 'techDifferentiation', name: '기술 차별성' },
      { field: 'componentsFunctions', name: '구성 요소 및 기능' },
      { field: 'implementationExample', name: '구현 방식 예' }
    ];

    // 기본 필드 검증
    for (const { field, name } of requiredFields) {
      if (!formData[field]?.trim()) {
        alert(`${name}을(를) 입력해주세요.`);
        return false;
      }
    }

    // 출원인 정보 검증
    if (!this.validateApplicant(formData)) return false;

    // 발명자 정보 검증
    if (!this.validateInventors(formData)) return false;

    return true;
  },

  validateApplicant(formData) {
    const { applicantType, applicantInfo } = formData;
    
    if (applicantType === 'corporation') {
      if (!applicantInfo.corporation_name?.trim()) {
        alert('법인명을 입력해주세요.');
        return false;
      }
      if (!applicantInfo.representative_name?.trim()) {
        alert('대표자명을 입력해주세요.');
        return false;
      }
      if (!applicantInfo.address?.trim()) {
        alert('본점소재지를 입력해주세요.');
        return false;
      }
    } else {
      if (!applicantInfo.name?.trim()) {
        alert('개인 성명을 입력해주세요.');
        return false;
      }
      if (!applicantInfo.address?.trim()) {
        alert('개인 주소를 입력해주세요.');
        return false;
      }
    }
    return true;
  },

  validateInventors(formData) {
    if (!formData.inventors?.length) {
      alert('최소 1명의 발명자 정보를 입력해주세요.');
      return false;
    }

    for (let i = 0; i < formData.inventors.length; i++) {
      const inventor = formData.inventors[i];
      if (!inventor.name?.trim()) {
        alert(`발명자 ${i + 1}의 성명을 입력해주세요.`);
        return false;
      }
      if (!inventor.address?.trim()) {
        alert(`발명자 ${i + 1}의 주소를 입력해주세요.`);
        return false;
      }
    }
    return true;
  },

  // 폼 제출 처리
  handleSubmit() {
    const formData = this.getFormData();
    if (!this.validateForm(formData)) return;

    PatentGenerator.generateDraft(formData);
    HistoryManager.addToHistory(formData.techName);
  },

  // 폼 초기화
  reset() {
    const form = Utils.$(SELECTORS.templateForm);
    if (form) {
      form.reset();
      
      // 글자 수 카운터 초기화
      Utils.$$('.char-counter .current-count').forEach(counter => {
        counter.textContent = '0';
      });
      Utils.$$('.char-counter').forEach(counter => {
        counter.classList.remove('limit-reached');
      });
    }

    // 초안 패널 초기화
    const noDraft = Utils.$(SELECTORS.noDraftMessage);
    const draftContent = Utils.$(SELECTORS.draftContent);
    
    if (noDraft) noDraft.style.display = 'block';
    if (draftContent) draftContent.style.display = 'none';
    
    AppState.currentDraftContent = '';
    Utils.showNotification('🔄 폼이 초기화되었습니다.');
  }
};

// ========== 발명자 관리 ==========
const InventorManager = {
  add() {
    const container = Utils.$(SELECTORS.inventorsContainer);
    const currentCount = Utils.$$(SELECTORS.inventorItem).length;
    
    if (currentCount >= CONFIG.MAX_INVENTORS) {
      Utils.showNotification(`최대 ${CONFIG.MAX_INVENTORS}명까지만 발명자를 추가할 수 있습니다.`);
      return;
    }
    
    const newNum = currentCount + 1;
    container.insertAdjacentHTML('beforeend', this.createInventorHTML(newNum));
    //Utils.showNotification(`발명자 ${newNum}이 추가되었습니다.`);
  },

  remove(inventorNum) {
    const item = Utils.$(`.inventor-item[data-inventor="${inventorNum}"]`);
    if (item) {
      item.remove();
      this.reorder();
      // Utils.showNotification('발명자가 제거되었습니다.');
    }
  },

  reorder() {
    Utils.$$(SELECTORS.inventorItem).forEach((item, index) => {
      const newNum = index + 1;
      item.setAttribute('data-inventor', newNum);
      
      // 헤더 업데이트
      const header = item.querySelector('.inventor-header h4');
      if (header) header.textContent = `발명자 ${newNum}`;
      
      // 제거 버튼 업데이트
      const removeBtn = item.querySelector('.remove-inventor-btn');
      if (removeBtn) {
        removeBtn.setAttribute('onclick', `InventorManager.remove(${newNum})`);
        removeBtn.style.display = newNum === 1 ? 'none' : 'inline-block';
      }
      
      // Input name 속성 업데이트
      ['name', 'address', 'nationality'].forEach(field => {
        const input = item.querySelector(`[name^="inventor_${field}_"]`);
        if (input) input.name = `inventor_${field}_${newNum}`;
      });
    });
  },

  createInventorHTML(num) {
    return `
      <div class="inventor-item" data-inventor="${num}">
        <div class="inventor-header">
          <h4>발명자 ${num}</h4>
          <button type="button" class="remove-inventor-btn" onclick="InventorManager.remove(${num})">
            <span class="remove-icon">×</span>
          </button>
        </div>
        <div class="inventor-info">
          <div class="info-row">
            <label>성명</label>
            <input type="text" name="inventor_name_${num}" class="text-input" placeholder="홍길동" required maxlength="50">
          </div>
          <div class="info-row">
            <label>주소</label>
            <input type="text" name="inventor_address_${num}" class="text-input" placeholder="서울특별시 강남구 테헤란로 123, 101동 101호" required maxlength="200">
          </div>
          <div class="info-row">
            <label>국적</label>
            <div class="select-wrapper">
              <select name="inventor_nationality_${num}" class="select-input" required>
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
      </div>
    `;
  }
};

// ========== 특허 문서 생성 ==========
const PatentGenerator = {
  generateDraft(formData) {
    const content = this.createPatentContent(formData);
    DraftRenderer.display(content);
    AppState.currentDraftContent = content;
  },

  createPatentContent(formData) {
    const techName = formData.techName.trim() || '혁신적인 기술 시스템';
    const englishTitle = Utils.generateEnglishTitle(techName);
    
    return `# 발명의 명칭
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

${this.formatApplicantInfo(formData.applicantInfo)}

${this.formatInventorsInfo(formData.inventors)}

---
*※ 본 특허청구범위는 특허법 제42조 제2~5항 및 시행규칙 제21조에 따라 작성되었습니다.*
*※ 모든 기술적 내용은 모범명세서 가이드에 따라 체계적으로 기술되어 있습니다.*`;
  },

  formatApplicantInfo(applicantInfo) {
    if (applicantInfo.type === 'corporation') {
      return `### 출원인
**법인명**: ${applicantInfo.corporation_name}
**대표자**: ${applicantInfo.representative_name}
**본점소재지**: ${applicantInfo.address}
**국적**: ${applicantInfo.nationality}`;
    }
    return `### 출원인
**성명**: ${applicantInfo.name}
**주소**: ${applicantInfo.address}
**국적**: ${applicantInfo.nationality}`;
  },

  formatInventorsInfo(inventors) {
    let section = '### 발명자\n';
    inventors.forEach((inventor, index) => {
      section += `**발명자 ${index + 1}**\n`;
      section += `**성명**: ${inventor.name}\n`;
      section += `**주소**: ${inventor.address}\n`;
      section += `**국적**: ${inventor.nationality}\n\n`;
    });
    return section;
  }
};

// ========== 문서 렌더링 ==========
const DraftRenderer = {
  display(content) {
    const noDraft = Utils.$(SELECTORS.noDraftMessage);
    const draftContent = Utils.$(SELECTORS.draftContent);
    
    if (noDraft) noDraft.style.display = 'none';
    if (draftContent) {
      draftContent.style.display = 'block';
      
      // 기존 컨텐츠 제거
      const existing = draftContent.querySelector('#draft_text, .markdown-content');
      if (existing) existing.remove();
      
      // 마크다운 렌더링
      const markdownDiv = document.createElement('div');
      markdownDiv.className = 'markdown-content';
      markdownDiv.innerHTML = this.convertMarkdownToHTML(content);
      
      const buttonRow = draftContent.querySelector('.button-row');
      draftContent.insertBefore(markdownDiv, buttonRow);
      
      // 버튼 상태 초기화
      this.resetButtons();
    }
    
    Utils.showNotification('특허 명세서 초안이 생성되었습니다.');
  },

  convertMarkdownToHTML(markdown) {
    let html = markdown
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\*\*청구항 (\d+)\*\*:/g, '<h4 style="color: #1a237e; margin-top: 20px;">청구항 $1:</h4>');

    // 리스트 처리
    const lines = html.split('\n');
    let inList = false;
    let listItems = [];
    let result = [];
    
    lines.forEach(line => {
      if (line.match(/^- /)) {
        if (!inList) inList = true;
        listItems.push(line.replace(/^- /, ''));
      } else {
        if (inList) {
          result.push('<ul>');
          listItems.forEach(item => result.push(`<li>${item}</li>`));
          result.push('</ul>');
          listItems = [];
          inList = false;
        }
        result.push(line);
      }
    });
    
    if (inList) {
      result.push('<ul>');
      listItems.forEach(item => result.push(`<li>${item}</li>`));
      result.push('</ul>');
    }
    
    html = result.join('\n');
    
    // 단락 처리
    const paragraphs = html.split('\n\n');
    html = paragraphs.map(p => {
      const trimmed = p.trim();
      if (trimmed && !trimmed.includes('<h') && !trimmed.includes('<ul') && 
          !trimmed.includes('<hr') && !trimmed.includes('<li>') &&
          !trimmed.includes('</ul>') && !trimmed.includes('</h')) {
        return `<p>${trimmed}</p>`;
      }
      return trimmed;
    }).join('\n\n');
    
    return html.replace(/\n(?!<|$)/g, '<br>\n');
  },

  resetButtons() {
    const normalButtons = Utils.$('#normalButtons');
    const editButtons = Utils.$('#editButtons');
    if (normalButtons) normalButtons.style.display = 'flex';
    if (editButtons) editButtons.style.display = 'none';
  }
};

// ========== 히스토리 관리 ==========
const HistoryManager = {
  addToHistory(techName) {
    //const newId = Math.max(...AppState.historyData.myHistory.map(h => h.id), 0) + 1;
    //const timestamp = Utils.getTimestamp();
    
    //const newItem = {
    //  id: newId,
    //  title: techName || '새로운 특허 명세서',
    //  items: [{
    //    id: newId * 10 + 1,
    //    title: `생성된 특허 명세서 초안 - ${timestamp}`,
    //    content: AppState.currentDraftContent
    //  }],
    // expanded: true
    //};
    
    //AppState.historyData.myHistory.unshift(newItem);
    //this.renderMyHistory();
    //Utils.showNotification('히스토리에 저장되었습니다.');
  },

  // renderMyHistory() {
  //   const container = Utils.$('#myHistoryItems');
  //   if (!container) return;
    
  //   container.innerHTML = '';
  //   AppState.historyData.myHistory.forEach(group => {
  //     container.appendChild(this.createHistoryItemElement(group));
  //   });
  // },

  createHistoryItemElement(group) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'history-item';
    itemDiv.innerHTML = `
      <div class="history-item-header" onclick="HistoryManager.toggleHistoryItem(this)">
        <span class="item-title editable" onclick="HistoryManager.editTitle(event, this)">${group.title}</span>
        <div class="item-actions">
          <button class="action-btn edit-btn" onclick="HistoryManager.editHistoryItem(event, this, ${group.id})" title="수정">✏️</button>
          <button class="action-btn delete-btn" onclick="HistoryManager.deleteHistoryItem(event, this, ${group.id})" title="삭제">🗑️</button>
          <button class="toggle-btn">${group.expanded ? '▼' : '▶'}</button>
        </div>
      </div>
      <div class="history-item-content ${group.expanded ? '' : 'collapsed'}">
        ${group.items.map(item => `
          <div class="sub-item" onclick="HistoryManager.loadHistoryItem(this, ${item.id})">
            <span>${item.title}</span>
          </div>
        `).join('')}
      </div>
    `;
    return itemDiv;
  },

  toggleHistoryItem(element) {
    const content = element.nextElementSibling;
    const toggleBtn = element.querySelector('.toggle-btn');
    const isCollapsed = content.classList.contains('collapsed');
    
    content.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? '▼' : '▶';
    
    const title = element.querySelector('.item-title').textContent;
    const group = AppState.historyData.myHistory.find(g => g.title === title);
    if (group) group.expanded = isCollapsed;
  },

  editTitle(event, element) {
    event.stopPropagation();
    // 제목 편집 로직 (기존과 동일)
  },

  editHistoryItem(event, element, groupId) {
    event.stopPropagation();
    Utils.showNotification('편집 기능이 구현될 예정입니다.');
  },

  deleteHistoryItem(event, element, groupId) {
    event.stopPropagation();
    if (confirm('이 항목을 삭제하시겠습니까?')) {
      AppState.historyData.myHistory = AppState.historyData.myHistory.filter(g => g.id !== groupId);
      element.closest('.history-item').remove();
      Utils.showNotification('항목이 삭제되었습니다.');
    }
  },

  loadHistoryItem(element, itemId) {
    Utils.showNotification('히스토리 아이템을 로드하고 있습니다...');
    setTimeout(() => {
      const sampleContent = `# 로드된 특허 명세서\n\n## 기술분야\n이것은 저장된 히스토리에서 로드된 특허 명세서 샘플입니다.`;
      DraftRenderer.display(sampleContent);
      AppState.currentDraftContent = sampleContent;
      Utils.showNotification('히스토리 아이템이 로드되었습니다.');
    }, 1000);
  }
};

// ========== 출원인 관리 ==========
const ApplicantManager = {
  toggle() {
    const applicantType = Utils.$('input[name="applicant_type"]:checked')?.value;
    const corporationInfo = Utils.$('#corporationInfo');
    const individualInfo = Utils.$('#individualInfo');
    
    if (!corporationInfo || !individualInfo) return;
    
    if (applicantType === 'corporation') {
      corporationInfo.style.display = 'block';
      individualInfo.style.display = 'none';
      ApplicantManager.setRequired(corporationInfo, true);
      ApplicantManager.setRequired(individualInfo, false);
    } else {
      corporationInfo.style.display = 'none';
      individualInfo.style.display = 'block';
      ApplicantManager.setRequired(individualInfo, true);
      ApplicantManager.setRequired(corporationInfo, false);
    }
  },

  setRequired(container, required) {
    container.querySelectorAll('input, select').forEach(input => {
      if (!input.name.includes('nationality')) {
        input.required = required;
      }
    });
  }
};

// ========== 문서 편집 ==========
const DocumentEditor = {
  enableEdit() {
    const draftContent = Utils.$(SELECTORS.draftContent);
    const markdownContent = draftContent.querySelector(SELECTORS.markdownContent);
    
    if (markdownContent) {
      markdownContent.remove();
      
      const textarea = document.createElement('textarea');
      textarea.id = 'draft_text';
      textarea.className = 'textarea-input editing';
      textarea.value = AppState.currentDraftContent;
      
      const buttonRow = draftContent.querySelector('.button-row');
      draftContent.insertBefore(textarea, buttonRow);
      
      this.toggleButtons(false);
      textarea.focus();
      Utils.showNotification('수정 모드가 활성화되었습니다.');
    }
  },

  cancelEdit() {
    const draftContent = Utils.$(SELECTORS.draftContent);
    const textarea = draftContent.querySelector('#draft_text');
    
    if (textarea) {
      textarea.remove();
      DraftRenderer.display(AppState.currentDraftContent);
      Utils.showNotification('수정이 취소되었습니다.');
    }
  },

  saveEdit() {
    const textarea = Utils.$('#draft_text');
    if (textarea) {
      AppState.currentDraftContent = textarea.value;
      textarea.remove();
      DraftRenderer.display(AppState.currentDraftContent);
      Utils.showNotification('✅ 수정이 완료되었습니다.');
    }
  },

  toggleButtons(isNormal) {
    const normalButtons = Utils.$('#normalButtons');
    const editButtons = Utils.$('#editButtons');
    if (normalButtons) normalButtons.style.display = isNormal ? 'flex' : 'none';
    if (editButtons) editButtons.style.display = isNormal ? 'none' : 'flex';
  }
};

// ========== 기타 기능들 ==========
const AIFeatures = {
  evaluate() {
    if (!AppState.currentDraftContent) {
      Utils.showNotification('평가할 초안이 없습니다.');
      return;
    }
    
    Utils.showNotification('AI가 특허 명세서를 평가 중입니다...');
    // 평가 로직...
  },

  requestModification() {
    const prompt = window.prompt('AI에게 요청할 수정 사항을 입력하세요:');
    if (!prompt?.trim()) return;
    
    Utils.showNotification('AI가 요청사항을 처리 중입니다...');
    setTimeout(() => {
      Utils.showNotification('AI 요청 완료: 청구항이 더욱 구체적으로 보완되었습니다.');
    }, CONFIG.EVALUATION_DELAY);
  }
};

// ========== 이벤트 리스너 초기화 ==========
function initializeEventListeners() {
  // 글자 수 카운팅
  Utils.$$('.text-input, .textarea-input').forEach(input => {
    input.addEventListener('input', function() {
      updateCharCounter(this);
    });
    updateCharCounter(input);
  });

  // 출원인 구분 라디오 버튼
  Utils.$$('input[name="applicant_type"]').forEach(radio => {
    radio.addEventListener('change', ApplicantManager.toggle);
  });

  // 발명자 추가 버튼
  const addInventorBtn = Utils.$(SELECTORS.addInventorBtn);
  if (addInventorBtn && !addInventorBtn.hasAttribute('data-listener-added')) {
    addInventorBtn.addEventListener('click', (e) => {
      e.preventDefault();
    });
    addInventorBtn.setAttribute('data-listener-added', 'true');
  }

  // 폼 제출
  const templateForm = Utils.$(SELECTORS.templateForm);
  if (templateForm) {
    templateForm.addEventListener('submit', (e) => {
      e.preventDefault();
      FormManager.handleSubmit();
    });
  }

  // 초기 상태 설정
  setTimeout(ApplicantManager.toggle, 100);
}

// ========== 기존 함수들 (호환성 유지) ==========
function updateCharCounter(input) {
  const counter = input.nextElementSibling;
  if (counter?.classList.contains('char-counter')) {
    const currentCount = input.value.length;
    const maxLength = input.getAttribute('maxlength');
    
    const countDisplay = counter.querySelector('.current-count');
    if (countDisplay) countDisplay.textContent = currentCount;
    
    counter.classList.toggle('limit-reached', currentCount >= maxLength * 0.9);
  }
}

// 전역 함수들 (호환성 유지)
const showNotification = Utils.showNotification.bind(Utils);
const handleFormSubmit = FormManager.handleSubmit.bind(FormManager);
const addInventor = InventorManager.add.bind(InventorManager);
const removeInventor = InventorManager.remove.bind(InventorManager);
const toggleApplicantType = ApplicantManager.toggle.bind(ApplicantManager);
const resetForm = FormManager.reset.bind(FormManager);
const enableEdit = DocumentEditor.enableEdit.bind(DocumentEditor);
const cancelEdit = DocumentEditor.cancelEdit.bind(DocumentEditor);
const saveEdit = DocumentEditor.saveEdit.bind(DocumentEditor);
const evaluateAI = AIFeatures.evaluate.bind(AIFeatures);
const requestAI = AIFeatures.requestModification.bind(AIFeatures);

// ========== 페이지 초기화 ==========
document.addEventListener('DOMContentLoaded', function() {
  initializeEventListeners();
  //HistoryManager.renderMyHistory();
  
  // 기존 초기화 함수들 호출 (다른 파일에서 정의된 경우)
  if (typeof setupHeaderTrigger === 'function') setupHeaderTrigger();
  if (typeof initializeHistoryPanel === 'function') initializeHistoryPanel();
});

// 기존 전역 변수들 (호환성 유지)
let currentDraftContent = '';
let isEvaluationMode = false;
let historyData = AppState.historyData;
