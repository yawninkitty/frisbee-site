# users/views.py

import json
from datetime import timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.db.models import Prefetch
from django.http import JsonResponse
from django.shortcuts import get_object_or_404, redirect, render
from django.template.loader import render_to_string
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from competitions.models import Application, ApplicationEntry, Competition, Entry, EntryJudge, Result
from users.forms import SignUpForm
from users.models import Dog, Notification, SPORT_CLASS_CHOICES, User, UserProfile
from users.notifications import NotificationService
from django.core.files.storage import default_storage
import uuid
from django.core.files.base import ContentFile

from django.contrib.auth import update_session_auth_hash
from django.contrib.auth.forms import PasswordChangeForm

# ============================================================
# ===== РЕГИСТРАЦИЯ И АУТЕНТИФИКАЦИЯ =====
# ============================================================

def sign_up(request):
    """Регистрация нового пользователя"""
    if request.method == 'POST':
        form = SignUpForm(request.POST)
        if form.is_valid():
            user = form.save()

            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.gender = form.cleaned_data.get('gender')
            profile.sport_class = form.cleaned_data.get('sport_class')

            if form.cleaned_data.get('role') == 'organizer':
                profile.is_organizer_requested = True
            else:
                profile.is_organizer_requested = False

            profile.save()

            # ← ПОЛУЧАЕМ next ИЗ POST ИЛИ GET
            next_url = request.POST.get('next') or request.GET.get('next')

            # Если есть next, передаём его на страницу успеха
            if next_url:
                return redirect(f'/sign-up-success/?username={user.username}&next={next_url}')

            return redirect(f'/sign-up-success/?username={user.username}')
    else:
        form = SignUpForm()

    return render(request, 'users/sign_up.html', {'form': form})


def sign_up_success(request):
    """Страница успешной регистрации"""
    username = request.GET.get('username', '')
    return render(request, 'users/sign_up_success.html', {'username': username})


# ============================================================
# ===== ЛИЧНЫЙ КАБИНЕТ =====
# ============================================================

@login_required
def profile(request):
    """Личный кабинет пользователя"""
    my_applications = Application.objects.filter(user=request.user).order_by('-created_at')

    owner_applications = Application.objects.filter(
        dog__owner=request.user,
        status=Application.STATUS_WAITING_OWNER
    ).exclude(user=request.user).order_by('-created_at')

    applications = list(my_applications) + list(owner_applications)

    applications.sort(
        key=lambda app: (
            0 if (app.dog.owner == request.user and app.status == Application.STATUS_WAITING_OWNER) else 1,
            -app.created_at.timestamp()
        )
    )

    dogs = Dog.objects.filter(owner=request.user)
    active_tab = request.GET.get('tab', 'applications')

    for app in applications:
        app.entries_list = ApplicationEntry.objects.filter(application=app).select_related('entry')
        app.can_cancel = not Result.objects.filter(application_entry__application=app).exists()

    return render(request, 'users/profile.html', {
        'applications': applications,
        'dogs': dogs,
        'active_tab': active_tab,
        'sport_class_choices': SPORT_CLASS_CHOICES,
    })


@login_required
def edit_profile_api(request):
    """API для редактирования профиля пользователя"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    user = request.user
    profile = user.profile

    # Обновляем данные пользователя
    user.first_name = request.POST.get('first_name', '')
    user.last_name = request.POST.get('last_name', '')
    user.save()

    # Обновляем профиль
    birth_date = request.POST.get('birth_date')
    if birth_date:
        profile.birth_date = birth_date
    else:
        profile.birth_date = None

    sport_class = request.POST.get('sport_class')
    if sport_class:
        profile.sport_class = sport_class

    gender = request.POST.get('gender')
    if gender:
        profile.gender = gender

    # Обработка аватара
    if request.POST.get('delete_avatar') == 'true':
        if profile.avatar:
            profile.avatar.delete()
            profile.avatar = None
    elif 'avatar' in request.FILES:
        if profile.avatar:
            profile.avatar.delete()
        profile.avatar = request.FILES['avatar']

    profile.save()
    return JsonResponse({'success': True})


@login_required
def request_organizer(request):
    """Запрос роли организатора"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    profile = request.user.profile

    if profile.is_organizer:
        return JsonResponse({'success': False, 'error': 'Вы уже являетесь организатором'})

    if profile.is_organizer_requested:
        return JsonResponse({'success': False, 'error': 'Заявка уже отправлена'})

    profile.is_organizer_requested = True
    profile.save()
    return JsonResponse({'success': True})

