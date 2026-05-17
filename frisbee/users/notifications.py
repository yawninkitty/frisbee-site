# users/notifications.py
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Notification


class NotificationService:
    """Сервис для работы с уведомлениями"""

    @staticmethod
    def send(user, type_, title, message, link=None, save=True):
        """
        Отправить уведомление пользователю

        Args:
            user: User объект или user_id
            type_: тип уведомления (из Notification.Type)
            title: заголовок
            message: текст
            link: опциональная ссылка
            save: сохранять в БД или нет (если False - только почта)
        """
        from django.core.mail import send_mail
        from django.conf import settings

        # Получаем user если передан id
        if isinstance(user, int):
            try:
                user = User.objects.get(id=user)
            except User.DoesNotExist:
                return

        # Сохраняем в БД
        notification = None
        if save:
            notification = Notification.objects.create(
                user=user,
                type=type_,
                title=title,
                message=message,
                link=link
            )

        # TODO: позже добавим отправку на email
        # if user.profile.email_notifications_enabled:
        #     send_mail(...)

        return notification

    @staticmethod
    def send_to_multiple(users, type_, title, message, link=None):
        """Отправить уведомление нескольким пользователям"""
        notifications = []
        for user in users:
            if isinstance(user, int):
                try:
                    user = User.objects.get(id=user)
                except User.DoesNotExist:
                    continue
            notif = NotificationService.send(user, type_, title, message, link)
            notifications.append(notif)
        return notifications

    @staticmethod
    def mark_as_read(notification_id, user):
        """Отметить уведомление как прочитанное"""
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
            notification.is_read = True
            notification.save()
            return True
        except Notification.DoesNotExist:
            return False

    @staticmethod
    def mark_all_as_read(user):
        """Отметить все уведомления пользователя как прочитанные"""
        return Notification.objects.filter(user=user, is_read=False).update(is_read=True)

    @staticmethod
    def get_unread_count(user):
        """Количество непрочитанных уведомлений"""
        return Notification.objects.filter(user=user, is_read=False).count()

    @staticmethod
    def cleanup_old_notifications(days=90):
        """Удалить старые уведомления (по умолчанию старше 90 дней)"""
        threshold = timezone.now() - timezone.timedelta(days=days)
        deleted, _ = Notification.objects.filter(created_at__lt=threshold).delete()
        return deleted