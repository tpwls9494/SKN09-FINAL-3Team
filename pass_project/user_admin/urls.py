# user_admin/urls.py
from django.urls import path
from . import views

app_name = "user_admin"

urlpatterns = [
    #--------- 기본 진입점을 User 관리로 설정 ---------------------------------------
    path('', views.user_management_view, name='user'),

    #--------- Group 관리 페이지 --------------------------------------------------
    path('group/', views.group_management_view, name='group'),

    #--------- User CRUD API ----------------------------------------------------
    # POST: 새 사용자(임시) 생성
    path('create/', views.create_user, name='create_user'),
    # POST: 특정 username으로 사용자 삭제
    path('delete/', views.delete_user, name='delete_user'),
    # GET: 사용자 목록 조회
    path('list/', views.get_user_list, name='get_user_list'),
    # POST: 비밀번호 초기화
    path('reset/', views.reset_user, name='reset_user'),
    # POST: 사용자 비활성화
    path('deactivate/', views.deactivate_user, name='deactivate_user'),

    #--------- Group CRUD & 멤버 관리 API ----------------------------------------
    path('group/create/', views.create_group, name='create_group'),

    # path('group/delete/', views.delete_group, name='delete_group'),

    path("group/user/delete/", views.delete_user_from_group, name="delete_user_from_group"),

    path('group/list/', views.get_group_list, name='get_group_list'),

    path('group/assign/', views.assign_user_to_team, name='assign_user_to_team'),

    path('group/user_list/', views.group_user_list, name='group_user_partial'),

    path('group/toggle-activation/', views.toggle_team_activation, name='toggle_team_activation'),

    path('group/deactivate/', views.deactivate_group, name='deactivate_group'),

]
