// static/js/dog_profile.js

let currentDiscipline = null;
let currentClass = null;
let classesByDiscipline = {};

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

    const isMobile = window.innerWidth <= 768;

    const activeResults = resultsData.filter(r =>
        r.discipline === currentDiscipline &&
        r.sport_class === currentClass &&
        r.status === 'active'
    );

    const disqualifiedResults = resultsData.filter(r =>
        r.discipline === currentDiscipline &&
        r.sport_class === currentClass &&
        r.status === 'disqualified'
    );

    if (activeResults.length === 0 && disqualifiedResults.length === 0) {
        container.innerHTML = '<p class="empty-message">Нет результатов в этом зачёте</p>';
        return;
    }

    // Мобильные карточки
    if (isMobile) {
        let html = '<div class="results-mobile-cards">';

        const allResults = [...activeResults, ...disqualifiedResults];

        allResults.forEach(result => {
            const placeText = result.status === 'disqualified' ? 'Снят' : (result.place || '—');

            html += `
                <div class="result-profile-card">
                    <div class="result-profile-block result-profile-top">
                        <div class="result-profile-group">
                            <span class="result-profile-label">Спортсмен</span>
                            <a href="/users/${result.user_id}/" class="result-profile-value link-purple-main">${escapeHtml(result.user_name)}</a>
                        </div>
                        <div class="result-profile-group">
                            <span class="result-profile-label">Сумма баллов</span>
                            <span class="result-profile-value">${result.result_value || '—'}</span>
                        </div>
                        <div class="result-profile-group">
                            <span class="result-profile-label">Место</span>
                            <span class="result-profile-value ${result.status === 'disqualified' ? 'disqualified-place' : ''}">${placeText}</span>
                        </div>
                    </div>
                    <div class="result-profile-block">
                        <div class="result-profile-col">
                            <span class="result-profile-label">Класс зачёта</span>
                            <span class="result-profile-value">${escapeHtml(result.sport_class_display)}</span>
                        </div>
                        <div class="result-profile-col">
                            <span class="result-profile-label">Соревнование</span>
                            <a href="/competitions/${result.competition_id}/" class="result-profile-value link-purple-main">${escapeHtml(result.competition_title)}</a>
                        </div>
                        <div class="result-profile-col">
                            <span class="result-profile-label">Дата</span>
                            <span class="result-profile-value">${formatDate(result.competition_date)}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
        return;
    }

    // Десктопная таблица
    let html = '<div class="results-table-wrapper"><table class="results-table"><thead><tr>';
    html += '<th>Место</th><th>Спортсмен</th><th>Суммарный балл</th>';
    html += '<th>Соревнование</th><th>Дата</th>';
    html += '</thead><tbody>';

    activeResults.forEach(result => {
        html += `
            <tr>
                <td class="place-${result.place}">${result.place || '—'}</td>
                <td class="user-name">
                    <a href="/users/${result.user_id}/" class="link-purple-main">${escapeHtml(result.user_name)}</a>
                 </td>
                <td><strong>${result.result_value || '—'}</strong></td>
                <td><a href="/competitions/${result.competition_id}/" class="link-purple-main">${escapeHtml(result.competition_title)}</a></td>
                <td>${formatDate(result.competition_date)}</td>
            </tr>
        `;
    });

    disqualifiedResults.forEach(result => {
        html += `
            <tr>
                <td class="disqualified-place">Снят</td>
                <td class="user-name">
                    <a href="/users/${result.user_id}/" class="link-purple-main">${escapeHtml(result.user_name)}</a>
                </td>
                <td><strong>${result.result_value || '—'}</strong></td>
                <td><a href="/competitions/${result.competition_id}/" class="link-purple-main">${escapeHtml(result.competition_title)}</a></td>
                <td>${formatDate(result.competition_date)}</td>
            </tr>
        `;
    });

    html += '</tbody></div>';
    container.innerHTML = html;
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
    if (resultsData && resultsData.length > 0) {
        const { disciplines, classesByDiscipline: clsByDiscipline } = getDisciplinesAndClasses(resultsData);
        classesByDiscipline = clsByDiscipline;
        if (disciplines.length > 0) {
            renderDisciplineTabs(disciplines, disciplines[0].code);
            setActiveDiscipline(disciplines[0].code);
        }
    }
});