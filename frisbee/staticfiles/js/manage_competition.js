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
    const disciplineOrder = ['bullseye', 'distance', 'accuracy'];
    const classOrder = ['novice', 'progress', 'open'];

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

    disciplines.sort((a, b) => disciplineOrder.indexOf(a.code) - disciplineOrder.indexOf(b.code));

    Object.keys(classesByDisciplineTemp).forEach(discipline => {
        classesByDisciplineTemp[discipline].sort((a, b) => classOrder.indexOf(a.code) - classOrder.indexOf(b.code));
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
        tab.classList.toggle('active', discipline.code === activeDiscipline);
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
        tab.classList.toggle('active', cls.code === activeClass);
        tab.textContent = cls.name;
        tab.dataset.class = cls.code;
        tab.addEventListener('click', () => setActiveClass(cls.code));
        container.appendChild(tab);
    });
}

function updateDisciplineTabsActive() {
    document.querySelectorAll('#discipline-tabs .chip').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.discipline === currentDiscipline);
    });
}

function updateClassTabsActive() {
    document.querySelectorAll('#class-tabs .chip').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.class === currentClass);
    });
}

function setActiveDiscipline(disciplineCode) {
    if (currentDiscipline === disciplineCode) return;
    currentDiscipline = disciplineCode;
    updateDisciplineTabsActive();

    const classes = classesByDiscipline[disciplineCode] || [];
    currentClass = classes.length > 0 ? classes[0].code : null;

    renderClassTabs(classes, currentClass);
    loadResults(currentDiscipline, currentClass);
    updateResultsHeader();
}

