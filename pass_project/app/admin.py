from django.contrib import admin
from .models import User, Template, Draft, Image, LoginLog

# Register your models here.
admin.site.register(User)
admin.site.register(Template)
admin.site.register(Draft)
admin.site.register(Image)
admin.site.register(LoginLog)