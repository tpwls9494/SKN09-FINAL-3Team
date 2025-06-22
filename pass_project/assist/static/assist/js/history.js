// 히스토리 관련 기능
App.history = {
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
    container.innerHTML = '';

    if(container.innerHTML == '') {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-history';
      emptyDiv.textContent = '히스토리가 없습니다.';
      container.appendChild(emptyDiv);
    }

    fetch('/assist/select_my_history/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': App.draft.getCSRFToken(),
      },
      body: JSON.stringify({
        user_id: currentUser.id
      })
    })
    .then(response => {
      if(!response.ok) {
        throw new Error('서버 응답 오류');
      }
      return response.json();
    })
    .then(data => {
      this.myHistoryData = [];

      Object.entries(data).forEach(([key, valueArray]) => {
        const obj = {};
        obj['id'] = key;
        obj['items'] = [];
        obj['expanded'] = false;

        valueArray.forEach((item, idx) => {
          const valObj = {
            id: item['id'],
            title: item['title'],
            content: item['content'],
            template_id: item['template_id']
          };
          obj['items'].push(valObj);
          if(idx === 0) {
            obj['title'] = item['draft_main_name'];
          }
        });
        
        this.myHistoryData.push(obj);
      });

      const emptyDiv = document.querySelector('.empty-history');
      emptyDiv.style.display = 'none';
      
      this.myHistoryData.forEach(group => {
        const groupElement = this.createHistoryItemElement(group);
        container.appendChild(groupElement);
      })
    })
    .catch(error => {
      console.error('저장 중 오류 발생:', error);
      App.utils.showNotification('불러오는 도중 오류가 발생했습니다.');
    })
  },
  
  // Team History 렌더링
  renderTeamHistory() {
    const container = document.getElementById('teamHistoryItems');
    container.innerHTML = '';
    
    fetch('/assist/select_team_history/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': App.draft.getCSRFToken(),
      },
      body: JSON.stringify({
        user_id: currentUser.id
      })
    })
    .then(response => {
      if(!response.ok) {
        throw new Error('서버 응답 오류');
      }
      return response.json();
    })
    .then(data => {
      this.teamHistoryData = [];

      var cnt = 1;
      for(var dd=0; dd<data.length; dd++) {
        let objs = data[dd];
        Object.entries(objs).forEach(([key, valueArray]) => {
                const obj = {};
                obj['name'] = key + " 님";
                obj['items'] = [];
                obj['expanded'] = false;
                obj['id'] = cnt;

                valueArray.forEach((item, idx) => {
                  if(item['id'] != undefined && item['title'] != undefined && item['content'] != undefined) {
                      const valObj = {
                      id: item['id'],
                      title: item['title'],
                      content: item['content']
                    };
                    obj['items'].push(valObj);
                  } else {
                    obj['items'] = []
                  }
                });
                this.teamHistoryData.push(obj);
                cnt ++ ;
        });
      }

      this.teamHistoryData.forEach(team => {
        const teamElement = this.createTeamGroupElement(team);
        container.appendChild(teamElement);
      })
    })
    .catch(error => {
      console.error('저장 중 오류 발생:', error);
      App.utils.showNotification('불러오는 도중 오류가 발생했습니다.');
    })
  },
  
  // 히스토리 아이템 요소 생성
  //${getEditIcon()}
  //${getDeleteIcon()}
  createHistoryItemElement(group) {
    const itemDiv = document.createElement('div');
    const latestItemId = group.items[group.items.length - 1]?.id;
    
    itemDiv.className = 'history-item';
    itemDiv.innerHTML = `
      <div class="history-item-header" onclick="App.history.toggleItem(this)">
        <span class="item-title editable" data-group-id="${group.id}" ondblclick="App.history.editTitle(event, this)">${group.title}</span>
        <div class="item-actions">
          <button class="action-btn edit-btn" onclick="App.history.editItem(event, this, ${group.id})" title="수정"><i class="fa-solid fa-pen-to-square"></i></button>
          <button class="action-btn delete-btn" onclick="App.history.deleteItem(event, this, ${group.id})" title="삭제"><i class="fa-solid fa-trash"></i></button>
          <button class="toggle-btn">${group.expanded ? '▼' : '▶'}</button>
        </div>
      </div>
      <div class="history-item-content ${group.expanded ? '' : 'collapsed'}">
        ${group.items.map(item => `
          <div class="sub-item" data-group-id="${group.id}" onclick="App.history.loadItem(this, ${item.id})">
            ${item.id === latestItemId ? `<span class="sub-item-select"><span class="latest-logo">new</span>&nbsp;&nbsp;&nbsp;&nbsp;${item.title}</span>` : `<span class="sub-item-select">${item.title}</span>`}
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
      <div class="team-header" data-group-id="${team.id}" onclick="App.history.toggleTeamGroup(this, ${team.id})">
        <span>${team.name}</span>
        <button class="toggle-btn">${team.expanded ? '▲' : '▼'}</button>
      </div>
      <div class="team-content ${team.expanded ? '' : 'collapsed'}">
        ${team.items.map(item => `
          <div class="team-item" data-group-id="${team.id}" onclick="App.history.viewTeamItem(this, ${item.id})">
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
    const group = this.myHistoryData.find(g => g.title === title);
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
    const team = this.teamHistoryData.find(t => t.id === teamId);
    if (team) {
      team.expanded = isCollapsed;
    }
  },

    // 제목 편집
    activateInlineEdit(element, groupId) {
    const originalText = element.textContent;
    console.log(originalText);

    // 이미 input이 들어가 있다면 중복 방지
    if (element.querySelector('input')) return;

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

      const group = this.myHistoryData.find(g => String(g.id) === String(groupId));

      if (!group || group.title === newText) {
        if (group) alert("바뀐 제목이 없습니다.");
        element.textContent = group?.title ?? originalText;
        return;
      }

      if (newText.length > 20) {
        alert("제목은 20자 내외로 설정해야 합니다.");
        element.textContent = group.title;
        return;
      }

      fetch('/assist/update_history_main_title/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': App.draft.getCSRFToken(),
        },
        body: JSON.stringify({
          template_id: groupId,
          title: newText
        })
      })
      .then(response => {
        if (!response.ok) throw new Error('서버 응답 오류');
        return response.json();
      })
      .then(data => {
        if (data.status === "success") {
          App.utils.showNotification('제목이 수정되었습니다.');
          group.title = newText;
        } else {
          App.utils.showNotification('오류가 발생했습니다.');
          element.textContent = group.title;
        }
      })
      .catch(error => {
        console.error('저장 중 오류 발생:', error);
        App.utils.showNotification('불러오는 도중 오류가 발생했습니다.');
        element.textContent = group.title;
      });
    };

    // input.addEventListener('blur', saveEdit);
    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        saveEdit();
      } else if (e.key === 'Escape') {
        element.textContent = originalText;
      }
    });
  },

  editTitle(event, element) {
    event.stopPropagation();
    const groupId = element.dataset.groupId;
    this.activateInlineEdit(element, groupId);
  },

  editItem(event, element, groupId) {
    event.stopPropagation();
    this.activateInlineEdit(element, groupId);
  },
  
  // 히스토리 아이템 삭제
  deleteItem(event, element, groupId) {
    event.stopPropagation();
    
    if (confirm('이 항목을 삭제하시겠습니까?')) {
      // 데이터에서 삭제
      // this.myHistoryData = this.myHistoryData.filter(g => g.id !== groupId);

      fetch('/assist/delete_history_main/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': App.draft.getCSRFToken(),
        },
        body: JSON.stringify({
          template_id: groupId
        })
      })
      .then(response => {
        if(!response.ok) {
          throw new Error('서버 응답 오류');
        }
        return response.json();
      })
      .then(data => {
        if(data.status == "success") {
          App.utils.showNotification('항목이 삭제되었습니다.');
          setTimeout(() => {
            location.reload(); // 2초 후 새로고침
          }, 2000);
        } else {
          App.utils.showNotification('오류가 발생했습니다.');
        }
      })
      .catch(error => {
        console.error('저장 중 오류 발생:', error);
        App.utils.showNotification('불러오는 도중 오류가 발생했습니다.');
      })
    }
  },
  
  // 히스토리 아이템 로드
  loadItem(element, itemId) {
    App.utils.showNotification('히스토리 아이템을 로드하고 있습니다...');
    const groupId = element.dataset.groupId;
    const group = this.myHistoryData.find(g => String(g.id) === groupId);
    const latestItemId = group.items[group.items.length - 1]?.id;

    const foundItem = group.items.find(item => item.id === itemId);
    console.log(foundItem);

    if(foundItem) {
      // 시뮬레이션된 로드
      setTimeout(() => {
        const sampleContent = `# 로드된 특허 명세서 \n\n${foundItem.content}`;

        if (App.draft) {
          App.draft.display(sampleContent);
          App.data.currentDraftContent = sampleContent;
        }
        App.utils.showNotification('히스토리 아이템이 로드되었습니다.');
      }, 1000);

      if (latestItemId === itemId) {
        const buttons = document.querySelectorAll(
          '.draft_self_modifybutton, .draft_request_aibutton, .draft_evalbutton, .draft_downloadbutton'
        );

        buttons.forEach(button => {
          button.classList.add('dynamic-hover');
          button.disabled = false;
        });

        console.log(itemId);
        window.CURRENT_TEMPLATE_ID = foundItem.template_id;
      }

    } else {
      App.utils.showNotification('해당 아이템을 찾을 수 없습니다.');
    }
  
  },
  
  // 팀 아이템 보기 (읽기 전용)
  viewTeamItem(element, itemId) {
    const groupId = element.dataset.groupId;
    const group = this.teamHistoryData.find(g => String(g.id) === groupId);
    
    const foundItem = group.items.find(item => item.id === itemId);

    App.utils.showNotification('팀 아이템을 불러오고 있습니다...');

    if(foundItem) {
      // 시뮬레이션된 로드
      setTimeout(() => {
        const sampleContent = `# 팀 공유 특허 명세서 (읽기 전용) \n\n${foundItem.content}`;

        if (App.draft) {
          App.draft.display(sampleContent);
          App.data.currentDraftContent = sampleContent;
        }
        App.utils.showNotification('히스토리 아이템이 로드되었습니다.');
      }, 1000);

      const buttons = document.querySelectorAll(
        '.draft_savebutton, .draft_self_modifybutton, .draft_request_aibutton, .draft_evalbutton, .draft_downloadbutton'
      );

      buttons.forEach(button => {
        button.style.display = 'none';
      });

    } else {
      App.utils.showNotification('해당 아이템을 찾을 수 없습니다.');
    }

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
    const content = App.data.currentDraftContent; // 저장할 특허 명세서 초안 내용

    return fetch('/assist/insert_patent_report/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': App.draft.getCSRFToken(),
      },
      body: JSON.stringify({
        user_id: currentUser.id,
        tech_name: techName || '새로운 특허 명세서',
        create_draft: content,
	sc_flag: 'create',
	version: 'v1'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
	window.CURRENT_TEMPLATE_ID = data.template_id;
        this.renderMyHistory(); // 서버 최신 데이터로 패널 갱신
        App.utils.showNotification('히스토리에 저장되었습니다.');
	return data.template_id;
      } else {
        App.utils.showNotification('저장 실패');
      }
    });
  }
};

// 페이지 로드 시 히스토리 초기화
document.addEventListener('DOMContentLoaded', function() {
  if (App.history) {
    App.history.init();
  }
})
