// // user_admin/static/user_admin/user.js

// let previewUsername = null;   // 모달 열 때 생성된 '임시 사용자'의 username을 저장
// let previewPassword = null;
// let resetUsername = null;
// let deactivateUsername = null;

// window.onload = function () {
//   loadUserList();
// };

// // CSRF 토큰 
// function getCookie(name) {
//   let cookieValue = null;
//   if (document.cookie && document.cookie !== '') {
//     const cookies = document.cookie.split(';');
//     for (let cookie of cookies) {
//       cookie = cookie.trim();
//       if (cookie.startsWith(name + '=')) {
//         cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//         break;
//       }
//     }
//   }
//   return cookieValue;
// }

// function openUserCreateModal() {
//   // 1) 오버레이 보이기
//   document.getElementById('modalOverlay').style.display = 'block';
//   // 2) 모달 자체 보이기
//   document.getElementById('userModal').style.display = 'block';
//   // 3) "생성 대기 중" 메시지 초기화
//   document.getElementById('userResult').innerText = '생성 대기 중입니다.';
//   // 4) 백엔드에 즉시 임시 사용자 생성 요청
//   fetch('/user_admin/user/create/', {
//     method: 'POST',
//     credentials: 'same-origin',  // 쿠키(세션 & CSRF) 전송 추가  [ yh - testing..  ]
//     headers: {
//       'X-CSRFToken': getCookie('csrftoken'),
//       'Content-Type': 'application/json'
//     }
//   })
//     .then(response => response.json())
//     .then(data => {
//       if (data.success) {
//         previewUsername = data.username;
//         previewPassword = data.password;
//         // 생성된 임시 계정 정보 모달에 표시
//         document.getElementById('generatedId').innerText = previewUsername;
//         document.getElementById('generatedPw').innerText = previewPassword;
//         document.getElementById('userResult').innerText = '사용자를 확정하려면 "추가"를 눌러주세요.';
//       } else {
//         document.getElementById('userResult').innerText = `오류 발생: ${data.error}`;
//       }
//     })
//     .catch(err => {
//       document.getElementById('userResult').innerText = `서버 오류: ${err}`;
//     });
// }

// function cancelUserCreate() {
//   // 1) 만약 previewUsername이 있으면, 서버에 삭제 요청
//   if (previewUsername) {
//     fetch('/user_admin/user/delete/', {
//       method: 'POST',
//       credentials: 'same-origin',  // 쿠키(세션 & CSRF) 전송 추가  [ yh - testing..  ]
//       headers: {
//         'X-CSRFToken': getCookie('csrftoken'),
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ username: previewUsername })
//     })
//       .then(response => response.json())
//       .then(data => {
//         // 삭제 성공 여부와 상관없이 모달 닫기 및 목록 새로고침
//         previewUsername = null;
//         previewPassword = null;
//         closeModalAndReload();
//       })
//       .catch(_ => {
//         // 네트워크 오류라도 모달만 닫고 목록 새로고침
//         previewUsername = null;
//         previewPassword = null;
//         closeModalAndReload();
//       });
//   } else {
//     closeModalAndReload();
//   }
// }

// function confirmUserCreate() {
//   // "추가" 버튼을 누르면, 이미 생성된 임시 계정을 확정만 해주면 되므로
//   // 단순히 모달 닫고 목록 갱신
//   if (previewUsername) {
//     previewUsername = null;
//     previewPassword = null;
//     closeModalAndReload();
//   } else {
//     // 만약 previewUsername이 없다면 그냥 모달 닫기
//     closeModalAndReload();
//   }
// }

// function closeModalAndReload() {
//   document.getElementById('userModal').style.display = 'none';
//   document.getElementById('modalOverlay').style.display = 'none';
//   document.getElementById('generatedId').innerText = '-';
//   document.getElementById('generatedPw').innerText = '-';
//   document.getElementById('userResult').innerText = '';
//   loadUserList();
// }

// function loadUserList() {
//   fetch('/user_admin/user/list/')
//     .then(response => response.json())
//     .then(users => {
//       const list = document.querySelector('.user-list');
//       list.innerHTML = '';  // 기존 내용 모두 비우고

//       users.forEach(user => {
//         const li = document.createElement('li');
//         li.className = 'user-item';

//         li.innerHTML = `
//           <span class="username">${user.username}</span>
//           <div class="user-icons">
//             <!-- 비밀번호 초기화 버튼 -->
//             <img
//               src="/static/user_admin/img/lock.png"
//               class="icon-btn reset-btn"
//               title="비밀번호 초기화"
//               data-username="${user.username}"
//             />
//             <!-- 사용자 정지(Deactivate) 버튼 -->
//             <img
//               src="/static/user_admin/img/stop.png"
//               class="icon-btn deactivate-btn"
//               title="정지"
//               data-username="${user.username}"
//             />
//           </div>
//         `;
//         list.appendChild(li);

