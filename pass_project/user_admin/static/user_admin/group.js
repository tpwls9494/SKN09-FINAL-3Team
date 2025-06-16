// window.onload = function () {
//   loadGroupList();
// };
let selectedTeamId = null;

document.addEventListener('DOMContentLoaded', function () {
  loadGroupList();
});

// CSRF 토큰 
function getCookie(name) {
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value);
  }
  return null;
}


function toggleGroup(header) {
  const box = header.closest('.group-box');
  const isExpanded = box.classList.contains('expanded');
  const icon = header.querySelector('.toggle-icon');

  // 모든 그룹 닫기
  document.querySelectorAll('.group-box').forEach(g => {
    g.classList.remove('expanded');
    g.querySelector('.group-user-list').style.display = 'none';
    g.querySelector('.toggle-icon').src = '/static/user_admin/img/down.png';
  });

  // 클릭한 그룹만 열기
  if (!isExpanded) {
    box.classList.add('expanded');
    box.querySelector('.group-user-list').style.display = 'block';
    icon.src = '/static/user_admin/img/up.png';
  }
}

// 그룹 모달 열기
function openCreateGroupModal() {
  // console.log('openCreateGroupModal 실행됨');
  document.getElementById('modalOverlay').style.display = 'block';
  document.getElementById('groupModal').style.display = 'block';
  document.getElementById('inputGroupName').value = '';        // 입력 초기화
  document.getElementById('groupResult').innerText = '그룹명을 입력하고 “추가”를 눌러주세요.';
}

// 모달 취소
function cancelGroupCreate() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('groupModal').style.display = 'none';
}
 

// 그룹 생성 요청
function confirmGroupCreate() {
  const name = document.getElementById('inputGroupName').value.trim();
  if (!name) {
    document.getElementById('groupResult').innerText = '그룹명을 입력해주세요.';
    return;
  }

  fetch('/user_admin/group/create/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': getCookie('csrftoken'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ team_name: name })
  })
.then(res => {
  if (!res.ok) {
    return res.json().then(errorData => {
      throw new Error(JSON.stringify(errorData));
    });
  }
  return res.json();
})
.then(data => {
  // document.getElementById('groupResult').innerText = `생성 완료: ${data.team_name} (ID: ${data.team_id})`;
  alert(`생성이 완료되었습니다! ${data.team_name} (ID: ${data.team_id})`);
  loadGroupList();
  closeAddGroupModal();
  location.reload();
})
.catch(err => {
  try {
    const parsed = JSON.parse(err.message);
    document.getElementById('groupResult').innerText = `오류: ${parsed.error ? parsed.error.team_name?.[0]?.message || JSON.stringify(parsed.error) : '알 수 없는 오류'}`;
  } catch {
    document.getElementById('groupResult').innerText = `서버 오류: ${err}`;
  }
});

// console.log(JSON.stringify({team_name: name}));

}

function loadGroupList() {
  fetch('/user_admin/group/list/')
    .then(res => res.json())
    .then(data => {
      const listContainer = document.getElementById('groupList');
      listContainer.innerHTML = '';

      data.groups.forEach(group => {
        const li = document.createElement('li');
        li.className = 'group-item';
        li.innerHTML = `
          <span class="groupname">${group.team_name}</span>
          <div class="group-icons">
            <img
              src="/static/user_admin/img/plus.png"
              id="plus-user"
              class="icon-btn add-user-btn"
              title="사용자 추가"
              data-group-id="${group.team_id}"
              data-group-name="${group.team_name}"
            />
            <img
              src="/static/user_admin/img/stop.png"
              class="icon-btn deactivate-group-btn"
              title="그룹 정지"
              data-group-id="${group.team_id}"
              data-group-name="${group.team_name}" 
            />
          </div>
        `;
        listContainer.appendChild(li);

        // 사용자 추가 버튼
        li.querySelector('.add-user-btn').addEventListener('click', (event) => {
          event.stopPropagation();
          document.getElementById('groupModal').style.display = 'none';
          openAddUserModal(group.team_id, group.team_name, "group-add");
        });

        // 그룹 정지 버튼
        li.querySelector('.deactivate-group-btn').addEventListener('click', () => {
          openDeactivateGroupModal(group.team_id);
        });
      });
    })
    .catch(err => {
      console.error('그룹 목록 불러오기 오류:', err);
    });
}

function openAddUserModal(groupId, groupName, flag) {
  selectedTeamId = groupId; 
  document.getElementById('modalOverlay').style.display = 'block';
  if (flag == "group-add") {
    document.getElementById('groupModal').style.display = 'none';
    document.getElementById('addUserModal').style.display = 'block';
  } else {
    document.getElementById('addUserModal').style.display = 'none';
  }
  
  document.getElementById('addUserGroupName').textContent = groupName;
  document.getElementById('addUserInput').value = '';

  // 자동완성 사용자 목록 가져오기
  fetch('/user_admin/user/list/')
    .then(res => res.json())
    .then(users => {
      const dataList = document.getElementById('userOptions');
      dataList.innerHTML = '';
      users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.username;
        dataList.appendChild(option);
      });
    });
}

function closeAddGroupModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('groupModal').style.display = 'none';
}

function closeAddUserModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('addUserModal').style.display = 'none';
}

