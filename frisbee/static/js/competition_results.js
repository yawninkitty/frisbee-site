// static/js/competition_results.js

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

// Получение уникальных дисциплин и их классов
function getDisciplinesAndClasses(entries) {
    const disciplines = [];
    const classesByDisciplineTemp = {};

    entries.forEach(entry => {
        const discipline = entry.discipline;
        const disciplineName = entry.discipline_name;
        const className = entry.class_name;
        const classCode = entry.class_code;

        if (!disciplines.find(d => d.code === discipline)) {
            disciplines.push({
                code: discipline,
                name: disciplineName
            });
        }

        if (!classesByDisciplineTemp[discipline]) {
            classesByDisciplineTemp[discipline] = [];
        }

        if (!classesByDisciplineTemp[discipline].find(c => c.code === classCode)) {
            classesByDisciplineTemp[discipline].push({
                code: classCode,
                name: className
            });
        }
    });

    return { disciplines, classesByDiscipline: classesByDisciplineTemp };
}

// Рендер вкладок дисциплин (используем класс chip)
function renderDisciplineTabs(disciplines, activeDiscipline) {
    const container = document.getElementById('discipline-tabs');
    if (!container) return;

    container.innerHTML = '';
    disciplines.forEach(discipline => {
        const tab = document.createElement('button');
        tab.className = 'chip';
        if (activeDiscipline === discipline.code) {
            tab.classList.add('active');
        }
        tab.textContent = discipline.name;
        tab.dataset.discipline = discipline.code;
        tab.addEventListener('click', () => {
            setActiveDiscipline(discipline.code);
        });
        container.appendChild(tab);
    });
}

// Рендер вкладок классов (используем класс chip)
function renderClassTabs(classes, activeClass) {
    const container = document.getElementById('class-tabs');
    if (!container) return;

    container.innerHTML = '';
    classes.forEach(cls => {
        const tab = document.createElement('button');
        tab.className = 'chip';
        if (activeClass === cls.code) {
            tab.classList.add('active');
        }
        tab.textContent = cls.name;
        tab.dataset.class = cls.code;
        tab.addEventListener('click', () => {
            setActiveClass(cls.code);
        });
        container.appendChild(tab);
    });
}

