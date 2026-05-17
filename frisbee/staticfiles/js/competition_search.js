// static/js/competition_search.js

let currentFilters = {
    search: '',
    disciplines: [],
    classes: [],
    period: null,
    date_from: null,
    date_to: null,
    venues: [],
    cities: [],
    organizers: []
};

document.addEventListener('DOMContentLoaded', async function() {
    await loadFilterOptions();
    initEventListeners();
    initMobileFilters();
    applyFilters();
    updateAllDropdownButtons();
});

function getCsrfToken() {
    return window.csrfToken || '';
}

async function applyFilters() {
    const container = document.getElementById('competitions-container');
    const emptyBlock = document.getElementById('competitions-empty');
    const illustration = document.querySelector('.search-illustration');

    if (emptyBlock) emptyBlock.style.display = 'none';

    if (container) {
        container.style.display = 'flex';
        container.innerHTML = '<div class="loader">Загрузка...</div>';
    }

    try {
        const response = await fetch('/api/filter-competitions/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify(currentFilters)
        });
        const data = await response.json();
        if (data.success) {
            container.innerHTML = data.html;

            if (container.children.length === 0 || data.html.trim() === '') {
                container.style.display = 'none';
                if (emptyBlock) emptyBlock.style.display = 'flex';
                if (illustration) illustration.style.display = 'none';
            } else {
                container.style.display = 'flex';
                if (illustration) illustration.style.display = 'block';
            }

            updateResultsCount();
        }
    } catch (error) {
        console.error('Ошибка:', error);
        if (container) container.style.display = 'none';
        if (emptyBlock) emptyBlock.style.display = 'flex';
        if (illustration) illustration.style.display = 'none';
    }
    updateClearAllButtonState();
}

async function loadFilterOptions() {
    try {
        const response = await fetch('/api/competitions/filter-options/');
        const data = await response.json();
        if (data.success) {
            renderCityOptions(data.cities);
            renderOrganizerOptions(data.organizers);
        }
    } catch (error) {
        console.error('Ошибка загрузки опций:', error);
    }
}

function renderCityOptions(cities) {
    const desktopContainer = document.getElementById('city-list');
    const mobileContainer = document.getElementById('mobile-city-list');

    const html = cities.map(city =>
        `<label class="checkbox-label"><input type="checkbox" class="city-checkbox" data-city="${city}"> ${city}</label>`
    ).join('');

    if (desktopContainer) desktopContainer.innerHTML = html;
    if (mobileContainer) mobileContainer.innerHTML = html;
}

function renderOrganizerOptions(organizers) {
    const desktopContainer = document.getElementById('organizer-list');
    const mobileContainer = document.getElementById('mobile-organizer-list');

    const html = organizers.map(org =>
        `<label class="checkbox-label"><input type="checkbox" class="organizer-checkbox" data-organizer-id="${org.id}"> ${org.name}</label>`
    ).join('');

    if (desktopContainer) desktopContainer.innerHTML = html;
    if (mobileContainer) mobileContainer.innerHTML = html;
}

function updateResultsCount() {
    const cards = document.querySelectorAll('.competition-card');
    const count = cards.length;
    const container = document.getElementById('results-count');
    if (container) {
        const word = getDeclension(count, 'соревнование', 'соревнования', 'соревнований');
        container.textContent = `Найдено: ${count} ${word}`;
    }
}

function updateDropdownButtonText(btn, values, label, getNameFn) {
    if (!btn) return;
    const count = values.length;
    const btnText = btn.querySelector('.btn-text');
    if (count === 0) {
        if (btnText) btnText.innerHTML = `${label} `;
        btn.classList.remove('has-filters');
    } else if (count === 1) {
        const name = getNameFn ? getNameFn(values[0]) : values[0];
        if (btnText) btnText.innerHTML = `${label} <span class="filter-value">${name}</span> `;
        btn.classList.add('has-filters');
    } else {
        if (btnText) btnText.innerHTML = `${label} <span class="filter-value">${count}</span> `;
        btn.classList.add('has-filters');
    }
}

function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) return `${parts[2]}.${parts[1]}`;
    }
    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) return `${parts[0]}.${parts[1]}`;
    }
    return dateStr;
}