@login_required
@require_http_methods(["POST"])
def change_password(request):
    """Смена пароля пользователя"""
    try:
        data = json.loads(request.body)
        old_password = data.get('old_password')
        new_password1 = data.get('new_password1')
        new_password2 = data.get('new_password2')

        if not old_password or not new_password1 or not new_password2:
            return JsonResponse({'success': False, 'error': 'Все поля обязательны'})

        if new_password1 != new_password2:
            return JsonResponse({'success': False, 'error': 'Новые пароли не совпадают'})

        if not request.user.check_password(old_password):
            return JsonResponse({'success': False, 'error': 'Неверный текущий пароль'})

        request.user.set_password(new_password1)
        request.user.save()
        update_session_auth_hash(request, request.user)

        return JsonResponse({'success': True})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Неверный формат данных'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


# ============================================================
# ===== УПРАВЛЕНИЕ ЗАЯВКАМИ =====
# ============================================================

@login_required
def cancel_application(request, app_id):
    """Отмена заявки спортсменом"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    try:
        application = Application.objects.get(id=app_id, user=request.user)

        has_results = Result.objects.filter(application_entry__application=application).exists()

        if has_results:
            return JsonResponse({'success': False, 'error': 'Нельзя отменить заявку, по которой уже есть результаты'})

        application.status = Application.STATUS_CANCELLED
        application.save()
        return JsonResponse({'success': True})
    except Application.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Заявка не найдена'})


@login_required
def upload_receipt_temp_file(request):
    """Загрузка чека во временную папку (для обычных пользователей)"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Не авторизован'})

    file = request.FILES.get('file')
    if not file:
        return JsonResponse({'success': False, 'error': 'Файл не передан'})

    if file.size > 10 * 1024 * 1024:
        return JsonResponse({'success': False, 'error': 'Файл слишком большой (максимум 10MB)'})

    try:
        ext = file.name.split('.')[-1]
        # Используем другую временную папку для чеков
        unique_name = f"temp_receipts/{request.user.id}/{uuid.uuid4().hex}.{ext}"
        path = default_storage.save(unique_name, ContentFile(file.read()))

        return JsonResponse({
            'success': True,
            'file': {
                'name': file.name,
                'path': path,
                'size': file.size
            }
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': f'Ошибка сохранения: {str(e)}'})

@login_required
def remove_receipt_temp_file(request):
    """Удаление временного файла чека"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    data = json.loads(request.body)
    file_path = data.get('path')

    if file_path and default_storage.exists(file_path):
        default_storage.delete(file_path)

    return JsonResponse({'success': True})

@login_required
def upload_application_receipt(request):
    """Загрузка чека об оплате заявки (поддерживает прямой файл и временный файл)"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    # Пробуем распарсить JSON (новый способ с временным файлом)
    try:
        data = json.loads(request.body)
        app_id = data.get('app_id')
        file_path = data.get('file_path')

        if app_id and file_path:
            # Новый способ: файл уже загружен во временную папку
            from django.core.files.storage import default_storage

            try:
                application = Application.objects.get(id=app_id, user=request.user)

                if application.status != Application.STATUS_APPROVED:
                    return JsonResponse(
                        {'success': False, 'error': 'Чек можно загрузить только после одобрения заявки'})

                # Проверяем, существует ли временный файл
                if not default_storage.exists(file_path):
                    return JsonResponse({'success': False, 'error': 'Файл не найден'})

                # Генерируем новое имя для постоянного хранения
                import uuid
                from datetime import datetime
                ext = file_path.split('.')[-1]
                new_path = f'receipts/{datetime.now().strftime("%Y/%m/%d")}/{uuid.uuid4().hex}.{ext}'

                # Копируем файл из временной папки в постоянную
                saved_path = default_storage.save(new_path, default_storage.open(file_path))

                # Удаляем старый чек, если был
                if application.payment_receipt:
                    if default_storage.exists(application.payment_receipt.path):
                        default_storage.delete(application.payment_receipt.path)

                application.payment_receipt = saved_path
                application.payment_status = Application.PAYMENT_STATUS_PENDING
                application.save()

                # Удаляем временный файл
                default_storage.delete(file_path)

                # Уведомление организатору
                from competitions.models import Competition
                from users.notifications import NotificationService
                NotificationService.send(
                    user=application.competition.organizer,
                    type_=Notification.Type.APPLICATION_PAYMENT,
                    title="Новый чек на проверку",
                    message=f"Пользователь {application.user.get_full_name() or application.user.username} загрузил чек для заявки на собаку {application.dog.name}",
                    link=f"/competitions/organizer/competition/{application.competition.id}/manage/"
                )

                return JsonResponse({'success': True})
            except Application.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Заявка не найдена'})
    except json.JSONDecodeError:
        pass  # Это не JSON, пробуем старый способ с form-data

    # Старый способ: прямой файл из form-data
    app_id = request.POST.get('app_id')
    receipt = request.FILES.get('receipt')

    if not app_id or not receipt:
        return JsonResponse({'success': False, 'error': 'Не указан ID заявки или файл'})

    try:
        application = Application.objects.get(id=app_id, user=request.user)

        if application.status != Application.STATUS_APPROVED:
            return JsonResponse({'success': False, 'error': 'Чек можно загрузить только после одобрения заявки'})

        # Удаляем старый чек, если был
        if application.payment_receipt:
            application.payment_receipt.delete()

        application.payment_receipt = receipt
        application.payment_status = Application.PAYMENT_STATUS_PENDING
        application.save()

        # Уведомление организатору
        from users.notifications import NotificationService
        NotificationService.send(
            user=application.competition.organizer,
            type_=Notification.Type.APPLICATION_PAYMENT,
            title="Новый чек на проверку",
            message=f"Пользователь {application.user.get_full_name() or application.user.username} загрузил чек для заявки на собаку {application.dog.name}",
            link=f"/competitions/organizer/competition/{application.competition.id}/manage/"
        )

        return JsonResponse({'success': True})
    except Application.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Заявка не найдена'})


@login_required
def approve_by_owner(request, app_id):
    """Подтверждение заявки владельцем собаки"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    try:
        application = Application.objects.get(id=app_id, dog__owner=request.user)

        if application.status != Application.STATUS_WAITING_OWNER:
            return JsonResponse({'success': False, 'error': 'Заявка не ожидает подтверждения'})

        application.status = Application.STATUS_PENDING
        application.save()
        return JsonResponse({'success': True})
    except Application.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Заявка не найдена'})


@login_required
def reject_by_owner(request, app_id):
    """Отклонение заявки владельцем собаки (удаление)"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    try:
        application = Application.objects.get(id=app_id, dog__owner=request.user)

        if application.status != Application.STATUS_WAITING_OWNER:
            return JsonResponse({'success': False, 'error': 'Заявка не ожидает подтверждения'})

        application.delete()
        return JsonResponse({'success': True})
    except Application.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Заявка не найдена'})


# ============================================================
# ===== УПРАВЛЕНИЕ СОБАКАМИ =====
# ============================================================

def get_dog_card(request):
    """Возвращает HTML карточки собаки для AJAX-запросов"""
    dog_id = request.GET.get('dog_id')
    show_select_button = request.GET.get('show_select_button') == 'true'
    show_select_other_button = request.GET.get('show_select_other_button') == 'true'

    if dog_id:
        try:
            dog = Dog.objects.get(id=dog_id)
            html = render_to_string('users/dog_card_for_select.html', {
                'dog': dog,
                'show_select_button': show_select_button,
                'show_select_other_button': show_select_other_button,
            })
            return JsonResponse({'html': html, 'success': True})
        except Dog.DoesNotExist:
            return JsonResponse({'html': '', 'success': False, 'error': 'Собака не найдена'})

    return JsonResponse({'html': '', 'success': False, 'error': 'ID собаки не указан'})


def get_other_dogs(request):
    """Возвращает список других собак (не принадлежащих текущему пользователю)"""
    user = request.user
    other_dogs = Dog.objects.exclude(owner=user)[:10]

    dogs_data = []
    for dog in other_dogs:
        dogs_data.append({
            'id': dog.id,
            'name': dog.name,
            'breed': dog.breed or '—',
            'sport_class': dog.get_sport_class_display(),
            'avatar_url': dog.avatar.url if dog.avatar else None,
        })

    return JsonResponse({'dogs': dogs_data, 'success': True})


@login_required
def add_dog(request):
    """Добавление новой собаки"""
    if request.method == 'POST':
        name = request.POST.get('name')
        breed = request.POST.get('breed', '')
        birth_date = request.POST.get('birth_date') or None
        height = request.POST.get('height') or None
        gender = request.POST.get('gender') or None  # Добавляем пол
        sport_class = request.POST.get('sport_class')
        avatar = request.FILES.get('avatar')

        if name and sport_class:
            dog = Dog.objects.create(
                owner=request.user,
                name=name,
                breed=breed,
                birth_date=birth_date,
                height=height,
                gender=gender,  # Добавляем пол
                sport_class=sport_class,
                avatar=avatar
            )
            return JsonResponse({'success': True, 'dog_id': dog.id, 'dog': {
                'id': dog.id,
                'name': dog.name,
                'breed': dog.breed or '—',
                'gender': dog.get_gender_display() if dog.gender else None,  # Добавляем отображение пола
                'sport_class': dog.get_sport_class_display(),
                'avatar_url': dog.avatar.url if dog.avatar else None,
            }})
        return JsonResponse({'success': False, 'error': 'Не все поля заполнены'})

    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})


