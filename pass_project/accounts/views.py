
# import json
# from django.shortcuts import render, redirect
# from django.views.decorators.csrf import csrf_exempt
# from django.http import JsonResponse
# from django.contrib.auth import authenticate, login
# from django.utils import timezone
# from .utils import anonymous_required
# from core.models import User, LoginLog
# from django.shortcuts import render
# from django.http import JsonResponse
# from django.contrib.auth.decorators import login_required
# from django.contrib.auth.models import User

# @login_required
# def mypage_view(request):
#     return render(request, 'accounts/mypage.html', {'user': request.user})

# @login_required
# def check_nickname(request):
#     nickname = request.GET.get('nickname')
#     is_taken = User.objects.filter(nickname=nickname).exists()
#     return JsonResponse({'available': not is_taken})

# @login_required
# def update_nickname(request):
#     if request.method == 'POST':
#         new_nickname = request.POST.get('nickname')
#         if not User.objects.filter(nickname=new_nickname).exists():
#             request.user.nickname = new_nickname
#             request.user.save()
#             return JsonResponse({'success': True})
#     return JsonResponse({'success': False})

# import json



# @ anonymous_required
# def login_view(request):
#     if request.method == 'POST':
#         username = request.POST['username']
#         password = request.POST['password']
#         user = authenticate(request, username=username, password=password)
#         if user is not None:
#             login(request, user)
#             return redirect('mypage')
#         else:
#             return render(request, 'login.html', {"error": "Invalid credentials"})
#     return render(request, 'accounts/login.html')

# # ajax: 로그인
# def ajax_login(request):
#     if request.method == 'POST':
#         response_obj = {}
#         try:
#             data = json.loads(request.body)
#             user_id = data.get('user_id')
#             password = data.get('password')
#             auto_login = data.get('auto_login')
#             print("nickname:", user_id, "| password:", password, "| auto_login:", auto_login)

#             user_obj = User.objects.filter(username=user_id)
#             for user in user_obj:
#                 response_obj['user_id'] = user.username
#                 response_obj['password'] = user.password
#                 response_obj['is_auto_login'] = user.is_auto_login
#             print("response::", response_obj)
            
#             if response_obj == {}:
#                 return JsonResponse({'success':False, 'error': '아이디가 잘못되었습니다.'})
            
#             if auto_login != response_obj['is_auto_login']:
#                 print("자동 로그인 정보를 업데이트 합니다...")
#                 for user in user_obj:
#                     user.is_auto_login = auto_login
#                     user.save(update_fields=['is_auto_login'])


#             if user_id == response_obj["user_id"] and password == response_obj["password"]:
#                 return JsonResponse({"success": True, 'redirect_url': "/"})
#             else:   
#                 if password != response_obj['password']:
#                     return JsonResponse({"success": False, 'error': '비밀번호가 잘못되었습니다.'})

#         except json.JSONDecodeError:
#             return JsonResponse({'success': False, 'error': '잘못된 JSON 형식입니다.'})
        
#     return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})
    

# # 로그인 로그 삽입
# @csrf_exempt
# def ajax_insert_login_log(request):
#     if request.method == 'POST':
#         try:
#             data = json.loads(request.body)
#             user_id = data.get('user_id')

#             user = User.objects.filter(username=user_id)
#             user_code = ""
#             for use in user:
#                 user_code = use.user_code
#             if not user:
#                 return JsonResponse({'success':False, 'error': '유저를 찾을 수 없습니다.'})
            
#             x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
#             user_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get("REMOTE_ADDR")

#             print("user_code::", user_code)
#             print("user_ip::", user_ip)

#             LoginLog.objects.create(
#                 user_code_id = user_code,
#                 user_ip = user_ip,
#                 login_time=timezone.now()
#             )

#             return JsonResponse({"success": True})
        
#         except Exception as e:
#             return JsonResponse({'success': False, 'error': str(e)})
#     else:
#         return JsonResponse({"success": False, 'error': 'POST 요청이 필요합니다.'})

# # ip가져오기기
# def get_client_ip(request):
#     x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
#     if x_forwarded_for:
#         ip = x_forwarded_for.split(',')[0]
#     else:
#         ip = request.META.get('REMOTE_ADDR')
#     return ip

