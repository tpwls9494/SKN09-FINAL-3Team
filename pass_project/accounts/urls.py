from django.urls import path
from . import views

app_name = 'accounts'
urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('ajax-login/', views.ajax_login, name='ajax_login'),
    path('ajax-insert-login-log/', views.ajax_insert_login_log, name='ajax_insert_login_log'),
    path('get-prev-login-user/', views.get_prev_login_user, name='get_prev_login_user'),
    path('mypage/', views.mypage_view, name='mypage'),
    path('mypage/repassword/', views.repassword_view, name='repassword'),
]