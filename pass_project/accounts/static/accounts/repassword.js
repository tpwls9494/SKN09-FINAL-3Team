// document.addEventListener('DOMContentLoaded', function () {
//   const form = document.getElementById('password-form');
//   const currentPw = document.getElementById('current-password');
//   const newPw = document.getElementById('new-password');
//   const confirmPw = document.getElementById('confirm-password');

//   const currentError = document.getElementById('current-error');
//   const newError = document.getElementById('new-error');
//   const confirmError = document.getElementById('confirm-error');

//   form.addEventListener('submit', function (e) {
//     e.preventDefault();

//     const current = currentPw.value.trim();
//     const newpass = newPw.value.trim();
//     const confirm = confirmPw.value.trim();

//     // 에러 메시지 초기화
//     [currentError, newError, confirmError].forEach(el => {
//       el.textContent = '';
//       el.style.display = 'none';
//     });

//     let isValid = true;

//     // 유효성 검사
//     if (current.length === 0) {
//       currentError.textContent = "현재 비밀번호를 입력해주세요.";
//       currentError.style.display = 'block';
//       isValid = false;
//     }

//     if (newpass.length < 8 || newpass.length > 16 || 
//         !/[A-Za-z]/.test(newpass) || 
//         !/[0-9]/.test(newpass) || 
//         !/[!@#$%^&*]/.test(newpass)) {
//       newError.textContent = "※ 영문, 숫자, 특수문자를 함께 사용해 8자 이상 16자 이하의 비밀번호만 가능합니다.";
//       newError.style.display = 'block';
//       isValid = false;
//     }

//     if (newpass !== confirm) {
//       confirmError.textContent = "※ 비밀번호가 일치하지 않습니다.";
//       confirmError.style.display = 'block';
//       isValid = false;
//     }

//     if (!isValid) return;

//     // 임시 처리 로직
//     if (current === '1234') {
//       document.getElementById('success-modal').style.display = 'flex';
//     } else {
//       // 현재 페이지에서 실패 메시지만 표시하고 화면 전환 없이 유지
//       currentError.textContent = "※ 현재 비밀번호가 올바르지 않습니다.";
//       currentError.style.display = 'block';
//     }
//   });
// });

// // 성공 모달에서 확인 버튼 클릭 시 로그인 페이지로 이동
// function goToLogin() {
//   window.location.href = '/accounts/login/';
// }













// 2025/06/09 (월요일) yunhwan - code testing

// repassword.js

// repassword.js

document.addEventListener('DOMContentLoaded', () => {
  const currentPw    = document.getElementById('current-password');
  const newPw        = document.getElementById('new-password');
  const confirmPw    = document.getElementById('confirm-password');
  const currentErr   = document.getElementById('current-error');
  const newErr       = document.getElementById('new-error');
  const confirmErr   = document.getElementById('confirm-error');
  const changeBtn    = document.getElementById('btn-change-password');
  const successModal = document.getElementById('success-modal');
  const completeBtn  = document.getElementById('completeConfirm');

  // CSRF 토큰 헬퍼
  function getCsrf() {
    return document.querySelector('meta[name="csrf-token"]').content;
  }

  // 1) 현재 비밀번호 입력할 때마다 일치 여부 AJAX 확인
  currentPw.addEventListener('input', () => {
    const pw = currentPw.value.trim();
    if (!pw) {
      currentErr.textContent = '';
      currentErr.style.display = 'none';
      return;
    }

    fetch('/accounts/check-current-password/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCsrf(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: pw }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.match) {
        currentErr.textContent = '현재 비밀번호와 일치합니다.';
        currentErr.style.color = 'green';
      } else {
        currentErr.textContent = '현재 비밀번호와 불일치합니다. 다시 입력해주시기 바랍니다.';
        currentErr.style.color = 'red';
      }
      // 메시지를 보이도록
      currentErr.style.display = 'block';
    })
    .catch(() => {
      currentErr.textContent = '비밀번호 확인 중 오류가 발생했습니다.';
      currentErr.style.color = 'red';
      currentErr.style.display = 'block';
    });
  });

  // 2) 새 비밀번호와 확인 입력할 때마다 실시간 일치 검사
  function checkNewMatch() {
    const a = newPw.value.trim();
    const b = confirmPw.value.trim();
    if (!b) {
      confirmErr.textContent = '';
      confirmErr.style.display = 'none';
      return;
    }
    if (a && a === b) {
      confirmErr.textContent = '입력하신 새 비밀번호가 일치합니다.';
      confirmErr.style.color = 'green';
    } else {
      confirmErr.textContent = '입력하신 새 비밀번호가 불일치합니다. 다시 입력해주시기 바랍니다.';
      confirmErr.style.color = 'red';
    }
    confirmErr.style.display = 'block';
  }
  newPw.addEventListener('input', checkNewMatch);
  confirmPw.addEventListener('input', checkNewMatch);

  // 3) “변경” 버튼 클릭 시
  changeBtn.addEventListener('click', () => {
    // 3-1) 현재 비밀번호 확인
    if (!currentErr.textContent.includes('일치합니다')) {
      alert('현재 비밀번호를 확인해 주세요.');
      return;
    }

    // 3-2) 새 비밀번호 형식 검사
    const np = newPw.value.trim();
    const validFormat = np.length >= 8 &&
                        np.length <= 16 &&
                        /[A-Za-z]/.test(np) &&
                        /[0-9]/.test(np) &&
                        /[!@#$%^&*]/.test(np);
    if (!validFormat) {
      alert('비밀번호는 8자 이상 16자 이하의 영어 대소문자, 숫자, 특수기호로 입력하셔야 합니다.');
      //alert('새 비밀번호 형식을 확인해 주세요.');
      return;
    }

    // 3-3) 새 비밀번호 일치 확인
    if (!confirmErr.textContent.includes('일치합니다')) {
      alert('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    // 3-4) 서버에 변경 요청
    fetch('/accounts/update-password/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCsrf(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ new_password: np }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        successModal.style.display = 'flex';
      } else {
        alert('변경 실패: ' + (data.error || ''));
      }
    })
    .catch(() => {
      alert('서버 오류가 발생했습니다.');
    });
  });

  // 4) 모달 “확인” 클릭 시 로그인 페이지로 이동
  completeBtn.addEventListener('click', () => {
    successModal.style.display = 'none';
    window.location.href = '/accounts/login/';
  });
});


