let currentResultId = null;
let currentDiscipline = null;
let currentParticipantsList = [];

// Заполнение формы буллсая из данных
function fillBullseyeForm(data) {
    const container = document.getElementById('throws-container');
    if (!container) return;

    container.innerHTML = '';
    const throws = data.throws || [];

    throws.forEach((value, index) => {
        const throwItem = document.getElementById('throw-item-template').content.cloneNode(true);
        const input = throwItem.querySelector('.throw-value');
        const label = throwItem.querySelector('label');

        input.value = value;
        label.textContent = `Бросок ${index + 1}`;

        const removeBtn = throwItem.querySelector('.remove-throw');
        const throwItemDiv = throwItem.querySelector('.throw-item');
        removeBtn.addEventListener('click', () => {
            throwItemDiv.remove();
            reindexBullseyeThrows();
            updateBullseyeTotals();
        });

        container.appendChild(throwItem);
        input.addEventListener('input', () => updateBullseyeTotals());
    });

    updateBullseyeTotals();

    const addBtn = document.getElementById('add-throw-btn');
    if (addBtn) {
        addBtn.removeEventListener('click', addBullseyeThrow);
        addBtn.addEventListener('click', addBullseyeThrow);
    }
}

function addBullseyeThrow() {
    const container = document.getElementById('throws-container');
    const throwCount = container.querySelectorAll('.throw-item').length;

    const throwItem = document.getElementById('throw-item-template').content.cloneNode(true);
    const input = throwItem.querySelector('.throw-value');
    const label = throwItem.querySelector('label');

    input.value = 0;
    label.textContent = `Бросок ${throwCount + 1}`;

    const removeBtn = throwItem.querySelector('.remove-throw');
    const throwItemDiv = throwItem.querySelector('.throw-item');
    removeBtn.addEventListener('click', () => {
        throwItemDiv.remove();
        reindexBullseyeThrows();
        updateBullseyeTotals();
    });

    container.appendChild(throwItem);
    input.addEventListener('input', () => updateBullseyeTotals());
    updateBullseyeTotals();
}

function reindexBullseyeThrows() {
    const items = document.querySelectorAll('#bullseye-form .throw-item');
    items.forEach((item, idx) => {
        const label = item.querySelector('label');
        if (label) label.textContent = `Бросок ${idx + 1}`;
    });
}

function updateBullseyeTotals() {
    const throwInputs = document.querySelectorAll('#bullseye-form .throw-value');
    let total = 0;
    throwInputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });
    const totalSumSpan = document.getElementById('total-sum');
    const throwsCountSpan = document.getElementById('throws-count');
    if (totalSumSpan) totalSumSpan.textContent = total;
    if (throwsCountSpan) throwsCountSpan.textContent = throwInputs.length;
}

// Заполнение формы дальности
function fillDistanceForm(data) {
    const attempt1 = document.getElementById('attempt-1');
    const attempt2 = document.getElementById('attempt-2');
    const attempt3 = document.getElementById('attempt-3');
    const lastChance = document.getElementById('last-chance');

    if (attempt1) attempt1.value = data.attempts ? data.attempts[0] : 0;
    if (attempt2) attempt2.value = data.attempts ? data.attempts[1] : 0;
    if (attempt3) attempt3.value = data.attempts ? data.attempts[2] : 0;
    if (lastChance) lastChance.value = data.last_chance || 0;

    updateDistanceBest();

    const inputs = document.querySelectorAll('#distance-form input');
    inputs.forEach(input => {
        input.removeEventListener('input', updateDistanceBest);
        input.addEventListener('input', updateDistanceBest);
    });
}

function updateDistanceBest() {
    const attempt1 = parseFloat(document.getElementById('attempt-1')?.value) || 0;
    const attempt2 = parseFloat(document.getElementById('attempt-2')?.value) || 0;
    const attempt3 = parseFloat(document.getElementById('attempt-3')?.value) || 0;
    const lastChance = parseFloat(document.getElementById('last-chance')?.value) || 0;
    const best = Math.max(attempt1, attempt2, attempt3, lastChance);
    const bestSpan = document.getElementById('best-value');
    if (bestSpan) bestSpan.textContent = best;
}