function updateAllDropdownButtons() {
    ['venue-dropdown', 'mobile-venue-dropdown'].forEach(id => {
        const btn = document.querySelector(`[data-dropdown="${id}"]`);
        updateDropdownButtonText(btn, currentFilters.venues, 'Тип площадки', v => v === 'outdoor' ? 'Уличная' : 'Крытая');
    });

    ['city-dropdown', 'mobile-city-dropdown'].forEach(id => {
        const btn = document.querySelector(`[data-dropdown="${id}"]`);
        updateDropdownButtonText(btn, currentFilters.cities, 'Город');
    });

    ['organizer-dropdown', 'mobile-organizer-dropdown'].forEach(id => {
        const btn = document.querySelector(`[data-dropdown="${id}"]`);
        const getOrganizerName = (id) => {
            const checkbox = document.querySelector(`.organizer-checkbox[data-organizer-id="${id}"]`);
            return checkbox ? checkbox.closest('label').textContent.trim() : id;
        };
        updateDropdownButtonText(btn, currentFilters.organizers, 'Организатор', getOrganizerName);
    });

    ['date-dropdown', 'mobile-date-dropdown'].forEach(id => {
        const btn = document.querySelector(`[data-dropdown="${id}"]`);
        if (btn) {
            const hasFilters = currentFilters.date_from || currentFilters.date_to;
            const btnText = btn.querySelector('.btn-text');
            if (hasFilters) {
                let dateText = '';
                if (currentFilters.date_from && currentFilters.date_to) {
                    dateText = `с ${formatDateForDisplay(currentFilters.date_from)} по ${formatDateForDisplay(currentFilters.date_to)}`;
                } else if (currentFilters.date_from) {
                    dateText = `с ${formatDateForDisplay(currentFilters.date_from)}`;
                } else if (currentFilters.date_to) {
                    dateText = `по ${formatDateForDisplay(currentFilters.date_to)}`;
                }
                if (btnText) btnText.innerHTML = `Дата проведения <span class="filter-value">${dateText}</span> `;
                btn.classList.add('has-filters');
            } else {
                if (btnText) btnText.innerHTML = `Дата проведения `;
                btn.classList.remove('has-filters');
            }
        }
    });
    updateClearAllButtonState();
}

function initDropdowns() {
    document.querySelectorAll('.dropdown-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdownId = this.dataset.dropdown;
            const dropdown = document.getElementById(dropdownId);
            if (!dropdown) return;
            const isOpen = dropdown.classList.contains('show');
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
            if (!isOpen) dropdown.classList.add('show');
        });
    });

    document.addEventListener('click', function(e) {
        if (e.target.closest('.flatpickr-calendar')) return;
        if (!e.target.closest('.dropdown-filter')) {
            document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
        }
    });
}

function initDatePickers() {
    const config = {
        dateFormat: "d.m.Y", locale: "ru", allowInput: true, disableMobile: true,
        onChange: function(selectedDates, dateStr) {
            if (dateStr) {
                const p = dateStr.split('.');
                if (p.length === 3) currentFilters.date_from = `${p[2]}-${p[1]}-${p[0]}`;
            } else currentFilters.date_from = null;
            applyFilters();
            updateAllDropdownButtons();
        }
    };

    ['date-from', 'mobile-date-from'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._flatpickr) flatpickr(el, config);
    });

    const configTo = { ...config, onChange: function(selectedDates, dateStr) {
        if (dateStr) {
            const p = dateStr.split('.');
            if (p.length === 3) currentFilters.date_to = `${p[2]}-${p[1]}-${p[0]}`;
        } else currentFilters.date_to = null;
        applyFilters();
        updateAllDropdownButtons();
    }};

    ['date-to', 'mobile-date-to'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el._flatpickr) flatpickr(el, configTo);
    });
}

function initEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            currentFilters.search = e.target.value;
            applyFilters();
        }, 300));
    }

    // Все чипы
    document.querySelectorAll('.chip[data-filter="discipline"]').forEach(chip => {
        chip.addEventListener('click', function() { toggleChip(this, this.dataset.value, 'disciplines'); });
    });
    document.querySelectorAll('.chip[data-filter="class"]').forEach(chip => {
        chip.addEventListener('click', function() { toggleChip(this, this.dataset.value, 'classes'); });
    });
    document.querySelectorAll('.chip[data-filter="period"]').forEach(chip => {
        chip.addEventListener('click', function() {
            const value = this.dataset.value;
            if (currentFilters.period === value) {
                currentFilters.period = null;
                this.classList.remove('active');
            } else {
                document.querySelectorAll('.chip[data-filter="period"]').forEach(c => c.classList.remove('active'));
                currentFilters.period = value;
                this.classList.add('active');
            }
            applyFilters();
            updateAllDropdownButtons();
        });
    });

    // Чекбоксы
    document.querySelectorAll('.venue-checkbox').forEach(cb => {
        cb.addEventListener('change', function() {
            const venue = this.dataset.venue;
            if (this.checked) currentFilters.venues.push(venue);
            else currentFilters.venues = currentFilters.venues.filter(v => v !== venue);
            applyFilters();
            updateAllDropdownButtons();
        });
    });

    document.addEventListener('change', function(e) {
        if (e.target.classList.contains('city-checkbox')) {
            const city = e.target.dataset.city;
            if (e.target.checked) currentFilters.cities.push(city);
            else currentFilters.cities = currentFilters.cities.filter(c => c !== city);
            applyFilters();
            updateAllDropdownButtons();
        }
        if (e.target.classList.contains('organizer-checkbox')) {
            const orgId = parseInt(e.target.dataset.organizerId);
            if (e.target.checked) currentFilters.organizers.push(orgId);
            else currentFilters.organizers = currentFilters.organizers.filter(o => o !== orgId);
            applyFilters();
            updateAllDropdownButtons();
        }
    });

    // Кнопки очистки
    document.getElementById('clear-all-filters')?.addEventListener('click', clearAllFilters);
    document.getElementById('mobile-clear-all-filters')?.addEventListener('click', clearAllFilters);

    ['clear-dates', 'mobile-clear-dates'].forEach(id => {
        document.getElementById(id)?.addEventListener('click', () => {
            ['date-from', 'mobile-date-from', 'date-to', 'mobile-date-to'].forEach(did => {
                const el = document.getElementById(did);
                if (el) el.value = '';
            });
            currentFilters.date_from = null;
            currentFilters.date_to = null;
            applyFilters();
            updateAllDropdownButtons();
        });
    });

    initDropdowns();
    initDatePickers();
}