function setActiveClass(classCode) {
    if (currentClass === classCode) return;
    currentClass = classCode;
    updateClassTabsActive();
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
    if (!entryTitle || !currentDiscipline || !currentClass) return;

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

(function adaptButtonsForMobile() {
    if (window.innerWidth <= 768) {
        const enterBtn = document.getElementById('enter-results-btn');
        const saveBtn = document.getElementById('save-start-order-btn');
        if (enterBtn) {
            enterBtn.classList.remove('btn-s');
            enterBtn.classList.add('btn-l');
        }
        if (saveBtn) {
            saveBtn.classList.remove('btn-s');
            saveBtn.classList.add('btn-l');
        }
    }
})();

function renderResultsTable(results) {
    const container = document.getElementById('results-table-container');
    if (!container) return;

    const isMobile = window.innerWidth <= 768;
    const isBullseye = currentDiscipline === 'bullseye';
    const isDistance = currentDiscipline === 'distance';
    const isAccuracy = currentDiscipline === 'accuracy';

    if (isMobile) {
        const headers = ['Место', 'Спортсмен', 'Собака', 'Статус'];
        if (isBullseye) headers.push('Броски', 'Сумма', 'Кол-во бросков');
        else if (isDistance) headers.push('Попытка 1', 'Попытка 2', 'Попытка 3', 'Посл. шанс', 'Лучший');
        else if (isAccuracy) headers.push('Броски', 'Сумма 5 лучших', 'Общая сумма');

        let html = '<div class="results-mobile-wrapper"><div class="results-mobile-layout">';

        html += '<div class="results-mobile-fixed"><table><tbody>';
        headers.forEach(header => {
            html += `<tr><td>${header}</td></tr>`;
        });
        html += '</tbody></table></div>';

        html += '<div class="results-mobile-scroll"><table><tbody>';

        if (results.length === 0) {
            html += '<tr><td>Нет участников</td></tr>';
        } else {
            html += '<tr>';
            results.forEach(result => {
                html += result.is_out_of_class
                    ? '<td class="out-of-class-place">ВнЗ</td>'
                    : `<td>${result.place || '—'}</td>`;
            });
            html += '</tr>';

            html += '<tr>';
            results.forEach(result => html += `<td>${escapeHtml(result.user_name)}</td>`);
            html += '</tr>';

            html += '<tr>';
            results.forEach(result => html += `<td>${escapeHtml(result.dog_name)}</td>`);
            html += '</tr>';

            html += '<tr>';
            results.forEach(result => {
                html += `<td class="status-${result.status}">${result.status === 'active' ? 'Активен' : 'Снят'}</td>`;
            });
            html += '</tr>';

            if (isBullseye) {
                html += '<tr>';
                results.forEach(result => {
                    const throws = result.data?.throws || [];
                    html += `<td>${throws.length ? throws.join(', ') : '—'}</td>`;
                });
                html += '</tr>';
                html += '<tr>';
                results.forEach(result => html += `<td>${result.data?.total ?? '—'}</td>`);
                html += '</tr>';
                html += '<tr>';
                results.forEach(result => html += `<td>${result.data?.throw_count ?? '—'}</td>`);
                html += '</tr>';
            } else if (isDistance) {
                html += '<tr>';
                results.forEach(result => html += `<td>${result.data?.attempts?.[0] || 0}</td>`);
                html += '</tr>';
                html += '<tr>';
                results.forEach(result => html += `<td>${result.data?.attempts?.[1] || 0}</td>`);
                html += '</tr>';
                html += '<tr>';
                results.forEach(result => html += `<td>${result.data?.attempts?.[2] || 0}</td>`);
                html += '</tr>';
                html += '<tr>';
                results.forEach(result => html += `<td>${result.data?.last_chance || 0}</td>`);
                html += '</tr>';
                html += '<tr>';
                results.forEach(result => html += `<td class="best-value">${result.data?.best || 0}</td>`);
                html += '</tr>';
            } else if (isAccuracy) {
                html += '<tr>';
                results.forEach(result => {
                    const throws = result.data?.throws || [];
                    html += `<td>${throws.length ? throws.join(', ') : '—'}</td>`;
                });
                html += '</tr>';
                html += '<tr>';
                results.forEach(result => html += `<td>${result.data?.top_five_sum ?? '—'}</td>`);
                html += '</tr>';
                html += '<tr>';
                results.forEach(result => html += `<td>${result.data?.total_sum ?? '—'}</td>`);
                html += '</tr>';
            }
        }

        html += '</tbody></table></div>';
        html += '</div></div>';
        container.innerHTML = html;
        return;
    }

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
            html += result.is_out_of_class
                ? '<td class="out-of-class-place">ВнЗ</td>'
                : `<td class="place-${result.place || 0}">${result.place || '—'}</td>`;
            html += `<td>${escapeHtml(result.user_name)}</td>`;
            html += `<td>${escapeHtml(result.dog_name)}</td>`;
            html += `<td class="status-${result.status}">${result.status === 'active' ? 'Активен' : 'Снят'}</td>`;

            if (isBullseye) {
                const throws = result.data?.throws || [];
                html += `<td>${throws.length ? throws.join(', ') : '—'}</td>`;
                html += `<td>${result.data?.total !== undefined ? result.data.total : '—'}</td>`;
                html += `<td>${result.data?.throw_count !== undefined ? result.data.throw_count : '—'}</td>`;
            } else if (isDistance) {
                const attempts = result.data?.attempts || [0, 0, 0];
                html += `<td>${attempts[0] || 0}</td><td>${attempts[1] || 0}</td><td>${attempts[2] || 0}</td>`;
                html += `<td>${result.data?.last_chance || 0}</td><td class="best-value">${result.data?.best || 0}</td>`;
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
        tab.classList.toggle('active', discipline.code === startOrderDiscipline);
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
        tab.classList.toggle('active', cls.code === startOrderClass);
        tab.textContent = cls.name;
        tab.dataset.class = cls.code;
        tab.addEventListener('click', () => setStartOrderClass(cls.code));
        container.appendChild(tab);
    });
}

function setStartOrderDiscipline(disciplineCode) {
    startOrderDiscipline = disciplineCode;
    document.querySelectorAll('#start-order-discipline-tabs .chip').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.discipline === disciplineCode);
    });
    const classes = classesByDiscipline[disciplineCode] || [];
    startOrderClass = classes.length > 0 ? classes[0].code : null;
    renderStartOrderClassTabs(classes);
    loadStartOrderTable();
    updateStartOrderHeader();
}