@login_required
def edit_dog(request, dog_id):
    """Редактирование собаки"""
    dog = get_object_or_404(Dog, id=dog_id, owner=request.user)

    if request.method == 'POST':
        dog.name = request.POST.get('name', dog.name)
        dog.breed = request.POST.get('breed', dog.breed)
        dog.birth_date = request.POST.get('birth_date') or None
        dog.height = request.POST.get('height') or None
        dog.gender = request.POST.get('gender') or None  # Добавляем пол
        dog.sport_class = request.POST.get('sport_class', dog.sport_class)

        if request.POST.get('delete_avatar') == 'true':
            if dog.avatar:
                dog.avatar.delete()
                dog.avatar = None
        elif 'avatar' in request.FILES:
            if dog.avatar:
                dog.avatar.delete()
            dog.avatar = request.FILES['avatar']

        dog.save()
        return JsonResponse({'success': True, 'dog': {
            'id': dog.id,
            'name': dog.name,
            'breed': dog.breed or '—',
            'gender': dog.get_gender_display() if dog.gender else None,  # Добавляем отображение пола
            'sport_class': dog.get_sport_class_display(),
            'avatar_url': dog.avatar.url if dog.avatar else None,
        }})

    return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})


@login_required
def delete_dog(request, dog_id):
    """Удаление собаки"""
    dog = get_object_or_404(Dog, id=dog_id, owner=request.user)

    has_active_applications = Application.objects.filter(
        dog=dog,
        status__in=['pending', 'approved']
    ).exists()

    if has_active_applications:
        return JsonResponse({
            'success': False,
            'error': 'Нельзя удалить собаку с активными заявками'
        })

    dog.delete()
    return JsonResponse({'success': True})


