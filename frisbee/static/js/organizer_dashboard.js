// static/js/organizer_dashboard.js

document.addEventListener('DOMContentLoaded', function() {
    // Текущие фильтры
    let currentMode = 'organizer';  // 'organizer' или 'judge'
    let currentPeriod = 'upcoming'; // 'upcoming' или 'past'

    const container = document.getElementById('competitions-container');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Получаем контейнеры с карточками от разных режимов
    const organizerCardsContainer = document.getElementById('organizer-cards');
    const judgeCardsContainer = document.getElementById('judge-cards');

    // Функция для получения даты из data-атрибута
    function getCompetitionDate(card) {
        const dateStr = card.dataset.date;
        if (dateStr) {
            const date = new Date(dateStr);
            date.setHours(0, 0, 0, 0);
            return date;
        }
        return null;
    }

    // Функция для проверки, предстоящее ли соревнование
    function isUpcoming(card) {
        const compDate = getCompetitionDate(card);
        if (!compDate) return false;
        return compDate >= today;
    }

    // Функция для удаления сообщения о пустом списке
    function removeEmptyMessage(containerEl) {
        const emptyMessage = containerEl.querySelector('.empty-message');
        if (emptyMessage) {
            emptyMessage.remove();
        }
    }

    // Функция для добавления сообщения о пустом списке
    function addEmptyMessage(containerEl, mode, period) {
        removeEmptyMessage(containerEl);
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-message';

        let messageText = '';
        if (mode === 'organizer') {
            messageText = period === 'upcoming'
                ? 'У вас ещё нет предстоящих соревнований как организатора.'
                : 'У вас ещё нет прошедших соревнований как организатора.';
        } else {
            messageText = period === 'upcoming'
                ? 'У вас ещё нет предстоящих соревнований, где вы судья.'
                : 'У вас ещё нет прошедших соревнований, где вы судья.';
        }

        emptyMessage.innerHTML = `<p>${messageText}</p>`;
        containerEl.appendChild(emptyMessage);
    }

    // Функция фильтрации карточек в одном контейнере
    function filterCardsInContainer(containerEl, period) {
        if (!containerEl) return 0;

        const cards = containerEl.querySelectorAll('.organizer-competition-card');
        let visibleCount = 0;

        cards.forEach(card => {
            if (period === 'upcoming') {
                if (isUpcoming(card)) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            } else {
                if (!isUpcoming(card)) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            }
        });

        return visibleCount;
    }

    // Функция обновления видимости контейнеров и фильтрации
    function updateView() {
        // Сначала показываем/скрываем контейнеры в зависимости от режима
        if (organizerCardsContainer) {
            organizerCardsContainer.style.display = currentMode === 'organizer' ? 'flex' : 'none';
        }
        if (judgeCardsContainer) {
            judgeCardsContainer.style.display = currentMode === 'judge' ? 'flex' : 'none';
        }

        // Фильтруем карточки в активном контейнере
        let activeContainer, visibleCount;

        if (currentMode === 'organizer') {
            activeContainer = organizerCardsContainer;
        } else {
            activeContainer = judgeCardsContainer;
        }

        if (activeContainer) {
            visibleCount = filterCardsInContainer(activeContainer, currentPeriod);

            if (visibleCount === 0) {
                addEmptyMessage(activeContainer, currentMode, currentPeriod);
            } else {
                removeEmptyMessage(activeContainer);
            }
        }
    }

    // Переключение режима (организатор/судья) - ищем .chip с data-mode
    const modeChips = document.querySelectorAll('.chip[data-mode]');
    modeChips.forEach(chip => {
        chip.addEventListener('click', function(e) {
            e.stopPropagation();
            modeChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentMode = this.dataset.mode;
            updateView();
        });
    });

    // Переключение периода (предстоящие/прошедшие) - ищем .chip с data-period
    const periodChips = document.querySelectorAll('.chip[data-period]');
    periodChips.forEach(chip => {
        chip.addEventListener('click', function(e) {
            e.stopPropagation();
            periodChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            updateView();
        });
    });

    // Кнопка создания соревнования
    const createBtn = document.getElementById('create-competition-btn');
    if (createBtn) {
        createBtn.addEventListener('click', function() {
            window.location.href = '/organizer/competition/create/';
        });
    }

    // Инициализация: применяем фильтры по умолчанию
    updateView();
});

// Публикация черновика из карточки
let currentPublishCompId = null;
let currentPublishCard = null;

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('publish-draft-btn')) {
        currentPublishCompId = e.target.dataset.competitionId;
        currentPublishCard = e.target.closest('.organizer-competition-card');
        showPublishModal();
    }
});

function showPublishModal() {
    const modal = document.getElementById('publish-confirm-modal');
    const overlay = document.getElementById('publish-modal-overlay');
    if (!modal || !overlay) return;

    modal.style.display = 'flex';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function hidePublishModal() {
    const modal = document.getElementById('publish-confirm-modal');
    const overlay = document.getElementById('publish-modal-overlay');
    if (modal) modal.style.display = 'none';
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

function showSuccessModal(message) {
    const modal = document.getElementById('success-modal');
    const overlay = document.getElementById('success-modal-overlay');
    const modalMessage = document.getElementById('success-modal-message');
    const closeBtn = document.getElementById('close-success-modal');
    const okBtn = document.getElementById('success-modal-ok');

    if (!modal || !overlay || !modalMessage) return;

    modalMessage.textContent = message;
    modal.style.display = 'flex';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    function closeModal() {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        closeBtn.removeEventListener('click', closeModal);
        okBtn.removeEventListener('click', closeModal);
        overlay.removeEventListener('click', closeModal);
    }

    closeBtn.addEventListener('click', closeModal);
    okBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);
}

function updateCardAfterPublish(card) {
    const statusTag = card.querySelector('.status-tag');
    if (statusTag) {
        statusTag.textContent = 'Опубликовано';
        statusTag.className = 'tag status-tag status-published';
    }

    const statItem = card.querySelector('.stat-item .body-text-md');
    if (statItem) statItem.textContent = 'Запись открыта';

    const publishBtn = card.querySelector('.publish-draft-btn');
    if (publishBtn) {
        const actionsDiv = publishBtn.closest('.competition-card-actions');
        publishBtn.remove();

        const manageLink = document.createElement('a');
        manageLink.href = `/organizer/competition/${currentPublishCompId}/manage/`;
        manageLink.className = 'btn btn-primary btn-s';
        manageLink.textContent = 'Управлять';
        actionsDiv.appendChild(manageLink);
    }
}

// Закрытие модалки
document.getElementById('close-publish-modal')?.addEventListener('click', hidePublishModal);
document.getElementById('publish-cancel-btn')?.addEventListener('click', hidePublishModal);
document.getElementById('publish-modal-overlay')?.addEventListener('click', hidePublishModal);

// Кнопка "Опубликовать" в модалке
document.getElementById('publish-confirm-btn')?.addEventListener('click', function() {
    if (!currentPublishCompId) return;

    const btn = this;
    btn.disabled = true;
    btn.textContent = 'Публикуется...';

    fetch(`/organizer/competition/${currentPublishCompId}/publish/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => response.json())
    .then(data => {
        hidePublishModal();
        if (data.success) {
            updateCardAfterPublish(currentPublishCard);
            showSuccessModal('Соревнование опубликовано!');
        } else {
            alert(data.error || 'Ошибка при публикации');
        }
    })
    .catch(error => {
        hidePublishModal();
        alert('Ошибка сети');
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = 'Опубликовать';
    });
});