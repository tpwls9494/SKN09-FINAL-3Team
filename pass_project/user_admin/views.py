from django.shortcuts import render
# 해당 url에 도달했을 때 실제 처리 로직 실행

def user_management_view(request):
    return render(request, 'user_admin/user.html')

def group_management_view(request):
    return render(request, 'user_admin/group.html')

def group_management_view(request):
    groups = ["R&D", "QA", "AI Research", "group4"]  # 추후 DB에서 받아와도 됨
    return render(request, 'user_admin/group.html', {'groups': groups})


from django.shortcuts import render, redirect
from django.contrib.auth import get_user_model
from core.models import LoginLog, Team, TeamLog
# from .forms import AdminUserCreateForm, TeamAssignmentForm

User = get_user_model()

def admin_user_list(request):
    users = User.objects.all()
    login_logs = LoginLog.objects.select_related('user_code').all()
    return render(request, 'user_admin/user_list.html', {
        'users': users,
        'login_logs': login_logs
    })

def admin_group_list(request):
    teams = Team.objects.all()
    team_logs = TeamLog.objects.select_related('user_code', 'team_id').all()
    return render(request, 'user_admin/group_list.html', {
        'teams': teams,
        'team_logs': team_logs
    })

def create_user(request):
    if request.method == 'POST':
        form = AdminUserCreateForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('user_admin:admin_user_list')
    else:
        form = AdminUserCreateForm()
    return render(request, 'user_admin/user_form.html', {'form': form})

def create_group(request):
    if request.method == 'POST':
        # 그룹 생성 로직 추가
        pass
    return render(request, 'user_admin/group_form.html')
