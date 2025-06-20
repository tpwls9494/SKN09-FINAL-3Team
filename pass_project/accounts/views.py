# # 2025/06/09 월요일 yunhwane - testing

# import json
# from django.shortcuts import render, redirect
# from django.urls import reverse
# from django.views.decorators.csrf import csrf_exempt
# from django.http import JsonResponse
# from django.contrib.auth import authenticate, login, logout
# from django.contrib.auth import logout as auth_logout
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
#     is_taken = CoreUser.objects.filter(user_nickname=nickname).exists()
#     return JsonResponse({'available': not is_taken})

# @login_required
# def update_nickname(request):
#     if request.method != 'POST':
#         return JsonResponse({'success': False, 'error': 'POST 요청이 필요합니다.'}, status=405)

#     try:
#         data = json.loads(request.body)
#         new_nick = data.get('nickname','').strip()
#     except json.JSONDecodeError:
#         new_nick = request.POST.get('nickname','').strip()

#     if not new_nick:
#         return JsonResponse({'success': False, 'error': '빈 닉네임은 허용되지 않습니다.'})

#     if CoreUser.objects.filter(user_nickname=new_nick).exists():
#         return JsonResponse({'success': False, 'error': '이미 사용 중인 닉네임입니다.'})

#     user = request.user
#     user.user_nickname = new_nick
#     user.save(update_fields=['user_nickname'])
#     return JsonResponse({'success': True})

# # ───────────────────────────────────────────────────────────
# # 2) 전통적(폼) 로그인 뷰
# # ───────────────────────────────────────────────────────────

# @anonymous_required
# def login_view(request):
#     if request.method == 'GET':
#         return render(request, 'accounts/login.html')

#     username = request.POST.get('username')
#     password = request.POST.get('password')
#     user = authenticate(request, username=username, password=password)
#     if user:
#         login(request, user)
#         role = 'admin' if user.is_superuser == 0 else 'user'

#     # 기본: 브라우저 종료 시 세션 만료 (SESSION_EXPIRE_AT_BROWSER_CLOSE=True 적용)
#     # '로그인 상태 유지' 체크했을 때만 장기 만료로 연장
#     if request.POST.get('auto_login') == '1':
#         request.session.set_expiry(None)  # settings.SESSION_COOKIE_AGE 사용

#         return redirect(f"{reverse('core:main')}?role={role}")

#     return render(request, 'accounts/login.html', {'error': '아이디 또는 비밀번호가 잘못되었습니다.'})

# # ───────────────────────────────────────────────────────────
# # 3) AJAX 로그인
# # ───────────────────────────────────────────────────────────

# @csrf_exempt
# def ajax_login(request):
#     if request.method != 'POST':
#         return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})
#     try:
#         body = json.loads(request.body.decode())
#         user_id  = body.get('user_id', '').strip()
#         password = body.get('password', '').strip()
#         auto_login = body.get('auto_login', 0)

#         # -------------------------- 비활성화 계정인지 확인 --------------------------

#         user_obj = CoreUser.objects.filter(username=user.id).first()
#         if user_id and not user_obj.is_active:
#             return JsonResponse({
#                 'success': False,
#                 'error': 'inactive_account'
#             })

#         # ------------------------------------------------------------------------ 

#         user = authenticate(request, username=user_id, password=password)
#         if user is None:
#             user = CoreUser.objects.filter(username=user_id).first()
#             if user is None:
#                 return JsonResponse({'success': False, 'error': '아이디가 잘못되었습니다.'})
#             try:
#                 pw_ok = user.check_password(password)
#             except Exception:
#                 pw_ok = False
#             if not pw_ok and user.password.strip() == password:
#                 pw_ok = True
#             if not pw_ok:
#                 return JsonResponse({'success': False, 'error': '비밀번호가 잘못되었습니다.'})

#         redirect_url = (
#             reverse('core:main') + '?role=admin' if user.is_superuser == 1
#             else reverse('core:main') + '?role=user'
#         )
#         if not hasattr(user, 'backend'):
#             user.backend = 'django.contrib.auth.backends.ModelBackend'
        
#         login(request, user)

#         # ‘로그인 상태 유지’ 꺼짐 시, 다음 요청에서만 세션 만료 로직을 건너뛰도록
#         if auto_login == 0:
#             request.session['skip_auto_logout'] = True

#         # 기본: 브라우저 종료 시 세션 만료
#         if auto_login == 1:
#             request.session.set_expiry(None)
#         else:
#             request.session.set_expiry(0)

#         if user.is_auto_login != auto_login:
#             user.is_auto_login = auto_login
#             user.save(update_fields=['is_auto_login'])
#         return JsonResponse({'success': True, 'redirect_url': redirect_url})

