from django.urls import path
from . import views

app_name = 'assist'
urlpatterns = [
    path('', views.editor_view, name='editor'),
    path('insert_patent_report/', views.insert_patent_report, name='insert_patent_report'),
    path('insert_evaluation_result/', views.insert_evaluation_result, name='insert_evaluation_result'),
    path('select_my_history/', views.select_my_history, name='select_my_history'),
    path('select_team_history/', views.select_team_history, name="select_team_history"),
    path('update_history_main_title/', views.update_history_main_title, name='update_history_main_title'),
    path('delete_history_main/', views.delete_history_main, name='delete_history_main'),

    path('qa/', views.qa_view, name='qa'),

    path('download/pdf/<int:draft_id>/', views.download_pdf, name='download_pdf'),
    path('download/docx/<int:draft_id>/', views.download_docx, name='download_docx'),
    path('download/hwp/<int:draft_id>/', views.download_hwp, name='download_hwp'),
]