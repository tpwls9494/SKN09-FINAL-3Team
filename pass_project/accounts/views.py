from django.shortcuts import render

def login_view(request):
    return render(request, 'accounts/login.html')

def mypage_view(request):
    return render(request, 'accounts/mypage.html')

def repassword_view(request):
    return render(request, 'accounts/repassword.html')