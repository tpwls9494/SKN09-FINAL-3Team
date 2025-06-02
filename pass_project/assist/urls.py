from django.urls import path
from . import views

app_name = 'assist'
urlpatterns = [
    path('', views.editor_view, name='editor'),
    path('qna/', views.qna_view, name='qna'),
]