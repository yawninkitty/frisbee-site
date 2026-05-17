from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from users.models import Dog
from users.models import SPORT_CLASS_CHOICES, CLASS_NOVICE
from smart_selects.db_fields import ChainedForeignKey
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
import re

# Константы дисциплин
DISCIPLINE_BULLSEYE = 'bullseye'
DISCIPLINE_DISTANCE = 'distance'
DISCIPLINE_ACCURACY = 'accuracy'

DISCIPLINE_CHOICES = [
    (DISCIPLINE_BULLSEYE, 'Буллсай'),
    (DISCIPLINE_DISTANCE, 'Броски на дальность'),
    (DISCIPLINE_ACCURACY, 'Броски на точность'),
]

# афиша соревнования
class Competition(models.Model):
    STATUS_DRAFT = 'draft'
    STATUS_PUBLISHED = 'published'

    STATUS_CHOICES = [
        (STATUS_DRAFT, 'Черновик'),
        (STATUS_PUBLISHED, 'Опубликовано'),
    ]

    LOCATION_TYPE_CHOICES = [
        ('indoor', 'Крытая'),
        ('outdoor', 'Уличная'),
    ]

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_DRAFT,
        verbose_name='Статус'
    )
    title = models.CharField(max_length=200, verbose_name='Название')
    date = models.DateField(verbose_name='Дата проведения')
    registration_deadline = models.DateField(verbose_name='Дата закрытия записи')
    location = models.CharField(max_length=200, verbose_name='Место проведения')
    location_type = models.CharField(
        max_length=10,
        choices=LOCATION_TYPE_CHOICES,
        default='outdoor',
        verbose_name='Тип площадки'
    )
    city = models.CharField(max_length=100, blank=True, verbose_name='Город')
    description = models.TextField(blank=True, verbose_name='Описание')
    organizer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='organized_competitions',
        verbose_name='Организатор'
    )
    payment_deadline = models.DateField(
        null=True,
        blank=True,
        verbose_name='Крайний срок оплаты'
    )
    payment_methods = models.ManyToManyField(
        'PaymentMethod',
        blank=True,
        verbose_name='Способы оплаты'
    )
    time = models.TimeField(
        null=True,
        blank=True,
        verbose_name='Время проведения'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Соревнование'
        verbose_name_plural = 'Соревнования'

    def __str__(self):
        return self.title

    def is_registration_open(self):
        from django.utils import timezone
        return self.registration_deadline >= timezone.now().date()

    def is_ongoing(self):
        from django.utils import timezone
        return self.date == timezone.now().date()

    def is_finished(self):
        from django.utils import timezone
        return self.date < timezone.now().date()

    def get_unique_disciplines_display(self):
        """Возвращает список уникальных русских названий дисциплин для соревнования"""
        from .models import Entry
        unique_codes = set(self.entries.values_list('discipline', flat=True))
        return [Entry(discipline=code).get_discipline_display() for code in unique_codes]

    def get_entries_by_class(self):
        """Возвращает зачёты, сгруппированные по классам в правильном порядке"""
        class_order = ['novice', 'progress', 'open']
        class_names = {
            'novice': 'Новички',
            'progress': 'Прогресс',
            'open': 'Открытый'
        }
        result = {}
        for class_code in class_order:
            entries = self.entries.filter(sport_class=class_code)
            if entries.exists():
                result[class_names[class_code]] = entries
        return result


# способы оплаты
class PaymentMethod(models.Model):
    METHOD_CHOICES = [
        ('online', 'Онлайн-касса'),
        ('transfer', 'Переводом'),
        ('cash', 'Наличными'),
    ]
    code = models.CharField(
        max_length=20,
        choices=METHOD_CHOICES,
        unique=True,
        verbose_name='Код'
    )
    name = models.CharField(max_length=50, verbose_name='Название')

    class Meta:
        verbose_name = 'Способ оплаты'
        verbose_name_plural = 'Способы оплаты'

    def __str__(self):
        return self.name

# файл соревнований
class CompetitionFile(models.Model):
    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name='files',
        verbose_name='Соревнование'
    )
    title = models.CharField(
        max_length=200,
        verbose_name='Название файла'
    )
    file = models.FileField(
        upload_to='competition_files/%Y/%m/%d/',
        verbose_name='Файл'
    )
    order = models.PositiveIntegerField(
        default=0,
        verbose_name='Порядок'
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата загрузки'
    )

    class Meta:
        verbose_name = 'Файл соревнования'
        verbose_name_plural = 'Файлы соревнований'
        ordering = ['order', 'uploaded_at']

    def __str__(self):
        return self.title

