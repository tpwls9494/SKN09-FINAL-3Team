// accounts/static/accounts/login.js

$(document).ready(function () {

    //   1) 이전 로그인 사용자 조회 (자동 로그인)
    fetch('/accounts/get-prev-login-user/')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const { user_id, is_auto_login } = data.data;
                // console.log(`최근 로그인: ${user_id}, 자동 로그인: ${is_auto_login}`);
                $('#input-login-check').prop('checked', is_auto_login === 1);

                if (is_auto_login === 1){
                    window.location.href = '/';
                    return;
                }
            } 
            // else {
            //     console.warn(data.error);
            // }
        })
        .catch(() => console.error('서버 요청 실패'));

    /* 초기 경고 문구 숨김 */
    $('#warn-id, #warn-pw').hide();

    /* CSRF 토큰 헬퍼 */
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
        return null;
    }
    const csrftoken = getCookie('csrftoken');

    /* ─────────────────────────────────────
       2) 로그인 버튼 클릭
    ───────────────────────────────────── */
    $('#login-btn').click(function () {
        const id = $('#input-id').val().trim();
        const pw = $('#input-pw').val().trim();

        /* 빈 입력값 체크 */
        if (!id || !pw) {
            alert('아이디와 비밀번호를 입력해주세요.');
            return;                             // ★ 수정: 더 이상 false 반환 안 함
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
                /* 성공: 서버가 주는 redirect_url 없으면 메인(/)으로 */
                window.location.href = data.redirect_url || '/';
                /* 로그인 로그 남기기 (실패해도 화면 전환엔 영향 없음) */
                fetch('/accounts/ajax-insert-login-log/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': csrftoken,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_id: id })
                }).catch(() => {});
            } else {
                /* 아이디/비밀번호 오류별 메시지 */
                if (data.error === '아이디가 잘못되었습니다.') {
                    $('#warn-id').show();  $('#warn-pw').hide();
                } else if (data.error === '비밀번호가 잘못되었습니다.') {
                    $('#warn-id').hide();  $('#warn-pw').show();
                } else {
                    alert(data.error);      // 기타 오류 경고
                }
            }
        })
        .catch(() => console.error('서버 에러가 발생했습니다.'));
    });
});
