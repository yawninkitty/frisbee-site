// static/js/competition_form.js

document.addEventListener('DOMContentLoaded', function() {
    const isEdit = window.isEdit || false;
    const competitionId = window.competitionId || null;

    // ====================== HELPER ДЛЯ FLOATING LABEL ======================
function updateFloatingLabel(input) {
    const group = input.closest('.floating-label-group');
    if (!group) return;

    const hasValue = input.value && input.value.trim() !== '';
    group.classList.toggle('has-value', hasValue);
}

// ====================== FLATPICKR ДЛЯ ДАТ ======================
function initDatePickers() {
    const isMobile = window.innerWidth <= 768;

    const dateConfig = {
        dateFormat: "d.m.Y",
        locale: "ru",
        allowInput: true,
        disableMobile: true,
        clickOpens: true,
        closeOnSelect: true,
        position: "auto",
    };

    const timeInput = document.getElementById('competition-time');
    if (timeInput) {
        flatpickr(timeInput, {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            locale: "ru",
            allowInput: true,
            disableMobile: true,
            defaultHour: 9,
            defaultMinute: 0
        });
    }

    function updateISO(displayInput, isoInput, date) {
        if (date && isoInput) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            isoInput.value = `${year}-${month}-${day}`;
            displayInput.setAttribute('data-iso-date', isoInput.value);
        } else if (isoInput) {
            isoInput.value = '';
            displayInput.removeAttribute('data-iso-date');
        }
    }

    function initSingleDatePicker(inputId, isoInputId, onChangeExtra = null) {
        const displayInput = document.getElementById(inputId);
        const isoInput = document.getElementById(isoInputId);
        if (!displayInput) return;

        // На мобилке запрещаем ввод с клавиатуры
        if (isMobile) {
            displayInput.setAttribute('readonly', true);
        }

        const currentValue = displayInput.value.trim();

        const fp = flatpickr(displayInput, {
            ...dateConfig,
            defaultDate: currentValue || null,

            onChange: function(selectedDates, dateStr, instance) {
                const selectedDate = selectedDates[0];
                if (selectedDate) {
                    updateISO(displayInput, isoInput, selectedDate);
                    if (onChangeExtra) onChangeExtra(selectedDate);
                }
                updateFloatingLabel(displayInput);
            }
        });

        if (currentValue) {
            displayInput.value = currentValue;
            const parsed = fp.parseDate(currentValue, 'd.m.Y');
            if (parsed) {
                updateISO(displayInput, isoInput, parsed);
            }
        }

        updateFloatingLabel(displayInput);

        displayInput.addEventListener('input', () => updateFloatingLabel(displayInput));

        displayInput.addEventListener('blur', () => {
            setTimeout(() => {
                if (!displayInput.value || displayInput.value.trim() === '') {
                    fp.clear();
                }
                updateFloatingLabel(displayInput);
            }, 10);
        });
    }

    initSingleDatePicker('competition-date', 'competition-date-iso', (selectedDate) => {
        const reg = document.getElementById('registration-deadline');
        const pay = document.getElementById('payment-deadline');
        if (reg?._flatpickr && selectedDate) reg._flatpickr.set('maxDate', selectedDate);
        if (pay?._flatpickr && selectedDate) pay._flatpickr.set('maxDate', selectedDate);
    });

    initSingleDatePicker('registration-deadline', 'registration-deadline-iso', (selectedDate) => {
        const comp = document.getElementById('competition-date');
        if (comp?._flatpickr && selectedDate) comp._flatpickr.set('minDate', selectedDate);
    });

    initSingleDatePicker('payment-deadline', 'payment-deadline-iso', (selectedDate) => {
        const comp = document.getElementById('competition-date');
        if (comp?._flatpickr && selectedDate) comp._flatpickr.set('minDate', selectedDate);
    });
}

initDatePickers();

    // ====================== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ======================
    const tabs = document.querySelectorAll('.form-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });

    // ====================== ФАЙЛЫ ======================
    const filesList = document.getElementById('files-list');
    const addFileBtn = document.getElementById('add-file-btn');
    const fileInput = document.getElementById('file-input');
    let filesToDelete = [];

    function updateFilesListVisibility() {
        if (filesList) {
            const hasChildren = filesList.children.length > 0;
            filesList.style.display = hasChildren ? '' : 'none';
        }
    }

    updateFilesListVisibility();

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function addFileToUI(file) {
        const template = document.getElementById('file-card-template');
        const clone = template.content.cloneNode(true);
        const fileCard = clone.querySelector('.file-card');
        const fileName = clone.querySelector('.file-name');
        const fileSize = clone.querySelector('.file-size');
        const removeBtn = clone.querySelector('.remove-file');

        fileCard.dataset.filePath = file.path;
        fileCard.dataset.fileName = file.name;
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);

        removeBtn.addEventListener('click', function() {
            if (confirm('Удалить файл?')) {
                if (fileCard.dataset.fileId) filesToDelete.push(fileCard.dataset.fileId);
                fetch('/api/remove-temp-file/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value },
                    body: JSON.stringify({ path: fileCard.dataset.filePath })
                }).then(res => res.json()).then(data => {
                    if (data.success) {
                        fileCard.remove();
                        updateFilesListVisibility();
                    }
                });
            }
        });
        filesList.appendChild(clone);
        updateFilesListVisibility();
    }

    function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const template = document.getElementById('file-card-template');
        const clone = template.content.cloneNode(true);
        const fileCard = clone.querySelector('.file-card');
        const fileName = clone.querySelector('.file-name');
        const fileSize = clone.querySelector('.file-size');
        const fileProgress = clone.querySelector('.file-progress');
        const progressBar = clone.querySelector('.progress-bar');
        const removeBtn = clone.querySelector('.remove-file');

        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        fileProgress.style.display = 'block';
        filesList.appendChild(clone);
        updateFilesListVisibility();

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-file/');
        xhr.setRequestHeader('X-CSRFToken', document.querySelector('[name=csrfmiddlewaretoken]').value);
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) progressBar.style.width = (e.loaded / e.total) * 100 + '%';
        };
        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    fileProgress.style.display = 'none';
                    fileCard.dataset.filePath = response.file.path;
                    fileCard.dataset.fileName = response.file.name;
                    removeBtn.addEventListener('click', function() {
                        if (confirm('Удалить файл?')) {
                            fetch('/api/remove-temp-file/', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value },
                                body: JSON.stringify({ path: fileCard.dataset.filePath })
                            }).then(res => res.json()).then(data => {
                                if (data.success) {
                                    fileCard.remove();
                                    updateFilesListVisibility();
                                }
                            });
                        }
                    });
                } else {
                    fileCard.remove();
                    updateFilesListVisibility();
                    alert('Ошибка загрузки: ' + (response.error || 'Неизвестная ошибка'));
                }
            } else {
                fileCard.remove();
                updateFilesListVisibility();
                alert('Ошибка загрузки файла');
            }
        };
        xhr.send(formData);
    }

    document.querySelectorAll('.existing-file').forEach(fileCard => {
        const removeBtn = fileCard.querySelector('.remove-existing-file');
        const fileId = fileCard.dataset.fileId;
        if (removeBtn) removeBtn.addEventListener('click', function() {
            filesToDelete.push(fileId);
            fileCard.remove();
            updateFilesListVisibility();
        });
    });

    if (addFileBtn) addFileBtn.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', (e) => { Array.from(e.target.files).forEach(file => uploadFile(file)); fileInput.value = ''; });

    // ====================== КОНТАКТЫ ======================
    const contactsList = document.getElementById('contacts-list');
    const addContactBtn = document.getElementById('add-contact-btn');

    function updateContactsListVisibility() {
        if (contactsList) {
            const hasChildren = contactsList.children.length > 0;
            contactsList.style.display = hasChildren ? '' : 'none';
        }
    }

    updateContactsListVisibility();

    function addContactToUI(contactType = 'email', contactValue = '') {
        const template = document.getElementById('contact-card-template');
        const clone = template.content.cloneNode(true);
        const contactCard = clone.querySelector('.contact-card');
        const customSelectWrapper = clone.querySelector('.contact-type-select');
        const hiddenInput = customSelectWrapper?.querySelector('.custom-select-input');
        const valueSpan = customSelectWrapper?.querySelector('.custom-select-value');
        const valueInput = clone.querySelector('.contact-value');
        const removeBtn = clone.querySelector('.remove-contact');

        if (valueInput) valueInput.value = contactValue;

        if (hiddenInput && contactType) {
            hiddenInput.value = contactType;
            const selectedOption = customSelectWrapper?.querySelector(`.custom-select-option[data-value="${contactType}"]`);
            if (selectedOption && valueSpan) {
                valueSpan.textContent = selectedOption.textContent;
                valueSpan.classList.remove('placeholder');
                const field = customSelectWrapper.querySelector('.custom-select-field');
                if (field) field.classList.add('has-value');
                selectedOption.classList.add('selected');
            }
        }

        if (typeof initCustomSelects === 'function') {
            initCustomSelects(contactCard);
        }

        removeBtn.addEventListener('click', () => {
            contactCard.remove();
            updateContactsListVisibility();
        });

        contactsList.appendChild(clone);
        updateContactsListVisibility();
    }

    document.querySelectorAll('.existing-contact .contact-type-select').forEach(select => {
        if (typeof initCustomSelects === 'function') {
            initCustomSelects(select.closest('.contact-card'));
        }
    });

    if (addContactBtn) addContactBtn.addEventListener('click', () => addContactToUI());

    // ====================== ЗАЧЁТЫ ======================
    const publishBtn = document.getElementById('publish-btn');
    const saveBtn = document.getElementById('save-btn');
    let entryFormCounter = 0;
    let entriesToDelete = [];

    function updatePublishButton() {
        if (!publishBtn) return;
        publishBtn.disabled = document.querySelectorAll('.entry-form-card').length === 0;
    }

    function attachEntryFormHandlers(form) {
        const removeBtn = form.querySelector('.remove-entry-form');
        const judgeText = form.querySelector('.judge-text');
        const customSelectWrapper = form.querySelector('.custom-select-wrapper');
        const customSelectField = customSelectWrapper?.querySelector('.custom-select-field');
        const hiddenInput = customSelectWrapper?.querySelector('.custom-select-input');
        const valueSpan = customSelectWrapper?.querySelector('.custom-select-value');

        if (hiddenInput && hiddenInput.value && valueSpan && isEdit) {
            const selectedOption = form.querySelector(`.custom-select-option[data-value="${hiddenInput.value}"]`);
            if (selectedOption) {
                valueSpan.textContent = selectedOption.textContent;
                valueSpan.classList.remove('placeholder');
                customSelectField?.classList.add('has-value');
                selectedOption.classList.add('selected');
            }
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                if (form.dataset.entryId) entriesToDelete.push(form.dataset.entryId);
                form.remove();
                updatePublishButton();
            });
        }

        if (judgeText && customSelectWrapper) {
            judgeText.addEventListener('input', function() {
                if (this.value.trim() !== '') {
                    if (hiddenInput) hiddenInput.value = '';
                    if (valueSpan) {
                        valueSpan.textContent = '';
                        valueSpan.classList.add('placeholder');
                    }
                    customSelectField?.classList.remove('has-value');
                    form.querySelectorAll('.custom-select-option').forEach(opt => opt.classList.remove('selected'));
                }
            });

            const options = form.querySelectorAll('.custom-select-option');
            options.forEach(option => {
                option.addEventListener('click', function() {
                    if (judgeText) judgeText.value = '';
                });
            });
        }

        form.querySelectorAll('.radio-option input[type="radio"]').forEach(radio => {
            radio.addEventListener('change', function() {
                const group = this.closest('.radio-options-row');
                group.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('active'));
                if (this.checked) this.closest('.radio-option').classList.add('active');
            });
            if (radio.checked && isEdit) radio.dispatchEvent(new Event('change'));
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

        const formId = entryFormCounter++;
        formCard.dataset.formId = formId;

        radioOptionsRow.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.name = `sport_class_${formId}`;
        });
        if (canEnterWithoutClassCheckbox) canEnterWithoutClassCheckbox.name = `can_enter_without_class_${formId}`;

        if (existingData) {
            if (existingData.id) formCard.dataset.entryId = existingData.id;
            const radioToCheck = radioOptionsRow.querySelector(`input[type="radio"][value="${existingData.sport_class}"]`);
            if (radioToCheck) radioToCheck.checked = true;
            if (existingData.can_enter_without_class && canEnterWithoutClassCheckbox) canEnterWithoutClassCheckbox.checked = true;

            if (existingData.judge_id && existingData.judge_id !== 'null') {
                if (customSelectWrapper) {
                    const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                    if (hiddenInput) hiddenInput.value = existingData.judge_id;
                }
                if (judgeTextInput) judgeTextInput.value = '';
            } else if (existingData.judge_name) {
                if (judgeTextInput) judgeTextInput.value = existingData.judge_name;
                if (customSelectWrapper) {
                    const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                    if (hiddenInput) hiddenInput.value = '';
                }
            }

            if (existingData.fee && feeInput) feeInput.value = existingData.fee;
        }

        const container = document.getElementById(`entry-forms-${discipline}`);
        if (container) {
            container.appendChild(clone);
            if (typeof initCustomSelects === 'function') initCustomSelects(container);
            attachEntryFormHandlers(formCard);
            updatePublishButton();
        }
    }

    // Для публикации — с валидацией
    function collectEntriesData() {
        const entries = [];

        document.querySelectorAll('.entry-form-card').forEach(form => {
            const discipline = form.closest('.discipline-section')?.dataset.discipline ||
                              form.dataset.discipline;

            const selectedRadio = form.querySelector('input[type="radio"]:checked');
            const sportClass = selectedRadio ? selectedRadio.value : null;
            const canEnterWithoutClass = form.querySelector('.can-enter-without-class-checkbox')?.checked || false;

            const judgeTextInput = form.querySelector('.judge-text');
            const customSelectWrapper = form.querySelector('.custom-select-wrapper');
            const hiddenInput = customSelectWrapper?.querySelector('.custom-select-input');

            let judgeId = '';
            let judgeName = '';

            if (judgeTextInput && judgeTextInput.value.trim() !== '') {
                judgeName = judgeTextInput.value.trim();
                judgeId = '';
            } else if (hiddenInput && hiddenInput.value.trim() !== '') {
                judgeId = hiddenInput.value.trim();
                const selectedOption = customSelectWrapper.querySelector('.custom-select-option.selected');
                judgeName = selectedOption ? selectedOption.textContent.trim() : '';
            }

            const fee = form.querySelector('.entry-fee')?.value || 0;

            if (!sportClass) return;
            if (!judgeId && !judgeName) return;

            const entryData = {
                discipline: discipline,
                sport_class: sportClass,
                judge_id: judgeId || null,
                judge_name: judgeName || '',
                fee: parseInt(fee) || 0,
                can_enter_without_class: canEnterWithoutClass
            };

            if (form.dataset.entryId) {
                entryData.id = form.dataset.entryId;
            }

            entries.push(entryData);
        });

        return entries;
    }

    // Для черновика — без валидации, сохраняем всё
    function collectEntriesDataForDraft() {
        const entries = [];

        document.querySelectorAll('.entry-form-card').forEach(form => {
            const discipline = form.closest('.discipline-section')?.dataset.discipline ||
                              form.dataset.discipline;

            const selectedRadio = form.querySelector('input[type="radio"]:checked');
            const sportClass = selectedRadio ? selectedRadio.value : null;
            const canEnterWithoutClass = form.querySelector('.can-enter-without-class-checkbox')?.checked || false;

            const judgeTextInput = form.querySelector('.judge-text');
            const customSelectWrapper = form.querySelector('.custom-select-wrapper');
            const hiddenInput = customSelectWrapper?.querySelector('.custom-select-input');

            let judgeId = '';
            let judgeName = '';

            if (judgeTextInput && judgeTextInput.value.trim() !== '') {
                judgeName = judgeTextInput.value.trim();
            } else if (hiddenInput && hiddenInput.value.trim() !== '') {
                judgeId = hiddenInput.value.trim();
                const selectedOption = customSelectWrapper.querySelector('.custom-select-option.selected');
                judgeName = selectedOption ? selectedOption.textContent.trim() : '';
            }

            const fee = form.querySelector('.entry-fee')?.value || 0;

            const entryData = {
                discipline: discipline || '',
                sport_class: sportClass || '',
                judge_id: judgeId || null,
                judge_name: judgeName || '',
                fee: parseInt(fee) || 0,
                can_enter_without_class: canEnterWithoutClass
            };

            if (form.dataset.entryId) {
                entryData.id = form.dataset.entryId;
            }

            entries.push(entryData);
        });

        return entries;
    }

    if (isEdit && window.existingEntries && window.existingEntries.length > 0) {
        ['bullseye', 'distance', 'accuracy'].forEach(discipline => {
            const container = document.getElementById(`entry-forms-${discipline}`);
            if (container) container.innerHTML = '';
        });
        window.existingEntries.forEach(entry => addEntryForm(entry.discipline, entry));
    }

    document.querySelectorAll('.add-entry-btn').forEach(btn => {
        btn.addEventListener('click', () => addEntryForm(btn.dataset.discipline));
    });

    // ====================== НАВИГАЦИЯ ======================
    document.getElementById('next-to-entries')?.addEventListener('click', () => {
        document.querySelector('.form-tab[data-tab="main"]').classList.remove('active');
        document.querySelector('.form-tab[data-tab="entries"]').classList.add('active');
        document.getElementById('tab-main').classList.remove('active');
        document.getElementById('tab-entries').classList.add('active');
        updatePublishButton();
    });
    document.getElementById('back-to-main')?.addEventListener('click', () => {
        document.querySelector('.form-tab[data-tab="entries"]').classList.remove('active');
        document.querySelector('.form-tab[data-tab="main"]').classList.add('active');
        document.getElementById('tab-entries').classList.remove('active');
        document.getElementById('tab-main').classList.add('active');
    });

    // ====================== ВАЛИДАЦИЯ ======================
    function removeFieldError(e) {
        const formGroup = e.target.closest('.form-group');
        if (formGroup) {
            formGroup.classList.remove('error');
            const errorSpan = formGroup.querySelector('.error-message');
            if (errorSpan) errorSpan.remove();
        }
    }

    function setupFieldListeners() {
        document.querySelectorAll('input, select, textarea').forEach(field => {
            field.removeEventListener('input', removeFieldError);
            field.removeEventListener('change', removeFieldError);
            field.addEventListener('input', removeFieldError);
            field.addEventListener('change', removeFieldError);
        });
    }

    function showErrors(errors) {
        const oldErrorsDiv = document.getElementById('form-errors-global');
        if (oldErrorsDiv) oldErrorsDiv.remove();

        const errorsDiv = document.createElement('div');
        errorsDiv.id = 'form-errors-global';
        errorsDiv.className = 'form-errors';
        errorsDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f5c6cb;';
        errorsDiv.innerHTML = '<ul style="margin: 0; padding-left: 20px;">' + errors.map(e => `<li>${e}</li>`).join('') + '</ul>';

        const form = document.getElementById('competition-form');
        form.insertBefore(errorsDiv, form.firstChild);
        errorsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => errorsDiv.remove(), 5000);
    }

    function clearFieldErrors() {
        document.querySelectorAll('.form-group').forEach(group => {
            group.classList.remove('error');
            const errorSpan = group.querySelector('.error-message');
            if (errorSpan) errorSpan.remove();
        });
    }

    function highlightField(field, errorMessage) {
        const formGroup = field.closest('.form-group');
        if (formGroup) {
            formGroup.classList.add('error');
            let errorSpan = formGroup.querySelector('.error-message');
            if (!errorSpan) {
                errorSpan = document.createElement('span');
                errorSpan.className = 'error-message';
                formGroup.appendChild(errorSpan);
            }
            errorSpan.textContent = errorMessage;
        }
    }

    function validateMainData() {
        const errors = [];
        clearFieldErrors();

        const requiredFields = [
            { selector: '[name="title"]', name: 'Название' },
            { selector: '[name="date"]', name: 'Дата проведения' },
            { selector: '[name="registration_deadline"]', name: 'Дата окончания сбора заявок' },
            { selector: '[name="location"]', name: 'Адрес' },
            { selector: '[name="city"]', name: 'Город' },
            { selector: '[name="location_type"]', name: 'Тип площадки' }
        ];

        requiredFields.forEach(config => {
            const field = document.querySelector(config.selector);
            if (field && !field.value.trim()) {
                const errorMsg = `Заполните поле "${config.name}"`;
                errors.push(errorMsg);
                highlightField(field, errorMsg);
            }
        });

        const contactCards = document.querySelectorAll('.contact-card');
        let hasContact = false;
        contactCards.forEach(card => {
            const typeSelect = card.querySelector('.contact-type-select .custom-select-input');
            const type = typeSelect?.value;
            const valueInput = card.querySelector('.contact-value');
            const value = valueInput?.value.trim();
            if (type && value) hasContact = true;
        });

        if (!hasContact && contactCards.length === 0) {
            errors.push('Добавьте хотя бы один контакт для связи');
        } else if (!hasContact && contactCards.length > 0) {
            errors.push('Заполните хотя бы один контакт для связи');
        }

        return { isValid: errors.length === 0, errors };
    }

    function validateEntries() {
        const errors = [];
        document.querySelectorAll('.entry-form-card').forEach((form, index) => {
            const sportClass = form.querySelector('input[type="radio"]:checked')?.value || null;
            const customSelectWrapper = form.querySelector('.custom-select-wrapper');
            let hasJudge = false;
            if (customSelectWrapper) {
                const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                const judgeTextInput = form.querySelector('.judge-text');
                if (hiddenInput?.value || judgeTextInput?.value.trim()) hasJudge = true;
            }
            if (!sportClass) errors.push(`В зачёте ${index + 1} не выбран класс`);
            if (!hasJudge) errors.push(`В зачёте ${index + 1} не указан судья`);
        });
        return { isValid: errors.length === 0, errors };
    }

