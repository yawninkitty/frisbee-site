from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

CLASS_NOVICE = 'novice'
CLASS_PROGRESS = 'progress'
CLASS_OPEN = 'open'

SPORT_CLASS_CHOICES = [
    (CLASS_NOVICE, 'Новички'),
    (CLASS_PROGRESS, 'Прогресс'),
    (CLASS_OPEN, 'Открытый'),
]


# профиль пользователя
class UserProfile(models.Model):
    # В users/models.py в класс UserProfile добавьте:
    GENDER_MALE = 'male'
    GENDER_FEMALE = 'female'
    GENDER_CHOICES = [
        (GENDER_MALE, 'Мужской'),
        (GENDER_FEMALE, 'Женский'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile',
        verbose_name='Пользователь'
    )
    birth_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Дата рождения'
    )

    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        blank=True,
        null=True,
        verbose_name='Пол'
    )
    avatar = models.ImageField(
        upload_to='avatars/users',
        null=True,
        blank=True,
        verbose_name='Аватар'
    )
    sport_class = models.CharField(
        max_length=20,
        choices=SPORT_CLASS_CHOICES,
        default=CLASS_NOVICE,
        verbose_name='Класс спортсмена'
    )
    is_organizer = models.BooleanField(
        default=False,
        verbose_name='Организатор'
    )
    is_organizer_requested = models.BooleanField(default=False, verbose_name='Запросил роль организатора')

    class Meta:
        verbose_name = 'Профиль пользователя'
        verbose_name_plural = 'Профили пользователей'

    def __str__(self):
        return f"Профиль {self.user.username}"

    def get_age_display(self):
        """Возвращает возраст пользователя с правильным склонением"""
        if not self.birth_date:
            return 'Возраст не указан'

        today = timezone.now().date()
        age = today.year - self.birth_date.year
        if today.month < self.birth_date.month or (
                today.month == self.birth_date.month and today.day < self.birth_date.day
        ):
            age -= 1

        if age == 0:
            return 'менее года'
        elif 11 <= age <= 19:
            return f'{age} лет'

        last_digit = age % 10
        if last_digit == 1:
            return f'{age} год'
        elif 2 <= last_digit <= 4:
            return f'{age} года'
        else:
            return f'{age} лет'


# профиль собаки
class Dog(models.Model):
    # Добавь в models.py в класс Dog:
    GENDER_MALE = 'male'
    GENDER_FEMALE = 'female'
    GENDER_CHOICES = [
        (GENDER_MALE, 'Кобель'),
        (GENDER_FEMALE, 'Сука'),
    ]

    gender = models.CharField(
        max_length=10,
        choices=GENDER_CHOICES,
        blank=True,
        null=True,
        verbose_name='Пол'
    )

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='dogs',
        verbose_name='Владелец'
    )
    name = models.CharField(
        max_length=100,
        verbose_name='Кличка'
    )
    breed = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Порода'
    )
    birth_date = models.DateField(
        null=True,
        blank=True,
        verbose_name='Дата рождения'
    )
    height = models.FloatField(
        null=True,
        blank=True,
        verbose_name='Рост (см)'
    )
    avatar = models.ImageField(
        upload_to='avatars/dogs',
        null=True,
        blank=True,
        verbose_name='Фото'
    )
    sport_class = models.CharField(
        max_length=20,
        choices=SPORT_CLASS_CHOICES,
        default=CLASS_NOVICE,
        verbose_name='Класс собаки'
    )

    class Meta:
        verbose_name = 'Собака'
        verbose_name_plural = 'Собаки'

    def __str__(self):
        return f"{self.name} (хозяин: {self.owner.username})"

    def get_age_display(self):
        """Возвращает возраст собаки с правильным склонением"""
        if not self.birth_date:
            return 'Возраст не указан'

        from django.utils import timezone
        today = timezone.now().date()
        delta = today - self.birth_date
        days = delta.days

        if days < 30:
            if days == 0:
                return 'менее 1 дня'
            elif days == 1:
                return '1 день'
            elif 2 <= days <= 4:
                return f'{days} дня'
            else:
                return f'{days} дней'

        months = days // 30
        if months < 12:
            if months == 1:
                return '1 месяц'
            elif 2 <= months <= 4:
                return f'{months} месяца'
            else:
                return f'{months} месяцев'

        years = days // 365
        if years == 1:
            return '1 год'
        elif 2 <= years <= 4:
            return f'{years} года'
        else:
            return f'{years} лет'


class Notification(models.Model):
    """Уведомление пользователя"""

    class Type(models.TextChoices):
        APPLICATION_STATUS = 'app_status', 'Изменение статуса заявки'
        APPLICATION_PAYMENT = 'app_payment', 'Статус оплаты заявки'
        APPLICATION_NEW = 'app_new', 'Новая заявка на вашу собаку'
        COMPETITION_REMINDER = 'comp_reminder', 'Напоминание о соревновании'
        RESULT_READY = 'result_ready', 'Результаты опубликованы'
        SYSTEM = 'system', 'Системное уведомление'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Пользователь'
    )
    type = models.CharField(
        max_length=20,
        choices=Type.choices,
        verbose_name='Тип уведомления'
    )
    title = models.CharField(
        max_length=200,
        verbose_name='Заголовок'
    )
    message = models.TextField(
        verbose_name='Текст уведомления'
    )
    link = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Ссылка (URL)'
    )
    is_read = models.BooleanField(
        default=False,
        verbose_name='Прочитано'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Дата создания'
    )

    class Meta:
        verbose_name = 'Уведомление'
        verbose_name_plural = 'Уведомления'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f"{self.user.username}: {self.title[:50]}"

    @property
    def time_ago(self):
        """Человекочитаемое время"""
        from django.utils import timezone
        delta = timezone.now() - self.created_at

        if delta.days > 0:
            return f"{delta.days} дн. назад"
        elif delta.seconds > 3600:
            return f"{delta.seconds // 3600} ч. назад"
        elif delta.seconds > 60:
            return f"{delta.seconds // 60} мин. назад"
        else:
            return "только что"