# контакты организатора
# competitions/models.py

class OrganizerContact(models.Model):
    CONTACT_TYPE_CHOICES = [
        ('email', 'Email'),
        ('phone', 'Телефон'),
        ('vk', 'ВКонтакте'),
        ('telegram', 'Telegram'),
    ]
    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name='contacts',
        verbose_name='Соревнование'
    )
    contact_type = models.CharField(
        max_length=20,
        choices=CONTACT_TYPE_CHOICES,
        verbose_name='Тип контакта'
    )
    value = models.CharField(
        max_length=200,
        verbose_name='Контактные данные'
    )

    class Meta:
        verbose_name = 'Контакт организатора'
        verbose_name_plural = 'Контакты организаторов'

    def __str__(self):
        return f"{self.get_contact_type_display()}: {self.value}"

    def get_formatted_value(self):
        """Возвращает отформатированное значение контакта"""
        import re

        if self.contact_type == 'phone':
            # Убираем все нецифровые символы
            digits = re.sub(r'\D', '', str(self.value))

            # Если пришло 10 цифр (без +7 или 8)
            if len(digits) == 10:
                return f"+7 ({digits[0:3]}) {digits[3:6]} {digits[6:8]}-{digits[8:10]}"

            # Если пришло 11 цифр (с 7 или 8 в начале)
            elif len(digits) == 11:
                # Если начинается с 8, заменяем на +7
                if digits.startswith('8'):
                    digits = '7' + digits[1:]
                return f"+{digits[0]} ({digits[1:4]}) {digits[4:7]} {digits[7:9]}-{digits[9:11]}"

        return self.value

    def get_icon_path(self):
        """Возвращает путь к иконке для типа контакта"""
        icons = {
            'email': 'images/envelope_gray_middle.svg',
            'phone': 'images/phone.svg',
            'vk': 'images/buble.svg',
            'telegram': 'images/buble.svg',
        }
        return icons.get(self.contact_type, 'images/buble.svg')

    def get_link_value(self):
        """Возвращает значение для ссылки (href)"""
        if self.contact_type == 'email':
            return f"mailto:{self.value}"
        elif self.contact_type == 'phone':
            digits = re.sub(r'\D', '', str(self.value))
            return f"tel:{digits}"
        elif self.contact_type == 'vk':
            return f"https://vk.com/{self.value}"
        elif self.contact_type == 'telegram':
            return f"https://t.me/{self.value}"
        return self.value

    def get_display_name(self):
        """Возвращает отображаемое имя для мессенджеров"""
        if self.contact_type == 'vk':
            return 'VK'
        elif self.contact_type == 'telegram':
            return 'Telegram'
        return self.get_formatted_value()


# зачёт
class Entry(models.Model):
    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name='entries',
        verbose_name='Соревнование'
    )
    discipline = models.CharField(
        max_length=20,
        choices=DISCIPLINE_CHOICES,
        verbose_name='Дисциплина'
    )
    sport_class = models.CharField(
        max_length=20,
        choices=SPORT_CLASS_CHOICES,
        default=CLASS_NOVICE,
        verbose_name='Класс'
    )
    can_enter_without_class = models.BooleanField(
        default=False,
        verbose_name='Можно вне зачёта',
        help_text='Если включено, участники могут выступать вне конкурсной программы'
    )
    fee = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=0,
        verbose_name='Взнос'
    )
    judges = models.ManyToManyField(
        User,
        through='EntryJudge',
        related_name='judging_entries_m2m',
        blank=True,
        verbose_name='Судьи (зарегистрированные)'
    )
    judge_name = models.CharField(
        max_length=200,
        blank=True,
        verbose_name='Судья (вручную)'
    )
    result_template = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        verbose_name='Шаблон результата',
        help_text='Описывает структуру данных результата для этой дисциплины'
    )
    class Meta:
        unique_together = ('competition', 'discipline', 'sport_class')
        verbose_name = 'Зачёт'
        verbose_name_plural = 'Зачёты'

    def __str__(self):
        return f"{self.competition.title} — {self.discipline} ({self.get_sport_class_display()})"

    def get_judge_display(self):
        if self.judge:
            return f"{self.judge.first_name} {self.judge.last_name}".strip() or self.judge.username
        return self.judge_name or "Судья не указан"

    def clean(self):
        if self.judges.exists() and self.judge_name:
            raise ValidationError('Нельзя указать одновременно и зарегистрированных судей, и судью текстом.')
        if not self.judges.exists() and not self.judge_name:
            raise ValidationError('Укажите судью (зарегистрированного или вручную).')


