// mypage.js

// document.addEventListener('DOMContentLoaded', function () {
//   // 유효성 검사
//   const form = document.querySelector('form');
//   const nicknameInput = document.getElementById('nickname');
//   const departmentInput = document.getElementById('department');

//   form.addEventListener('submit', function (e) {
//     let isValid = true;
//     let errors = [];

//     const nickname = nicknameInput.value.trim();
//     const department = departmentInput.value.trim();

//     if (nickname.length < 2) {
//       isValid = false;
//       errors.push("닉네임은 2자 이상이어야 합니다.");
//     }
//     if (!/^[a-zA-Z가-힣0-9]+$/.test(nickname)) {
//       isValid = false;
//       errors.push("닉네임에 특수문자는 사용할 수 없습니다.");
//     }
//     if (department.length < 2 || /\s/.test(department)) {
//       isValid = false;
//       errors.push("부서는 공백 없이 2자 이상 입력해야 합니다.");
//     }

//     if (!isValid) {
//       e.preventDefault();
//       alert(errors.join("\n"));
//     }
//   });

//   // 닉네임 모달
//   const modal = document.getElementById('nicknameModal');
//   const openBtn = document.querySelector('.btn-change');
//   const cancelBtn = document.getElementById('cancelModal');
//   const confirmBtn = document.getElementById('confirmChange');
//   const resultMsg = document.getElementById('nicknameCheckResult');

//   openBtn.addEventListener('click', function (e) {
//     e.preventDefault();
//     modal.classList.remove('hidden');
//     resultMsg.classList.add('hidden');
//     document.getElementById('new_nickname').value = '';
//   });

//   cancelBtn.addEventListener('click', function () {
//     modal.classList.add('hidden');
//   });

//   confirmBtn.addEventListener('click', function () {
//     const newNickname = document.getElementById('new_nickname').value.trim();
//     if (newNickname.length < 2) {
//       resultMsg.textContent = "닉네임은 2자 이상이어야 합니다.";
//       resultMsg.classList.remove('hidden');
//       return;
//     }
//     alert(`닉네임이 '${newNickname}'(으)로 변경됩니다.`); // 서버 연동 필요
//     modal.classList.add('hidden');
//   });

//   document.getElementById('checkDuplicate').addEventListener('click', function () {
//     const value = document.getElementById('new_nickname').value.trim();
//     if (value === '') {
//       resultMsg.textContent = "닉네임을 입력하세요.";
//       resultMsg.classList.remove('hidden');
//       return;
//     }
//     const dummyTaken = ['admin', 'passai', 'dbwlsdl01'];
//     if (dummyTaken.includes(value.toLowerCase())) {
//       resultMsg.textContent = "닉네임이 이미 존재 합니다.";
//     } else {
//       resultMsg.textContent = "사용 가능한 닉네임 입니다.";
//     }
//     resultMsg.classList.remove('hidden');
//   });

//   // 비밀번호 재설정 영역 전환
//   const btnPassword = document.querySelector('.btn-password');
//   const infoPanel = document.getElementById('infoPanel');
//   const passwordPanel = document.getElementById('passwordPanel');
//   const passwordForm = document.getElementById('passwordForm');

//   btnPassword.addEventListener('click', function (e) {
//     e.preventDefault();
//     infoPanel.classList.add('hidden');
//     passwordPanel.classList.remove('hidden');
//   });

//   passwordForm.addEventListener('submit', function (e) {
//     e.preventDefault();
//     const current = document.getElementById('current_password').value.trim();
//     const newPw = document.getElementById('new_password').value.trim();
//     const confirm = document.getElementById('confirm_password').value.trim();

//     if (!current || !newPw || !confirm) {
//       alert("모든 필드를 입력해주세요.");
//       return;
//     }

//     if (newPw.length < 8 || !/[A-Za-z]/.test(newPw) || !/[0-9]/.test(newPw) || !/[!@#$%^&*]/.test(newPw)) {
//       alert("새 비밀번호는 8자 이상이며, 영문/숫자/특수문자를 포함해야 합니다.");
//       return;
//     }

//     if (newPw !== confirm) {
//       alert("새 비밀번호가 일치하지 않습니다.");
//       return;
//     }

//     alert("비밀번호가 성공적으로 변경되었습니다. (서버 요청 필요)");
//     passwordForm.reset();
//     infoPanel.classList.remove('hidden');
//     passwordPanel.classList.add('hidden');
//   });
// });




















// 2025/06/07 (토)
// mypage.js
// mypage.js

document.addEventListener('DOMContentLoaded', () => {
  const openBtn    = document.getElementById('btn-nick');
  const modal      = document.getElementById('nicknameModal');
  const cancelBtn  = document.getElementById('cancelModal');
  const dupBtn     = document.getElementById('checkDuplicate');
  const confirmBtn = document.getElementById('confirmChange');
  const resultMsg  = document.getElementById('nicknameCheckResult');
  const input      = document.getElementById('new_nickname');

  function getCsrf() {
    return document.querySelector('meta[name="csrf-token"]').content;
  }

  openBtn.addEventListener('click', e => {
    e.preventDefault();
    modal.classList.remove('hidden');
    resultMsg.classList.add('hidden');
    confirmBtn.disabled = true;
    input.value = '';
    input.focus();
  });

  cancelBtn.addEventListener('click', () => modal.classList.add('hidden'));

  dupBtn.addEventListener('click', () => {
    const nick = input.value.trim();
    if (!nick) return alert('닉네임을 입력해 주세요.');

    fetch(`/accounts/nickname/check/?nickname=${encodeURIComponent(nick)}`)
      .then(res => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.available) {
          resultMsg.textContent = `"${nick}" 은(는) 사용 가능합니다.`;
          resultMsg.style.color = 'green';
          confirmBtn.disabled = false;
        } else {
          resultMsg.textContent = data.error || `"${nick}" 은(는) 이미 사용 중입니다.`;
          resultMsg.style.color = 'red';
          confirmBtn.disabled = true;
        }
        resultMsg.classList.remove('hidden');
      })
      .catch(err => {
        console.error('dup check error', err);
        alert('중복 확인에 실패했습니다.');
      });
  });

  confirmBtn.addEventListener('click', () => {
    const nick = input.value.trim();
    if (!nick) return alert('닉네임을 입력해 주세요.');

    fetch('/accounts/nickname/update/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCsrf(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nickname: nick }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) {
          alert('닉네임이 변경되었습니다.');
          window.location.reload();
        } else {
          alert('변경에 실패했습니다: ' + (data.error||''));
        }
      })
      .catch(err => {
        console.error('update error', err);
        alert('서버 오류가 발생했습니다.');
      });
  });
});
