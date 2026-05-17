// static/js/manage_competition.js

console.log('=== manage_competition.js loaded ===');

let currentDiscipline = null;
let currentClass = null;
let classesByDiscipline = {};
let entriesData = [];

function getDisciplineName(code) {
    const names = {
        'bullseye': 'Буллсай',
        'distance': 'Броски на дальность',
        'accuracy': 'Броски на точность'
    };
    return names[code] || code;
}

function getClassName(code) {
    const names = {
        'novice': 'Новички',
        'progress': 'Прогресс',
        'open': 'Открытый'
    };
    return names[code] || code;
}

function getDisciplinesAndClasses(entries) {
    const disciplines = [];
    const classesByDisciplineTemp = {};

    entries.forEach(entry => {
        const discipline = entry.discipline;
        const disciplineName = entry.discipline_name;
        const className = entry.class_name;
        const classCode = entry.class_code;

        if (!disciplines.find(d => d.code === discipline)) {
            disciplines.push({ code: discipline, name: disciplineName });
        }

        if (!classesByDisciplineTemp[discipline]) {
            classesByDisciplineTemp[discipline] = [];
        }

        if (!classesByDisciplineTemp[discipline].find(c => c.code === classCode)) {
            classesByDisciplineTemp[discipline].push({ code: classCode, name: className });
        }
    });

    return { disciplines, classesByDiscipline: classesByDisciplineTemp };
}

function renderDisciplineTabs(disciplines, activeDiscipline) {
    const container = document.getElementById('discipline-tabs');
    if (!container) return;

    container.innerHTML = '';
    disciplines.forEach(discipline => {
        const tab = document.createElement('button');
        tab.className = 'chip';
        if (activeDiscipline === discipline.code) tab.classList.add('active');
        tab.textContent = discipline.name;
        tab.dataset.discipline = discipline.code;
        tab.addEventListener('click', () => setActiveDiscipline(discipline.code));
        container.appendChild(tab);
    });
}

function renderClassTabs(classes, activeClass) {
    const container = document.getElementById('class-tabs');
    if (!container) return;

    container.innerHTML = '';
    classes.forEach(cls => {
        const tab = document.createElement('button');
        tab.className = 'chip';
        if (activeClass === cls.code) tab.classList.add('active');
        tab.textContent = cls.name;
        tab.dataset.class = cls.code;
        tab.addEventListener('click', () => setActiveClass(cls.code));
        container.appendChild(tab);
    });
}

function setActiveDiscipline(disciplineCode) {
    currentDiscipline = disciplineCode;

    document.querySelectorAll('#discipline-tabs .chip').forEach(tab => {
        if (tab.dataset.discipline === disciplineCode) tab.classList.add('active');
        else tab.classList.remove('active');
    });

    const classes = classesByDiscipline[disciplineCode] || [];
    const firstClass = classes.length > 0 ? classes[0].code : null;
    currentClass = firstClass;

    renderClassTabs(classes, currentClass);
    loadResults(currentDiscipline, currentClass);
    updateResultsHeader();
}

function setActiveClass(classCode) {
    currentClass = classCode;

    document.querySelectorAll('#class-tabs .chip').forEach(tab => {
        if (tab.dataset.class === classCode) tab.classList.add('active');
        else tab.classList.remove('active');
    });

    loadResults(currentDiscipline, currentClass);
    updateResultsHeader();
}

