from django.urls import path
from . import views

app_name = 'assist'
urlpatterns = [
    path('', views.editor_view, name='editor'),
    path('insert_patent_report/', views.insert_patent_report, name='insert_patent_report'),
    path('save_evaluation_simple/', views.save_evaluation_simple, name='save_evaluation_simple'),
    path('insert_evaluation_result/', views.insert_evaluation_result, name='insert_evaluation_result'),
    path('select_my_history/', views.select_my_history, name='select_my_history'),
    path('select_team_history/', views.select_team_history, name="select_team_history"),
    path('update_history_main_title/', views.update_history_main_title, name='update_history_main_title'),
    path('delete_history_main/', views.delete_history_main, name='delete_history_main'),

    # qa page
    path('qa/', views.qa_page, name='qa_page'),
    path('api/qa/ask/', views.qa_ask, name='qa_ask'),
    path('api/qa/test/', views.qa_test_connection, name='qa_test'),

    # download
    path('download/pdf/<int:draft_id>/', views.download_pdf, name='download_pdf'),
    path('download/docx/<int:draft_id>/', views.download_docx, name='download_docx'),
    path('download/hwp/<int:draft_id>/', views.download_hwp, name='download_hwp'),

    #rag
    path('api/test-rag/', views.test_rag_connection, name='test_rag'),
    path('api/rag-status/', views.rag_status, name='rag_status'),

    #한번에
    path('api/ask/', views.ask_question, name='ask_question'),
    path('demo/', views.rag_demo, name='rag_demo'),

    #스트리밍
    path('api/ask-stream/', views.ask_question_stream, name='ask_question_stream'),
    path('demo-stream/', views.rag_demo_stream, name='rag_demo_stream'),
    
    # assist
    path('api/assist/ask/', views.assist_ask, name='assist_ask'),
    path('api/qwen/assist-stream/', views.assist_stream, name='assist_stream'),
    
    path('api/assist/edit/',     views.assist_edit,     name='assist_edit'),
    path('api/assist/evaluate/', views.assist_evaluate, name='assist_evaluate'),
    path('api/assist/generate/', views.assist_generate, name='assist_generate'),
]