@login_required
def get_dog(request, dog_id):
    """Возвращает данные одной собаки для редактирования"""
    dog = get_object_or_404(Dog, id=dog_id, owner=request.user)

    return JsonResponse({
        'success': True,
        'dog': {
            'id': dog.id,
            'name': dog.name,
            'breed': dog.breed or '—',
            'birth_date': dog.birth_date.isoformat() if dog.birth_date else None,
            'height': dog.height,
            'gender': dog.gender,  # Добавляем пол (код male/female)
            'sport_class_code': dog.sport_class,
            'sport_class': dog.get_sport_class_display(),
            'avatar_url': dog.avatar.url if dog.avatar else None,
        }
    })


# ============================================================
# ===== УВЕДОМЛЕНИЯ =====
# ============================================================

@login_required
def notifications_view(request):
    """Страница уведомлений пользователя"""
    three_months_ago = timezone.now() - timedelta(days=90)
    notifications = Notification.objects.filter(
        user=request.user,
        created_at__gte=three_months_ago
    ).order_by('-created_at')

    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    groups = {
        'today': [],
        'yesterday': [],
        'last_week': [],
        'last_month': [],
        'older': [],
    }

    for notif in notifications:
        notif_date = notif.created_at.date()

        if notif_date == today:
            groups['today'].append(notif)
        elif notif_date == yesterday:
            groups['yesterday'].append(notif)
        elif notif_date > week_ago:
            groups['last_week'].append(notif)
        elif notif_date > month_ago:
            groups['last_month'].append(notif)
        else:
            groups['older'].append(notif)

    if request.GET.get('mark_read') == 'all':
        NotificationService.mark_all_as_read(request.user)
        return redirect('users:notifications')

    context = {
        'groups': groups,
        'unread_count': NotificationService.get_unread_count(request.user),
    }
    return render(request, 'users/notifications.html', context)