# def get_prev_login_user(request):
#     client_ip = get_client_ip(request)

#     try:
#         last_log = LoginLog.objects.select_related('user_code').filter(user_ip=client_ip).latest('login_time')
#         user = last_log.user_code

#         response_data = {
#             'user_id': user.username,
#             'is_auto_login': user.is_auto_login,
#         }

#         return JsonResponse({'success': True, 'data': response_data})
    
#     except LoginLog.DoesNotExist:
#         return JsonResponse({'success': False, 'error': '해당 IP로 로그인한 기록이 없습니다.'})

# def mypage_view(request):
#     return render(request, 'accounts/mypage.html')

# def repassword_view(request):
#     return render(request, 'accounts/repassword.html')

# def update_view(request):
#     return render(request, 'accounts/update.html')


















# 관리자만 로그인 됨

# import json
# from django.shortcuts import render, redirect
# from django.urls import reverse
# from django.views.decorators.csrf import csrf_exempt
# from django.http import JsonResponse
# from django.contrib.auth import authenticate, login
# from django.contrib.auth.decorators import login_required
# from django.utils import timezone

# from .utils import anonymous_required
# from core.models import User as CoreUser, LoginLog  # 커스텀 사용자 모델만 사용


# # ───────────────────────────────────────────────────────────
# # 1) 마이페이지 및 닉네임 처리
# # ───────────────────────────────────────────────────────────

# @login_required
# def mypage_view(request):
#     return render(request, 'accounts/mypage.html', {'user': request.user})


# @login_required
# def check_nickname(request):
#     nickname = request.GET.get('nickname')
#     is_taken = CoreUser.objects.filter(nickname=nickname).exists()
#     return JsonResponse({'available': not is_taken})


# @login_required
# def update_nickname(request):
#     if request.method == 'POST':
#         new_nickname = request.POST.get('nickname')
#         if not CoreUser.objects.filter(nickname=new_nickname).exists():
#             request.user.nickname = new_nickname
#             request.user.save()
#             return JsonResponse({'success': True})
#     return JsonResponse({'success': False})


# # ───────────────────────────────────────────────────────────
# # 2) 전통적(폼) 로그인 뷰
# # ───────────────────────────────────────────────────────────

# @anonymous_required
# def login_view(request):
#     """폼 POST로 들어오는 전통적인 로그인(ajax 사용 안 함)"""
#     if request.method == 'POST':
#         username = request.POST['username']
#         password = request.POST['password']
#         user = authenticate(request, username=username, password=password)
#         if user is not None:
#             login(request, user)
#             return redirect(reverse('core:main'))  # ← 메인 페이지로 이동
#         else:
#             return render(request, 'accounts/login.html', {"error": "Invalid credentials"})
#     return render(request, 'accounts/login.html')


# # ───────────────────────────────────────────────────────────
# # 3) AJAX 로그인 (login.js 대응)
# #    - core_user.is_staff 값이 0 또는 1인 경우만 메인 페이지 이동
# #    - 계정 미존재 / 비밀번호 오류 / is_staff 0·1 외: 거부
# # ───────────────────────────────────────────────────────────

# @csrf_exempt
# def ajax_login(request):
#     """AJAX POST /accounts/ajax-login/"""
#     if request.method != 'POST':
#         return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})

#     try:
#         body = json.loads(request.body.decode())
#         user_id    = body.get('user_id')
#         password   = body.get('password')
#         auto_login = body.get('auto_login', 0)

#         user = CoreUser.objects.filter(username=user_id).first()
#         if user is None:
#             return JsonResponse({'success': False, 'error': '아이디가 잘못되었습니다.'})

#         # ── 패스워드 검증 ──────────────────────────────────
#         #   ① 일반 Django 해시(check_password)
#         #   ② (DB에 안전하지 않게) 평문으로 저장된 경우 직접 비교
#         password_match = False
#         try:
#             password_match = user.check_password(password)
#         except Exception:
#             pass
#         if not password_match:
#             password_match = (user.password == password)

#         if not password_match:
#             return JsonResponse({'success': False, 'error': '비밀번호가 잘못되었습니다.'})
#         # ────────────────────────────────────────────────

#         if user.is_staff not in (1, 0):  # 1: 총괄, 0: 직원
#             return JsonResponse({'success': False, 'error': '접근 권한이 없습니다.'})

