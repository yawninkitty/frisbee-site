from django.shortcuts import render, get_object_or_404
from django.core.paginator import Paginator
from django.db.models import Q
from .models import Article, TAG_CHOICES  # TAG_CHOICES импортируем из models, а не из Article
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.template.loader import render_to_string


def article_list(request):
    """Страница со списком статей"""
    articles = Article.objects.filter(is_published=True)

    # Поиск
    search_query = request.GET.get('q')
    if search_query:
        articles = articles.filter(
            Q(title__icontains=search_query) |
            Q(content__icontains=search_query)
        )

    # Фильтр по тегу
    current_tag = request.GET.get('tag')
    if current_tag:
        articles = articles.filter(tag=current_tag)

    # Пагинация (6 статей на страницу)
    paginator = Paginator(articles, 6)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    # Все теги для фильтра (из констант)
    all_tags = [{'code': code, 'name': name} for code, name in TAG_CHOICES]

    context = {
        'page_obj': page_obj,
        'all_tags': all_tags,
        'current_tag': current_tag,
        'search_query': search_query,
    }
    return render(request, 'journal/article_list.html', context)


def article_detail(request, slug):
    """Детальная страница статьи"""
    article = get_object_or_404(Article, slug=slug, is_published=True)
    article.views += 1
    article.save()

    # Похожие статьи (по тому же тегу)
    similar = Article.objects.filter(
        tag=article.tag,
        is_published=True
    ).exclude(id=article.id)[:5]

    # Получаем отображаемое имя тега из констант
    tag_display = dict(TAG_CHOICES).get(article.tag, article.tag)

    context = {
        'article': article,
        'similar': similar,
        'tag_display': tag_display,  # исправлено: используем TAG_CHOICES из импорта
    }
    return render(request, 'journal/article_detail.html', context)

def article_list_api(request):
    """API для получения статей (AJAX)"""
    try:
        search_query = request.GET.get('q', '').strip()
        tag = request.GET.get('tag', '').strip()
        page = int(request.GET.get('page', 1))

        articles = Article.objects.filter(is_published=True)

        if search_query:
            articles = articles.filter(
                Q(title__icontains=search_query) |
                Q(content__icontains=search_query)
            )

        if tag:
            articles = articles.filter(tag=tag)

        articles = articles.order_by('-created_at')  # ← исправлено

        paginator = Paginator(articles, 12)
        page_obj = paginator.get_page(page)

        html = ''
        for article in page_obj:
            html += render_to_string('journal/article_card.html', {'article': article})

        return JsonResponse({
            'success': True,
            'html': html,
            'has_next': page_obj.has_next()
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)