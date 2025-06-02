from django.urls import path
from . import views

app_name = 'accounts'
urlpatterns = [
    path('login/', views.login_view, name='login'),
    path('mypage/', views.mypage_view, name='mypage'),
    path('mypage/repassword/', views.repassword_view, name='repassword'),
]