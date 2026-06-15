// static/js/enter_results.js

let currentResultId = null;
let currentDiscipline = null;
let currentParticipantsList = [];

// Проверка, есть ли баллы у участника
function hasScores(option) {
    return parseFloat(option.dataset.hasScores) > 0;
}

// Обновление текста опции в селекте
function updateOptionText(resultId, hasScoresFlag) {
    const selectedOption = document.querySelector(`.custom-select-option[data-value="${resultId}"]`);
    if (!selectedOption) return;

    const status = getCurrentStatus();
    const cleanText = selectedOption.textContent.replace(' ✓', '').replace(' (пусто)', '').replace(' (снят)', '');

    let suffix = ' (пусто)';
    if (status === 'disqualified') {
        suffix = ' (снят)';
    } else if (hasScoresFlag) {
        suffix = ' ✓';
    }

    selectedOption.textContent = `${cleanText} ${suffix}`;
    selectedOption.dataset.hasScores = hasScoresFlag ? '1' : '0';
    selectedOption.dataset.status = status;

    const hiddenInput = document.querySelector('.custom-select-input');
    if (hiddenInput && hiddenInput.value == resultId) {
        const triggerSpan = document.querySelector('.custom-select-trigger .custom-select-value');
        if (triggerSpan) triggerSpan.textContent = selectedOption.textContent;
    }
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
            const participantIndex = window.participantsData.findIndex(p => p.result_id == currentResultId);
            if (participantIndex !== -1) {
                window.participantsData[participantIndex].data = data;
                window.participantsData[participantIndex].status = status;
            }

            // Проверяем баллы на основе данных
            const hasScoresFlag = (currentDiscipline === 'bullseye' && data.total > 0) ||
                                  (currentDiscipline === 'distance' && data.best > 0) ||
                                  (currentDiscipline === 'accuracy' && data.top_five_sum > 0);
            updateOptionText(currentResultId, hasScoresFlag);

            alert('Результат сохранён!');
        } else {
            alert(responseData.error || 'Ошибка сохранения');
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка сети');
    }
}

// Заполнение формы буллсая
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
    throwInputs.forEach(input => { total += parseInt(input.value) || 0; });
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
    const templateId = { bullseye: 'bullseye-template', distance: 'distance-template', accuracy: 'accuracy-template' }[discipline];
    const template = document.getElementById(templateId);
    const resultsForm = document.getElementById('results-form');
    if (!template || !resultsForm) return;

    resultsForm.innerHTML = '';
    const clone = template.content.cloneNode(true);
    resultsForm.appendChild(clone);

    if (discipline === 'bullseye') fillBullseyeForm(data);
    else if (discipline === 'distance') fillDistanceForm(data);
    else if (discipline === 'accuracy') fillAccuracyForm(data);

    if (typeof initFloatingLabels === 'function') initFloatingLabels();
}

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

        // Устанавливаем checked
        radio.checked = radio.value === participant.status;
        // Обновляем active класс
        radio.closest('.radio-option').classList.toggle('active', radio.checked);
    });

    updateNavButtons();
}

function handleStatusChange() {
    document.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('active'));
    if (this.checked) this.closest('.radio-option').classList.add('active');
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

// Навигация
function goToPrevParticipant() {
    if (!currentParticipantsList.length || !currentResultId) return;
    const currentIndex = currentParticipantsList.findIndex(p => p.result_id == currentResultId);
    if (currentIndex > 0) switchToParticipant(currentParticipantsList[currentIndex - 1].result_id);
}

function goToNextParticipant() {
    if (!currentParticipantsList.length || !currentResultId) return;
    const currentIndex = currentParticipantsList.findIndex(p => p.result_id == currentResultId);
    if (currentIndex < currentParticipantsList.length - 1) switchToParticipant(currentParticipantsList[currentIndex + 1].result_id);
}

function switchToParticipant(resultId) {
    const option = document.querySelector(`.custom-select-option[data-value="${resultId}"]`);
    if (!option) return;

    const hiddenInput = document.querySelector('.custom-select-input');
    if (hiddenInput) hiddenInput.value = resultId;

    const valueSpan = document.querySelector('.custom-select-trigger .custom-select-value');
    if (valueSpan) { valueSpan.textContent = option.textContent; valueSpan.classList.remove('placeholder'); }

    document.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');

    const field = document.querySelector('.custom-select-field');
    if (field) field.classList.add('has-value');

    document.querySelector('.custom-select-dropdown')?.classList.remove('show');
    document.querySelector('.custom-select-trigger')?.classList.remove('active');

    const discipline = document.getElementById('discipline-data')?.dataset.discipline;
    if (discipline) loadFormForParticipant(resultId, discipline, window.participantsData || []);
}

function updateNavButtons() {
    const prevBtn = document.getElementById('prev-participant-btn');
    const nextBtn = document.getElementById('next-participant-btn');
    if (!prevBtn || !nextBtn) return;
    const currentIndex = currentParticipantsList.findIndex(p => p.result_id == currentResultId);
    prevBtn.disabled = currentIndex <= 0;
    nextBtn.disabled = currentIndex >= currentParticipantsList.length - 1;
}

// Кастомный селект
function setupCustomSelectHandlers() {
    document.querySelectorAll('.custom-select-option').forEach(option => {
        option.removeEventListener('click', option._customHandler);
        option._customHandler = function(e) {
            e.stopPropagation();
            const value = this.dataset.value;
            document.querySelector('.custom-select-input').value = value;

            const valueSpan = document.querySelector('.custom-select-trigger .custom-select-value');
            if (valueSpan) { valueSpan.textContent = this.textContent; valueSpan.classList.remove('placeholder'); }

            document.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            document.querySelector('.custom-select-field')?.classList.add('has-value');
            document.querySelector('.custom-select-dropdown')?.classList.remove('show');
            document.querySelector('.custom-select-trigger')?.classList.remove('active');

            const discipline = document.getElementById('discipline-data')?.dataset.discipline;
            if (discipline) loadFormForParticipant(value, discipline, window.participantsData || []);
        };
        option.addEventListener('click', option._customHandler);
    });
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    const discipline = document.getElementById('discipline-data')?.dataset.discipline;
    const participants = window.participantsData || [];
    if (!discipline) return;

    setTimeout(() => {
        setupCustomSelectHandlers();

        const firstOption = document.querySelector('.custom-select-option');
        if (firstOption && participants.length > 0) {
            const firstValue = firstOption.dataset.value;
            document.querySelector('.custom-select-input').value = firstValue;

            const valueSpan = document.querySelector('.custom-select-trigger .custom-select-value');
            if (valueSpan) { valueSpan.textContent = firstOption.textContent; valueSpan.classList.remove('placeholder'); }

            document.querySelector('.custom-select-field')?.classList.add('has-value');
            firstOption.classList.add('selected');
            loadFormForParticipant(firstValue, discipline, participants);
        }
    }, 100);

    const saveBtn = document.getElementById('save-result-btn');
    if (saveBtn) saveBtn.addEventListener('click', saveCurrentResult);

    const prevBtn = document.getElementById('prev-participant-btn');
    const nextBtn = document.getElementById('next-participant-btn');
    if (prevBtn) prevBtn.addEventListener('click', goToPrevParticipant);
    if (nextBtn) nextBtn.addEventListener('click', goToNextParticipant);
});