#         # Django 세션 로그인
#         login(request, user)

#         # 자동 로그인 여부 업데이트
#         if user.is_auto_login != auto_login:
#             user.is_auto_login = auto_login
#             user.save(update_fields=['is_auto_login'])

#         return JsonResponse({'success': True, 'redirect_url': reverse('core:main')})

#     except (json.JSONDecodeError, KeyError):
#         return JsonResponse({'success': False, 'error': '잘못된 JSON 형식입니다.'})
# # ───────────────────────────────────────────────────────────

# @csrf_exempt
# def ajax_login(request):
#     if request.method != 'POST':
#         return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})

#     try:
#         body = json.loads(request.body.decode())
#         user_id    = body.get('user_id')
#         password   = body.get('password')
#         auto_login = body.get('auto_login', 0)

#         user = CoreUser.objects.filter(username=user_id).first()
#         if user is None:
#             return JsonResponse({'success': False, 'error': '아이디가 잘못되었습니다.'})

#         # 1단계: Django 해시 검사
#         password_match = user.check_password(password)

#         # 2단계: DB에 평문이 저장돼 있을 때 대비
#         if not password_match:
#             password_match = (user.password.strip() == password.strip())

#         if not password_match:
#             return JsonResponse({'success': False, 'error': '비밀번호가 잘못되었습니다.'})

#         # is_staff 분기
#         if user.is_staff not in (0, 1):
#             return JsonResponse({'success': False, 'error': '접근 권한이 없습니다.'})

#         login(request, user)

#         if user.is_auto_login != auto_login:
#             user.is_auto_login = auto_login
#             user.save(update_fields=['is_auto_login'])

#         return JsonResponse({'success': True, 'redirect_url': reverse('core:main')})

#     except (json.JSONDecodeError, KeyError):
#         return JsonResponse({'success': False, 'error': '잘못된 JSON 형식입니다.'})


# # ───────────────────────────────────────────────────────────
# # 4) 로그인 로그 삽입
# # ───────────────────────────────────────────────────────────

# @csrf_exempt
# def ajax_insert_login_log(request):
#     if request.method != 'POST':
#         return JsonResponse({"success": False, 'error': 'POST 요청이 필요합니다.'})

#     try:
#         data = json.loads(request.body)
#         user_id = data.get('user_id')
#         user = CoreUser.objects.filter(username=user_id).first()
#         if not user:
#             return JsonResponse({'success': False, 'error': '유저를 찾을 수 없습니다.'})

#         x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
#         user_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get("REMOTE_ADDR")

#         LoginLog.objects.create(
#             user_code_id=user.user_code,
#             user_ip=user_ip,
#             login_time=timezone.now()
#         )
#         return JsonResponse({"success": True})

#     except Exception as e:
#         return JsonResponse({'success': False, 'error': str(e)})


# # ───────────────────────────────────────────────────────────
# # 5) 마지막 로그인 사용자 조회 (자동 로그인용)
# # ───────────────────────────────────────────────────────────

# def get_client_ip(request):
#     x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
#     if x_forwarded_for:
#         return x_forwarded_for.split(',')[0]
#     return request.META.get('REMOTE_ADDR')


# def get_prev_login_user(request):
#     client_ip = get_client_ip(request)
#     try:
#         last_log = (
#             LoginLog.objects.select_related('user_code')
#             .filter(user_ip=client_ip)
#             .latest('login_time')
#         )
#         user = last_log.user_code
#         response_data = {
#             'user_id': user.username,
#             'is_auto_login': user.is_auto_login,
#         }
#         return JsonResponse({'success': True, 'data': response_data})
#     except LoginLog.DoesNotExist:
#         return JsonResponse({'success': False, 'error': '해당 IP로 로그인한 기록이 없습니다.'})


# # ───────────────────────────────────────────────────────────
# # 6) 기타 단순 렌더링 뷰 (마이페이지·비밀번호재설정 등)
# # ───────────────────────────────────────────────────────────

# def repassword_view(request):
#     return render(request, 'accounts/repassword.html')

# def update_view(request):
#     return render(request, 'accounts/update.html')
















import json
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.utils import timezone

