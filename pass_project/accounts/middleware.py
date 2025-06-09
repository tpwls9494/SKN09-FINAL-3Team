# # accounts/middleware.py

# import json
# from django.contrib.auth import logout
# from django.shortcuts import redirect
# from django.utils.deprecation import MiddlewareMixin

# class EnforceAutoLogoutMiddleware(MiddlewareMixin):
#      def process_request(self, request):
#         user = getattr(request, 'user', None)
#         if user and user.is_authenticated:
            
#             # 첫 요청 건너뛰기 플래그가 있으면 바로 제거하고 통과
#             if request.session.pop('skip_auto_logout', False):
#                 return None            

#             # 자동 로그인 플래그가 꺼져 있으면 세션만 끊고, 바로 다음으로 넘어가게
#             if getattr(user, 'is_auto_login', 0) != 1:
#                 logout(request)
#                 # return None 으로 두면 이 요청은 로그아웃된 상태의 request 로 뷰가 실행됩니다.

#         return None
