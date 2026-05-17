// static/js/edit_competition.js

let judgesList = [];

async function loadJudges() {
    try {
        const response = await fetch('/api/get-judges/');
        const data = await response.json();
        if (data.success) {
            judgesList = data.judges;
            return judgesList;
        }
        return [];
    } catch (error) {
        console.error('Ошибка загрузки судей:', error);
        return [];
    }
}

function getISOValue(input) {
    if (!input) return '';
    if (input.getAttribute('data-iso-date')) {
        return input.getAttribute('data-iso-date');
    }
    if (input.value) {
        const parts = input.value.split('.');
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return input.value;
    }
    return '';
}

function setISODate(input, date) {
    if (date && input) {
        const isoDate = date.toISOString().split('T')[0];
        input.setAttribute('data-iso-date', isoDate);
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    await loadJudges();

    // ====================== FLATPICKR ДЛЯ ДАТ ======================
    function initDatePickers() {
        const dateConfig = { dateFormat: "d.m.Y", locale: "ru", allowInput: true };

        const dateInput = document.getElementById('competition-date');
        if (dateInput && typeof flatpickr !== 'undefined') {
            const fp = flatpickr(dateInput, {
                ...dateConfig,
                onChange: (selectedDates) => {
                    const selectedDate = selectedDates[0];
                    setISODate(dateInput, selectedDate);
                    const regDeadline = document.getElementById('registration-deadline');
                    if (regDeadline?._flatpickr && selectedDate) regDeadline._flatpickr.set('maxDate', selectedDate);
                    const paymentDeadline = document.getElementById('payment-deadline');
                    if (paymentDeadline?._flatpickr && selectedDate) paymentDeadline._flatpickr.set('maxDate', selectedDate);
                }
            });
            if (dateInput.value) {
                const parsed = fp.parseDate(dateInput.value, 'Y-m-d');
                if (parsed) { setISODate(dateInput, parsed); fp.setDate(parsed, true); }
            }
        }

        const regDeadlineInput = document.getElementById('registration-deadline');
        if (regDeadlineInput && typeof flatpickr !== 'undefined') {
            const fp = flatpickr(regDeadlineInput, {
                ...dateConfig,
                onChange: (selectedDates) => {
                    const selectedDate = selectedDates[0];
                    setISODate(regDeadlineInput, selectedDate);
                    const compDate = document.getElementById('competition-date');
                    if (compDate?._flatpickr && selectedDate) compDate._flatpickr.set('minDate', selectedDate);
                }
            });
            if (regDeadlineInput.value) {
                const parsed = fp.parseDate(regDeadlineInput.value, 'Y-m-d');
                if (parsed) { setISODate(regDeadlineInput, parsed); fp.setDate(parsed, true); }
            }
        }

        const paymentDeadlineInput = document.getElementById('payment-deadline');
        if (paymentDeadlineInput && typeof flatpickr !== 'undefined') {
            const fp = flatpickr(paymentDeadlineInput, {
                ...dateConfig,
                onChange: (selectedDates) => {
                    const selectedDate = selectedDates[0];
                    setISODate(paymentDeadlineInput, selectedDate);
                    const compDate = document.getElementById('competition-date');
                    if (compDate?._flatpickr && selectedDate) compDate._flatpickr.set('minDate', selectedDate);
                }
            });
            if (paymentDeadlineInput.value) {
                const parsed = fp.parseDate(paymentDeadlineInput.value, 'Y-m-d');
                if (parsed) { setISODate(paymentDeadlineInput, parsed); fp.setDate(parsed, true); }
            }
        }
    }
    initDatePickers();

    // ====================== ВКЛАДКИ ======================
    const topTabs = document.querySelectorAll('.form-tab');
    const topTabContents = document.querySelectorAll('.tab-content');
    topTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            topTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            topTabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // ====================== НАВИГАЦИЯ ======================
    document.getElementById('next-to-entries')?.addEventListener('click', () => {
        document.querySelector('.form-tab[data-tab="main"]').classList.remove('active');
        document.querySelector('.form-tab[data-tab="entries"]').classList.add('active');
        document.getElementById('tab-main').classList.remove('active');
        document.getElementById('tab-entries').classList.add('active');
    });
    document.getElementById('back-to-main')?.addEventListener('click', () => {
        document.querySelector('.form-tab[data-tab="entries"]').classList.remove('active');
        document.querySelector('.form-tab[data-tab="main"]').classList.add('active');
        document.getElementById('tab-entries').classList.remove('active');
        document.getElementById('tab-main').classList.add('active');
    });

    // ====================== ФАЙЛЫ ======================
    const filesList = document.getElementById('files-list');
    const addFileBtn = document.getElementById('add-file-btn');
    const fileInput = document.getElementById('file-input');
    let filesToDelete = [];

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const template = document.getElementById('file-card-template');
        if (!template) return;
        const clone = template.content.cloneNode(true);
        const fileCard = clone.querySelector('.file-card');
        const fileName = clone.querySelector('.file-name');
        const fileSize = clone.querySelector('.file-size');
        const fileProgress = clone.querySelector('.file-progress');
        const progressBar = clone.querySelector('.progress-bar');
        const removeBtn = clone.querySelector('.remove-file');
        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);
        if (fileProgress) fileProgress.style.display = 'block';
        if (removeBtn) removeBtn.addEventListener('click', () => fileCard.remove());
        if (filesList) filesList.appendChild(clone);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-file/');
        xhr.setRequestHeader('X-CSRFToken', document.querySelector('[name=csrfmiddlewaretoken]').value);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable && progressBar) progressBar.style.width = (e.loaded / e.total) * 100 + '%'; };
        xhr.onload = () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    if (fileProgress) fileProgress.style.display = 'none';
                    if (fileCard) fileCard.dataset.filePath = response.file.path;
                    if (removeBtn) removeBtn.onclick = () => {
                        if (confirm('Удалить файл?')) {
                            fetch('/api/remove-temp-file/', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value },
                                body: JSON.stringify({ path: fileCard.dataset.filePath })
                            }).then(res => res.json()).then(data => { if (data.success) fileCard.remove(); });
                        }
                    };
                } else { fileCard.remove(); alert('Ошибка загрузки: ' + (response.error || 'Неизвестная ошибка')); }
            } else { fileCard.remove(); alert('Ошибка загрузки файла'); }
        };
        xhr.send(formData);
    }

    document.querySelectorAll('.existing-file').forEach(fileCard => {
        const removeBtn = fileCard.querySelector('.remove-existing-file');
        const fileId = fileCard.dataset.fileId;
        if (removeBtn) removeBtn.addEventListener('click', () => { filesToDelete.push(fileId); fileCard.remove(); });
    });
    addFileBtn?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', (e) => { Array.from(e.target.files).forEach(file => uploadFile(file)); fileInput.value = ''; });

    // ====================== КОНТАКТЫ ======================
    const contactsList = document.getElementById('contacts-list');
    const addContactBtn = document.getElementById('add-contact-btn');
    function addContactToUI(contactType = '', contactValue = '') {
        const template = document.getElementById('contact-card-template');
        if (!template) return;
        const clone = template.content.cloneNode(true);
        const contactCard = clone.querySelector('.contact-card');
        const typeSelect = contactCard.querySelector('.contact-type');
        const valueInput = contactCard.querySelector('.contact-value');
        const removeBtn = contactCard.querySelector('.remove-contact');
        if (typeSelect && contactType) typeSelect.value = contactType;
        if (valueInput) valueInput.value = contactValue;
        if (removeBtn) removeBtn.addEventListener('click', () => contactCard.remove());
        if (contactsList) contactsList.appendChild(clone);
        if (typeof initCustomSelects === 'function') initCustomSelects(contactCard);
    }
    document.querySelectorAll('.existing-contact .remove-contact').forEach(btn => {
        btn.addEventListener('click', function() { this.closest('.contact-card').remove(); });
    });
    addContactBtn?.addEventListener('click', () => addContactToUI());

    // ====================== ЗАЧЁТЫ ======================
    let entriesToDelete = [];
    let entryFormCounter = 0;

    function getDisciplineName(code) {
        const names = { 'bullseye': 'Буллсай', 'distance': 'Броски на дальность', 'accuracy': 'Броски на точность' };
        return names[code] || code;
    }

    function attachEntryFormHandlers(form) {
        const removeBtn = form.querySelector('.remove-entry-form');
        const judgeText = form.querySelector('.judge-text');
        const customSelectWrapper = form.querySelector('.custom-select-wrapper');
        const hiddenInput = customSelectWrapper?.querySelector('.custom-select-input');
        const valueSpan = customSelectWrapper?.querySelector('.custom-select-value');
        if (hiddenInput && hiddenInput.value && valueSpan) {
            const selectedOption = form.querySelector(`.custom-select-option[data-value="${hiddenInput.value}"]`);
            if (selectedOption) {
                valueSpan.textContent = selectedOption.textContent;
                valueSpan.classList.remove('placeholder');
                customSelectWrapper.querySelector('.custom-select-field').classList.add('has-value');
                selectedOption.classList.add('selected');
            }
        }
        if (removeBtn) removeBtn.addEventListener('click', () => {
            const entryId = form.dataset.entryId;
            if (entryId) entriesToDelete.push(entryId);
            form.remove();
        });
        if (judgeText) {
            judgeText.addEventListener('input', function() {
                if (this.value.trim() && hiddenInput) {
                    hiddenInput.value = '';
                    if (valueSpan) { valueSpan.textContent = ' '; valueSpan.classList.add('placeholder'); }
                    customSelectWrapper.querySelector('.custom-select-field').classList.remove('has-value');
                    form.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
                }
            });
        }
        const radioOptions = form.querySelectorAll('.radio-option input[type="radio"]');
        radioOptions.forEach(radio => {
            radio.addEventListener('change', function() {
                const radioOption = this.closest('.radio-option');
                const group = radioOption.closest('.radio-options-row');
                group.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('active'));
                if (this.checked) radioOption.classList.add('active');
            });
        });
    }

    function addEntryForm(discipline, existingData = null) {
        const template = document.getElementById('entry-form-template');
        if (!template) return;
        const clone = template.content.cloneNode(true);
        const formCard = clone.querySelector('.entry-form-card');
        const radioOptionsRow = formCard.querySelector('.radio-options-row');
        const customSelectWrapper = formCard.querySelector('.custom-select-wrapper');
        const judgeTextInput = formCard.querySelector('.judge-text');
        const feeInput = formCard.querySelector('.entry-fee');
        const canEnterWithoutClassCheckbox = formCard.querySelector('.can-enter-without-class-checkbox');
        if (existingData) {
            if (existingData.id) formCard.dataset.entryId = existingData.id;
            const radioToCheck = radioOptionsRow.querySelector(`input[type="radio"][value="${existingData.sport_class}"]`);
            if (radioToCheck) radioToCheck.checked = true;
            if (existingData.can_enter_without_class && canEnterWithoutClassCheckbox) canEnterWithoutClassCheckbox.checked = true;
            if (existingData.judge_name && judgeTextInput) judgeTextInput.value = existingData.judge_name;
            if (existingData.judge_id && customSelectWrapper) {
                const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                if (hiddenInput) hiddenInput.value = existingData.judge_id;
            }
            if (existingData.fee && feeInput) feeInput.value = existingData.fee;
        }
        const container = document.getElementById(`entry-forms-${discipline}`);
        if (container) {
            container.appendChild(clone);
            if (typeof initCustomSelects === 'function') initCustomSelects(container);
            attachEntryFormHandlers(formCard);
            const radioOptions = formCard.querySelectorAll('.radio-option input[type="radio"]');
            radioOptions.forEach(radio => {
                if (radio.checked) radio.dispatchEvent(new Event('change'));
            });
        }
    }

    if (typeof existingEntries !== 'undefined' && existingEntries.length > 0) {
        existingEntries.forEach(entry => addEntryForm(entry.discipline, entry));
    }
    document.querySelectorAll('.add-entry-btn').forEach(btn => {
        btn.addEventListener('click', () => addEntryForm(btn.dataset.discipline));
    });

    function collectEntriesData() {
        const entries = [];
        document.querySelectorAll('.entry-form-card').forEach(form => {
            const entryId = form.dataset.entryId;
            const discipline = form.dataset.discipline;
            const selectedRadio = form.querySelector('input[type="radio"]:checked');
            const sportClass = selectedRadio ? selectedRadio.value : null;
            const canEnterWithoutClass = form.querySelector('.can-enter-without-class-checkbox')?.checked || false;
            const customSelectWrapper = form.querySelector('.custom-select-wrapper');
            let judgeId = '', judgeName = '';
            if (customSelectWrapper) {
                const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                const selectedOption = customSelectWrapper.querySelector('.custom-select-option.selected');
                if (hiddenInput?.value) {
                    judgeId = hiddenInput.value;
                    judgeName = selectedOption ? selectedOption.textContent : '';
                }
            }
            const judgeText = form.querySelector('.judge-text');
            if (judgeText?.value.trim() && !judgeId) judgeName = judgeText.value.trim();
            const fee = form.querySelector('.entry-fee')?.value || 0;
            if (!sportClass) return;
            if (!judgeId && !judgeName) return;
            const entryData = { discipline, sport_class: sportClass, judge_id: judgeId || null, judge_name: judgeName || '', fee, can_enter_without_class: canEnterWithoutClass };
            if (entryId) entryData.id = entryId;
            entries.push(entryData);
        });
        return entries;
    }

    // ====================== СОХРАНЕНИЕ ======================
    const form = document.getElementById('competition-form');
    const competitionId = document.querySelector('input[name="competition_id"]')?.value;

    async function saveAsDraft() {
        const formData = new FormData();
        if (competitionId) formData.append('competition_id', competitionId);
        const fields = ['title', 'date', 'registration_deadline', 'location', 'location_type', 'city', 'description', 'payment_deadline'];
        fields.forEach(field => {
            const el = document.querySelector(`[name="${field}"]`);
            if (el && el.value) formData.append(field, field === 'date' || field === 'registration_deadline' || field === 'payment_deadline' ? getISOValue(el) : el.value);
        });
        formData.append('status', 'draft');
        formData.append('save_as_draft', 'true');
        try {
            const response = await fetch(`/organizer/competition/${competitionId}/edit/`, {
                method: 'POST', body: formData,
                headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value, 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            alert(data.success ? 'Черновик сохранён' : (data.error || 'Ошибка при сохранении черновика'));
        } catch (error) { console.error(error); alert('Ошибка сети'); }
    }
    document.querySelectorAll('.btn-secondary').forEach(btn => {
        if (btn.textContent.includes('Черновик')) btn.addEventListener('click', (e) => { e.preventDefault(); saveAsDraft(); });
    });

    document.getElementById('save-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        if (competitionId) formData.append('competition_id', competitionId);
        const fields = ['title', 'date', 'registration_deadline', 'location', 'location_type', 'city', 'description', 'payment_deadline'];
        fields.forEach(field => {
            const el = document.querySelector(`[name="${field}"]`);
            if (el) formData.append(field, field === 'date' || field === 'registration_deadline' || field === 'payment_deadline' ? getISOValue(el) : el.value);
        });
        document.querySelectorAll('.payment-method-checkbox:checked').forEach(cb => formData.append('payment_methods', cb.value));
        document.querySelectorAll('.contact-card').forEach(card => {
            const type = card.querySelector('.contact-type')?.value;
            const value = card.querySelector('.contact-value')?.value;
            if (type && value) { formData.append('contact_type[]', type); formData.append('contact_value[]', value); }
        });
        filesToDelete.forEach(fileId => formData.append('delete_files[]', fileId));
        document.querySelectorAll('.file-card:not(.existing-file)').forEach(card => {
            const filePath = card.dataset.filePath;
            if (filePath) formData.append('new_files[]', filePath);
        });
        entriesToDelete.forEach(entryId => formData.append('delete_entries[]', entryId));
        formData.append('entries_data', JSON.stringify(collectEntriesData()));
        formData.append('status', 'published');
        try {
            const response = await fetch(`/organizer/competition/${competitionId}/edit/`, {
                method: 'POST', body: formData,
                headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value, 'X-Requested-With': 'XMLHttpRequest' }
            });
            const data = await response.json();
            if (data.success) window.location.href = '/organizer/dashboard/';
            else alert(data.error || 'Ошибка при обновлении');
        } catch (error) { console.error(error); alert('Ошибка сети'); }
    });

    document.getElementById('delete-competition-btn')