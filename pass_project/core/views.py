from django.shortcuts import render


def main_view(request):
    """
    flag = 1  → 비로그인
    flag = 2  → 관리자(is_superuser==1)
    flag = 3  → 일반 사용자(is_superuser==0)
    """
    flag = 1
    username = ""
    if request.user.is_authenticated:
        if request.user.is_superuser == 1:
            flag = 2
            username = "관리자"
        else:
            flag = 3
            username = request.user.username
            
    return render(request, 'core/main.html',
                  {'flag': flag, 'username': username})   # ← 수정