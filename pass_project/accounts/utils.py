from django.contrib.auth.decorators import user_passes_test
from django.urls import reverse_lazy


def anonymous_required(function=None, redirect_url=None):
    if not redirect_url:
        redirect_url = reverse_lazy('accounts:mypage')

    actual_decorator = user_passes_test(
        lambda u: not u.is_authenticated,
        login_url=redirect_url
    )

    if function:
        return actual_decorator(function)
    
    return actual_decorator