from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import UserProfile, Dog


admin.site.index_title = 'Управление сайтом'
admin.site.site_header = 'Административная панель'
admin.site.site_title = 'Фризби-портал'


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Профиль'


class CustomUserAdmin(BaseUserAdmin):
    inlines = [UserProfileInline]
    list_display = [
        'username', 'email', 'first_name', 'last_name',
        'is_staff', 'get_is_organizer', 'get_is_organizer_requested'
    ]

    def get_is_organizer(self, obj):
        return obj.profile.is_organizer if hasattr(obj, 'profile') else False
    get_is_organizer.short_description = 'Организатор'
    get_is_organizer.boolean = True

    def get_is_organizer_requested(self, obj):
        return obj.profile.is_organizer_requested if hasattr(obj, 'profile') else False
    get_is_organizer_requested.short_description = 'Запросил роль'
    get_is_organizer_requested.boolean = True


# Перерегистрируем модель User
admin.site.unregister(User)
admin.site.register(User, CustomUserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'birth_date', 'sport_class', 'is_organizer', 'is_organizer_requested')
    list_filter = ('is_organizer', 'is_organizer_requested', 'sport_class')
    search_fields = ('user__username', 'user__email')


@admin.register(Dog)
class DogAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'breed', 'height', 'sport_class')
    list_filter = ('sport_class',)
    search_fields = ('name', 'owner__username', 'breed')