//         // 비밀번호 초기화 클릭 이벤트
//         li.querySelector('.reset-btn').addEventListener('click', () => {
//           openResetModal(user.username);
//         });

//         // 사용자 정지(Deactivate) 클릭 이벤트
//         li.querySelector('.deactivate-btn').addEventListener('click', () => {
//           openDeactivateModal(user.username);
//         });
//       });
//     })
//     .catch(error => {
//       console.error("사용자 목록 로드 실패:", error);
//     });
// }
// /*======================================
//   “비밀번호 초기화” 전용 모달 관련 함수
// ======================================*/

// // (2) 모달 열기: resetUsername에 username을 저장하고 모달+오버레이 보이기
// function openResetModal(username) {
//   resetUsername = username;
//   document.getElementById('resetOverlay').style.display = 'block';
//   document.getElementById('resetModal').style.display = 'block';
// }

// // (3) 모달 닫기: resetUsername 초기화, 모달·오버레이 숨기기
// function cancelReset() {
//   resetUsername = null;
//   document.getElementById('resetModal').style.display = 'none';
//   document.getElementById('resetOverlay').style.display = 'none';
// }

// // (4) “네”(확인) 클릭 시: 실제 초기화 API 호출 후 응답 처리
// function confirmReset() {
//   if (!resetUsername) {
//     cancelReset();
//     return;
//   }

//   fetch('/user_admin/user/reset/', {
//     method: 'POST',
//     headers: {
//       'X-CSRFToken': getCookie('csrftoken'),
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ username: resetUsername })
//   })
//     .then(response => response.json())
//     .then(data => {
//       if (data.success) {
//         alert(`${resetUsername}님의 비밀번호가 초기화되었습니다.\n(초기 비밀번호: 1111)`);
//       } else {
//         alert(`초기화 실패: ${data.error}`);
//       }
//     })
//     .catch(err => {
//       alert(`서버 오류 발생: ${err}`);
//     })
//     .finally(() => {
//       cancelReset();
//       loadUserList();
//     });
// }

// /*======================================
//   4) 사용자 정지(Deactivate) 모달 관련
//   ======================================*/
// function openDeactivateModal(username) {
//   deactivateUsername = username;
//   // 모달 안의 <strong id="deactivateUsernameText"> 부분에 이름 채워 넣기
//   document.getElementById('deactivateUsernameText').innerText = username;
//   document.getElementById('deactivateOverlay').style.display = 'block';
//   document.getElementById('deactivateModal').style.display = 'block';
// }

// function cancelDeactivate() {
//   deactivateUsername = null;
//   document.getElementById('deactivateModal').style.display = 'none';
//   document.getElementById('deactivateOverlay').style.display = 'none';
// }

// function confirmDeactivate() {
//   if (!deactivateUsername) {
//     cancelDeactivate();
//     return;
//   }

//   fetch('/user_admin/user/deactivate/', {
//     method: 'POST',
//     headers: {
//       'X-CSRFToken': getCookie('csrftoken'),
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({ username: deactivateUsername })
//   })
//     .then(response => response.json())
//     .then(data => {
//       if (data.success) {
//         alert(`“${deactivateUsername}” 사용자가 정지되었습니다.`);
//       } else {
//         alert(`정지 실패: ${data.error}`);
//       }
//     })
//     .catch(err => {
//       alert(`서버 오류 발생: ${err}`);
//     })
//     .finally(() => {
//       deactivateUsername = null;
//       cancelDeactivate();
//       loadUserList();
//     });
// }





















// user_admin/static/user_admin/user.js

let previewUsername = null;   // 모달 열 때 생성된 '임시 사용자'의 username을 저장
let previewPassword = null;
let resetUsername = null;
let deactivateUsername = null;

window.onload = function () {
  loadUserList();
};

// CSRF 토큰 
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function openUserCreateModal() {
  document.getElementById('modalOverlay').style.display = 'block';
  document.getElementById('userModal').style.display = 'block';
  document.getElementById('userResult').innerText = '생성 대기 중입니다.';

  fetch('/user_admin/user/create/', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': getCookie('csrftoken'),
      'Content-Type': 'application/json'
    }
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        previewUsername = data.username;
        previewPassword = data.password;
        document.getElementById('generatedId').innerText = previewUsername;
        document.getElementById('generatedPw').innerText = previewPassword;
        document.getElementById('userResult').innerText = '※ 사용자를 확정하려면 "추가"를 눌러주세요.';
      } else {
        document.getElementById('userResult').innerText = `오류 발생: ${data.error}`;
      }
    })
    .catch(err => {
      document.getElementById('userResult').innerText = `서버 오류: ${err}`;
    });
}