class EntryJudge(models.Model):
    """Назначение судьи на зачёт (пользователь сайта)"""
    entry = models.ForeignKey(
        Entry,
        on_delete=models.CASCADE,
        related_name='assigned_judges',
        verbose_name='Зачёт'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='judging_entries',
        verbose_name='Судья'
    )
    assigned_at = models.DateTimeField(auto_now_add=True, verbose_name='Дата назначения')

    class Meta:
        unique_together = ['entry', 'user']
        verbose_name = 'Назначение судьи'
        verbose_name_plural = 'Назначения судей'

    def __str__(self):
        return f"{self.user.get_full_name()} — {self.entry}"

# сигнал для подстановки шаблона результата после создания зачёта
@receiver(post_save, sender=Entry)
def set_template_on_creation(sender, instance, created, **kwargs):
    if created and not instance.result_template:
        templates = {
            'bullseye': {
                "discipline_type": "bullseye",
                "table_columns": [
                    {"field": "throw_count", "label": "Бросков"},
                    {"field": "total", "label": "Сумма"}
                ],
                "sort_field": "total",
                "sort_order": "desc"
            },
            'distance': {
                "discipline_type": "distance",
                "table_columns": [
                    {"field": "attempts", "label": "Попытки (м)"},
                    {"field": "last_chance", "label": "Последний шанс (м)"},
                    {"field": "best", "label": "Лучший (м)"}
                ],
                "sort_field": "best",
                "sort_order": "desc"
            },
            'accuracy': {
                "discipline_type": "accuracy",
                "table_columns": [
                    {"field": "throws", "label": "Броски"},
                    {"field": "top_five_sum", "label": "Сумма 5 лучших"}
                ],
                "sort_field": "top_five_sum",
                "sort_order": "desc"
            }
        }
        instance.result_template = templates.get(instance.discipline, {})
        instance.save(update_fields=['result_template'])