// Заполнение формы точности
function fillAccuracyForm(data) {
    const leftCol = document.getElementById('accuracy-left-col');
    const rightCol = document.getElementById('accuracy-right-col');
    const throws = data.throws || Array(10).fill(0);

    if (leftCol) {
        leftCol.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const throwField = document.getElementById('accuracy-throw-template').content.cloneNode(true);
            const input = throwField.querySelector('.throw-value');
            const label = throwField.querySelector('label');
            input.value = throws[i] || 0;
            label.textContent = `Бросок ${i + 1}`;
            input.addEventListener('input', () => updateAccuracyTotals());
            leftCol.appendChild(throwField);
        }
    }

    if (rightCol) {
        rightCol.innerHTML = '';
        for (let i = 5; i < 10; i++) {
            const throwField = document.getElementById('accuracy-throw-template').content.cloneNode(true);
            const input = throwField.querySelector('.throw-value');
            const label = throwField.querySelector('label');
            input.value = throws[i] || 0;
            label.textContent = `Бросок ${i + 1}`;
            input.addEventListener('input', () => updateAccuracyTotals());
            rightCol.appendChild(throwField);
        }
    }

    updateAccuracyTotals();
}

function updateAccuracyTotals() {
    const throwInputs = document.querySelectorAll('#accuracy-form .throw-value');
    const throws = Array.from(throwInputs).map(input => parseInt(input.value) || 0);
    const sorted = [...throws].sort((a, b) => b - a);
    const topFiveSum = sorted.slice(0, 5).reduce((sum, v) => sum + v, 0);
    const totalSum = throws.reduce((sum, v) => sum + v, 0);

    const topFiveSpan = document.getElementById('top-five-sum');
    const totalSumSpan = document.getElementById('accuracy-total-sum');
    if (topFiveSpan) topFiveSpan.textContent = topFiveSum;
    if (totalSumSpan) totalSumSpan.textContent = totalSum;
}

// Загрузка формы для выбранной дисциплины
function loadForm(discipline, data) {
    let templateId = '';
    if (discipline === 'bullseye') templateId = 'bullseye-template';
    else if (discipline === 'distance') templateId = 'distance-template';
    else if (discipline === 'accuracy') templateId = 'accuracy-template';

    const template = document.getElementById(templateId);
    const resultsForm = document.getElementById('results-form');
    if (!template || !resultsForm) return;

    resultsForm.innerHTML = '';
    const clone = template.content.cloneNode(true);
    resultsForm.appendChild(clone);

    if (discipline === 'bullseye') {
        fillBullseyeForm(data);
    } else if (discipline === 'distance') {
        fillDistanceForm(data);
    } else if (discipline === 'accuracy') {
        fillAccuracyForm(data);
    }

    if (typeof initFloatingLabels === 'function') {
        initFloatingLabels();
    }
}

// Загрузка формы для выбранного участника
function loadFormForParticipant(resultId, discipline, participants) {
    const participant = participants.find(p => p.result_id == resultId);
    if (!participant) return;

    currentResultId = resultId;
    currentDiscipline = discipline;
    currentParticipantsList = participants;

    loadForm(discipline, participant.data || {});

    const statusGroup = document.getElementById('status-radio-group');
    if (statusGroup) statusGroup.style.display = 'flex';

    const statusRadios = document.querySelectorAll('input[name="participant_status"]');
    statusRadios.forEach(radio => {
        radio.removeEventListener('change', handleStatusChange);
        radio.addEventListener('change', handleStatusChange);

        if (radio.value === participant.status) {
            radio.checked = true;
            radio.closest('.radio-option').classList.add('active');
        } else {
            radio.closest('.radio-option').classList.remove('active');
        }
    });

    updateNavButtons();
}

function handleStatusChange() {
    document.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('active'));
    if (this.checked) {
        this.closest('.radio-option').classList.add('active');
    }
}

function getCurrentStatus() {
    const selectedRadio = document.querySelector('input[name="participant_status"]:checked');
    return selectedRadio ? selectedRadio.value : 'active';
}

