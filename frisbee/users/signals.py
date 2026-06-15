# users/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from competitions.models import Application
from .notifications import NotificationService
from .models import Notification


@receiver(post_save, sender=Application)
def application_status_changed_notification(sender, instance, created, **kwargs):
    """Уведомление при изменении статуса заявки"""

    # При создании заявки — уведомление организатору (если собака чужая)
    if created and instance.status == Application.STATUS_WAITING_OWNER:
        # Уведомляем владельца собаки, что на неё подали заявку
        NotificationService.send(
            user=instance.dog.owner,
            type_=Notification.Type.APPLICATION_NEW,
            title="Новая заявка на вашу собаку",
            message=f"На собаку {instance.dog.name} подали заявку на соревнование '{instance.competition.title}'. Зайдите в ЛК для подтверждения.",
            link=f"/users/profile/#applications"
        )

    if not created:
        pass