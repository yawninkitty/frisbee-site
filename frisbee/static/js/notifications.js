// users/static/users/js/notifications.js

document.addEventListener('DOMContentLoaded', function() {
    // Получаем все непрочитанные уведомления
    const unreadItems = document.querySelectorAll('.notification-item.unread');

    if (unreadItems.length === 0) return;

    // Собираем ID непрочитанных уведомлений
    const unreadIds = Array.from(unreadItems).map(item => parseInt(item.dataset.id));

    // Отправляем запрос на сервер, чтобы отметить их как прочитанные
    fetch('/users/notifications/mark-all/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify({ notification_ids: unreadIds })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Обновляем счётчик у колокольчика
            updateBadgeCount(data.unread_count);

            // Сохраняем в sessionStorage, что эти уведомления уже отмечены
            // Чтобы при следующем заходе они были белыми
            sessionStorage.setItem('notifications_marked', 'true');
        }
    })
    .catch(err => console.error('Ошибка:', err));

    // Проверяем, были ли уведомления уже отмечены в этой сессии
    if (sessionStorage.getItem('notifications_marked')) {
        // Убираем синий цвет
        unreadItems.forEach(item => {
            item.classList.remove('unread');
        });
    }
});

// Обновить бейдж с конкретным числом
function updateBadgeCount(count) {
    const bell = document.querySelector('.notification-bell');
    if (!bell) return;

    const badge = bell.querySelector('.badge');

    if (count > 0) {
        if (badge) {
            badge.textContent = count;
        } else {
            const newBadge = document.createElement('span');
            newBadge.className = 'badge';
            newBadge.textContent = count;
            bell.appendChild(newBadge);
        }
    } else {
        if (badge) badge.remove();
    }
}

// Получение CSRF токена из cookie
function getCsrfToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }
    return cookieValue;
}