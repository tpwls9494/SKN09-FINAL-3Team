// 2025/06/07 (토)
// mypage.js
// mypage.js

document.addEventListener('DOMContentLoaded', () => {
  const openBtn    = document.getElementById('btn-nick');
  const modal      = document.getElementById('nicknameModal');
  const cancelBtn  = document.getElementById('cancelModal');
  const dupBtn     = document.getElementById('checkDuplicate');
  const confirmBtn = document.getElementById('confirmChange');
  const input      = document.getElementById('new_nickname');
  const resultMsg  = document.getElementById('nicknameCheckResult');
  const userId = document.getElementById('current-userId').textContent.trim();
  const nickElement = document.getElementById("current-nick");
  const nickname = nickElement ? nickElement.textContent.trim() : "사용자(닉네임 미지정)";
  const userDepartmentInfo = document.getElementById("userDepartmentInfo");

  fetch('/accounts/select_department/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCsrf(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_nickname : nickname,
        userId : userId
      }),
    })
    .then(res => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
    })
    .then(data => {
      if(data.status == "success") {
        let depArr = data.data;
        let depStr = "";
        for(var i=0; i<depArr.length; i++) {
          if(i == (depArr.length - 1)) {
            depStr += ` ${depArr[i]}`;
          } else if(i == 0) {
            depStr += `${depArr[i]}`;
          } else {
            depStr += `, ${depArr[i]}`
          }
        }

        if(depStr != "") {
          userDepartmentInfo.textContent = depStr;
        } else {
          userDepartmentInfo.textContent = "부서 미지정";
        }
        
      }
    })
    .catch(err => {
        console.error('update error', err);
        alert('서버 오류가 발생했습니다.');
    });

  function getCsrf() {
    return document.querySelector('meta[name="csrf-token"]').content;
  }

  openBtn.addEventListener('click', e => {
    e.preventDefault();
    modal.classList.remove('hidden');
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
          resultMsg.classList.add("show");
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
