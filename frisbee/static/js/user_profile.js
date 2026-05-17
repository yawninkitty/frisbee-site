// static/js/user_profile.js

let currentDiscipline = null;
let currentClass = null;
let classesByDiscipline = {};

// Проверяем, что переменные существуют
if (typeof isOrganizer === 'undefined') var isOrganizer = false;
if (typeof resultsData === 'undefined') var resultsData = [];
if (typeof organizedComps === 'undefined') var organizedComps = [];
if (typeof judgingComps === 'undefined') var judgingComps = [];

console.log('=== JS загружен ===');
console.log('isOrganizer в JS:', isOrganizer);
console.log('organizedComps в JS:', organizedComps);
console.log('judgingComps в JS:', judgingComps);

// ====================== ВКЛАДКИ (СЛАЙДЕР) ======================
function initTabs() {
    const tabs = document.querySelectorAll('.form-tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;

            // Проверяем, есть ли такая вкладка у организатора
            if (!isOrganizer && tabId === 'organizer') return;

            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));

            const targetContent = document.getElementById(`tab-${tabId}`);
            if (targetContent) targetContent.classList.add('active');

            // При переключении на вкладку организатора обновляем фильтры
            if (tabId === 'organizer') {
                initOrganizerFilters();
            }
        });
    });
}