function showSuccessModal(message) {
    const modal = document.getElementById('success-modal');
    const overlay = document.getElementById('success-modal-overlay');
    const modalMessage = document.getElementById('success-modal-message');
    const closeBtn = document.getElementById('close-success-modal');
    const okBtn = document.getElementById('success-modal-ok');

    if (!modal || !overlay) return;

    modalMessage.textContent = message;

    modal.style.display = 'flex';
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    function closeModal() {
        modal.style.display = 'none';
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');

        closeBtn.removeEventListener('click', closeModal);
        okBtn.removeEventListener('click', onOk);
        overlay.removeEventListener('click', onOverlayClick);
        document.removeEventListener('keydown', onEsc);
    }

    function onOk() {
        closeModal();
        window.location.href = '/organizer/dashboard/';
    }

    function onOverlayClick(e) {
        if (e.target === overlay) {
            onOk();
        }
    }

    function onEsc(e) {
        if (e.key === 'Escape') {
            onOk();
        }
    }

    closeBtn.addEventListener('click', closeModal);
    okBtn.addEventListener('click', onOk);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onEsc);
}

    async function saveAsDraft() {
        const formData = new FormData();
        if (isEdit && competitionId) formData.append('competition_id', competitionId);

        const title = document.querySelector('[name="title"]')?.value;
        if (title) formData.append('title', title);

        const dateISO = document.getElementById('competition-date-iso')?.value;
        if (dateISO) formData.append('date', dateISO);
        const regDeadlineISO = document.getElementById('registration-deadline-iso')?.value;
        if (regDeadlineISO) formData.append('registration_deadline', regDeadlineISO);
        const paymentDeadlineISO = document.getElementById('payment-deadline-iso')?.value;
        if (paymentDeadlineISO) formData.append('payment_deadline', paymentDeadlineISO);

        const location = document.querySelector('[name="location"]')?.value;
        if (location) formData.append('location', location);
        const locationType = document.querySelector('[name="location_type"]:checked')?.value;
        if (locationType) formData.append('location_type', locationType);
        const city = document.querySelector('[name="city"]')?.value;
        if (city) formData.append('city', city);
        const description = document.querySelector('[name="description"]')?.value;
        if (description) formData.append('description', description);
        const timeValue = document.querySelector('[name="time"]')?.value;
    if (timeValue) formData.append('time', timeValue);

        document.querySelectorAll('.payment-method-checkbox:checked').forEach(cb =>
            formData.append('payment_methods', cb.value)
        );

        document.querySelectorAll('.contact-card').forEach(card => {
            const typeSelect = card.querySelector('.contact-type-select .custom-select-input');
            const valueInput = card.querySelector('.contact-value');
            const type = typeSelect?.value;
            const value = valueInput?.value.trim();
            if (type && value) {
                formData.append('contact_type[]', type);
                formData.append('contact_value[]', value);
            }
        });

        if (isEdit) {
            filesToDelete.forEach(id => formData.append('delete_files[]', id));
            entriesToDelete.forEach(id => formData.append('delete_entries[]', id));
        }
        document.querySelectorAll('.file-card:not(.existing-file)').forEach(card => {
            const path = card.dataset.filePath;
            if (path) formData.append('new_files[]', path);
        });

        // Используем сбор без валидации для черновика
        const entriesData = collectEntriesDataForDraft();
        entriesData.forEach((entry, index) => {
            formData.append(`entries[${index}][discipline]`, entry.discipline);
            formData.append(`entries[${index}][sport_class]`, entry.sport_class);
            formData.append(`entries[${index}][judge_id]`, entry.judge_id || '');
            formData.append(`entries[${index}][judge_name]`, entry.judge_name || '');
            formData.append(`entries[${index}][fee]`, entry.fee);
            formData.append(`entries[${index}][can_enter_without_class]`, entry.can_enter_without_class);
        });

        formData.append('status', 'draft');
        if (isEdit) formData.append('save_as_draft', 'true');

        const url = isEdit ? `/organizer/competition/${competitionId}/edit/` : '/organizer/competition/create/';

        try {
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            const data = await response.json();
            if (data.success) {
                showSuccessModal(isEdit ? 'Черновик сохранён.' : 'Черновик создан.');
            } else {
                showErrors([data.error || 'Ошибка при сохранении черновика']);
            }
        } catch (error) {
            showErrors(['Ошибка сети: ' + error.message]);
        }
    }

    // ====================== ОТПРАВКА ФОРМЫ ======================
    const form = document.getElementById('competition-form');
    const submitBtn = publishBtn || saveBtn;

    if (form && submitBtn) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();

            const mainValidation = validateMainData();
            if (!mainValidation.isValid) {
                document.querySelector('.form-tab[data-tab="main"]').click();
                showErrors(mainValidation.errors);
                return;
            }

            const entriesValidation = validateEntries();
            if (!entriesValidation.isValid) {
                document.querySelector('.form-tab[data-tab="entries"]').click();
                showErrors(entriesValidation.errors);
                return;
            }

            const formData = new FormData();
            if (isEdit && competitionId) formData.append('competition_id', competitionId);

            formData.append('title', document.querySelector('[name="title"]').value);
            formData.append('date', document.getElementById('competition-date-iso')?.value || '');
            formData.append('registration_deadline', document.getElementById('registration-deadline-iso')?.value || '');
            formData.append('location', document.querySelector('[name="location"]').value);
            formData.append('location_type', document.querySelector('[name="location_type"]:checked')?.value || '');
            formData.append('city', document.querySelector('[name="city"]').value);
            formData.append('description', document.querySelector('[name="description"]').value || '');
            formData.append('payment_deadline', document.getElementById('payment-deadline-iso')?.value || '');
            formData.append('time', document.querySelector('[name="time"]')?.value || '');
            formData.append('status', 'published');

            document.querySelectorAll('.payment-method-checkbox:checked').forEach(cb => formData.append('payment_methods', cb.value));

            document.querySelectorAll('.contact-card').forEach(card => {
                const typeSelect = card.querySelector('.contact-type-select .custom-select-input');
                const valueInput = card.querySelector('.contact-value');
                const type = typeSelect?.value;
                const value = valueInput?.value.trim();
                if (type && value) {
                    formData.append('contact_type[]', type);
                    formData.append('contact_value[]', value);
                }
            });

            if (isEdit) {
                filesToDelete.forEach(id => formData.append('delete_files[]', id));
                entriesToDelete.forEach(id => formData.append('delete_entries[]', id));
            }

            document.querySelectorAll('.file-card:not(.existing-file)').forEach(card => {
                const path = card.dataset.filePath;
                if (path) formData.append('new_files[]', path);
            });

            const entriesData = collectEntriesData();
            entriesData.forEach((entry, index) => {
                formData.append(`entries[${index}][discipline]`, entry.discipline);
                formData.append(`entries[${index}][sport_class]`, entry.sport_class);
                formData.append(`entries[${index}][judge_id]`, entry.judge_id || '');
                formData.append(`entries[${index}][judge_name]`, entry.judge_name || '');
                formData.append(`entries[${index}][fee]`, entry.fee);
                formData.append(`entries[${index}][can_enter_without_class]`, entry.can_enter_without_class);
            });

            const url = isEdit ? `/organizer/competition/${competitionId}/edit/` : '/organizer/competition/create/';

            fetch(url, {
                method: 'POST',
                body: formData,
                headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value, 'X-Requested-With': 'XMLHttpRequest' }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) showSuccessModal(isEdit ? 'Соревнование успешно обновлено!' : 'Соревнование успешно создано!');
                else showErrors([data.error || 'Ошибка при сохранении']);
            })
            .catch(error => showErrors(['Ошибка сети: ' + error.message]));
        });
    }

    document.querySelectorAll('.draft-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.preventDefault();
            saveAsDraft();
        });
    });

    if (isEdit) {
        document.getElementById('delete-competition-btn')?.addEventListener('click', async function() {
            if (!confirm('ВНИМАНИЕ! Вы уверены, что хотите удалить это соревнование?\n\nУдаление невозможно будет отменить.')) return;
            try {
                const response = await fetch(`/organizer/competition/${competitionId}/delete/`, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value, 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
                });
                const data = await response.json();
                if (data.success) { alert('Соревнование успешно удалено'); window.location.href = '/organizer/dashboard/'; }
                else alert(data.error || 'Ошибка при удалении соревнования');
            } catch (error) { alert('Ошибка сети'); }
        });
    }

    setupFieldListeners();
});