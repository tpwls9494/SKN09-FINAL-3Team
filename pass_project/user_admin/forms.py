from django import forms
from django.contrib.auth import get_user_model
from core.models import Team, TeamLog

User = get_user_model() # 실제 프로젝트에서 설정된 사용자 모델을 가져옴

# 팀(그룹) 생성 폼
class TeamCreateForm(forms.ModelForm):
    class Meta:
        model = Team
        fields = ['team_name']


# 팀 삭제 폼
class TeamDeleteForm(forms.Form):
    team = forms.ModelChoiceField(queryset=Team.objects.all())


# 사용자를 팀에 배치하는 폼
class AssignUserToTeamForm(forms.Form):
    user = forms.ModelChoiceField(queryset=User.objects.filter(user_left_date__isnull=True))
    team = forms.ModelChoiceField(queryset=Team.objects.all())


# 사용자 팀 제거 폼 (TeamLog 기준 삭제)
class RemoveUserFromTeamForm(forms.Form):
    user = forms.ModelChoiceField(queryset=User.objects.filter(user_left_date__isnull=True))
    team = forms.ModelChoiceField(queryset=Team.objects.all())

    def clean(self):
        cleaned_data = super().clean()
        user = cleaned_data.get('user')
        team = cleaned_data.get('team')

        if not TeamLog.objects.filter(user_code=user, team_id=team).exists():
            raise forms.ValidationError("해당 사용자는 이 팀에 속해 있지 않습니다.")