// Установка активной дисциплины
function setActiveDiscipline(disciplineCode) {
    currentDiscipline = disciplineCode;

    const disciplineTabs = document.querySelectorAll('#discipline-tabs .chip');
    disciplineTabs.forEach(tab => {
        if (tab.dataset.discipline === disciplineCode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    const classes = classesByDiscipline[disciplineCode] || [];
    const firstClass = classes.length > 0 ? classes[0].code : null;
    currentClass = firstClass;

    renderClassTabs(classes, currentClass);
    loadResults(currentDiscipline, currentClass);
    updateResultsHeader();
}

// Установка активного класса
function setActiveClass(classCode) {
    currentClass = classCode;

    const classTabs = document.querySelectorAll('#class-tabs .chip');
    classTabs.forEach(tab => {
        if (tab.dataset.class === classCode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    loadResults(currentDiscipline, currentClass);
    updateResultsHeader();
}

// Загрузка результатов
async function loadResults(discipline, className) {
    const container = document.getElementById('results-table-container');
    if (!container) return;

    if (!discipline || !className) {
        container.innerHTML = '<p>Выберите дисциплину и класс для просмотра результатов</p>';
        return;
    }

    container.innerHTML = '<p>Загрузка...</p>';

    try {
        const url = `/competitions/${competitionId}/results-api/?discipline=${discipline}&class=${className}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
            renderResultsTable(data.results || []);
        } else {
            container.innerHTML = '<p>' + (data.error || 'Ошибка загрузки результатов') + '</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки результатов:', error);
        container.innerHTML = '<p>Ошибка загрузки результатов</p>';
    }
}

// Обновление заголовка
function updateResultsHeader() {
    const entryTitle = document.getElementById('current-entry-title');
    if (entryTitle) {
        const disciplineName = getDisciplineName(currentDiscipline);
        const className = getClassName(currentClass);
        entryTitle.innerHTML = `<span class="color-black">${disciplineName}</span> <span class="color-gray-middle">${className}</span>`;
    }
}

// Рендер таблицы результатов
function renderResultsTable(results) {
    const container = document.getElementById('results-table-container');
    if (!container) return;

    const isBullseye = currentDiscipline === 'bullseye';
    const isDistance = currentDiscipline === 'distance';
    const isAccuracy = currentDiscipline === 'accuracy';

    // Разделяем результаты
    const activeResults = results.filter(r => !r.is_out_of_class && r.status === 'active');
    const disqualifiedResults = results.filter(r => !r.is_out_of_class && r.status === 'disqualified');
    const outOfClassResults = results.filter(r => r.is_out_of_class);

    let html = '<div class="results-table-wrapper"><table class="results-table"><thead><tr>';
    html += '<th>Место</th><th>Спортсмен</th><th>Собака</th>';

    if (isBullseye) {
        html += '<th>Броски</th><th>Сумма</th><th>Кол-во бросков</th>';
    } else if (isDistance) {
        html += '<th>Попытка 1 (м)</th><th>Попытка 2 (м)</th><th>Попытка 3 (м)</th><th>Последний шанс (м)</th><th>Лучший (м)</th>';
    } else if (isAccuracy) {
        html += '<th>Броски</th><th>Сумма 5 лучших</th><th>Общая сумма</th>';
    }

    html += '</thead><tbody>';

    if (activeResults.length === 0 && disqualifiedResults.length === 0 && outOfClassResults.length === 0) {
        const colCount = isBullseye ? 6 : (isDistance ? 8 : 6);
        html += `<tr><td colspan="${colCount}" class="empty-message" style="text-align: center;">Нет участников в этом зачёте</td></tr>`;
    } else {
        // Активные участники (с местами)
        activeResults.forEach(result => {
            html += '<tr>';
            html += `<td class="place-${result.place}">${result.place || '—'}</td>`;
            html += `<td>${escapeHtml(result.user_name)}</td>`;
            html += `<td>${escapeHtml(result.dog_name)}</td>`;

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

            html += '<tr>';
        });

        // Снятые участники
        disqualifiedResults.forEach(result => {
            html += '<tr>';
            html += `<td class="disqualified-place">Снят</td>`;
            html += `<td>${escapeHtml(result.user_name)}</td>`;
            html += `<td>${escapeHtml(result.dog_name)}</td>`;

            if (isBullseye) {
                const throws = result.data?.throws || [];
                html += `<td>${throws.length ? throws.join(', ') : '—'}`;
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

        // Участники вне зачёта
        if (outOfClassResults.length > 0) {
            if (activeResults.length > 0 || disqualifiedResults.length > 0) {
                const colCount = isBullseye ? 6 : (isDistance ? 8 : 6);
                html += `<tr class="separator-row"><td colspan="${colCount}" style="text-align: center; padding: 8px;"><span class="body-text-sm color-gray-middle">— Участники вне зачёта —</span></td></tr>`;
            }

            outOfClassResults.forEach(result => {
                html += '<tr class="out-of-class-row">';
                html += `<td class="out-of-class-place">Вне зачёта</td>`;
                html += `<td>${escapeHtml(result.user_name)}</td>`;
                html += `<td>${escapeHtml(result.dog_name)}</td>`;

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
    }

    html += '</tbody></div>';
    container.innerHTML = html;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Инициализация
function init() {
    const entriesDataScript = document.getElementById('entries-data');
    if (entriesDataScript) {
        try {
            entriesData = JSON.parse(entriesDataScript.textContent);
            console.log('Entries data loaded:', entriesData);
        } catch (e) {
            console.error('Error parsing entries data:', e);
        }
    }

    if (!entriesData || entriesData.length === 0) {
        const container = document.getElementById('results-table-container');
        if (container) {
            container.innerHTML = '<p>Нет зачётов для отображения результатов</p>';
        }
        return;
    }

    const { disciplines, classesByDiscipline: clsByDiscipline } = getDisciplinesAndClasses(entriesData);
    classesByDiscipline = clsByDiscipline;
    if (disciplines.length > 0) {
        renderDisciplineTabs(disciplines, disciplines[0].code);
        setActiveDiscipline(disciplines[0].code);
    }
}

init();

// ====================== ПЕРЕКЛЮЧЕНИЕ: РЕЗУЛЬТАТЫ / ПРОТОКОЛ ======================
let currentView = 'results';

document.querySelectorAll('.form-tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabId = this.dataset.tab;
        document.querySelectorAll('.form-tab[data-tab]').forEach(t => t.classList.remove('active'));
        this.classList.add('active');

        document.getElementById('tab-results').style.display = tabId === 'results' ? 'flex' : 'none';
        document.getElementById('tab-start-order').style.display = tabId === 'start-order' ? 'flex' : 'none';

        currentView = tabId;
        if (currentDiscipline && currentClass) {
            if (tabId === 'results') {
                loadResults(currentDiscipline, currentClass);
            } else {
                loadStartOrderTable();
            }
        }
    });
});

// ====================== СТАРТОВЫЙ ПРОТОКОЛ (публичный) ======================
async function loadStartOrderTable() {
    const container = document.getElementById('start-order-table-container');
    if (!container) return;

    if (!currentDiscipline || !currentClass) {
        container.innerHTML = '<p class="empty-message">Выберите дисциплину и класс</p>';
        return;
    }

    container.innerHTML = '<p>Загрузка...</p>';

    try {
        const url = `/competitions/${competitionId}/results-api/?discipline=${currentDiscipline}&class=${currentClass}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.success && data.results.length > 0) {
            renderStartOrderTable(data.results);
            updateStartOrderHeader();
        } else {
            container.innerHTML = '<p class="empty-message">Нет участников в этом зачёте</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        container.innerHTML = '<p class="empty-message">Ошибка загрузки</p>';
    }
}

function renderStartOrderTable(results) {
    const container = document.getElementById('start-order-table-container');
    if (!container) return;

    results.sort((a, b) => (a.start_order ?? 9999) - (b.start_order ?? 9999) || (a.id ?? 0) - (b.id ?? 0));

    const activeResults = results.filter(r => r.status === 'active');

    let html = '<div class="start-order-table-wrapper"><table class="results-table start-order-table"><thead><tr>';
    html += '<th>Порядок выступления</th><th>Спортсмен</th><th>Собака</th>';
    html += '</tr></thead><tbody>';

    if (activeResults.length === 0) {
        html += '<tr><td colspan="3" class="empty-message" style="text-align: center;">Нет участников</td></tr>';
    } else {
        activeResults.forEach((result, index) => {
            html += '<tr>';
            html += `<td class="order-num">${index + 1}</td>`;
            html += `<td>${escapeHtml(result.user_name)}</td>`;
            html += `<td>${escapeHtml(result.dog_name)}</td>`;
            html += '</tr>';
        });
    }

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function updateStartOrderHeader() {
    const entryTitle = document.getElementById('start-order-entry-title');
    if (entryTitle && currentDiscipline && currentClass) {
        entryTitle.innerHTML = `<span class="color-black">${getDisciplineName(currentDiscipline)}</span> <span class="color-gray-middle">${getClassName(currentClass)}</span>`;
    }
}