#     except Exception as e:
#         import traceback
#         tb = traceback.format_exc()
#         print("‼️ ajax_login ERROR ‼️", tb)
#         return JsonResponse({'success': False, 'error': str(e), 'trace': tb}, status=500)

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
#         user_ip = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')
#         LoginLog.objects.create(
#             user_code_id=user.user_code,
#             user_ip=user_ip,
#             login_time=timezone.now()
#         )
#         return JsonResponse({"success": True})
#     except Exception as e:
#         return JsonResponse({'success': False, 'error': str(e)})

# # ───────────────────────────────────────────────────────────
# # 5) 마지막 로그인 사용자 조회
# # ───────────────────────────────────────────────────────────

# def get_client_ip(request):
#     x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
#     return x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')

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
# # 6) 로그아웃 뷰
# # ───────────────────────────────────────────────────────────


# def logout_view(request):
#     """
#     로그아웃 시 가장 최근에 생성된 LoginLog 레코드의 logout_time을 채우고
#     세션을 종료한 뒤 로그인 페이지(또는 메인)로 리다이렉트합니다.
#     """
#     if request.user.is_authenticated:
#         # user_code FK로 묶인 최근 로그 하나 꺼내오기
#         try:
#             log = LoginLog.objects.filter(user_code=request.user).latest('login_time')
#             if not log.logout_time:
#                 log.logout_time = timezone.now()
#                 log.save()
#         except LoginLog.DoesNotExist:
#             pass
#         auth_logout(request)
#     # 로그아웃 후 리다이렉트할 URL로 변경하세요
#     return redirect('accounts:login')


# # ───────────────────────────────────────────────────────────
# # 7) 비밀번호 재설정 페이지 렌더링
# # ───────────────────────────────────────────────────────────

# def repassword_view(request):
#     return render(request, 'accounts/repassword.html')

# # ───────────────────────────────────────────────────────────
# # 8) 비밀번호 체크 및 업데이트
# # ───────────────────────────────────────────────────────────

# @login_required
# @csrf_exempt
# def check_current_password(request):
#     body = json.loads(request.body.decode())
#     pw   = body.get('password', '')
#     return JsonResponse({'match': request.user.check_password(pw)})

# @login_required
# @csrf_exempt
# def update_password(request):
#     body = json.loads(request.body.decode())
#     new_pw = body.get('new_password', '').strip()
#     if not new_pw:
#         return JsonResponse({'success': False, 'error': '비밀번호를 입력해주세요.'})
    
#     user = request.user
#     user.set_password(new_pw)
#     user.save()

#     logout(request)
    
#     return JsonResponse({
#         'success': True,
#         'redirect_url': reverse('accounts:login')
#         })

# # ───────────────────────────────────────────────────────────
# # 9) 기타 뷰
# # ───────────────────────────────────────────────────────────

# def update_view(request):
#     return render(request, 'accounts/update.html')
















import json
import logging
from django.shortcuts import render, redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.utils import timezone

from .utils import anonymous_required
from core.models import User as CoreUser, LoginLog  # 커스텀 사용자 모델만 사용

logger = logging.getLogger(__name__)

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

    try:
        data = json.loads(request.body)
        new_nick = data.get('nickname','').strip()
    except json.JSONDecodeError:
        new_nick = request.POST.get('nickname','').strip()

    if not new_nick:
        return JsonResponse({'success': False, 'error': '빈 닉네임은 허용되지 않습니다.'})

    if CoreUser.objects.filter(user_nickname=new_nick).exists():
        return JsonResponse({'success': False, 'error': '이미 사용 중인 닉네임입니다.'})

    user = request.user
    user.user_nickname = new_nick
    user.save(update_fields=['user_nickname'])
    return JsonResponse({'success': True})

# ───────────────────────────────────────────────────────────
# 2) 전통적(폼) 로그인 뷰
# ───────────────────────────────────────────────────────────

@anonymous_required
def login_view(request):
    if request.method == 'GET':
        return render(request, 'accounts/login.html')

    username = request.POST.get('username')
    password = request.POST.get('password')
    user = authenticate(request, username=username, password=password)
    if user:
        login(request, user)
        role = 'admin' if user.is_superuser == 0 else 'user'

    if request.POST.get('auto_login') == '1':
        request.session.set_expiry(None)
        return redirect(f"{reverse('core:main')}?role={role}")

    return render(request, 'accounts/login.html', {'error': '아이디 또는 비밀번호가 잘못되었습니다.'})

# ───────────────────────────────────────────────────────────
# 3) AJAX 로그인
# ───────────────────────────────────────────────────────────

