from django.urls import path
from . import views

urlpatterns = [
    path('editor/', views.editor_view, name='editor_view'),
    path('download/pdf/<int:draft_id>/', views.download_pdf, name='download_pdf'),
    path('download/docx/<int:draft_id>/', views.download_docx, name='download_docx'),
]