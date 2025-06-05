// 히스토리 관련 기능
App.history = {
  data: {
    myHistory: [
      {
        id: 1,
        title: '항공업 자동 예약 시스템',
        items: [
          { id: 11, title: '생성된 특허 명세서 초안 1', content: '...' },
          { id: 12, title: '생성된 특허 명세서 초안 2', content: '...' }
        ],
        expanded: true
      },
      {
        id: 2,
        title: '최적화된 항공 혼잡 해결...',
        items: [
          { id: 21, title: '특허 명세서 초안', content: '...' }
        ],
        expanded: false
      }
    ],
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
      {
        id: 2,
        name: 'rodnfl02 님',
        items: [],
        expanded: false
      },
      {
        id: 3,
        name: 'tpwlsdl98 님',
        items: [],
        expanded: false
      }
    ]
  },
  
  // 패널 토글
  togglePanel() {
    const historyPanel = document.getElementById('historyPanel');
    const toggleBtn = document.getElementById('sideToggleBtn');
    
    if (historyPanel) {
      historyPanel.classList.toggle('collapsed');
      
      // 패널 상태에 따라 이미지 변경
      if (toggleBtn && window.STATIC_IMAGES) {
        if (historyPanel.classList.contains('collapsed')) {
          // 닫힌 상태 - sidebtn2 이미지 사용
          toggleBtn.src = window.STATIC_IMAGES.sidebtn2;
        } else {
          // 열린 상태 - sidebtn1 이미지 사용
          toggleBtn.src = window.STATIC_IMAGES.sidebtn1;
        }
      }
    }
  },
  
  // 초기화
  init() {
    this.renderMyHistory();
    this.renderTeamHistory();
  },
  
  // My History 렌더링
  renderMyHistory() {
    const container = document.getElementById('myHistoryItems');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.data.myHistory.forEach(group => {
      const groupElement = this.createHistoryItemElement(group);
      container.appendChild(groupElement);
    });
  },
  
  // Team History 렌더링
  renderTeamHistory() {
    const container = document.getElementById('teamHistoryItems');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.data.teamHistory.forEach(team => {
      const teamElement = this.createTeamGroupElement(team);
      container.appendChild(teamElement);
    });
  },
  
  // 히스토리 아이템 요소 생성
  createHistoryItemElement(group) {
    const itemDiv = document.createElement('div');
    
    itemDiv.className = 'history-item';
    itemDiv.innerHTML = `
      <div class="history-item-header" onclick="App.history.toggleItem(this)">
        <span class="item-title editable" onclick="App.history.editTitle(event, this)">${group.title}</span>
        <div class="item-actions">
          <button class="action-btn edit-btn" onclick="App.history.editItem(event, this, ${group.id})" title="수정">${getEditIcon()}</button>
          <button class="action-btn delete-btn" onclick="App.history.deleteItem(event, this, ${group.id})" title="삭제">${getDeleteIcon()}</button>
          <button class="toggle-btn">${group.expanded ? '▼' : '▶'}</button>
        </div>
      </div>
      <div class="history-item-content ${group.expanded ? '' : 'collapsed'}">
        ${group.items.map(item => `
          <div class="sub-item" onclick="App.history.loadItem(this, ${item.id})">
            <span>${item.title}</span>
          </div>
        `).join('')}
      </div>
    `;
    
    return itemDiv;
  },
  
  // 팀 그룹 요소 생성
  createTeamGroupElement(team) {
    const teamDiv = document.createElement('div');
    teamDiv.className = 'team-group';
    teamDiv.innerHTML = `
      <div class="team-header" onclick="App.history.toggleTeamGroup(this, ${team.id})">
        <span>${team.name}</span>
        <button class="toggle-btn">${team.expanded ? '▲' : '▼'}</button>
      </div>
      <div class="team-content ${team.expanded ? '' : 'collapsed'}">
        ${team.items.map(item => `
          <div class="team-item" onclick="App.history.viewTeamItem(this, ${item.id})">
            <span>${item.title}</span>
          </div>
        `).join('')}
      </div>
    `;
    
    return teamDiv;
  },
  
  // 히스토리 아이템 토글
  toggleItem(element) {
    const content = element.nextElementSibling;
    const toggleBtn = element.querySelector('.toggle-btn');
    const isCollapsed = content.classList.contains('collapsed');
    
    content.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? '▼' : '▶';
    
    // 데이터 업데이트
    const title = element.querySelector('.item-title').textContent;
    const group = this.data.myHistory.find(g => g.title === title);
    if (group) {
      group.expanded = isCollapsed;
    }
  },
  
  // 팀 그룹 토글
  toggleTeamGroup(element, teamId) {
    const content = element.nextElementSibling;
    const toggleBtn = element.querySelector('.toggle-btn');
    const isCollapsed = content.classList.contains('collapsed');
    
    content.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? '▲' : '▼';
    
    // 데이터 업데이트
    const team = this.data.teamHistory.find(t => t.id === teamId);
    if (team) {
      team.expanded = isCollapsed;
    }
  },
  
  // 제목 편집
  editTitle(event, element) {
    event.stopPropagation();
    
    const originalText = element.textContent;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'edit-input';
    input.style.cssText = `
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 13px;
      color: #333;
      width: 100%;
    `;
    
    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
    input.select();
    
    const saveEdit = () => {
      const newText = input.value.trim() || originalText;
      element.textContent = newText;
      
      // 데이터 업데이트
      const group = this.data.myHistory.find(g => g.title === originalText);
      if (group) {
        group.title = newText;
      }
      
      App.utils.showNotification('제목이 수정되었습니다.');
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        element.textContent = originalText;
      }
    });
  },
  
  // 히스토리 아이템 편집
  editItem(event, element, groupId) {
    event.stopPropagation();
    App.utils.showNotification('편집 기능이 구현될 예정입니다.');
  },
  
  // 히스토리 아이템 삭제
  deleteItem(event, element, groupId) {
    event.stopPropagation();
    
    if (confirm('이 항목을 삭제하시겠습니까?')) {
      // 데이터에서 삭제
      this.data.myHistory = this.data.myHistory.filter(g => g.id !== groupId);
      
      // UI에서 제거
      const historyItem = element.closest('.history-item');
      historyItem.remove();
      
      App.utils.showNotification('항목이 삭제되었습니다.');
    }
  },
  
  // 히스토리 아이템 로드
  loadItem(element, itemId) {
    App.utils.showNotification('히스토리 아이템을 로드하고 있습니다...');
    
    // 시뮬레이션된 로드
    setTimeout(() => {
      const sampleContent = `# 로드된 특허 명세서

## 기술분야
이것은 저장된 히스토리에서 로드된 특허 명세서 샘플입니다.

## 배경기술
기존 기술의 한계점과 문제점을 설명합니다.

## 해결하려는 과제
본 발명으로 해결하고자 하는 기술적 과제를 설명합니다.`;

      if (App.draft) {
        App.draft.display(sampleContent);
        App.data.currentDraftContent = sampleContent;
      }
      App.utils.showNotification('히스토리 아이템이 로드되었습니다.');
    }, 1000);
  },
  
  // 팀 아이템 보기 (읽기 전용)
  viewTeamItem(element, itemId) {
    App.utils.showNotification('팀 아이템을 불러오고 있습니다...');
    
    setTimeout(() => {
      const sampleContent = `# 팀 공유 특허 명세서 (읽기 전용)

## 기술분야
팀원이 작성한 특허 명세서입니다.

## 배경기술
이 문서는 읽기 전용으로 제공됩니다.`;

      if (App.draft) {
        App.draft.display(sampleContent);
        App.data.currentDraftContent = sampleContent;
      }
      App.utils.showNotification('팀 아이템이 로드되었습니다. (읽기 전용)');
    }, 1000);
  },
  
  // 팀 히스토리 새로고침
  refreshTeam() {
    App.utils.showNotification('팀 히스토리를 새로고침하고 있습니다...');
    
    setTimeout(() => {
      this.renderTeamHistory();
      App.utils.showNotification('팀 히스토리가 새로고침되었습니다.');
    }, 1000);
  },
  
  // 히스토리에 추가
  addToHistory(techName) {
    const newId = Math.max(...this.data.myHistory.map(h => h.id), 0) + 1;
    const now = new Date();
    const timestamp = now.toLocaleString();
    
    const newHistoryItem = {
      id: newId,
      title: techName || '새로운 특허 명세서',
      items: [
        { 
          id: newId * 10 + 1, 
          title: `생성된 특허 명세서 초안 - ${timestamp}`, 
          content: App.data.currentDraftContent 
        }
      ],
      expanded: true
    };
    
    this.data.myHistory.unshift(newHistoryItem);
    this.renderMyHistory();
    
    App.utils.showNotification('히스토리에 저장되었습니다.');
  }
};

// 페이지 로드 시 히스토리 초기화
document.addEventListener('DOMContentLoaded', function() {
  if (App.history) {
    App.history.init();
  }
});