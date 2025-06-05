from django.contrib import admin
from django.contrib.auth import get_user_model
from core.models import LoginLog, Team, TeamLog
# Django 자동 제공 관리자 페이지에서 모델을 어떻게 보여줄지 정의
# 어떤 필드를 보여줄지, 필터링이나 검색, 정렬 등을 지정 가능

User = get_user_model()

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'user_code', 'user_nickname', 'user_privilege']

@admin.register(LoginLog)
class LoginLogAdmin(admin.ModelAdmin):
    list_display = ['user_code', 'login_time', 'logout_time']

@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ['team_id', 'team_name']

@admin.register(TeamLog)
class TeamLogAdmin(admin.ModelAdmin):
    list_display = ['team_id', 'user_code', 'action_time']
