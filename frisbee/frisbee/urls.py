from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from users import views as user_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('competitions.urls')),
    path('users/', include('users.urls')),
    path('journal/', include('journal.urls')),

    path('profile/', user_views.profile, name='profile'),

    # Аутентификация
    path('login/', auth_views.LoginView.as_view(template_name='users/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('sign-up/', user_views.sign_up, name='sign_up'),
    path('sign-up-success/', user_views.sign_up_success, name='sign_up_success'),
    path('captcha/', include('captcha.urls')),

    path("ckeditor5/", include('django_ckeditor_5.urls')),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)