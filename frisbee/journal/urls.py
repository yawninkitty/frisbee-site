from django.urls import path
from . import views

app_name = 'journal'

urlpatterns = [
    path('', views.article_list, name='article_list'),
    path('<slug:slug>/', views.article_detail, name='article_detail'),
    path('api/articles/', views.article_list_api, name='article_list_api'),
]