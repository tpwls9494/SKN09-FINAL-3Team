
$(document).ready(function () {
    $('#warn-id').hide();
    $('#warn-pw').hide();

    $('#login-btn').click(function () {
        const id = $('#input-id').val();
        const pw = $('#input-pw').val();

        if (!id || !pw) {
            alert('아이디와 비밀번호를 입력해주세요.');
            $('#warn-id').hide();
            $('#warn-pw').show();
        }
    });
});