# users/views.py

@login_required
@require_http_methods(["POST"])
def mark_notifications_read(request):
    """
    Отметить уведомления как прочитанные
    """
    try:
        data = json.loads(request.body)
        notification_ids = data.get('notification_ids', [])

        for notif_id in notification_ids:
            NotificationService.mark_as_read(notif_id, request.user)

        # Возвращаем новое количество непрочитанных
        unread_count = NotificationService.get_unread_count(request.user)

        return JsonResponse({'success': True, 'unread_count': unread_count})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
def unread_notifications_count(request):
    """API для получения количества непрочитанных уведомлений"""
    count = NotificationService.get_unread_count(request.user)
    return JsonResponse({'unread_count': count})


# ============================================================
# ===== ПУБЛИЧНЫЕ СТРАНИЦЫ =====
# ============================================================

def users_list(request):
    """Страница со списком пользователей и собак"""
    return render(request, 'users/users_list.html')


def user_profile(request, pk):
    """Публичный профиль пользователя"""
    profile_user = get_object_or_404(User, pk=pk, is_active=True)

    user_profile = None
    if hasattr(profile_user, 'profile'):
        user_profile = profile_user.profile

    is_organizer = user_profile.is_organizer if user_profile else False

    # Убираем условие if not is_organizer — результаты нужны для всех!
    results_data = []
    applications = Application.objects.filter(
        user=profile_user,
        status=Application.STATUS_APPROVED,
        payment_status=Application.PAYMENT_STATUS_PAID
    ).select_related('competition', 'dog').prefetch_related(
        Prefetch('application_entries', queryset=ApplicationEntry.objects.select_related('entry'))
    )

    for app in applications:
        competition = app.competition
        for app_entry in app.application_entries.all():
            entry = app_entry.entry
            result = Result.objects.filter(application_entry=app_entry).first()

            if result:
                results_data.append({
                    'discipline': entry.discipline,
                    'discipline_display': entry.get_discipline_display(),
                    'sport_class': entry.sport_class,
                    'sport_class_display': entry.get_sport_class_display(),
                    'dog_name': app.dog.name,
                    'result_value': result.sort_value,
                    'place': result.place,
                    'status': result.status,
                    'competition_id': competition.id,
                    'competition_title': competition.title,
                    'competition_date': competition.date.isoformat() if competition.date else None,
                    'is_out_of_class': app_entry.is_out_of_class,
                })

    results_data.sort(key=lambda x: x['competition_date'] if x['competition_date'] else '', reverse=True)

    dogs = Dog.objects.filter(owner=profile_user)

    organized_comps_data = []
    judging_comps_data = []
    if is_organizer:
        organized_comps = Competition.objects.filter(organizer=profile_user).order_by('-date')
        judging_comps = Competition.objects.filter(
            entries__assigned_judges__user=profile_user
        ).distinct().order_by('-date')

        for comp in organized_comps:
            organized_comps_data.append({
                'id': comp.id,
                'title': comp.title,
                'date': comp.date.isoformat() if comp.date else None,
                'location': comp.location,
                'city': comp.city or '',
                'registration_deadline': comp.registration_deadline.isoformat() if comp.registration_deadline else None,
                'is_registration_open': comp.is_registration_open(),
                'disciplines': comp.get_unique_disciplines_display(),
            })

        for comp in judging_comps:
            if comp not in organized_comps:
                judging_comps_data.append({
                    'id': comp.id,
                    'title': comp.title,
                    'date': comp.date.isoformat() if comp.date else None,
                    'location': comp.location,
                    'city': comp.city or '',
                    'registration_deadline': comp.registration_deadline.isoformat() if comp.registration_deadline else None,
                    'is_registration_open': comp.is_registration_open(),
                    'disciplines': comp.get_unique_disciplines_display(),
                })

    context = {
        'profile_user': profile_user,
        'is_organizer': is_organizer,
        'results': results_data,
        'dogs': dogs,
        'organized_competitions': organized_comps_data,
        'judging_competitions': judging_comps_data,
    }

    return render(request, 'users/user_profile.html', context)