// Сбор данных из формы
function collectFormData() {
    if (currentDiscipline === 'bullseye') {
        const throwInputs = document.querySelectorAll('#bullseye-form .throw-value');
        const throws = Array.from(throwInputs).map(input => parseInt(input.value) || 0);
        const total = throws.reduce((sum, v) => sum + v, 0);
        return { throws, total, throw_count: throws.length };
    } else if (currentDiscipline === 'distance') {
        const attempts = [
            parseFloat(document.getElementById('attempt-1')?.value) || 0,
            parseFloat(document.getElementById('attempt-2')?.value) || 0,
            parseFloat(document.getElementById('attempt-3')?.value) || 0
        ];
        const lastChance = parseFloat(document.getElementById('last-chance')?.value) || 0;
        const best = Math.max(...attempts, lastChance);
        return { attempts, last_chance: lastChance, best };
    } else if (currentDiscipline === 'accuracy') {
        const throwInputs = document.querySelectorAll('#accuracy-form .throw-value');
        const throws = Array.from(throwInputs).map(input => parseInt(input.value) || 0);
        const sorted = [...throws].sort((a, b) => b - a);
        const topFiveSum = sorted.slice(0, 5).reduce((sum, v) => sum + v, 0);
        const totalSum = throws.reduce((sum, v) => sum + v, 0);
        return { throws, top_five_sum: topFiveSum, total_sum: totalSum };
    }
    return {};
}

// Сохранение результата
async function saveCurrentResult() {
    if (!currentResultId || !currentDiscipline) return;

    const data = collectFormData();
    const status = getCurrentStatus();

    try {
        const response = await fetch('/organizer/result/update-data/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            },
            body: JSON.stringify({
                result_id: currentResultId,
                data: data,
                status: status
            })
        });

        const responseData = await response.json();
        if (responseData.success) {
            // Обновляем данные в локальном массиве
            const participantIndex = window.participantsData.findIndex(p => p.result_id == currentResultId);
            if (participantIndex !== -1) {
                window.participantsData[participantIndex].data = data;
                window.participantsData[participantIndex].status = status;
            }

            // Обновляем текст в селекте
            const selectedOption = document.querySelector(`.custom-select-option[data-value="${currentResultId}"]`);
            if (selectedOption) {
                const cleanText = selectedOption.textContent.replace(' ✓', '').replace(' (не заполнено)', '');
                selectedOption.textContent = `${cleanText} ✓`;
                const triggerSpan = document.querySelector('.custom-select-trigger .custom-select-value');
                if (triggerSpan && !triggerSpan.textContent.includes('✓')) {
                    triggerSpan.textContent = selectedOption.textContent;
                }
            }

            alert('Результат сохранён!');
        } else {
            alert(responseData.error || 'Ошибка сохранения');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка сети');
    }
}

// Навигация между участниками
function goToPrevParticipant() {
    if (!currentParticipantsList.length || !currentResultId) return;

    const currentIndex = currentParticipantsList.findIndex(p => p.result_id == currentResultId);
    if (currentIndex > 0) {
        const prevParticipant = currentParticipantsList[currentIndex - 1];
        switchToParticipant(prevParticipant.result_id);
    }
}

function goToNextParticipant() {
    if (!currentParticipantsList.length || !currentResultId) return;

    const currentIndex = currentParticipantsList.findIndex(p => p.result_id == currentResultId);
    if (currentIndex < currentParticipantsList.length - 1) {
        const nextParticipant = currentParticipantsList[currentIndex + 1];
        switchToParticipant(nextParticipant.result_id);
    }
}

function switchToParticipant(resultId) {
    // Находим опцию в селекте
    const option = document.querySelector(`.custom-select-option[data-value="${resultId}"]`);
    if (option) {
        // Обновляем скрытый input
        const hiddenInput = document.querySelector('.custom-select-input');
        if (hiddenInput) hiddenInput.value = resultId;

        // Обновляем отображаемое значение
        const valueSpan = document.querySelector('.custom-select-trigger .custom-select-value');
        if (valueSpan) {
            valueSpan.textContent = option.textContent;
            valueSpan.classList.remove('placeholder');
        }

        // Обновляем активный класс у опций
        document.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        // Добавляем класс has-value
        const field = document.querySelector('.custom-select-field');
        if (field) field.classList.add('has-value');

        // Закрываем дропдаун
        const dropdown = document.querySelector('.custom-select-dropdown');
        const trigger = document.querySelector('.custom-select-trigger');
        if (dropdown) dropdown.classList.remove('show');
        if (trigger) trigger.classList.remove('active');

        // Загружаем форму для выбранного участника
        const discipline = document.getElementById('discipline-data')?.dataset.discipline;
        const participants = window.participantsData || [];
        if (discipline && participants.length) {
            loadFormForParticipant(resultId, discipline, participants);
        }
    }
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-participant-btn');
    const nextBtn = document.getElementById('next-participant-btn');

    if (!prevBtn || !nextBtn) return;

    const currentIndex = currentParticipantsList.findIndex(p => p.result_id == currentResultId);

    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= currentParticipantsList.length - 1;
}

