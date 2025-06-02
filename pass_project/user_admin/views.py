from django.shortcuts import render

def user_management_view(request):
    return render(request, 'management/user.html')

def group_management_view(request):
    return render(request, 'management/group.html')