async function loadResults(discipline, classCode) {
    const container = document.getElementById('results-table-container');
    if (!container) return;

    if (!discipline || !classCode) {
        container.innerHTML = '<p class="empty-message">Выберите дисциплину и класс для просмотра результатов</p>';
        return;
    }

    container.innerHTML = '<div class="loader">Загрузка...</div>';

    try {
        const url = `/organizer/competition/${competitionId}/results-api/?discipline=${discipline}&class=${classCode}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            renderResultsTable(data.results || []);
        } else {
            container.innerHTML = '<p class="empty-message">' + (data.error || 'Ошибка загрузки результатов') + '</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки результатов:', error);
        container.innerHTML = '<p class="empty-message">Ошибка загрузки результатов</p>';
    }
}

function updateResultsHeader() {
    const entryTitle = document.getElementById('current-entry-title');
    entryTitle.innerHTML = `
            <span class="header-sm color-black">${getDisciplineName(currentDiscipline)}</span>
            <span class="header-sm color-gray-middle">${getClassName(currentClass)}</span>
        `;

    const enterBtn = document.getElementById('enter-results-btn');
    if (enterBtn) {
        enterBtn.onclick = () => {
            const entry = entriesData.find(e => e.discipline === currentDiscipline && e.class_code === currentClass);
            if (entry?.id) {
                window.location.href = `/organizer/competition/${competitionId}/entry/${entry.id}/enter-results/`;
            } else {
                alert('Не удалось найти зачёт для ввода результатов');
            }
        };
    }
}

function renderResultsTable(results) {
    const container = document.getElementById('results-table-container');
    if (!container) return;

    const isBullseye = currentDiscipline === 'bullseye';
    const isDistance = currentDiscipline === 'distance';
    const isAccuracy = currentDiscipline === 'accuracy';

    let html = '<div class="results-table-wrapper"><table class="results-table"><thead><tr>';
    html += '<th>Место</th><th>Спортсмен</th><th>Собака</th><th>Статус</th>';

    if (isBullseye) {
        html += '<th>Броски</th><th>Сумма</th><th>Кол-во бросков</th>';
    } else if (isDistance) {
        html += '<th>Попытка 1 (м)</th><th>Попытка 2 (м)</th><th>Попытка 3 (м)</th><th>Последний шанс (м)</th><th>Лучший (м)</th>';
    } else if (isAccuracy) {
        html += '<th>Броски</th><th>Сумма 5 лучших</th><th>Общая сумма</th>';
    }

    html += '</tr></thead><tbody>';

    if (results.length === 0) {
        const colCount = isBullseye ? 7 : (isDistance ? 9 : 7);
        html += `<tr><td colspan="${colCount}" class="empty-message" style="text-align: center;">Нет участников в этом зачёте</td></tr>`;
    } else {
        results.forEach(result => {
            html += '<tr>';

            if (result.is_out_of_class) {
                html += `<td class="out-of-class-place">ВнЗ</td>`;
            } else {
                html += `<td class="place-${result.place || 0}">${result.place || '—'}</td>`;
            }

            html += `<td>${escapeHtml(result.user_name)}</td>`;
            html += `<td>${escapeHtml(result.dog_name)}</td>`;

            const statusText = result.status === 'active' ? 'Активен' : 'Снят';
            html += `<td class="status-${result.status}">${statusText}</td>`;

            if (isBullseye) {
                const throws = result.data?.throws || [];
                html += `<td>${throws.length ? throws.join(', ') : '—'}</td>`;
                html += `<td>${result.data?.total !== undefined ? result.data.total : '—'}</td>`;
                html += `<td>${result.data?.throw_count !== undefined ? result.data.throw_count : '—'}</td>`;
            } else if (isDistance) {
                const attempts = result.data?.attempts || [0, 0, 0];
                html += `<td>${attempts[0] || 0}</td>`;
                html += `<td>${attempts[1] || 0}</td>`;
                html += `<td>${attempts[2] || 0}</td>`;
                html += `<td>${result.data?.last_chance || 0}</td>`;
                html += `<td class="best-value">${result.data?.best || 0}</td>`;
            } else if (isAccuracy) {
                const throws = result.data?.throws || [];
                html += `<td>${throws.length ? throws.join(', ') : '—'}</td>`;
                html += `<td>${result.data?.top_five_sum !== undefined ? result.data.top_five_sum : '—'}</td>`;
                html += `<td>${result.data?.total_sum !== undefined ? result.data.total_sum : '—'}</td>`;
            }

            html += '</tr>';
        });
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function initResults() {
    const entriesScript = document.getElementById('entries-data');
    if (entriesScript) {
        try {
            entriesData = JSON.parse(entriesScript.textContent);
        } catch (e) {
            console.error('Error parsing entries data:', e);
        }
    }

    if (!entriesData || entriesData.length === 0) {
        const container = document.getElementById('results-table-container');
        if (container) container.innerHTML = '<p class="empty-message">Нет зачётов для отображения результатов</p>';
        return;
    }

    const { disciplines, classesByDiscipline: clsByDiscipline } = getDisciplinesAndClasses(entriesData);
    classesByDiscipline = clsByDiscipline;

    if (disciplines.length > 0) {
        renderDisciplineTabs(disciplines, disciplines[0].code);
        setActiveDiscipline(disciplines[0].code);
    }
}

// ====================== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ======================
document.addEventListener('DOMContentLoaded', function() {
    const tabs = document.querySelectorAll('.form-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchToTab(tabId) {
        if (!isMainOrganizer && tabId === 'applications') return;

        tabs.forEach(t => t.classList.remove('active'));
        const targetTab = document.querySelector(`.form-tab[data-tab="${tabId}"]`);
        if (targetTab) targetTab.classList.add('active');

        tabContents.forEach(content => content.classList.remove('active'));
        const targetContent = document.getElementById(`tab-${tabId}`);
        if (targetContent) targetContent.classList.add('active');

        if (tabId === 'results') {
            if (entriesData && entriesData.length > 0) {
                const { disciplines } = getDisciplinesAndClasses(entriesData);
                if (disciplines.length > 0 && !currentDiscipline) {
                    setActiveDiscipline(disciplines[0].code);
                }
            }
        }

        if (tabId === 'start-order') {
            if (entriesData && entriesData.length > 0) {
                const { disciplines } = getDisciplinesAndClasses(entriesData);
                if (!startOrderDiscipline && disciplines.length > 0) {
                    initStartOrder();
                }
            }
        }

        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabId);
        window.history.pushState({}, '', url);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            switchToTab(tabId);
        });
    });

    // Сначала заполняем entriesData
    initResults();

    // Определяем, какую вкладку открыть при загрузке
    const urlParams = new URLSearchParams(window.location.search);
    let activeTab = urlParams.get('tab');

    if (activeTab === 'applications' || activeTab === 'results' || activeTab === 'start-order') {
        switchToTab(activeTab);
    } else {
        if (isMainOrganizer) {
            switchToTab('applications');
        } else {
            switchToTab('results');
        }
    }

    // ====================== МОДАЛЬНЫЕ ОКНА ======================
    const modalOverlay = document.getElementById('modal-overlay');
    const paymentModal = document.getElementById('payment-modal');
    const statusModal = document.getElementById('application-status-modal');
    let currentAppId = null;

    function openModal(modal) {
        if (modalOverlay) modalOverlay.style.display = 'flex';
        if (modal) modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modal) {
        if (modalOverlay) modalOverlay.style.display = 'none';
        if (modal) modal.style.display = 'none';
        document.body.style.overflow = '';
    }

    function closeAllModals() {
        if (modalOverlay) modalOverlay.style.display = 'none';
        if (paymentModal) paymentModal.style.display = 'none';
        if (statusModal) statusModal.style.display = 'none';
        document.body.style.overflow = '';
    }

    if (modalOverlay) modalOverlay.addEventListener('click', closeAllModals);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });

    // ====================== СТАТУС ОПЛАТЫ ======================
    const paymentButtons = document.querySelectorAll('.payment-status-btn');

    if (paymentButtons.length && isMainOrganizer) {
        paymentButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                currentAppId = null;
                const appId = this.dataset.appId;
                const currentStatus = this.dataset.status;
                currentAppId = appId;

                const paymentModalContent = paymentModal.querySelector('#modal-content');
                const customSelectWrapper = paymentModalContent.querySelector('.custom-select-wrapper');
                const customSelectField = customSelectWrapper.querySelector('.custom-select-field');
                const valueSpan = customSelectWrapper.querySelector('.custom-select-value');
                const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                const options = customSelectWrapper.querySelectorAll('.custom-select-option');

                const selectedOption = Array.from(options).find(opt => opt.dataset.value === currentStatus);
                if (selectedOption) {
                    valueSpan.textContent = selectedOption.textContent;
                    valueSpan.classList.remove('placeholder');
                    customSelectField.classList.add('has-value');
                    selectedOption.classList.add('selected');
                }
                if (hiddenInput) hiddenInput.value = currentStatus;

                openModal(paymentModal);
            });
        });
    }

    document.getElementById('close-payment-modal')?.addEventListener('click', () => closeModal(paymentModal));
    document.getElementById('cancel-payment-modal')?.addEventListener('click', () => closeModal(paymentModal));

    document.getElementById('payment-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const modalContent = document.getElementById('payment-modal');
        const hiddenInput = modalContent.querySelector('.custom-select-input');
        const newStatus = hiddenInput?.value;

        if (!currentAppId || !newStatus) return;

        // Блокируем кнопку отправки
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Сохранение...';
        }

        try {
            const response = await fetch('/organizer/application/update-payment-status/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
                body: JSON.stringify({ app_id: currentAppId, payment_status: newStatus })
            });

            const data = await response.json();

            if (data.success) {
                const btn = document.querySelector(`.payment-status-btn[data-app-id="${currentAppId}"]`);
                if (btn) {
                    const selectedOption = modalContent.querySelector('.custom-select-option.selected');
                    const newStatusText = selectedOption?.textContent ||
                        (newStatus === 'paid' ? 'Оплачено' :
                         newStatus === 'pending' ? 'Чек на проверке' : 'Не оплачено');

                    btn.dataset.status = newStatus;
                    btn.textContent = newStatusText;

                    // Обновляем классы стилей
                    btn.classList.remove('status-unpaid', 'status-pending', 'status-paid');
                    if (newStatus === 'unpaid') btn.classList.add('status-unpaid');
                    else if (newStatus === 'pending') btn.classList.add('status-pending');
                    else if (newStatus === 'paid') btn.classList.add('status-paid');
                }

                closeModal(paymentModal);
                currentAppId = null;

                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            } else {
                alert(data.error || 'Ошибка при обновлении статуса');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка сети');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });

    // ====================== СТАТУС ЗАЯВКИ ======================
    const statusButtons = document.querySelectorAll('.application-status-btn');
    const rejectionReasonGroup = document.getElementById('rejection-reason-group');
    const rejectionReason = document.getElementById('rejection-reason');

    function toggleRejectionReason(status) {
        if (rejectionReasonGroup) {
            rejectionReasonGroup.style.display = status === 'rejected' ? 'flex' : 'none';
        }
    }

    if (statusButtons.length && isMainOrganizer) {
        statusButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                currentAppId = null;
                const appId = this.dataset.appId;
                const currentStatus = this.dataset.status;
                const currentComment = this.dataset.organizerComment || '';
                currentAppId = appId;

                const statusModalContent = statusModal.querySelector('#modal-content');
                const customSelectWrapper = statusModalContent.querySelector('.custom-select-wrapper');
                const customSelectField = customSelectWrapper.querySelector('.custom-select-field');
                const valueSpan = customSelectWrapper.querySelector('.custom-select-value');
                const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                const options = customSelectWrapper.querySelectorAll('.custom-select-option');

                const selectedOption = Array.from(options).find(opt => opt.dataset.value === currentStatus);
                if (selectedOption) {
                    valueSpan.textContent = selectedOption.textContent;
                    valueSpan.classList.remove('placeholder');
                    customSelectField.classList.add('has-value');
                    selectedOption.classList.add('selected');
                }
                if (hiddenInput) hiddenInput.value = currentStatus;
                if (rejectionReason) rejectionReason.value = currentComment;
                toggleRejectionReason(currentStatus);

                openModal(statusModal);
            });
        });
    }

    document.getElementById('close-status-modal')?.addEventListener('click', () => closeModal(statusModal));
    document.getElementById('cancel-status-modal')?.addEventListener('click', () => closeModal(statusModal));

    const statusModalContent = document.getElementById('application-status-modal');
    if (statusModalContent) {
        const observer = new MutationObserver(() => {
            const hiddenInput = statusModalContent.querySelector('.custom-select-input');
            if (hiddenInput) {
                toggleRejectionReason(hiddenInput.value);
            }
        });
        observer.observe(statusModalContent, { childList: true, subtree: true, attributes: true });
    }

    document.getElementById('application-status-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const modalContent = document.getElementById('application-status-modal');
    const hiddenInput = modalContent.querySelector('.custom-select-input');
    const newStatus = hiddenInput?.value;
    const comment = rejectionReason?.value || '';

    if (!currentAppId || !newStatus) return;

    // Блокируем кнопку отправки, чтобы избежать двойного клика
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Сохранение...';
    }

    try {
        const response = await fetch('/organizer/application/update-status/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            },
            body: JSON.stringify({
                app_id: currentAppId,
                status: newStatus,
                organizer_comment: comment
            })
        });

        const data = await response.json();

        if (data.success) {
            // Обновляем кнопку на странице
            const btn = document.querySelector(`.application-status-btn[data-app-id="${currentAppId}"]`);
            if (btn) {
                const selectedOption = modalContent.querySelector('.custom-select-option.selected');
                const newStatusText = selectedOption?.textContent ||
                    (newStatus === 'approved' ? 'Одобрена' :
                     newStatus === 'rejected' ? 'Отклонена' : 'На рассмотрении');

                btn.dataset.status = newStatus;
                btn.dataset.organizerComment = comment;
                btn.textContent = newStatusText;

                // Обновляем классы стилей для кнопки
                btn.classList.remove('status-pending', 'status-approved', 'status-rejected');
                if (newStatus === 'pending') btn.classList.add('status-pending');
                else if (newStatus === 'approved') btn.classList.add('status-approved');
                else if (newStatus === 'rejected') btn.classList.add('status-rejected');
            }

            // Закрываем модалку
            closeModal(statusModal);

            // Сбрасываем currentAppId
            currentAppId = null;

            // Небольшая задержка перед разблокировкой (необязательно)
            setTimeout(() => {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }, 500);
        } else {
            alert(data.error || 'Ошибка при обновлении статуса');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка сети');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
});

    // Инициализация результатов
    if (document.getElementById('tab-results')) {
        initResults();
    }
});

// ====================== СТАРТОВЫЕ ПРОТОКОЛЫ ======================
let startOrderDiscipline = null;
let startOrderClass = null;
let draggedRow = null;

function renderStartOrderDisciplineTabs(disciplines) {
    const container = document.getElementById('start-order-discipline-tabs');
    if (!container) return;
    container.innerHTML = '';
    disciplines.forEach(discipline => {
        const tab = document.createElement('button');
        tab.className = 'chip';
        if (startOrderDiscipline === discipline.code) tab.classList.add('active');
        tab.textContent = discipline.name;
        tab.dataset.discipline = discipline.code;
        tab.addEventListener('click', () => setStartOrderDiscipline(discipline.code));
        container.appendChild(tab);
    });
}

function renderStartOrderClassTabs(classes) {
    const container = document.getElementById('start-order-class-tabs');
    if (!container) return;
    container.innerHTML = '';
    classes.forEach(cls => {
        const tab = document.createElement('button');
        tab.className = 'chip';
        if (startOrderClass === cls.code) tab.classList.add('active');
        tab.textContent = cls.name;
        tab.dataset.class = cls.code;
        tab.addEventListener('click', () => setStartOrderClass(cls.code));
        container.appendChild(tab);
    });
}

function setStartOrderDiscipline(disciplineCode) {
    startOrderDiscipline = disciplineCode;
    const classes = classesByDiscipline[disciplineCode] || [];
    startOrderClass = classes.length > 0 ? classes[0].code : null;
    renderStartOrderClassTabs(classes);
    loadStartOrderTable();
    updateStartOrderHeader();
}

function setStartOrderClass(classCode) {
    startOrderClass = classCode;
    loadStartOrderTable();
    updateStartOrderHeader();
}

function updateStartOrderHeader() {
    const entryTitle = document.getElementById('start-order-entry-title');
    const saveBtn = document.getElementById('save-start-order-btn');
    if (entryTitle && startOrderDiscipline && startOrderClass) {
        entryTitle.innerHTML = `
            <span class="header-sm color-black">${getDisciplineName(startOrderDiscipline)}</span>
            <span class="header-sm color-gray-middle">${getClassName(startOrderClass)}</span>
        `;
    }
    if (saveBtn) saveBtn.style.display = startOrderDiscipline && startOrderClass ? 'inline-flex' : 'none';
}

async function loadStartOrderTable() {
    const container = document.getElementById('start-order-table-container');
    const saveBtn = document.getElementById('save-start-order-btn');
    if (!container) return;

    if (!startOrderDiscipline || !startOrderClass) {
        container.innerHTML = '<p class="empty-message">Выберите дисциплину и класс для работы со стартовым протоколом</p>';
        if (saveBtn) saveBtn.style.display = 'none';
        return;
    }

    container.innerHTML = '<div class="loader">Загрузка...</div>';

    try {
        const url = `/organizer/competition/${competitionId}/results-api/?discipline=${startOrderDiscipline}&class=${startOrderClass}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.results.length > 0) {
            renderStartOrderTable(data.results);
            if (saveBtn) saveBtn.style.display = 'inline-flex';
        } else {
            container.innerHTML = '<p class="empty-message">Нет участников в этом зачёте</p>';
            if (saveBtn) saveBtn.style.display = 'none';
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = '<p class="empty-message">Ошибка загрузки</p>';
    }
}

