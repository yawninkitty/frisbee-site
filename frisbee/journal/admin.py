from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Article, ArticleImage, TAG_CHOICES


class ArticleImageInline(admin.TabularInline):
    model = ArticleImage
    extra = 1
    fields = ('image', 'caption', 'order')
    readonly_fields = ('preview',)

    def preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" style="max-height: 100px;">')
        return '-'

    preview.short_description = 'Предпросмотр'


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('title', 'cover_preview', 'tag', 'created_at', 'is_published', 'views')
    list_filter = ('tag', 'is_published', 'created_at')
    search_fields = ('title', 'content')
    prepopulated_fields = {'slug': ('title',)}
    date_hierarchy = 'created_at'
    inlines = [ArticleImageInline]
    readonly_fields = ('views',)

    fieldsets = (
        ('Основное', {
            'fields': ('title', 'slug', 'cover_image', 'tag', 'content')
        }),
        ('Публикация', {
            'fields': ('author', 'created_at', 'is_published', 'views')
        }),
    )

    def cover_preview(self, obj):
        if obj.cover_image:
            return mark_safe(f'<img src="{obj.cover_image.url}" style="max-height: 50px;">')
        return '-'

    cover_preview.short_description = 'Обложка'