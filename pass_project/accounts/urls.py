from django.urls import path
from . import views

app_name = 'accounts'
urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('mypage/', views.mypage_view, name='mypage'),
    path('nickname/check/', views.check_nickname, name='check_nickname'),
    path('nickname/update/', views.update_nickname, name='update_nickname'),
    path('mypage/repassword/', views.repassword_view, name='repassword'),
    path('update/', views.update_view, name='update'),
]

