# competitions/urls.py
from django.urls import path
from . import views

app_name = 'competitions'

urlpatterns = [
    # ============================================================
    # ПУБЛИЧНЫЕ СТРАНИЦЫ
    # ============================================================
    path('', views.index, name='index'),
    path('competitions/', views.competition_list, name='competition_list'),
    path('competitions/<int:pk>/', views.competition_detail, name='competition_detail'),
    path('competitions/<int:pk>/results/', views.competition_results, name='competition_results'),
    path('competitions/<int:pk>/success/', views.application_success, name='application_success'),

    # ============================================================
    # РАБОТА С ЗАЯВКАМИ
    # ============================================================
    path('competitions/<int:pk>/register/', views.register_for_competition, name='register_for_competition'),

    # ============================================================
    # УПРАВЛЕНИЕ СОРЕВНОВАНИЯМИ (ОРГАНИЗАТОР)
    # ============================================================
    path('organizer/dashboard/', views.organizer_dashboard, name='organizer_dashboard'),
    path('organizer/competition/create/', views.create_competition, name='create_competition'),
    path('organizer/competition/<int:pk>/edit/', views.edit_competition, name='edit_competition'),
    path('organizer/competition/<int:pk>/manage/', views.manage_competition, name='manage_competition'),
    path('organizer/competition/<int:pk>/delete/', views.delete_competition, name='delete_competition'),
    path('organizer/competition/<int:pk>/publish/', views.publish_competition, name='publish_competition'),

    # ============================================================
    # УПРАВЛЕНИЕ ЗАЯВКАМИ (ОРГАНИЗАТОР)
    # ============================================================
    path('organizer/application/update-status/', views.update_application_status, name='update_application_status'),
    path('organizer/application/update-payment-status/', views.update_application_payment_status,
         name='update_payment_status'),

    # ============================================================
    # РАБОТА С РЕЗУЛЬТАТАМИ
    # ============================================================
    path('organizer/competition/<int:pk>/entry/<int:entry_id>/enter-results/', views.enter_results,
         name='enter_results'),
    path('organizer/result/update-data/', views.update_result_data, name='update_result_data'),
    path('organizer/result/update-status/', views.update_result_status, name='update_result_status'),
    path('organizer/competition/<int:pk>/results-api/', views.get_results_api, name='results_api'),
    path('organizer/competition/<int:pk>/update-start-order/', views.update_start_order, name='update_start_order'),

    # ============================================================
    # ЭКСПОРТ
    # ============================================================
    path('competitions/<int:pk>/export/', views.export_results, name='export_results'),
    path('competitions/<int:pk>/entries-api/', views.get_competition_entries_api, name='competition_entries_api'),

    # ============================================================
    # ПУБЛИЧНЫЕ API
    # ============================================================
    path('competitions/<int:pk>/results-api/', views.get_results_api_public, name='results_api_public'),
    path('api/competitions/all/', views.get_competitions_all_api, name='competitions_all_api'),
    path('api/competitions/filter-options/', views.get_filter_options_api, name='filter_options_api'),
    path('api/get-judges/', views.api_get_judges, name='api_get_judges'),
    path('api/filter-competitions/', views.filter_competitions, name='filter_competitions'),

    # ============================================================
    # РАБОТА С ФАЙЛАМИ
    # ============================================================
    path('api/upload-file/', views.upload_competition_file, name='upload_file'),

    # ============================================================
    # ВСПОМОГАТЕЛЬНЫЕ
    # ============================================================
    path('api/dog-card/', views.get_dog_card, name='get_dog_card'),
    path('api/application-form/', views.get_application_form_html, name='get_application_form_html'),

    path('api/competition-card-html/', views.get_competition_card_html, name='get_competition_card_html'),
]