function cancelUserCreate() {
  if (previewUsername) {
    fetch('/user_admin/user/delete/', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username: previewUsername })
    })
      .then(response => response.json())
      .finally(() => {
        previewUsername = null;
        previewPassword = null;
        closeModalAndReload();
      });
  } else {
    closeModalAndReload();
  }
}

function confirmUserCreate() {
  if (previewUsername) {
    previewUsername = null;
    previewPassword = null;
  }
  closeModalAndReload();
}

function closeModalAndReload() {
  document.getElementById('userModal').style.display = 'none';
  document.getElementById('modalOverlay').style.display = 'none';
  document.getElementById('generatedId').innerText = '-';
  document.getElementById('generatedPw').innerText = '-';
  document.getElementById('userResult').innerText = '';
  loadUserList();
}

function loadUserList() {
  fetch('/user_admin/user/list/', { credentials: 'same-origin' })
    .then(response => response.json())
    .then(users => {
      const list = document.querySelector('.user-list');
      list.innerHTML = '';

      users.forEach(user => {
        const li = document.createElement('li');
        li.className = 'user-item';

        li.innerHTML = `
          <span class="username">${user.username}</span>
          <div class="user-icons">
            <img src="/static/user_admin/img/lock.png" class="icon-btn reset-btn" title="비밀번호 초기화" data-username="${user.username}" />
            <img src="/static/user_admin/img/stop.png" class="icon-btn deactivate-btn" title="정지" data-username="${user.username}" />
          </div>
        `;
        list.appendChild(li);

        li.querySelector('.reset-btn').addEventListener('click', () => openResetModal(user.username));
        li.querySelector('.deactivate-btn').addEventListener('click', () => openDeactivateModal(user.username));
      });
    })
    .catch(error => console.error('사용자 목록 로드 실패:', error));
}

// 비밀번호 초기화 모달
function openResetModal(username) {
  resetUsername = username;
  document.getElementById('resetOverlay').style.display = 'block';
  document.getElementById('resetModal').style.display = 'block';
}

function cancelReset() {
  resetUsername = null;
  document.getElementById('resetModal').style.display = 'none';
  document.getElementById('resetOverlay').style.display = 'none';
}

function confirmReset() {
  if (!resetUsername) return cancelReset();

  fetch('/user_admin/user/reset/', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': getCookie('csrftoken'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: resetUsername })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert(`${resetUsername}님의 비밀번호가 초기화되었습니다.\n(초기 비밀번호: 1111)\n다시 로그인 해 주시기 바랍니다.`);
      } else {
        alert(`초기화 실패: ${data.error}`);
      }
    })
    .catch(err => alert(`서버 오류 발생: ${err}`))
    .finally(() => {
      cancelReset();
      loadUserList();
      location.reload();
    });
}

// 사용자 정지(Deactivate) 모달
function openDeactivateModal(username) {
  deactivateUsername = username;
  document.getElementById('deactivateUsernameText').innerText = username;
  document.getElementById('deactivateOverlay').style.display = 'block';
  document.getElementById('deactivateModal').style.display = 'block';
}

function cancelDeactivate() {
  deactivateUsername = null;
  document.getElementById('deactivateModal').style.display = 'none';
  document.getElementById('deactivateOverlay').style.display = 'none';
}

function confirmDeactivate() {
  if (!deactivateUsername) return cancelDeactivate();

  const userRow = document.querySelector(`tr[data-username="${deactivateUsername}"]`);
  if(!userRow) {
    alert('사용자 정보를 찾을 수 없습니다.')
    return cancelDeactivate();
  }

  const status = userRow.getAttribute('data-status');

  if(status === "active") {
    alert(`“${deactivateUsername}” 사용자가 현재 로그인 상태입니다. 로그아웃 후 정지할 수 있습니다.`);
    return cancelDeactivate();
  }

  fetch('/user_admin/user/deactivate/', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': getCookie('csrftoken'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username: deactivateUsername })
  })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        alert(`“${deactivateUsername}” 사용자가 정지되었습니다.`);
        
      } else {
        alert(`정지 실패: ${data.error}`);
      }
    })
    .catch(err => alert(`서버 오류 발생: ${err}`))
    .finally(() => {
      cancelDeactivate();
      loadUserList();
    });
}
