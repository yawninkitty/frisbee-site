from django.shortcuts import render


def custom_error(request, exception=None, code=500, title='', message=''):
    errors = {
        400: {'title': 'Неверный запрос', 'message': 'Сервер не смог обработать ваш запрос.'},
        403: {'title': 'Доступ запрещён', 'message': 'У вас нет прав для просмотра этой страницы.'},
        404: {'title': 'Страница не найдена', 'message': 'Такой страницы не существует или она была удалена.'},
        500: {'title': 'Ошибка сервера', 'message': 'Что-то пошло не так. Попробуйте обновить страницу позже.'},
    }

    error = errors.get(code, {'title': 'Ошибка', 'message': 'Произошла неизвестная ошибка.'})

    return render(request, 'error.html', {
        'code': code,
        'title': error['title'],
        'message': error['message'],
    }, status=code)


def custom_404(request, exception):
    return custom_error(request, exception, code=404)


def custom_500(request):
    return custom_error(request, code=500)


def custom_403(request, exception):
    return custom_error(request, exception, code=403)


def custom_400(request, exception):
    return custom_error(request, exception, code=400)