# users/context_processors.py
from .notifications import NotificationService

def notification_context(request):
    """Добавляет количество непрочитанных уведомлений в контекст"""
    if request.user.is_authenticated:
        return {
            'unread_count': NotificationService.get_unread_count(request.user)
        }
    return {'unread_count': 0}