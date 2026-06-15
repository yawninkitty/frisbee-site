# users/urls.py
from django.urls import path
from . import views

app_name = 'users'

urlpatterns = [
    # Регистрация
    path('sign-up/', views.sign_up, name='sign_up'),
    path('sign-up-success/', views.sign_up_success, name='sign_up_success'),

    # Профиль
    path('profile/', views.profile, name='profile'),
    path('profile/edit/', views.edit_profile_api, name='edit_profile'),
    path('request-organizer/', views.request_organizer, name='request_organizer'),
    path('password-change/', views.change_password, name='password_change'),

    # Заявки
    path('application/<int:app_id>/cancel/', views.cancel_application, name='cancel_application'),
    path('application/upload-receipt/', views.upload_application_receipt, name='upload_receipt'),
    path('application/<int:app_id>/approve/', views.approve_by_owner, name='approve_by_owner'),
    path('application/<int:app_id>/reject/', views.reject_by_owner, name='reject_by_owner'),

    # Собаки
    path('dogs/', views.get_other_dogs, name='get_other_dogs'),
    path('dog/add/', views.add_dog, name='add_dog'),
    path('dog/<int:dog_id>/edit/', views.edit_dog, name='edit_dog'),
    path('dog/<int:dog_id>/delete/', views.delete_dog, name='delete_dog'),
    path('dog/<int:dog_id>/', views.get_dog, name='get_dog'),
    path('dog-card/', views.get_dog_card, name='get_dog_card'),

    # Уведомления
    path('notifications/', views.notifications_view, name='notifications'),
    path('notifications/mark-all/', views.mark_notifications_read, name='mark_notifications_read'),
    path('notifications/unread-count/', views.unread_notifications_count, name='unread_count'),

    # Публичные страницы
    path('users-list/', views.users_list, name='users_list'),
    path('<int:pk>/', views.user_profile, name='user_profile'),
    path('dogs/<int:pk>/', views.dog_profile, name='dog_profile'),

    # API
    path('api/users/', views.get_users_api, name='get_users_api'),
    path('api/dogs/', views.get_dogs_api, name='get_dogs_api'),
    path('api/dog-card-html/', views.get_dog_card_html, name='get_dog_card_html'),
    path('api/dog-modal/', views.get_dog_modal_html, name='get_dog_modal_html'),
    path('api/user-dogs/', views.get_user_dogs_html, name='user_dogs'),

    path('profile/change-email/', views.change_email, name='change_email'),
    path('profile/delete/', views.delete_account, name='delete_account'),
    path('upload-receipt-temp/', views.upload_receipt_temp_file, name='upload_receipt_temp'),
    path('remove-receipt-temp/', views.remove_receipt_temp_file, name='remove_receipt_temp'),

    path('api/user-card-html/', views.get_user_card_html, name='get_user_card_html'),
    path('api/dog-card-html-for-list/', views.get_dog_card_html_for_list, name='get_dog_card_html_for_list'),
]