def dog_profile(request, pk):
    """Публичный профиль собаки"""
    dog = get_object_or_404(Dog, pk=pk)

    results_data = []
    applications = Application.objects.filter(
        dog=dog,
        status=Application.STATUS_APPROVED,
        payment_status=Application.PAYMENT_STATUS_PAID
    ).select_related('competition', 'user').prefetch_related(
        Prefetch('application_entries', queryset=ApplicationEntry.objects.select_related('entry'))
    )

    for app in applications:
        competition = app.competition
        user = app.user
        for app_entry in app.application_entries.all():
            entry = app_entry.entry
            result = Result.objects.filter(application_entry=app_entry).first()

            if result:
                results_data.append({
                    'discipline': entry.discipline,
                    'discipline_display': entry.get_discipline_display(),
                    'sport_class': entry.sport_class,
                    'sport_class_display': entry.get_sport_class_display(),
                    'user_id': user.id,
                    'user_name': user.get_full_name() or user.username,
                    'result_value': result.sort_value,
                    'place': result.place,
                    'status': result.status,
                    'competition_id': competition.id,
                    'competition_title': competition.title,
                    'competition_date': competition.date.isoformat() if competition.date else None,
                })

    results_data.sort(key=lambda x: x['competition_date'] if x['competition_date'] else '', reverse=True)

    context = {
        'dog': dog,
        'results': results_data,
    }

    return render(request, 'users/dog_profile.html', context)


# ============================================================
# ===== API ДЛЯ ПОИСКА И ФИЛЬТРАЦИИ =====
# ============================================================

def get_users_api(request):
    """API для получения списка пользователей"""
    users = User.objects.filter(is_active=True)

    users_data = []
    for user in users:
        user_profile = None
        if hasattr(user, 'profile'):
            user_profile = user.profile

        first_dog = user.dogs.first()
        dog_class = first_dog.get_sport_class_display() if first_dog else 'Новички'

        users_data.append({
            'id': user.id,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'gender': user_profile.gender if user_profile else None,
            'age_display': user_profile.get_age_display() if user_profile else 'Возраст не указан',
            'is_organizer': user_profile.is_organizer if user_profile else False,
            'is_athlete': not (user_profile.is_organizer if user_profile else False),
            'dog_class': dog_class,
            'sport_class': user_profile.get_sport_class_display() if user_profile else 'Не указан',
            'avatar': user_profile.avatar.url if user_profile and user_profile.avatar else None,
        })

    return JsonResponse({'success': True, 'users': users_data})


def get_dogs_api(request):
    """API для получения списка собак"""
    dogs = Dog.objects.all()

    dogs_data = []
    for dog in dogs:
        dogs_data.append({
            'id': dog.id,
            'name': dog.name,
            'gender': dog.gender,
            'height': dog.height,
            'breed': dog.breed,
            'dog_class': dog.get_sport_class_display(),  # ← для карточки собаки
            'owner_id': dog.owner.id,
            'avatar': dog.avatar.url if dog.avatar else None,
            'age_display': dog.get_age_display(),
        })

    return JsonResponse({'success': True, 'dogs': dogs_data})

