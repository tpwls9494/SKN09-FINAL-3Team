from django.urls import path
from . import views
# url 경로와 view 함수를 연결

app_name = 'user_admin'
urlpatterns = [
    path('user/', views.user_management_view, name='user'),
    path('group/', views.group_management_view, name='group'),
]


from django.urls import path
from . import views

app_name = "user_admin"

urlpatterns = [
    path('users/', views.admin_user_list, name='admin_user_list'),
    path('groups/', views.admin_group_list, name='admin_group_list'),
    path('user/create/', views.create_user, name='create_user'),
    path('group/create/', views.create_group, name='create_group'),
]