function confirmAddUserToGroup() {
  const username = document.getElementById('addUserInput').value.trim();
  const groupName = document.getElementById('addUserGroupName').value;

  if (!username) {
    alert('사용자 ID를 입력해주세요.');
    return;
  }

  fetch('/user_admin/group/assign/', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCookie('csrftoken')
    },
    body: JSON.stringify({ username: username, team_id: selectedTeamId })
  })
  .then(res => {
    if (!res.ok) {
      throw new Error('서버 응답 실패');
    }
    return res.json();  // ❗HTML 오면 여기서 에러남
  })
  .then(data => {
    if (data.success) {
      alert('사용자 추가 성공');
      closeAddUserModal();
      location.reload();
    } else {
      alert('사용자 추가 실패: ' + (data.error || '알 수 없는 오류'));
    }
  })
  .catch(error => {
    console.error('요청 실패:', error);
    alert('요청 실패: ' + error.message);
  });

}

function loadGroupUsers(teamId, container) {
    container.innerHTML = ''; 
    users.forEach(user => {
        const li = document.createElement("li");
        li.innerHTML = `
          <span class="status ${statusClass}"></span>
          <span class="username">${user.user_nickname || user.username}</span>
          <img src="/static/user_admin/img/delete.png" class="delete-icon" alt="삭제" onclick="deleteUserFromGroup(${teamId}, '${user.user_code}')">
          `;
        container.appendChild(li);
    });
}

function deleteUserFromGroup(teamId, user_code) {
  if (!confirm("정말로 이 사용자를 그룹에서 삭제하시겠습니까?")) return;

  fetch(`/user_admin/group/user/delete/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCookie("csrftoken")
    },
    body: JSON.stringify({ team_id: teamId, user_code: user_code })
  })
  .then(res => {
    if (!res.ok) throw new Error("응답이 실패했습니다");

    return res.json(); // 💥 여기서 HTML이 오면 에러 발생
  })
  .then(data => {
    if (data.success) {
      alert("삭제되었습니다.");
      // ❗ 그룹 목록뿐 아니라 사용자 목록도 다시 로드
      const expandedBox = document.querySelector('.group-box.expanded');
      if (expandedBox) {
        const teamId = expandedBox.dataset.teamId;
        const container = expandedBox.querySelector('.group-user-list');
        fetch(`/api/group/${teamId}/users`)
          .then(res => res.json())
          .then(data => {
            container.innerHTML = '';
            data.users.forEach(user => {
              const li = document.createElement("li");
              li.innerHTML = `
                <span class="status ${user.is_logged_in ? 'online' : 'offline'}"></span>
                <span class="username">${user.user_nickname || user.username}</span>
                <img src="/static/user_admin/img/delete.png" class="delete-icon" alt="삭제" onclick="deleteUserFromGroup(${teamId}, '${user.user_code}')">
              `;
              container.appendChild(li);
            });
          });
          location.reload();
      }
    } else {
      alert("삭제 실패: " + data.message);
    }
  })
  .catch(err => {
    console.error("삭제 오류:", err);
    alert("서버 오류: " + err.message);
  });
}


function openDeactivateGroupModal(teamId) {
  const teamName = document.querySelector(`.deactivate-group-btn[data-group-id="${teamId}"]`)
                    .getAttribute("data-group-name");

  // 모달 텍스트 설정
  document.getElementById("deactivateConfirmText").innerHTML =
    `“${teamName}” 그룹을 정지하시겠습니까?<br><small>(정지된 그룹은 더 이상 사용할 수 없습니다.)</small>`;

  document.getElementById("deactivateTargetGroupId").value = teamId;

  // 모달 열기
  document.getElementById('modalOverlay').style.display = 'block';
  document.getElementById("deactivateGroupUserModal").style.display = 'block';
}


function closeDeactivateUserModal() {
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('deactivateGroupUserModal').style.display = 'none';
}

function confirmDeactivateGroup() {
  const teamId = document.getElementById("deactivateTargetGroupId").value;

  fetch(`/user_admin/group/deactivate/`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRFToken": getCookie("csrftoken")
    },
    body: JSON.stringify({ team_id: teamId })
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("그룹이 정지되었습니다.");
        closeDeactivateUserModal();
        loadGroupList(); // 다시 불러오기
      } else {
        alert("정지 실패: " + data.message);
      }
    })
    .catch(err => {
      console.error("그룹 정지 요청 실패:", err);
      alert("서버 오류: " + err.message);
    });
}

function toggleTeamActivation(teamId, nameElement) {
  fetch('/user_admin/toggle_team_activation/', {
    method: 'POST',
    headers: {
      'X-CSRFToken': getCookie('csrftoken'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `team_id=${teamId}`
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      nameElement.textContent = data.new_name;  // 화면에 이름 반영
      alert(`${data.status}되었습니다`);
    } else {
      alert(data.error || '변경 실패');
    }
  });
}

// 예시: 비활성화 버튼 클릭 시
document.querySelectorAll('.deactivate-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const teamId = this.dataset.teamId;
    const nameElement = this.closest('.group-box').querySelector('.group-header span');
    toggleTeamActivation(teamId, nameElement);
  });
});


// js 바인딩
document.addEventListener('DOMContentLoaded', function () {
  const addGroupBtn = document.getElementById('create-group-btn');
  const cancelBtn = document.querySelector('.cancel-btn');
  const modalOverlay = document.getElementById('modalOverlay');
  const confirmBtn = document.querySelector('.confirm-btn');

  if (addGroupBtn) {
    addGroupBtn.addEventListener('click', openCreateGroupModal);
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', openCreateGroupModal);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', cancelGroupCreate);
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', confirmGroupCreate);
  }
});

// 그룹에 사용자 추가 모달

// 그룹 삭제 모달

// 취소 모달