// ====================== ФУНКЦИИ ДЛЯ РЕЗУЛЬТАТОВ ======================
function getDisciplinesAndClasses(results) {
    const disciplines = [];
    const classesByDisciplineTemp = {};

    results.forEach(result => {
        const discipline = result.discipline;
        const disciplineName = result.discipline_display;
        const className = result.sport_class_display;
        const classCode = result.sport_class;

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
    renderResultsTable();
}

function setActiveClass(classCode) {
    currentClass = classCode;

    document.querySelectorAll('#class-tabs .chip').forEach(tab => {
        if (tab.dataset.class === classCode) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    renderResultsTable();
}

function renderResultsTable() {
    const container = document.getElementById('results-table-container');
    if (!container) return;

    if (!currentDiscipline || !currentClass) {
        container.innerHTML = '<p class="empty-message">Выберите дисциплину и класс для просмотра результатов</p>';
        return;
    }

    // Разделяем результаты
    const activeResults = resultsData.filter(r =>
        r.discipline === currentDiscipline &&
        r.sport_class === currentClass &&
        !r.is_out_of_class &&
        r.status === 'active'
    );

    const disqualifiedResults = resultsData.filter(r =>
        r.discipline === currentDiscipline &&
        r.sport_class === currentClass &&
        !r.is_out_of_class &&
        r.status === 'disqualified'
    );

    const outOfClassResults = resultsData.filter(r =>
        r.discipline === currentDiscipline &&
        r.sport_class === currentClass &&
        r.is_out_of_class
    );

    if (activeResults.length === 0 && disqualifiedResults.length === 0 && outOfClassResults.length === 0) {
        container.innerHTML = '<p class="empty-message">Нет результатов в этом зачёте</p>';
        return;
    }

    let html = '<div class="results-table-wrapper"><table class="results-table"><thead><tr>';
    html += '<th>Место</th><th>Собака</th><th>Суммарный балл</th>';
    html += '<th>Соревнование</th><th>Дата</th>';
    html += '</thead><tbody>';

    // Активные участники (с местами)
    activeResults.forEach(result => {
        html += `
            <tr>
                <td class="place-${result.place}">${result.place || '—'}</td>
                <td class="dog-name">${escapeHtml(result.dog_name)}</td>
                <td><strong>${result.result_value || '—'}</strong></td>
                <td><a href="/competitions/${result.competition_id}/" class="link-purple-main">${escapeHtml(result.competition_title)}</a></td>
                <td>${formatDate(result.competition_date)}</td>
            </tr>
        `;
    });

    // Снятые участники
    disqualifiedResults.forEach(result => {
        html += `
            <tr>
                <td class="disqualified-place">Снят</td>
                <td class="dog-name">${escapeHtml(result.dog_name)}</td>
                <td><strong>${result.result_value || '—'}</strong></td>
                <td><a href="/competitions/${result.competition_id}/" class="link-purple-main">${escapeHtml(result.competition_title)}</a></td>
                <td>${formatDate(result.competition_date)}</td>
            </tr>
        `;
    });

    // Участники вне зачёта
    if (outOfClassResults.length > 0) {
        if (activeResults.length > 0 || disqualifiedResults.length > 0) {
            html += `<tr class="separator-row"><td colspan="5" style="text-align: center; padding: 8px;"><span class="body-text-sm color-gray-middle">— Участники вне зачёта —</span></td></tr>`;
        }

        outOfClassResults.forEach(result => {
            html += `
                <tr>
                    <td class="out-of-class-place">Вне зачёта</td>
                    <td class="dog-name">${escapeHtml(result.dog_name)}</td>
                    <td><strong>${result.result_value || '—'}</strong></td>
                    <td><a href="/competitions/${result.competition_id}/" class="link-purple-main">${escapeHtml(result.competition_title)}</a></td>
                    <td>${formatDate(result.competition_date)}</td>
                </tr>
            `;
        });
    }

    html += '</tbody></div>';
    container.innerHTML = html;
}

// ====================== ФУНКЦИИ ДЛЯ ОРГАНИЗАТОРА ======================
function initOrganizerFilters() {
    if (!isOrganizer) return;

    let currentRole = 'organizer';
    let currentPeriod = 'upcoming';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    async function renderOrganizerCompetitions() {
        let competitions = currentRole === 'organizer' ? organizedComps : judgingComps;

        let filtered = competitions.filter(comp => {
            if (!comp.date) return false;
            const compDate = new Date(comp.date);
            if (currentPeriod === 'upcoming') {
                return compDate >= today;
            } else {
                return compDate < today;
            }
        });

        const container = document.getElementById('organizer-competitions-container');
        if (!container) return;

        if (filtered.length === 0) {
            container.innerHTML = '<p class="empty-message">Нет соревнований</p>';
            return;
        }

        // Ждём загрузки всех карточек
        const cards = await Promise.all(filtered.map(comp => renderCompetitionCard(comp)));
        container.innerHTML = cards.join('');
    }

    // Обработчики для чипов роли
    const roleChips = document.querySelectorAll('#role-chips .chip');
    roleChips.forEach(chip => {
        chip.addEventListener('click', function() {
            roleChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentRole = this.dataset.role;
            renderOrganizerCompetitions();
        });
    });

    // Обработчики для чипов периода
    const periodChips = document.querySelectorAll('#period-chips .chip');
    periodChips.forEach(chip => {
        chip.addEventListener('click', function() {
            periodChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentPeriod = this.dataset.period;
            renderOrganizerCompetitions();
        });
    });

    renderOrganizerCompetitions();
}

// ====================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ======================
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

async function renderCompetitionCard(comp) {
    const response = await fetch('/api/competition-card-html/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ competition: comp })
    });
    const data = await response.json();
    return data.success ? data.html : '';
}

function formatDate(dateStr) {
    if (!dateStr) return 'Дата не указана';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ====================== ИНИЦИАЛИЗАЦИЯ ======================
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация вкладок
    initTabs();

    // Инициализация результатов
    if (resultsData && resultsData.length > 0) {
        const { disciplines, classesByDiscipline: clsByDiscipline } = getDisciplinesAndClasses(resultsData);
        classesByDiscipline = clsByDiscipline;
        if (disciplines.length > 0) {
            renderDisciplineTabs(disciplines, disciplines[0].code);
            setActiveDiscipline(disciplines[0].code);
        }
    }

    // Инициализация фильтров организатора
    if (isOrganizer) {
        initOrganizerFilters();
    }
});

// ====================== КАРУСЕЛЬ СОБАК ======================
function initDogsCarousel() {
    const dogsTab = document.getElementById('tab-dogs');
    if (!dogsTab) return;

    const carouselContainer = dogsTab.querySelector('.carousel-container');
    if (!carouselContainer) return;

    // Если карусель уже создана, обновляем её
    if (window.dogsCarouselProfile) {
        window.dogsCarouselProfile.updateButtons();
        window.dogsCarouselProfile.updateCardWidth();
        return;
    }

    // Создаём новую карусель
    window.dogsCarouselProfile = new Carousel(carouselContainer, {
        cardSelector: '.dog-card',
        cardWidth: 280
    });
}

// Наблюдатель за открытием вкладки "Собаки"
const dogsTab = document.getElementById('tab-dogs');
if (dogsTab) {
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.classList.contains('active')) {
                // Даём время на отрисовку
                setTimeout(() => {
                    initDogsCarousel();
                }, 100);
            }
        });
    });
    observer.observe(dogsTab, { attributes: true, attributeFilter: ['class'] });

    // Если вкладка уже активна при загрузке
    if (dogsTab.classList.contains('active')) {
        initDogsCarousel();
    }
}