// Обновляем обработчики для кастомного селекта
function setupCustomSelectHandlers() {
    const options = document.querySelectorAll('.custom-select-option');

    options.forEach(option => {
        // Убираем старые обработчики
        option.removeEventListener('click', option._customHandler);

        // Добавляем новый обработчик
        option._customHandler = function(e) {
            e.stopPropagation();
            const value = this.dataset.value;
            const text = this.textContent;

            // Обновляем скрытый input
            const hiddenInput = document.querySelector('.custom-select-input');
            if (hiddenInput) hiddenInput.value = value;

            // Обновляем отображаемое значение
            const valueSpan = document.querySelector('.custom-select-trigger .custom-select-value');
            if (valueSpan) {
                valueSpan.textContent = text;
                valueSpan.classList.remove('placeholder');
            }

            // Обновляем активный класс
            document.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');

            // Добавляем класс has-value
            const field = document.querySelector('.custom-select-field');
            if (field) field.classList.add('has-value');

            // Закрываем дропдаун
            const dropdown = document.querySelector('.custom-select-dropdown');
            const trigger = document.querySelector('.custom-select-trigger');
            if (dropdown) dropdown.classList.remove('show');
            if (trigger) trigger.classList.remove('active');

            // Загружаем форму для выбранного участника
            const discipline = document.getElementById('discipline-data')?.dataset.discipline;
            const participants = window.participantsData || [];
            if (discipline && participants.length) {
                loadFormForParticipant(value, discipline, participants);
            }
        };

        option.addEventListener('click', option._customHandler);
    });
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', function() {
    const disciplineData = document.getElementById('discipline-data');
    const discipline = disciplineData?.dataset.discipline;
    const participants = window.participantsData || [];

    if (!discipline) return;

    // Даём время глобальному initCustomSelects из interactions.js отработать
    setTimeout(() => {
        // Настраиваем свои обработчики поверх глобальных
        setupCustomSelectHandlers();

        const firstOption = document.querySelector('.custom-select-option');
        if (firstOption && participants.length > 0) {
            const firstValue = firstOption.dataset.value;
            const hiddenInput = document.querySelector('.custom-select-input');
            if (hiddenInput) hiddenInput.value = firstValue;

            const valueSpan = document.querySelector('.custom-select-trigger .custom-select-value');
            if (valueSpan) {
                valueSpan.textContent = firstOption.textContent;
                valueSpan.classList.remove('placeholder');
            }

            const field = document.querySelector('.custom-select-field');
            if (field) field.classList.add('has-value');

            firstOption.classList.add('selected');
            loadFormForParticipant(firstValue, discipline, participants);
        }
    }, 100);

    const saveBtn = document.getElementById('save-result-btn');
    if (saveBtn) {
        saveBtn.removeEventListener('click', saveBtn._clickHandler);
        saveBtn._clickHandler = saveCurrentResult;
        saveBtn.addEventListener('click', saveBtn._clickHandler);
    }

    const prevBtn = document.getElementById('prev-participant-btn');
    const nextBtn = document.getElementById('next-participant-btn');

    if (prevBtn) {
        prevBtn.removeEventListener('click', prevBtn._clickHandler);
        prevBtn._clickHandler = goToPrevParticipant;
        prevBtn.addEventListener('click', prevBtn._clickHandler);
    }

    if (nextBtn) {
        nextBtn.removeEventListener('click', nextBtn._clickHandler);
        nextBtn._clickHandler = goToNextParticipant;
        nextBtn.addEventListener('click', nextBtn._clickHandler);
    }

    // Наблюдатель за появлением новых опций (если селект инициализируется позже)
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                const options = document.querySelectorAll('.custom-select-option');
                if (options.length > 0 && !options[0]._customHandler) {
                    setupCustomSelectHandlers();
                }
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});