from .utils import anonymous_required
from core.models import User as CoreUser, LoginLog  # 커스텀 사용자 모델만 사용

# ───────────────────────────────────────────────────────────
# 1) 마이페이지 및 닉네임 처리
# ───────────────────────────────────────────────────────────

@login_required
def mypage_view(request):
    return render(request, 'accounts/mypage.html', {'user': request.user})


@login_required
def check_nickname(request):
    nickname = request.GET.get('nickname')
    is_taken = CoreUser.objects.filter(user_nickname=nickname).exists()
    return JsonResponse({'available': not is_taken})


@login_required
def update_nickname(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'POST 요청이 필요합니다.'}, status=405)

    # JSON body 파싱 지원
    try:
        data = json.loads(request.body)
        new_nick = data.get('nickname','').strip()
    except json.JSONDecodeError:
        new_nick = request.POST.get('nickname','').strip()

    if not new_nick:
        return JsonResponse({'success': False, 'error': '빈 닉네임은 허용되지 않습니다.'})

    if CoreUser.objects.filter(user_nickname=new_nick).exists():
        return JsonResponse({'success': False, 'error': '이미 사용 중인 닉네임입니다.'})

    # 실제 저장
    user = request.user
    user.user_nickname = new_nick
    user.save(update_fields=['user_nickname'])
    return JsonResponse({'success': True})


    # if request.method == 'POST':
    #     new_nickname = request.POST.get('nickname')
    #     if not CoreUser.objects.filter(nickname=new_nickname).exists():
    #         request.user.nickname = new_nickname
    #         request.user.save()
    #         return JsonResponse({'success': True})
    # return JsonResponse({'success': False})


# ───────────────────────────────────────────────────────────
# 2) 전통적(폼) 로그인 뷰
# ───────────────────────────────────────────────────────────

@anonymous_required
@anonymous_required                               # ← 로그인된 사용자는 /mypage 로 보냄
def login_view(request):
    """
    • GET  : 로그인 화면 렌더링
    • POST : (폼 제출 방식) 인증 후 메인(/?role=admin|user)으로 이동
      AJAX 로그인은 ajax_login()이 따로 처리하므로
      GET만 있어도 동작하지만, 폼 방식도 대비해 POST 로직을 남겨둔다.
    """
    if request.method == 'GET':
        return render(request, 'accounts/login.html')   # 로그인 페이지

    # ---- 아래는 폼 방식 로그인(OPTIONAL) --------------------
    username = request.POST.get('username')
    password = request.POST.get('password')

    user = authenticate(request, username=username, password=password)
    if user:
        login(request, user)
        role = 'admin' if user.is_superuser == 0 else 'user'
        return redirect(f"{reverse('core:main')}?role={role}")

    # 인증 실패
    return render(request, 'accounts/login.html',
                  {'error': '아이디 또는 비밀번호가 잘못되었습니다.'})


# 2025/06/07 (토토)
# @csrf_exempt
# def ajax_login(request):
#     if request.method != 'POST':
#         return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})

#     body = json.loads(request.body.decode())
#     user_id    = body.get('user_id', '').strip()
#     password   = body.get('password', '').strip()
#     auto_login = body.get('auto_login', 0)

#     # 1) 표준 인증
#     user = authenticate(request, username=user_id, password=password)

#     # 2) 실패 시 수동 검증 (해시 → 평문)
#     if user is None:
#         user = CoreUser.objects.filter(username=user_id).first()
#         if user is None:
#             return JsonResponse({'success': False, 'error': '아이디가 잘못되었습니다.'})

#         try:
#             pw_ok = user.check_password(password)          # 해시 확인
#         except Exception:
#             pw_ok = False

#         if not pw_ok and user.password.strip() == password:
#             pw_ok = True                                   # 평문 확인

#         if not pw_ok:
#             return JsonResponse({'success': False, 'error': '비밀번호가 잘못되었습니다.'})

#     # 3) redirect URL (is_superuser==1 → 관리자)
#     redirect_url = (
#         reverse('core:main') + '?role=admin' if user.is_superuser == 1
#         else reverse('core:main') + '?role=user'
#     )

#     # 4) backend 지정(표준 authenticate 경로가 아니면)
#     if not hasattr(user, 'backend'):
#         user.backend = 'django.contrib.auth.backends.ModelBackend'

