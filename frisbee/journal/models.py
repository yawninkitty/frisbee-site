from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.urls import reverse
from django_ckeditor_5.fields import CKEditor5Field

# Константы тегов
TAG_CHOICES = [
    ('guide', 'Гайд'),
    ('athletes', 'Спортсменам'),
    ('organizers', 'Организаторам'),
    ('rules', 'Правила'),
    ('training', 'Тренировки'),
]


class Article(models.Model):
    """Статья журнала"""
    title = models.CharField(max_length=200, verbose_name='Заголовок')
    slug = models.SlugField(max_length=200, unique=True, verbose_name='Слаг')

    # Обложка
    cover_image = models.ImageField(
        upload_to='journal/covers/%Y/%m/%d/',
        verbose_name='Обложка',
        help_text='Рекомендуемый размер: 800x600px'
    )

    # Текст статьи
    content = CKEditor5Field(verbose_name='Содержание', config_name='default')

    # Тег (выбор из констант)
    tag = models.CharField(
        max_length=20,
        choices=TAG_CHOICES,
        default='other',
        verbose_name='Тег'
    )

    author = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        verbose_name='Автор'
    )

    created_at = models.DateTimeField(default=timezone.now, verbose_name='Дата публикации')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Дата обновления')
    is_published = models.BooleanField(default=True, verbose_name='Опубликовано')
    views = models.PositiveIntegerField(default=0, verbose_name='Просмотры')

    class Meta:
        verbose_name = 'Статья'
        verbose_name_plural = 'Статьи'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def get_absolute_url(self):
        return reverse('journal:article_detail', args=[self.slug])

    def reading_time(self):
        """Примерное время чтения в минутах"""
        word_count = len(self.content.split())
        minutes = max(1, round(word_count / 200))  # 200 слов в минуту
        return minutes

    def get_tag_display_name(self):
        """Возвращает отображаемое имя тега"""
        return dict(TAG_CHOICES).get(self.tag, self.tag)


class ArticleImage(models.Model):
    """Иллюстрации для статьи"""
    article = models.ForeignKey(
        Article, on_delete=models.CASCADE, related_name='images',
        verbose_name='Статья'
    )
    image = models.ImageField(
        upload_to='journal/images/%Y/%m/%d/',
        verbose_name='Изображение'
    )
    caption = models.CharField(max_length=200, blank=True, verbose_name='Подпись')
    order = models.PositiveIntegerField(default=0, verbose_name='Порядок')

    class Meta:
        verbose_name = 'Иллюстрация'
        verbose_name_plural = 'Иллюстрации'
        ordering = ['order']

    def __str__(self):
        return f'Иллюстрация к {self.article.title}'
