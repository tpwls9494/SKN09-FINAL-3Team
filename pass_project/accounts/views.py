from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User

@login_required
def mypage_view(request):
    return render(request, 'accounts/mypage.html', {'user': request.user})

@login_required
def check_nickname(request):
    nickname = request.GET.get('nickname')
    is_taken = User.objects.filter(nickname=nickname).exists()
    return JsonResponse({'available': not is_taken})

@login_required
def update_nickname(request):
    if request.method == 'POST':
        new_nickname = request.POST.get('nickname')
        if not User.objects.filter(nickname=new_nickname).exists():
            request.user.nickname = new_nickname
            request.user.save()
            return JsonResponse({'success': True})
    return JsonResponse({'success': False})

def login_view(request):
    return render(request, 'accounts/login.html')

def mypage_view(request):
    return render(request, 'accounts/mypage.html')

def repassword_view(request):
    return render(request, 'accounts/repassword.html')

def update_view(request):
    return render(request, 'accounts/update.html')