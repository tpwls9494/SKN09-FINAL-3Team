// accounts/static/accounts/login.js

$(document).ready(function () {

    // 1) 이전 로그인 사용자 조회 (자동 로그인)
    fetch('/accounts/get-prev-login-user/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const { user_id, is_auto_login } = data.data;
                $('#input-login-check').prop('checked', is_auto_login === 1);
                if (is_auto_login === 1) {
                    window.location.href = '/';
                    return;
                }
            }
        })
        .catch(() => console.error('서버 요청 실패'));

    // 초기 경고 문구 숨김
    $('#warn-id, #warn-pw').hide();

    // CSRF 토큰 헬퍼
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }
    const csrftoken = getCookie('csrftoken');

    // 로그인 버튼 클릭
    $('#login-btn').click(function () {
        const id = $('#input-id').val().trim();
        const pw = $('#input-pw').val().trim();

        // 빈 입력값 체크
        if (!id || !pw) {
            alert('아이디와 비밀번호를 입력해주세요.');
            return;
        }

        fetch('/accounts/ajax-login/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrftoken,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: id,
                password: pw,
                auto_login: $('#input-login-check').is(':checked') ? 1 : 0
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // 로그인 성공 시 리다이렉트
                window.location.href = data.redirect_url || '/';
                // 로그인 로그 남기기
                fetch('/accounts/ajax-insert-login-log/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id: id })
                }).catch(() => {});
                return;
            }

            // 비활성화 계정 처리
            if (data.error === 'inactive_account') {
                $('#inactive-modal').show();
                return;  // ← 여기서 즉시 종료
            }

            // 아이디/비밀번호 오류별 메시지
            $('#warn-id, #warn-pw').hide();
            if (data.error === '아이디가 잘못되었습니다.') {
                $('#warn-id').show();
            } else if (data.error === '비밀번호가 잘못되었습니다.') {
                $('#warn-pw').show();
            } else {
                console.error('ajax_login error:', data.error);
            }
        })
        .catch(() => console.error('서버 에러가 발생했습니다.'));
    });

    // 모달 닫기 버튼
    $('#inactive-modal .close').click(function(){
        $('#inactive-modal').hide();
    });

    $('#inactive-ok-btn').click(function(){
        $('#inactive-modal').hide();
  });
});
