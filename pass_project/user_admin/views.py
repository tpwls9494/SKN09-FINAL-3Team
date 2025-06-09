from django.views.decorators.http import require_POST, require_GET
from django.http import JsonResponse
from django.contrib.auth import get_user_model
from django.shortcuts import render, get_object_or_404
import json
from core.models import LoginLog, TeamLog, Team
from .forms import *
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import user_passes_test
from collections import defaultdict
from django.shortcuts import render

# 해당 url에 도달했을 때 실제 처리 로직 실행

User = get_user_model()

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
def user_management_view(request):
    """
    사용자 관리 페이지 진입 시, 현재 DB에 있는 사용자 목록을 템플릿으로 넘깁니다.
    """
    users = User.objects.all().order_by('username')
    login_logs = LoginLog.objects.select_related('user_code').order_by('-login_time')[:20]
    return render(request, 'user_admin/user.html', {
        'users': users,
        'login_logs': login_logs,
        })

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
@require_POST
def create_user(request):
    """
    모달을 열 때 즉시 호출되는 API.
    새로운 사용자(user-XXX 형태)를 만들고, 
    JSON으로 생성된 username/password를 돌려줍니다.
    """
    base = "user"
    count = User.objects.count() + 1
    # user-001, user-002, ... 형식
    new_user_id = f"{base}-{count:03d}"
    default_password = "1111"
    new_user = User.objects.create_user(username=new_user_id, password=default_password)
    return JsonResponse({
        "success": True,
        "username": new_user.username,
        "password": default_password,
    })

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
@require_POST
@csrf_exempt 
def create_group(request):
    if request.headers.get('Content-Type') == 'application/json':
        import json
        data = json.loads(request.body)
        form = TeamCreateForm(data)

        if form.is_valid():
            team = form.save()
            return JsonResponse({
                'success': True,
                'team_id': team.team_id,
                'team_name': team.team_name
            })
        else:
            return JsonResponse({
                'success': False,
                'error': form.errors.get_json_data()
            }, status=400)

    return JsonResponse({'success': False, 'error': 'Invalid request'}, status=400)

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
@require_POST
def delete_user(request):
    """
    취소 버튼을 눌렀을 때 호출되는 API.
    모달에 표시된 username을 받아서, 방금 생성된 임시 계정을 삭제합니다.
    """
    import json
    data = json.loads(request.body.decode('utf-8') or "{}")
    username = data.get("username")
    if not username:
        return JsonResponse({"success": False, "error": "username을 전달해주세요."})
    try:
        user = get_object_or_404(User, username=username)
        user.delete()
        return JsonResponse({"success": True})
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)})
    
# @require_POST
# @csrf_exempt
# def delete_group(request):
#     """
#     그룹 삭제를 눌렀을 떄 호출되는 API,
#     DB 에서 해당 그룹을 삭제함
#     """
#     if request.method == 'POST':
#         # 그룹 삭제 로직 추가
#         pass
#     return render(request, 'user_admin/group_form.html')

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
def get_user_list(request):
    """
    사용자 목록을 JSON으로 반환합니다.
    """
    users = User.objects.all().order_by("username")
    data = [
        {"username": user.username}
        for user in users
    ]
    return JsonResponse(data, safe=False)

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
def get_group_list(request):
    groups = Team.objects.all().order_by('-team_id')
    data = [{'team_id': group.team_id, 'team_name': group.team_name} for group in groups]
    return JsonResponse({'groups': data})

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
@require_POST
def reset_user(request):
    """
    POST로 받은 username 사용자의 비밀번호를 '1111'로 초기화
    요청 Body: { "username": "user-123" }
    응답: { "success": true } 또는 { "success": false, "error": "에러 메시지" }
    """
    try:
        body_unicode = request.body.decode('utf-8')
        data = json.loads(body_unicode)
        username = data.get('username', None)
        if not username:
            return JsonResponse({'success': False, 'error': 'username이 전달되지 않았습니다.'})

        # 해당 username의 User 객체 가져오기
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': '해당 사용자를 찾을 수 없습니다.'})

        # 비밀번호 초기화
        user.set_password('1111')
        user.save()

        return JsonResponse({'success': True})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '잘못된 JSON 형식입니다.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
