from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Competition, PaymentMethod, OrganizerContact,
    Entry, Application, Result, CompetitionFile, ApplicationEntry
)
from django import forms
from django.utils.safestring import mark_safe
from django.contrib import admin
from django.urls import reverse
from django.http import JsonResponse
from .models import Result, Application, Entry

### кастомные формы для админки ###

class OrganizerContactInline(admin.TabularInline):
    """
    Inline для контактов организатора.
    TabularInline — компактный табличный вид (в отличие от StackedInline).
    """
    model = OrganizerContact
    extra = 1                      # показывать 1 пустую строку для добавления
    fields = ('contact_type', 'value')
    verbose_name = 'Контакт организатора'
    verbose_name_plural = 'Контакты организатора'

class CompetitionFileInline(admin.TabularInline):
    model = CompetitionFile
    extra = 1
    fields = ('title', 'file', 'order')
    verbose_name = 'Файл'
    verbose_name_plural = 'Файлы (регламенты, правила и т.д.)'

### конец кастомных форм админки ###

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    """
    Способы оплаты — простой справочник.
    """
    list_display = ('code', 'name')          # колонки
    list_editable = ('name',)                # можно редактировать название прямо из списка


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    """
    Админка для управления соревнованиями.
    """
    list_display = ('title', 'date', 'organizer', 'location_type', 'is_registration_open')
    list_filter = ('date', 'location_type', 'organizer')
    search_fields = ('title', 'location')
    date_hierarchy = 'date'  # навигация по датам вверху страницы
    filter_horizontal = ('payment_methods',)  # удобный виджет для ManyToMany (два списка)
    inlines = [OrganizerContactInline, CompetitionFileInline]

    fieldsets = (
        ('Основное', {
            'fields': ('title', 'organizer', 'description')
        }),
        ('Даты и место', {
            'fields': ('date', 'registration_deadline', 'location', 'location_type')
        }),
        ('Оплата', {
            'fields': ('payment_deadline', 'payment_methods'),
            'classes': ('collapse',)  # сворачиваемый блок
        }),
    )

    def is_registration_open(self, obj):
        if obj.is_registration_open():
            return mark_safe('<span style="color:green;">✓ Открыта</span>')
        return mark_safe('<span style="color:red;">✗ Закрыта</span>')

    is_registration_open.short_description = 'Запись'


@admin.register(Entry)
class EntryAdmin(admin.ModelAdmin):
    """
    Админка для управления зачётами.
    """
    list_display = ('competition', 'discipline', 'sport_class', 'fee', 'can_enter_without_class')
    list_filter = ('discipline', 'sport_class', 'can_enter_without_class')
    search_fields = ('competition__title',)

    # Убираем 'fields' и оставляем только 'fieldsets'
    fieldsets = (
        ('Соревнование', {
            'fields': ('competition',)
        }),
        ('Зачёт', {
            'fields': ('discipline', 'sport_class', 'fee', 'can_enter_without_class')  # ← добавили новое поле
        }),
        ('Судья', {
            'fields': ('judge_name',),  # убрал 'judge', если нет такого поля
            'description': 'Укажите судью (введите имя вручную)'
        }),
    )

    def get_judge_display(self, obj):
        """Отображаем судью (красиво)"""
        return obj.get_judge_display()

    get_judge_display.short_description = 'Судья'


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    """
    Админка для управления заявками.
    """
    list_display = ('user', 'dog', 'competition', 'status', 'payment_status', 'created_at', 'add_result_link')
    list_filter = ('status', 'payment_status', 'competition')
    search_fields = ('user__username', 'dog__name', 'competition__title')

    def get_fieldsets(self, request, obj=None):
        # Базовые поля, которые видны всегда
        fieldsets = (
            ('Участник', {
                'fields': ('user', 'dog')
            }),
            ('Соревнование', {
                'fields': ('competition',)
            }),
        )

        # Если заявка одобрена — показываем статус оплаты и чек
        if obj and obj.status == 'approved':
            fieldsets += (
                ('Статусы', {
                    'fields': ('status', 'payment_status')
                }),
                ('Чек об оплате', {
                    'fields': ('payment_receipt',),
                    'classes': ('collapse',)
                }),
            )
        else:
            # Если не одобрена — показываем только статус заявки
            fieldsets += (
                ('Статус заявки', {
                    'fields': ('status', 'organizer_comment',)
                }),
            )

        # Комментарий — отдельно, доступен всегда
        fieldsets += (
            ('Комментарий', {
                'fields': ('comment',),
                'classes': ('collapse',)
            }),
        )

        return fieldsets

    def add_result_link(self, obj):
        """Кнопка для добавления результата к заявке (только если можно вносить результаты)"""
        if obj.is_ready_for_results():  # заявка одобрена и оплачена
            url = reverse('admin:competitions_result_add')
            return format_html(
                '<a class="button" href="{}?application={}" style="background-color: #28a745; color: white; padding: 5px 10px; border-radius: 4px; text-decoration: none;">➕ Добавить результат</a>',
                url, obj.id
            )
        return '-'
    add_result_link.short_description = 'Результаты'
    add_result_link.allow_tags = True


