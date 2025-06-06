from django import forms
from django.contrib.auth import get_user_model
from .models import Team, TeamLog

User = get_user_model() # 실제 프로젝트에서 설정된 사용자 모델을 가져옴


# ✅ 1. 사용자 생성 폼
# 사용자 생성을 위한 폼 정의 
class UserCreateForm(forms.ModelForm): # ModelForm은 특정 모델과 직접 연결되어 풀 필드를 자동 생성함
    password = forms.CharField(widget=forms.PasswordInput)

    class Meta:
        model = User
        fields = ['username', 'password', 'user_nickname', 'is_auto_login']

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user


# ✅ 2. 사용자 탈퇴 처리 폼
class UserDeactivateForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['user_left_date']


# ✅ 3. 팀(그룹) 생성 폼
class TeamCreateForm(forms.ModelForm):
    class Meta:
        model = Team
        fields = ['team_name']


# ✅ 4. 팀 삭제 폼
class TeamDeleteForm(forms.Form):
    team = forms.ModelChoiceField(queryset=Team.objects.all())


# ✅ 5. 사용자를 팀에 배치하는 폼
class AssignUserToTeamForm(forms.Form):
    user = forms.ModelChoiceField(queryset=User.objects.filter(user_left_date__isnull=True))
    team = forms.ModelChoiceField(queryset=Team.objects.all())


# ✅ 6. 사용자 팀 제거 폼 (TeamLog 기준 삭제)
class RemoveUserFromTeamForm(forms.Form):
    user = forms.ModelChoiceField(queryset=User.objects.filter(user_left_date__isnull=True))
    team = forms.ModelChoiceField(queryset=Team.objects.all())

    def clean(self):
        cleaned_data = super().clean()
        user = cleaned_data.get('user')
        team = cleaned_data.get('team')

        if not TeamLog.objects.filter(user_code=user, team_id=team).exists():
            raise forms.ValidationError("해당 사용자는 이 팀에 속해 있지 않습니다.")
