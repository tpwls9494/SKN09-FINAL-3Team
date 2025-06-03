from django.shortcuts import render

def user_management_view(request):
    return render(request, 'user_admin/user.html')

def group_management_view(request):
    return render(request, 'user_admin/group.html')
