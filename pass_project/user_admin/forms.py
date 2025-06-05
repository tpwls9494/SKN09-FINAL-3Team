# # 사용자에게 폼을 보여주고, 입력값을 검증하고 필요하면 db 저장
# # Django의 form 또는 ModelForm 클래스를 기반으로 구성됨됨
# # view 에서 이 폼을 불러서 사용하는 방식으로 진행

# from django import forms
# from django.contrib.auth import get_user_model
# from core.models import Team, TeamLog

# User = get_user_model()

# # # 1. 사용자 생성 폼
# # class UserCreateForm(forms.ModelForm):
# #     class Meta:
# #         model = User
# #         fields = ['username', 'user_nickname', 'is_auto_login', 'user_left_date']

# # 2. 그룹(Team) 생성 폼
# class TeamCreateForm(forms.ModelForm):
#     class Meta:
#         model = Team
#         fields = ['team_name']

# # 3. 사용자를 그룹에 배치하는 폼
# class AssignUserToTeamForm(forms.ModelForm):
#     class Meta:
#         model = TeamLog
#         fields = ['user_code', 'team_id']
#         widgets = {
#             'user_code': forms.Select(attrs={'class': 'form-select'}),
#             'team_id': forms.Select(attrs={'class': 'form-select'}),
#         }

# # 4. 사용자를 그룹에서 삭제할 때 사용할 선택 폼
# class RemoveUserFromTeamForm(forms.Form):
#     user_code = forms.ModelChoiceField(queryset=User.objects.all())
#     team_id = forms.ModelChoiceField(queryset=Team.objects.all())