@admin.register(ApplicationEntry)
class ApplicationEntryAdmin(admin.ModelAdmin):
    list_display = ('application', 'entry', 'is_out_of_class', 'get_discipline', 'get_sport_class')
    list_filter = ('application__competition', 'entry__discipline', 'is_out_of_class')
    search_fields = (
        'application__user__username',
        'application__user__first_name',
        'application__user__last_name',
        'application__dog__name',
        'entry__discipline',
        'entry__sport_class'
    )
    list_select_related = ('application', 'entry', 'application__user', 'application__dog')

    # Поля для формы редактирования
    fieldsets = (
        ('Основная информация', {
            'fields': ('application', 'entry')
        }),
        ('Параметры участия', {
            'fields': ('is_out_of_class',),
            'description': 'Если отмечено — участник выступает вне зачёта (не занимает место)'
        }),
    )

    # Делаем поле is_out_of_class редактируемым в списке (удобно)
    list_editable = ('is_out_of_class',)

    # Дополнительные методы для красивого отображения
    def get_discipline(self, obj):
        return obj.entry.get_discipline_display()
    get_discipline.short_description = 'Дисциплина'
    get_discipline.admin_order_field = 'entry__discipline'

    def get_sport_class(self, obj):
        return obj.entry.get_sport_class_display()
    get_sport_class.short_description = 'Класс'
    get_sport_class.admin_order_field = 'entry__sport_class'

    # Красивое отображение флага "Вне зачёта"
    def is_out_of_class(self, obj):
        if obj.is_out_of_class:
            return '✅ Вне зачёта'
        return '—'
    is_out_of_class.short_description = 'Вне зачёта'
    is_out_of_class.boolean = False  # можно убрать boolean, чтобы был текст


@admin.register(Result)
class ResultAdmin(admin.ModelAdmin):
    list_display = ('application_entry', 'get_user', 'get_dog', 'sort_value', 'place', 'status')
    list_filter = ('application_entry__entry__competition', 'application_entry__entry__discipline', 'status')
    search_fields = ('application_entry__application__user__username', 'application_entry__application__dog__name')

    def get_user(self, obj):
        return obj.application_entry.application.user.username

    get_user.short_description = 'Спортсмен'

    def get_dog(self, obj):
        return obj.application_entry.application.dog.name

    get_dog.short_description = 'Собака'

    def get_readonly_fields(self, request, obj=None):
        if obj:
            return ('application_entry',)
        return ()

    fieldsets = (
        ('Связи', {
            'fields': ('application_entry',)
        }),
        ('Результат', {
            'fields': ('data', 'sort_value', 'place', 'status')
        }),
    )