@csrf_exempt
def ajax_login(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': '잘못된 요청입니다.'})
    try:
        data = json.loads(request.body.decode())
        user_id   = data.get('user_id', '').strip()
        password  = data.get('password', '').strip()
        auto_login = data.get('auto_login', 0)

        # 1) 사용자 존재 확인
        user = CoreUser.objects.filter(username=user_id).first()
        if not user:
            return JsonResponse({'success': False, 'error': '아이디가 잘못되었습니다.'})

        # 2) 비활성화 계정 체크
        if not user.is_active:
            return JsonResponse({'success': False, 'error': 'inactive_account'})

        # 3) 비밀번호 검사
        if not user.check_password(password):
            return JsonResponse({'success': False, 'error': '비밀번호가 잘못되었습니다.'})

        # 4) 인증 백엔드 지정 및 로그인
        user.backend = 'django.contrib.auth.backends.ModelBackend'
        login(request, user)

        # 5) 세션 만료 설정
        if auto_login == 1:
            request.session.set_expiry(None)
        else:
            request.session.set_expiry(0)

        # 6) 로그인 로그 남기기 (optional)
        # LoginLog.objects.create(user_code=user, user_ip=... )

        # 7) 리다이렉트 URL 반환
        redirect_url = reverse('core:main')
        return JsonResponse({'success': True, 'redirect_url': redirect_url})

    except Exception:
        logger.error("ajax_login ERROR", exc_info=True)
        return JsonResponse({'success': False, 'error': '서버 에러가 발생했습니다.'}, status=500)

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
        xff = request.META.get('HTTP_X_FORWARDED_FOR')
        user_ip = xff.split(',')[0] if xff else request.META.get('REMOTE_ADDR')
        LoginLog.objects.create(
            user_code_id=user.user_code,
            user_ip=user_ip,
            login_time=timezone.now()
        )
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

# ───────────────────────────────────────────────────────────
# 5) 마지막 로그인 사용자 조회
# ───────────────────────────────────────────────────────────

def get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0] if xff else request.META.get('REMOTE_ADDR')

def get_prev_login_user(request):
    client_ip = get_client_ip(request)
    try:
        last_log = (
            LoginLog.objects.select_related('user_code')
            .filter(user_ip=client_ip)
            .latest('login_time')
        )
        user = last_log.user_code
        return JsonResponse({
            'success': True,
            'data': {'user_id': user.username, 'is_auto_login': user.is_auto_login}
        })
    except LoginLog.DoesNotExist:
        return JsonResponse({'success': False, 'error': '해당 IP로 로그인한 기록이 없습니다.'})

# ───────────────────────────────────────────────────────────
# 6) 로그아웃 뷰
# ───────────────────────────────────────────────────────────

# def logout_view(request):
#     if request.user.is_authenticated:
#         try:
#             log = LoginLog.objects.filter(user_code=request.user).latest('login_time')
#             if not log.logout_time:
#                 log.logout_time = timezone.now()
#                 log.save()
#         except LoginLog.DoesNotExist:
#             pass
#         auth_logout(request)
#     return redirect('accounts:login')

from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import logout as auth_logout

# … (중략) …

def logout_view(request):
    """
    1) 가장 최근 LoginLog의 logout_time을 채우고
    2) 세션을 끊은 뒤
    3) 이전에 로그인했던 권한(role)에 따라 메인 페이지로 리다이렉트
    """
    was_admin = False
    if request.user.is_authenticated:
        # 로그아웃 전 관리자 여부 저장
        was_admin = request.user.is_superuser == 1
        # 로그아웃 시간 기록
        try:
            log = LoginLog.objects.filter(user_code=request.user).latest('login_time')
            if not log.logout_time:
                log.logout_time = timezone.now()
                log.save()
        except LoginLog.DoesNotExist:
            pass
        # 실제 로그아웃
        auth_logout(request)

    # role 파라미터 결정 (관리자면 admin, 아니면 user)
    role = 'admin' if was_admin else 'user'
    return redirect(f"{reverse('core:main')}?role={role}")



# ───────────────────────────────────────────────────────────
# 7) 비밀번호 재설정 외 기타 뷰
# ───────────────────────────────────────────────────────────

def repassword_view(request):
    return render(request, 'accounts/repassword.html')

@login_required
@csrf_exempt
def check_current_password(request):
    body = json.loads(request.body.decode())
    return JsonResponse({'match': request.user.check_password(body.get('password', ''))})

@login_required
@csrf_exempt
def update_password(request):
    body = json.loads(request.body.decode())
    new_pw = body.get('new_password', '').strip()
    if not new_pw:
        return JsonResponse({'success': False, 'error': '비밀번호를 입력해주세요.'})
    request.user.set_password(new_pw)
    request.user.save()
    auth_logout(request)
    return JsonResponse({'success': True, 'redirect_url': reverse('accounts:login')})

def update_view(request):
    return render(request, 'accounts/update.html')