# заявка
class Application(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_APPROVED = 'approved'
    STATUS_REJECTED = 'rejected'
    STATUS_WAITING_OWNER = 'waiting_owner'
    STATUS_CANCELLED = 'cancelled'

    PAYMENT_STATUS_NOT_PAID = 'unpaid'
    PAYMENT_STATUS_PENDING = 'pending'
    PAYMENT_STATUS_PAID = 'paid'

    STATUS_CHOICES = [
        (STATUS_PENDING, 'На рассмотрении'),
        (STATUS_APPROVED, 'Одобрена'),
        (STATUS_REJECTED, 'Отклонена'),
        (STATUS_WAITING_OWNER, 'Ожидает подтверждения владельца'),
        (STATUS_CANCELLED, 'Отменена'),
    ]

    PAYMENT_STATUS_CHOICES = [
        (PAYMENT_STATUS_NOT_PAID, 'Не оплачено'),
        (PAYMENT_STATUS_PENDING, 'Чек на проверке'),
        (PAYMENT_STATUS_PAID, 'Оплачено'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name='Спортсмен'
    )
    dog = models.ForeignKey(
        Dog,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name='Собака'
    )
    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name='Соревнование'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='Статус заявки'
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default=PAYMENT_STATUS_NOT_PAID,
        verbose_name='Статус оплаты'
    )
    payment_receipt = models.FileField(
        upload_to='receipts/%Y/%m/%d/',
        blank=True,
        null=True,
        verbose_name='Чек об оплате'
    )
    comment = models.TextField(
        blank=True,
        null=True,
        verbose_name='Комментарий'
    )
    organizer_comment = models.TextField(
        blank=True,
        null=True,
        verbose_name='Комментарий организатора'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата подачи'
    )

    class Meta:
        verbose_name = 'Заявка'
        verbose_name_plural = 'Заявки'

    def __str__(self):
        entries_count = self.application_entries.count()
        return f"{self.user} — {self.dog} — {self.competition} ({self.get_status_display()}, {entries_count} зач.)"

    def is_ready_for_results(self):
        """Можно ли вносить результаты по этой заявке"""
        return self.status == self.STATUS_APPROVED and self.payment_status == self.PAYMENT_STATUS_PAID

    def can_upload_receipt(self):
        """Можно ли прикрепить чек об оплате к этой заявке"""
        return self.status == self.STATUS_APPROVED

    def payment_status_display(self):
        """Статусы оплаты в карточке заявки"""
        if self.payment_status == self.PAYMENT_STATUS_PAID:
            return 'Оплачено'
        elif self.payment_status == self.PAYMENT_STATUS_PENDING:
            return 'Чек на проверке'
        elif self.can_upload_receipt():
            return 'Не оплачено (можно загрузить чек)'
        else:
            return 'Оплата пока недоступна'

    def get_total_fee(self):
        """Возвращает общую сумму взносов за все зачёты"""
        total = 0
        for app_entry in self.application_entries.all():
            total += app_entry.entry.fee
        return total


class ApplicationEntry(models.Model):
    application = models.ForeignKey(
        'Application',
        on_delete=models.CASCADE,
        related_name='application_entries',
        verbose_name='Заявка'
    )
    entry = models.ForeignKey(
        'Entry',
        on_delete=models.CASCADE,
        related_name='application_entries',
        verbose_name='Зачёт'
    )
    is_out_of_class = models.BooleanField(
        default=False,
        verbose_name='Вне зачёта'
    )

    class Meta:
        unique_together = ('application', 'entry')
        verbose_name = 'Заявка-Зачёт'
        verbose_name_plural = 'Выбранные зачёты в заявках'

    def __str__(self):
        out_of_class = " (вне зачёта)" if self.is_out_of_class else ""
        return f"{self.application} — {self.entry}{out_of_class}"

# результат
class Result(models.Model):
    STATUS_ACTIVE = 'active'
    STATUS_DISQUALIFIED = 'disqualified'

    STATUS_CHOICES = [
        (STATUS_ACTIVE, 'Активен'),
        (STATUS_DISQUALIFIED, 'Снят'),
    ]

    application_entry = ChainedForeignKey(
        ApplicationEntry,
        chained_field='application',
        chained_model_field='application',
        show_all=False,
        auto_choose=True,
        sort=True,
        verbose_name='Заявка и зачёт',
        related_name='results'
    )
    start_order = models.PositiveIntegerField(default=0, verbose_name='Порядок выступления')
    data = models.JSONField(default=dict, verbose_name='Данные результата')
    sort_value = models.FloatField(default=0, verbose_name='Значение для сортировки')
    place = models.IntegerField(null=True, blank=True, verbose_name='Место')
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        verbose_name='Статус участника'
    )

    class Meta:
        ordering = ['start_order', 'place']
        verbose_name = 'Результат'
        verbose_name_plural = 'Результаты'

    def __str__(self):
        return f"{self.application_entry} — {self.sort_value} ({self.place}-е место)"

# сигнал для появления шаблона результата из зачёта в самом поле data модели результата
# а ещё по нему вычисляется итоговый балл в отдельное поле!
# а ещё по нему в целом считаются результаты!
@receiver(pre_save, sender=Result)
def normalize_result_data(sender, instance, **kwargs):
    entry = instance.application_entry.entry
    discipline = entry.discipline

    # Если data пустое — создаём структуру
    if not instance.data or instance.data == {}:
        if discipline == 'bullseye':
            instance.data = {
                'throws': [],
                'total': 0,
                'throw_count': 0
            }
        elif discipline == 'distance':
            instance.data = {
                'attempts': [0, 0, 0],
                'last_chance': 0,
                'best': 0
            }
        elif discipline == 'accuracy':
            instance.data = {
                'throws': [0] * 10,
                'top_five_sum': 0,
                'total_sum': 0
            }

    # === ВЫЧИСЛЯЕМ АГРЕГИРОВАННЫЕ ПОЛЯ ===

    if discipline == 'bullseye':
        throws = instance.data.get('throws', [])
        # Суммируем все броски
        instance.data['total'] = sum(throws) if throws else 0
        instance.data['throw_count'] = len(throws)
        # sort_value для сортировки
        instance.sort_value = instance.data['total']

    elif discipline == 'distance':
        attempts = instance.data.get('attempts', [0, 0, 0])
        last_chance = instance.data.get('last_chance', 0)
        best = max(attempts + [last_chance]) if attempts or last_chance else 0
        instance.data['best'] = best
        instance.sort_value = best

    elif discipline == 'accuracy':
        throws = instance.data.get('throws', [0] * 10)
        # Сортируем по убыванию и берём 5 лучших
        sorted_throws = sorted(throws, reverse=True)
        top_five_sum = sum(sorted_throws[:5]) if sorted_throws else 0
        instance.data['top_five_sum'] = top_five_sum
        instance.data['total_sum'] = sum(throws)
        instance.sort_value = top_five_sum