function renderStartOrderTable(results) {
    const container = document.getElementById('start-order-table-container');
    if (!container) return;

    // Сортируем по start_order, затем по id для стабильности
    results.sort((a, b) => (a.start_order ?? 9999) - (b.start_order ?? 9999) || (a.id ?? 0) - (b.id ?? 0));

    let html = '<div class="start-order-table-wrapper"><table class="results-table start-order-table"><thead><tr>';
    html += '<th class="drag-col"></th><th class="order-num-head">Порядок выступления</th><th>Спортсмен</th><th>Собака</th>';
    html += '</tr></thead><tbody>';

    results.forEach((result, index) => {
        const resultId = result.id || '';
        html += `<tr draggable="true" data-result-id="${resultId}" class="draggable-row">`;
        html += `<td class="drag-handle"><img src="/static/images/drag_and_drop.svg" alt="↕"></td>`;
        html += `<td class="order-num">${index + 1}</td>`;
        html += `<td class="order-sportsman">${escapeHtml(result.user_name)}</td>`;
        html += `<td>${escapeHtml(result.dog_name)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    initDragAndDrop();
}

function initDragAndDrop() {
    const tbody = document.querySelector('.start-order-table tbody');
    if (!tbody) return;

    tbody.addEventListener('dragstart', function(e) {
        draggedRow = e.target.closest('tr.draggable-row');
        if (!draggedRow) return;
        draggedRow.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    tbody.addEventListener('dragend', function(e) {
        const row = e.target.closest('tr.draggable-row');
        if (row) row.classList.remove('dragging');
        updateRowNumbers();
    });

    tbody.addEventListener('dragover', function(e) {
        e.preventDefault();
        const targetRow = e.target.closest('tr.draggable-row');
        if (!targetRow || targetRow === draggedRow) return;

        const rect = targetRow.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;

        if (e.clientY < mid) {
            tbody.insertBefore(draggedRow, targetRow);
        } else {
            tbody.insertBefore(draggedRow, targetRow.nextSibling);
        }
    });
}

function updateRowNumbers() {
    const rows = document.querySelectorAll('.start-order-table .draggable-row');
    rows.forEach((row, index) => {
        row.querySelector('.order-num').textContent = index + 1;
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('save-start-order-btn')?.addEventListener('click', async function() {
        const rows = document.querySelectorAll('.start-order-table .draggable-row');
        const order = [];

        rows.forEach((row, index) => {
            const resultId = row.getAttribute('data-result-id');
            if (resultId && resultId.trim() !== '') {
                order.push({
                    result_id: parseInt(resultId),
                    start_order: index
                });
            }
        });

        if (order.length === 0) {
            alert('Нет данных для сохранения');
            return;
        }

        try {
            const response = await fetch(`/organizer/competition/${competitionId}/update-start-order/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
                body: JSON.stringify({ order })
            });
            const data = await response.json();
            if (data.success) {
                alert('Порядок сохранён!');
            } else {
                alert(data.error || 'Ошибка сохранения');
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка сети');
        }
    });
});

function initStartOrder() {
    if (!entriesData || entriesData.length === 0) {
        const container = document.getElementById('start-order-table-container');
        if (container) container.innerHTML = '<p class="empty-message">Нет зачётов для стартовых протоколов</p>';
        return;
    }

    const { disciplines } = getDisciplinesAndClasses(entriesData);
    if (disciplines.length > 0) {
        renderStartOrderDisciplineTabs(disciplines);
        // Явно активируем первый таб
        document.querySelectorAll('#start-order-discipline-tabs .chip').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.discipline === disciplines[0].code);
        });
        setStartOrderDiscipline(disciplines[0].code);
    }
}