@require_POST
def deactivate_user(request):
    """
    POST 요청으로 받은 username 사용자의 is_active를 False로 설정하여
    해당 사용자가 더 이상 로그인·활동할 수 없도록 처리합니다.
    """
    try:
        body_unicode = request.body.decode('utf-8')
        data = json.loads(body_unicode)
        username = data.get('username')

        if not username:
            return JsonResponse({'success': False, 'error': 'username이 전달되지 않았습니다.'})

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': f'"{username}" 사용자를 찾을 수 없습니다.'})

        # 이미 비활성화된 사용자라면
        if not user.is_active:
            return JsonResponse({'success': False, 'error': f'"{username}" 사용자는 이미 정지된 상태입니다.'})

        # is_active를 False로 설정하여 로그인 차단
        user.is_active = False
        user.save()

        return JsonResponse({'success': True})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': '잘못된 JSON 형식입니다.'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)  
@require_POST
@csrf_exempt
def assign_user_to_team(request):
    import json
    data = json.loads(request.body)
    username = data.get("username")
    team_id = data.get("team_id")

    try:
        user = User.objects.get(username=username)
        team = Team.objects.get(team_id=team_id)

        # ✅ TeamLog에 기록
        TeamLog.objects.create(
            user_code=user,
            team_id=team,
        )

        return JsonResponse({"success": True, "message": f"{username} 그룹 배정 완료"})

    except User.DoesNotExist:
        return JsonResponse({"success": False, "error": "사용자 없음"}, status=400)
    except Team.DoesNotExist:
        return JsonResponse({"success": False, "error": "그룹 없음"}, status=400)

    
@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
@require_GET
def group_user_list(request):
    group_data = []

    groups = Team.objects.all().order_by('-team_id')
    for group in groups:
        logs = TeamLog.objects.filter(team_id=group).select_related('user_code')
        users = [log.user_code for log in logs]

        group_data.append({
            'team_id': group.team_id,
            'team_name': group.team_name,
            'users': users,
        })

    return render(request, 'user_admin/group.html', {
        'groups': group_data,
    })

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
def group_management_view(request):
    group_data = []
    groups = Team.objects.all().order_by('-team_id')

    for group in groups:
        # 사용자별 최신 로그만 고려하기 위해 정리
        logs = TeamLog.objects.filter(team_id=group).order_by('user_code', '-action_time')
        latest_logs = {}
        for log in logs:
            uid = log.user_code.user_code
            if uid not in latest_logs:
                latest_logs[uid] = log  # 가장 최신 로그만 유지

        # 짝수 번째 작업은 삭제 상태로 간주
        user_action_counts = defaultdict(int)
        for log in TeamLog.objects.filter(team_id=group):
            user_action_counts[log.user_code.user_code] += 1

        users = []
        for uid, log in latest_logs.items():
            if user_action_counts[uid] % 2 == 1:  # 홀수면 현재 그룹에 포함된 상태
                last_login = log.user_code.loginlog_set.last()
                is_logged_in = last_login and last_login.logout_time is None
                users.append({
                    "username": log.user_code.username,
                    "user_code": str(log.user_code.user_code),
                    "user_nickname": log.user_code.user_nickname,
                    "is_active": log.user_code.is_active,
                    "is_logged_in": is_logged_in,
                })

        group_data.append({
            'team_id': group.team_id,
            'team_name': group.team_name,
            'users': users,
        })

    return render(request, 'user_admin/group.html', {
        'groups': group_data
    })

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
def get_group_users(request, team_id):
    logs = TeamLog.objects.filter(team_id=team_id).select_related('user_code')
    users = [{"username": log.user_code.username} for log in logs]
    return JsonResponse({"users": users})

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
@require_POST
@csrf_exempt
def delete_user_from_group(request):
    import json
    data = json.loads(request.body)
    user_code = data.get("user_code")
    username = data.get("username")
    team_id = data.get("team_id")

    try:
        user = User.objects.get(user_code=user_code)
        team = Team.objects.get(team_id=team_id)

        TeamLog.objects.create(
             team_id=team,
            user_code=user,
        
        )

        return JsonResponse({"success": True, "message": f"{username} 그룹 제거 완료"})

    except User.DoesNotExist:
        return JsonResponse({"success": False, "error": "사용자 없음"}, status=400)
    except Team.DoesNotExist:
        return JsonResponse({"success": False, "error": "그룹 없음"}, status=400)

@user_passes_test(lambda u: u.is_authenticated and u.is_superuser)
def group_user_partial(request):
    from .models import Team
    groups = Team.objects.prefetch_related('users', 'users__loginlog_set').all()
    return render(request, 'user_admin/group_user_partial.html', {'groups': groups})