def get_dog_card_html(request):
    """Возвращает HTML карточки собаки по ID"""
    dog_id = request.GET.get('dog_id')
    show_select_button = request.GET.get('show_select_button') == 'true'
    show_select_other_button = request.GET.get('show_select_other_button') == 'true'

    try:
        dog = Dog.objects.get(id=dog_id)
        html = render_to_string('users/dog_card_for_select.html', {
            'dog': dog,
            'show_select_button': show_select_button,
            'show_select_other_button': show_select_other_button,
        })
        return JsonResponse({'success': True, 'html': html})
    except Dog.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Собака не найдена'})

def get_dog_modal_html(request):
    """Возвращает HTML модального окна выбора собаки"""
    from django.template.loader import render_to_string
    html = render_to_string('users/dog_modal.html', {})
    return JsonResponse({'success': True, 'html': html})


def get_user_dogs_html(request):
    """Возвращает HTML карточек собак текущего пользователя для ЛК (без кнопок выбора)"""
    dogs = Dog.objects.filter(owner=request.user)

    html = ''
    for dog in dogs:
        html += render_to_string('users/dog_card_profile.html', {
            'dog': dog,
        })

    if not html:
        html = '<p class="empty-message">У вас пока нет собак</p>'

    return JsonResponse({'success': True, 'html': html})


@login_required
@require_http_methods(["POST"])
def change_email(request):
    """Смена email пользователя"""
    try:
        data = json.loads(request.body)
        new_email = data.get('email')

        if not new_email:
            return JsonResponse({'success': False, 'error': 'Email не указан'})

        # Проверяем, не занят ли email
        if User.objects.exclude(id=request.user.id).filter(email=new_email).exists():
            return JsonResponse({'success': False, 'error': 'Этот email уже используется'})

        request.user.email = new_email
        request.user.save()

        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})


@login_required
@require_http_methods(["POST"])
def delete_account(request):
    """Удаление аккаунта пользователя"""
    user = request.user

    # Проверяем, есть ли активные заявки
    has_active_applications = Application.objects.filter(
        user=user,
        status__in=['pending', 'approved']
    ).exists()

    if has_active_applications:
        return JsonResponse({
            'success': False,
            'error': 'Нельзя удалить аккаунт с активными заявками'
        })

    # Удаляем аватар, если есть
    if user.profile.avatar:
        user.profile.avatar.delete()

    # Удаляем пользователя
    user.delete()

    return JsonResponse({'success': True})


def get_user_card_html(request):
    """Возвращает HTML карточки пользователя"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    data = json.loads(request.body)
    user_data = data.get('user')
    age_text = data.get('age_text', 'Возраст не указан')
    role = data.get('role', 'Спортсмен')
    sport_class = data.get('sport_class', 'Не указан')  # ← исправлено: получаем sport_class

    html = render_to_string('users/user_card.html', {
        'user_data': user_data,
        'age_text': age_text,
        'role': role,
        'sport_class': sport_class,  # ← исправлено: передаём sport_class
    })
    return JsonResponse({'success': True, 'html': html})


def get_dog_card_html_for_list(request):
    """Возвращает HTML карточки собаки"""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Метод не поддерживается'})

    data = json.loads(request.body)
    dog_data = data.get('dog')
    gender_text = data.get('gender_text', 'Не указан')
    age_text = data.get('age_text', 'Возраст не указан')
    height_text = data.get('height_text', 'Рост не указан')
    breed = data.get('breed', 'Порода не указана')
    dog_class = data.get('dog_class', 'Не указан')

    html = render_to_string('users/dog_card.html', {
        'dog_data': dog_data,
        'gender_text': gender_text,
        'age_text': age_text,
        'height_text': height_text,
        'breed': breed,
        'dog_class': dog_class
    })
    return JsonResponse({'success': True, 'html': html})