function setStartOrderClass(classCode) {
    startOrderClass = classCode;
    document.querySelectorAll('#start-order-class-tabs .chip').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.class === classCode);
    });
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

    const isMobile = window.innerWidth <= 768;

    results.sort((a, b) => (a.start_order ?? 9999) - (b.start_order ?? 9999) || (a.id ?? 0) - (b.id ?? 0));

    let html = '<div class="start-order-table-wrapper"><table class="results-table start-order-table"><thead><tr>';
    html += '<th class="drag-col"></th><th class="order-num-head">Порядок выступления</th><th>Спортсмен</th><th>Собака</th>';
    html += '</tr></thead><tbody>';

    results.forEach((result, index) => {
        const resultId = result.id || '';
        const isFirst = index === 0;
        const isLast = index === results.length - 1;

        html += `<tr draggable="true" data-result-id="${resultId}" class="draggable-row">`;

        if (isMobile) {
            html += '<td class="drag-col"><div class="mobile-arrows">';
            html += `<button class="arrow-btn arrow-up" data-direction="up" ${isFirst ? 'disabled' : ''}>↑</button>`;
            html += `<button class="arrow-btn arrow-down" data-direction="down" ${isLast ? 'disabled' : ''}>↓</button>`;
            html += '</div></td>';
        } else {
            html += `<td class="drag-handle"><img src="/static/images/drag_and_drop.svg" alt="↕"></td>`;
        }

        html += `<td class="order-num">${index + 1}</td>`;
        html += `<td class="order-sportsman">${escapeHtml(result.user_name)}</td>`;
        html += `<td>${escapeHtml(result.dog_name)}</td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    if (isMobile) {
        initMobileArrowButtons();
    } else {
        initDragAndDrop();
    }
}

function initMobileArrowButtons() {
    document.querySelectorAll('.arrow-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.disabled) return;

            const currentRow = this.closest('tr.draggable-row');
            const tbody = currentRow.parentNode;
            const direction = this.dataset.direction;
            const rows = Array.from(tbody.querySelectorAll('tr.draggable-row'));
            const currentIndex = rows.indexOf(currentRow);

            if (direction === 'up' && currentIndex > 0) {
                tbody.insertBefore(currentRow, rows[currentIndex - 1]);
            } else if (direction === 'down' && currentIndex < rows.length - 1) {
                tbody.insertBefore(rows[currentIndex + 1], currentRow);
            }

            updateMobileRowNumbersAndArrows();
        });
    });
}

function updateMobileRowNumbersAndArrows() {
    const rows = document.querySelectorAll('.start-order-table .draggable-row');
    rows.forEach((row, index) => {
        row.querySelector('.order-num').textContent = index + 1;

        const arrowUp = row.querySelector('.arrow-up');
        const arrowDown = row.querySelector('.arrow-down');

        if (arrowUp) arrowUp.disabled = index === 0;
        if (arrowDown) arrowDown.disabled = index === rows.length - 1;
    });
}

function initDragAndDrop() {
    const tbody = document.querySelector('.start-order-table tbody');
    if (!tbody) return;

    // На десктопе — draggable на всей строке
    tbody.querySelectorAll('tr').forEach(row => {
        row.setAttribute('draggable', 'true');
    });

    tbody.addEventListener('dragstart', function(e) {
        // Не даём перетаскивать, если кликнули на стрелки (мобилка)
        if (e.target.closest('.mobile-arrows') || e.target.closest('.arrow-btn')) {
            e.preventDefault();
            return;
        }

        draggedRow = e.target.closest('tr');
        if (!draggedRow) return;
        draggedRow.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    tbody.addEventListener('dragend', function(e) {
        const row = e.target.closest('tr');
        if (row) row.classList.remove('dragging');
        updateRowNumbers();
    });

    tbody.addEventListener('dragover', function(e) {
        e.preventDefault();
        const targetRow = e.target.closest('tr');
        if (!targetRow || targetRow === draggedRow) return;
        const rect = targetRow.getBoundingClientRect();
        if (e.clientY < rect.top + rect.height / 2) {
            tbody.insertBefore(draggedRow, targetRow);
        } else {
            tbody.insertBefore(draggedRow, targetRow.nextSibling);
        }
    });
}

function updateRowNumbers() {
    document.querySelectorAll('.start-order-table .draggable-row').forEach((row, index) => {
        row.querySelector('.order-num').textContent = index + 1;
    });
}

function initStartOrder() {
    if (!entriesData || entriesData.length === 0) {
        const container = document.getElementById('start-order-table-container');
        if (container) container.innerHTML = '<p class="empty-message">Нет зачётов для стартовых протоколов</p>';
        return;
    }

    const { disciplines } = getDisciplinesAndClasses(entriesData);
    if (disciplines.length > 0) {
        renderStartOrderDisciplineTabs(disciplines);
        setStartOrderDiscipline(disciplines[0].code);
    }
}

// ====================== ЕДИНЫЙ DOMContentLoaded ======================
document.addEventListener('DOMContentLoaded', function() {
    initResults();

    const tabs = document.querySelectorAll('.form-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    function switchToTab(tabId) {
        if (!isMainOrganizer && tabId === 'applications') return;

        tabs.forEach(t => t.classList.remove('active'));
        document.querySelector(`.form-tab[data-tab="${tabId}"]`)?.classList.add('active');

        tabContents.forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tabId}`)?.classList.add('active');

        if (tabId === 'start-order' && !startOrderDiscipline) {
            initStartOrder();
        }

        const url = new URL(window.location.href);
        url.searchParams.set('tab', tabId);
        window.history.pushState({}, '', url);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchToTab(tab.dataset.tab));
    });

    const urlParams = new URLSearchParams(window.location.search);
    const activeTab = urlParams.get('tab');
    const validTabs = ['applications', 'results', 'start-order'];
    const defaultTab = isMainOrganizer ? 'applications' : 'results';
    switchToTab(validTabs.includes(activeTab) ? activeTab : defaultTab);

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
        closeModal(paymentModal);
        closeModal(statusModal);
    }

    if (modalOverlay) modalOverlay.addEventListener('click', closeAllModals);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllModals(); });

    // ====================== СТАТУС ОПЛАТЫ ======================
    document.querySelectorAll('.payment-status-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentAppId = this.dataset.appId;
            const currentStatus = this.dataset.status;

            const wrapper = paymentModal.querySelector('.custom-select-wrapper');
            const field = wrapper.querySelector('.custom-select-field');
            const valueSpan = wrapper.querySelector('.custom-select-value');
            const hiddenInput = wrapper.querySelector('.custom-select-input');
            const options = wrapper.querySelectorAll('.custom-select-option');

            options.forEach(opt => opt.classList.remove('selected'));
            const selectedOption = Array.from(options).find(opt => opt.dataset.value === currentStatus);
            if (selectedOption) {
                valueSpan.textContent = selectedOption.textContent;
                valueSpan.classList.remove('placeholder');
                field.classList.add('has-value');
                selectedOption.classList.add('selected');
            }
            if (hiddenInput) hiddenInput.value = currentStatus;

            openModal(paymentModal);
        });
    });

    document.getElementById('close-payment-modal')?.addEventListener('click', () => closeModal(paymentModal));
    document.getElementById('cancel-payment-modal')?.addEventListener('click', () => closeModal(paymentModal));

    document.getElementById('payment-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hiddenInput = paymentModal.querySelector('.custom-select-input');
        const newStatus = hiddenInput?.value;
        if (!currentAppId || !newStatus) return;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Сохранение...'; }

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
                document.querySelectorAll(`.payment-status-btn[data-app-id="${currentAppId}"]`).forEach(btn => {
                    const selectedOption = paymentModal.querySelector('.custom-select-option.selected');
                    btn.dataset.status = newStatus;
                    btn.textContent = selectedOption?.textContent || newStatus;
                });
                closeModal(paymentModal);
            } else {
                alert(data.error || 'Ошибка при обновлении статуса');
            }
        } catch (error) {
            alert('Ошибка сети');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
        }
    });

    // ====================== СТАТУС ЗАЯВКИ ======================
    const rejectionReasonGroup = document.getElementById('rejection-reason-group');
    const rejectionReason = document.getElementById('rejection-reason');

    function toggleRejectionReason(status) {
        if (rejectionReasonGroup) rejectionReasonGroup.style.display = status === 'rejected' ? 'flex' : 'none';
    }

    document.querySelectorAll('.application-status-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            currentAppId = this.dataset.appId;
            const currentStatus = this.dataset.status;
            const currentComment = this.dataset.organizerComment || '';

            const wrapper = statusModal.querySelector('.custom-select-wrapper');
            const field = wrapper.querySelector('.custom-select-field');
            const valueSpan = wrapper.querySelector('.custom-select-value');
            const hiddenInput = wrapper.querySelector('.custom-select-input');
            const options = wrapper.querySelectorAll('.custom-select-option');

            options.forEach(opt => opt.classList.remove('selected'));
            const selectedOption = Array.from(options).find(opt => opt.dataset.value === currentStatus);
            if (selectedOption) {
                valueSpan.textContent = selectedOption.textContent;
                valueSpan.classList.remove('placeholder');
                field.classList.add('has-value');
                selectedOption.classList.add('selected');
            }
            if (hiddenInput) hiddenInput.value = currentStatus;
            if (rejectionReason) rejectionReason.value = currentComment;
            toggleRejectionReason(currentStatus);

            openModal(statusModal);
        });
    });

    document.getElementById('close-status-modal')?.addEventListener('click', () => closeModal(statusModal));
    document.getElementById('cancel-status-modal')?.addEventListener('click', () => closeModal(statusModal));

    const statusModalContent = document.getElementById('application-status-modal');
    if (statusModalContent) {
        const observer = new MutationObserver(() => {
            const hiddenInput = statusModalContent.querySelector('.custom-select-input');
            if (hiddenInput) toggleRejectionReason(hiddenInput.value);
        });
        observer.observe(statusModalContent, { childList: true, subtree: true, attributes: true });
    }

    document.getElementById('application-status-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hiddenInput = statusModal.querySelector('.custom-select-input');
        const newStatus = hiddenInput?.value;
        const comment = rejectionReason?.value || '';
        if (!currentAppId || !newStatus) return;

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent;
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Сохранение...'; }

        try {
            const response = await fetch('/organizer/application/update-status/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                },
                body: JSON.stringify({ app_id: currentAppId, status: newStatus, organizer_comment: comment })
            });
            const data = await response.json();

            if (data.success) {
                document.querySelectorAll(`.application-status-btn[data-app-id="${currentAppId}"]`).forEach(btn => {
                    const selectedOption = statusModal.querySelector('.custom-select-option.selected');
                    btn.dataset.status = newStatus;
                    btn.dataset.organizerComment = comment;
                    btn.textContent = selectedOption?.textContent || newStatus;
                });
                closeModal(statusModal);
            } else {
                alert(data.error || 'Ошибка при обновлении статуса');
            }
        } catch (error) {
            alert('Ошибка сети');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
        }
    });

    // Сохранение стартового порядка
    document.getElementById('save-start-order-btn')?.addEventListener('click', async function() {
        let order = [];

        const rows = document.querySelectorAll('.start-order-table .draggable-row');
        rows.forEach((row, index) => {
            const resultId = row.getAttribute('data-result-id');
            if (resultId) order.push({ result_id: parseInt(resultId), start_order: index });
        });

        if (order.length === 0) { alert('Нет данных для сохранения'); return; }

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
            alert(data.success ? 'Порядок сохранён!' : (data.error || 'Ошибка сохранения'));
        } catch (error) {
            alert('Ошибка сети');
        }
    });
});