#     login(request, user)            # 한 번만 호출

#     # 5) 자동 로그인 플래그 업데이트
#     if user.is_auto_login != auto_login:
#         user.is_auto_login = auto_login
#         user.save(update_fields=['is_auto_login'])

#     return JsonResponse({'success': True, 'redirect_url': redirect_url})


@csrf_exempt
def ajax_login(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})
    try:
        if request.method != 'POST':
            return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})

        body = json.loads(request.body.decode())
        user_id  = body.get('user_id', '').strip()
        password = body.get('password', '').strip()
        auto_login = body.get('auto_login', 0)

        print(f"➡ LOGIN ATTEMPT: {user_id=} {password=}")   # <- 디버그 로그

        # 1) 표준 인증
        user = authenticate(request, username=user_id, password=password)

        # 2) 실패 시 수동 검증
        if user is None:
            user = CoreUser.objects.filter(username=user_id).first()
            if user is None:
                return JsonResponse({'success': False, 'error': '아이디가 잘못되었습니다.'})

            try:
                pw_ok = user.check_password(password)
            except Exception:
                pw_ok = False
            if not pw_ok and user.password.strip() == password:
                pw_ok = True
            if not pw_ok:
                return JsonResponse({'success': False, 'error': '비밀번호가 잘못되었습니다.'})

        # 3) redirect URL
        redirect_url = (
            reverse('core:main') + '?role=admin' if user.is_superuser == 1
            else reverse('core:main') + '?role=user'
        )

        # 4) backend 지정
        if not hasattr(user, 'backend'):
            user.backend = 'django.contrib.auth.backends.ModelBackend'

        login(request, user)

        # 5) 자동 로그인 플래그
        if user.is_auto_login != auto_login:
            user.is_auto_login = auto_login
            user.save(update_fields=['is_auto_login'])

        return JsonResponse({'success': True, 'redirect_url': redirect_url})

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print("‼️ ajax_login ERROR ‼️", tb)   # 서버 콘솔에 전체 스택트레이스 출력
        # 프론트에도 trace를 넘겨줘서 F12 → Network → Response에서 바로 보도록
        return JsonResponse({'success': False, 'error': str(e), 'trace': tb}, status=500)



# ───────────────────────────────────────────────────────────
# 4) 로그인 로그 삽입
# ───────────────────────────────────────────────────────────

@csrf_exempt
def ajax_insert_login_log(request):
    if request.method != 'POST':
        return JsonResponse({"success": False, 'error': 'POST 요청이 필요합니다.'})

    try:
        data = json.loads(request.body)
        user_id = data.get('user_id')
        user = CoreUser.objects.filter(username=user_id).first()
        if not user:
            return JsonResponse({'success': False, 'error': '유저를 찾을 수 없습니다.'})

        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        user_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get("REMOTE_ADDR")

        LoginLog.objects.create(
            user_code_id=user.user_code,
            user_ip=user_ip,
            login_time=timezone.now()
        )
        return JsonResponse({"success": True})

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


# ───────────────────────────────────────────────────────────
# 5) 마지막 로그인 사용자 조회 (자동 로그인용)
# ───────────────────────────────────────────────────────────

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')


def get_prev_login_user(request):
    client_ip = get_client_ip(request)
    try:
        last_log = (
            LoginLog.objects.select_related('user_code')
            .filter(user_ip=client_ip)
            .latest('login_time')
        )
        user = last_log.user_code
        response_data = {
            'user_id': user.username,
            'is_auto_login': user.is_auto_login,
        }
        return JsonResponse({'success': True, 'data': response_data})
    except LoginLog.DoesNotExist:
        return JsonResponse({'success': False, 'error': '해당 IP로 로그인한 기록이 없습니다.'})


# ───────────────────────────────────────────────────────────
# 6) 로그아웃 뷰
# ───────────────────────────────────────────────────────────

def logout_view(request):                        # ← 추가
    logout(request)
    return redirect('core:main')


# ───────────────────────────────────────────────────────────
# 7) 단순 렌더링 뷰
# ───────────────────────────────────────────────────────────

def repassword_view(request):
    return render(request, 'accounts/repassword.html')

def update_view(request):
    return render(request, 'accounts/update.html')