function toggleChip(chip, value, filterKey) {
    const index = currentFilters[filterKey].indexOf(value);
    if (index === -1) {
        currentFilters[filterKey].push(value);
        chip.classList.add('active');
    } else {
        currentFilters[filterKey].splice(index, 1);
        chip.classList.remove('active');
    }
    applyFilters();
    updateAllDropdownButtons();
    syncAllChips();
}

function syncAllChips() {
    document.querySelectorAll('.chip[data-filter="discipline"]').forEach(chip => {
        chip.classList.toggle('active', currentFilters.disciplines.includes(chip.dataset.value));
    });
    document.querySelectorAll('.chip[data-filter="class"]').forEach(chip => {
        chip.classList.toggle('active', currentFilters.classes.includes(chip.dataset.value));
    });
    document.querySelectorAll('.chip[data-filter="period"]').forEach(chip => {
        chip.classList.toggle('active', currentFilters.period === chip.dataset.value);
    });
}

function clearAllFilters() {
    currentFilters = {
        search: '', disciplines: [], classes: [], period: null,
        date_from: null, date_to: null, venues: [], cities: [], organizers: []
    };

    document.getElementById('search-input').value = '';
    document.querySelectorAll('.chip.active').forEach(chip => chip.classList.remove('active'));
    document.querySelectorAll('.venue-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.city-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.organizer-checkbox').forEach(cb => cb.checked = false);
    ['date-from', 'mobile-date-from', 'date-to', 'mobile-date-to'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    applyFilters();
    updateAllDropdownButtons();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getDeclension(number, one, two, five) {
    let n = Math.abs(number);
    n %= 100;
    if (n >= 5 && n <= 20) return five;
    n %= 10;
    if (n === 1) return one;
    if (n >= 2 && n <= 4) return two;
    return five;
}

function updateClearAllButtonState() {
    const hasFilters =
        currentFilters.search !== '' ||
        currentFilters.disciplines.length > 0 ||
        currentFilters.classes.length > 0 ||
        currentFilters.period !== null ||
        currentFilters.date_from !== null ||
        currentFilters.date_to !== null ||
        currentFilters.venues.length > 0 ||
        currentFilters.cities.length > 0 ||
        currentFilters.organizers.length > 0;

    ['clear-all-filters', 'mobile-clear-all-filters'].forEach(id => {
        const btn = document.getElementById(id);
        if (!btn) return;
        if (hasFilters) {
            btn.disabled = false;
            btn.classList.remove('disabled');
        } else {
            btn.disabled = true;
            btn.classList.add('disabled');
        }
    });

    const mobileFilterBtn = document.getElementById('mobile-filter-btn');
    if (mobileFilterBtn) {
        if (hasFilters) {
            mobileFilterBtn.classList.add('has-filters');
        } else {
            mobileFilterBtn.classList.remove('has-filters');
        }
    }
}

// ====================== МОБИЛЬНЫЕ ФИЛЬТРЫ ======================

function initMobileFilters() {
    const mobileBtn = document.getElementById('mobile-filter-btn');
    const mobilePanel = document.getElementById('mobile-filter-panel');
    const mobileOverlay = document.getElementById('mobile-filter-overlay');
    const closeBtn = document.getElementById('close-mobile-filter');
    const applyBtn = document.getElementById('apply-mobile-filter');

    if (!mobileBtn || !mobilePanel) return;

    function openMobileFilter() {
        syncAllChips();
        mobilePanel.style.display = 'flex';
        mobileOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeMobileFilter() {
        mobilePanel.style.display = 'none';
        mobileOverlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    mobileBtn.addEventListener('click', openMobileFilter);
    closeBtn?.addEventListener('click', closeMobileFilter);
    mobileOverlay?.addEventListener('click', closeMobileFilter);
    applyBtn?.addEventListener('click', closeMobileFilter);
}