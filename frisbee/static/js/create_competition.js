// static/js/create_competition.js

document.addEventListener('DOMContentLoaded', function() {

    // ====================== FLATPICKR ДЛЯ ДАТ ======================
    function initDatePickers() {
        // Настройки для flatpickr
        const dateConfig = {
            dateFormat: "d.m.Y",
            locale: "ru",
            allowInput: true,
        };

        // Функция для сохранения ISO даты в data-атрибут
        function setISODate(input, date) {
            if (date) {
                const isoDate = date.toISOString().split('T')[0];
                input.setAttribute('data-iso-date', isoDate);
            } else {
                input.removeAttribute('data-iso-date');
            }
        }

        // Дата проведения
        const dateInput = document.getElementById('competition-date');
        if (dateInput && typeof flatpickr !== 'undefined') {
            flatpickr(dateInput, {
                ...dateConfig,
                onChange: function(selectedDates, dateStr, instance) {
                    const selectedDate = selectedDates[0];
                    setISODate(dateInput, selectedDate);

                    const regDeadline = document.getElementById('registration-deadline');
                    if (regDeadline && regDeadline._flatpickr && selectedDate) {
                        regDeadline._flatpickr.set('maxDate', selectedDate);
                    }

                    const paymentDeadline = document.getElementById('payment-deadline');
                    if (paymentDeadline && paymentDeadline._flatpickr && selectedDate) {
                        paymentDeadline._flatpickr.set('maxDate', selectedDate);
                    }
                }
            });
        }

        // Дата окончания регистрации
        const regDeadlineInput = document.getElementById('registration-deadline');
        if (regDeadlineInput && typeof flatpickr !== 'undefined') {
            flatpickr(regDeadlineInput, {
                ...dateConfig,
                onChange: function(selectedDates, dateStr, instance) {
                    const selectedDate = selectedDates[0];
                    setISODate(regDeadlineInput, selectedDate);

                    const compDate = document.getElementById('competition-date');
                    if (compDate && compDate._flatpickr && selectedDate) {
                        compDate._flatpickr.set('minDate', selectedDate);
                    }
                }
            });
        }

        // Срок оплаты
        const paymentDeadlineInput = document.getElementById('payment-deadline');
        if (paymentDeadlineInput && typeof flatpickr !== 'undefined') {
            flatpickr(paymentDeadlineInput, {
                ...dateConfig,
                onChange: function(selectedDates, dateStr, instance) {
                    const selectedDate = selectedDates[0];
                    setISODate(paymentDeadlineInput, selectedDate);

                    const compDate = document.getElementById('competition-date');
                    if (compDate && compDate._flatpickr && selectedDate) {
                        compDate._flatpickr.set('minDate', selectedDate);
                    }
                }
            });
        }
    }

    // Функция для получения ISO даты из поля (для отправки)
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

    // ====================== ЗАГРУЗКА СОХРАНЁННЫХ ФАЙЛОВ ======================
    function loadTempFiles() {
        fetch('/api/temp-files/')
            .then(response => response.json())
            .then(data => {
                if (data.success && data.files) {
                    data.files.forEach(file => {
                        addFileToUI(file);
                    });
                }
            })
            .catch(error => console.error('Ошибка загрузки файлов:', error));
    }

    // ====================== ФАЙЛЫ (AJAX) ======================
    const filesList = document.getElementById('files-list');
    const addFileBtn = document.getElementById('add-file-btn');
    const fileInput = document.getElementById('file-input');

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
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);

        removeBtn.addEventListener('click', function() {
            if (confirm('Удалить файл?')) {
                fetch('/api/remove-temp-file/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    },
                    body: JSON.stringify({ path: fileCard.dataset.filePath })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        fileCard.remove();
                    }
                });
            }
        });

        filesList.appendChild(clone);
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

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload-file/');
        xhr.setRequestHeader('X-CSRFToken', document.querySelector('[name=csrfmiddlewaretoken]').value);

        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                progressBar.style.width = percent + '%';
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    fileProgress.style.display = 'none';
                    fileCard.dataset.filePath = response.file.path;

                    removeBtn.addEventListener('click', function() {
                        if (confirm('Удалить файл?')) {
                            fetch('/api/remove-temp-file/', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                                },
                                body: JSON.stringify({ path: fileCard.dataset.filePath })
                            })
                            .then(response => response.json())
                            .then(data => {
                                if (data.success) {
                                    fileCard.remove();
                                }
                            });
                        }
                    });
                } else {
                    fileCard.remove();
                    alert('Ошибка загрузки: ' + (response.error || 'Неизвестная ошибка'));
                }
            } else {
                fileCard.remove();
                alert('Ошибка загрузки файла');
            }
        };

        xhr.send(formData);
    }

    addFileBtn.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => uploadFile(file));
        fileInput.value = '';
    });

    // ====================== КОНТАКТЫ ======================
    const contactsList = document.getElementById('contacts-list');
    const addContactBtn = document.getElementById('add-contact-btn');

    function addContactToUI(contactType = 'email', contactValue = '') {
        const template = document.getElementById('contact-card-template');
        const clone = template.content.cloneNode(true);
        const contactCard = clone.querySelector('.contact-card');
        const typeSelect = clone.querySelector('.contact-type');
        const valueInput = clone.querySelector('.contact-value');
        const removeBtn = clone.querySelector('.remove-contact');

        typeSelect.value = contactType;
        valueInput.value = contactValue;

        removeBtn.addEventListener('click', function() {
            contactCard.remove();
        });

        contactsList.appendChild(clone);
    }

    addContactBtn.addEventListener('click', function() {
        addContactToUI();
    });

    // ====================== ЗАЧЁТЫ ======================
    const publishBtn = document.getElementById('publish-btn');
    let entryFormCounter = 0;

    function updatePublishButton() {
        if (!publishBtn) return;
        const forms = document.querySelectorAll('.entry-form-card');
        if (forms.length > 0) {
            publishBtn.disabled = false;
            publishBtn.title = '';
        } else {
            publishBtn.disabled = true;
            publishBtn.title = 'Добавьте хотя бы один зачёт';
        }
    }

    function getDisciplineName(code) {
        const names = {
            'bullseye': 'Буллсай',
            'distance': 'Броски на дальность',
            'accuracy': 'Броски на точность'
        };
        return names[code] || code;
    }

    function addEntryForm(discipline) {
        const template = document.getElementById('entry-form-template');
        if (!template) return;

        const clone = template.content.cloneNode(true);
        const formCard = clone.querySelector('.entry-form-card');
        const removeBtn = clone.querySelector('.remove-entry-form');
        const radioGroup = clone.querySelector('.radio-group');
        const judgeSelect = clone.querySelector('.judge-select');
        const judgeText = clone.querySelector('.judge-text');

        const formId = entryFormCounter++;
        formCard.dataset.formId = formId;

        const radioButtons = radioGroup.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
            radio.name = `sport_class_${formId}`;
        });

        if (judgeSelect) {
            judgeSelect.addEventListener('change', function() {
                if (this.value) {
                    judgeText.value = '';
                }
            });
        }

        if (judgeText) {
            judgeText.addEventListener('input', function() {
                if (this.value.trim()) {
                    judgeSelect.value = '';
                }
            });
        }

        formCard.dataset.discipline = discipline;

        removeBtn.addEventListener('click', function() {
            formCard.remove();
            updatePublishButton();
        });

        const container = document.getElementById(`entry-forms-${discipline}`);
        if (container) {
            container.appendChild(clone);
            updatePublishButton();

            if (typeof initCustomSelects === 'function') {
                initCustomSelects(container);
            }
        }
    }

    function collectEntriesData() {
        const entries = [];
        const forms = document.querySelectorAll('.entry-form-card');

        forms.forEach(form => {
            const discipline = form.dataset.discipline;
            const selectedRadio = form.querySelector(`input[type="radio"]:checked`);
            const sportClass = selectedRadio ? selectedRadio.value : null;

            // Получаем значение из кастомного селекта
            const customSelectWrapper = form.querySelector('.custom-select-wrapper');
            let judgeId = '';
            let judgeName = '';

            if (customSelectWrapper) {
                const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                const selectedOption = customSelectWrapper.querySelector('.custom-select-option.selected');

                if (hiddenInput && hiddenInput.value) {
                    judgeId = hiddenInput.value;
                    judgeName = selectedOption ? selectedOption.textContent : '';
                } else {
                    // Если в кастомном селекте ничего не выбрано, проверяем ручной ввод
                    const judgeTextInput = form.querySelector('.judge-text');
                    if (judgeTextInput && judgeTextInput.value.trim()) {
                        judgeName = judgeTextInput.value.trim();
                    }
                }
            } else {
                // Fallback на старый select (если вдруг)
                const judgeSelect = form.querySelector('.judge-select');
                const judgeText = form.querySelector('.judge-text');
                if (judgeSelect && judgeSelect.value) {
                    judgeId = judgeSelect.value;
                } else if (judgeText && judgeText.value.trim()) {
                    judgeName = judgeText.value.trim();
                }
            }

            const fee = form.querySelector('.entry-fee')?.value || 0;
            const canEnterWithoutClass = form.querySelector('.can-enter-without-class-checkbox')?.checked || false;

            if (!sportClass) return;
            if (!judgeId && !judgeName) return;

            entries.push({
                discipline: discipline,
                sport_class: sportClass,
                judge_id: judgeId || null,
                judge_name: judgeName || '',
                fee: fee,
                can_enter_without_class: canEnterWithoutClass
            });
        });

        return entries;
    }

    document.querySelectorAll('.add-entry-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const discipline = this.dataset.discipline;
            addEntryForm(discipline);
        });
    });

    // ====================== НАВИГАЦИЯ МЕЖДУ ВКЛАДКАМИ ======================
    const nextToEntriesBtn = document.getElementById('next-to-entries');
    const backToMainBtn = document.getElementById('back-to-main');

    if (nextToEntriesBtn) {
        nextToEntriesBtn.addEventListener('click', function() {
            document.querySelectorAll('.form-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === 'entries') {
                    tab.classList.add('active');
                }
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('tab-entries').classList.add('active');
            updatePublishButton();
        });
    }

    if (backToMainBtn) {
        backToMainBtn.addEventListener('click', function() {
            document.querySelectorAll('.form-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === 'main') {
                    tab.classList.add('active');
                }
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('tab-main').classList.add('active');
        });
    }

    // ====================== ПОДСВЕТКА ОШИБОК ======================
    function removeFieldError(e) {
        const field = e.target;
        const formGroup = field.closest('.form-group');
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

    // ====================== ФУНКЦИЯ ДЛЯ СОХРАНЕНИЯ ЧЕРНОВИКА ======================
    function saveAsDraft() {
        const formData = new FormData();

        const titleInput = document.querySelector('[name="title"]');
        const dateInput = document.querySelector('[name="date"]');
        const registrationDeadlineInput = document.querySelector('[name="registration_deadline"]');
        const locationInput = document.querySelector('[name="location"]');
        const locationTypeSelect = document.querySelector('[name="location_type"]');
        const cityInput = document.querySelector('[name="city"]');
        const descriptionTextarea = document.querySelector('[name="description"]');
        const paymentDeadlineInput = document.querySelector('[name="payment_deadline"]');

        if (titleInput && titleInput.value) formData.append('title', titleInput.value);
        if (dateInput && dateInput.value) formData.append('date', getISOValue(dateInput));
        if (registrationDeadlineInput && registrationDeadlineInput.value) formData.append('registration_deadline', getISOValue(registrationDeadlineInput));
        if (locationInput && locationInput.value) formData.append('location', locationInput.value);
        if (locationTypeSelect) formData.append('location_type', locationTypeSelect.value);
        if (cityInput && cityInput.value) formData.append('city', cityInput.value);
        if (descriptionTextarea) formData.append('description', descriptionTextarea.value);
        if (paymentDeadlineInput && paymentDeadlineInput.value) formData.append('payment_deadline', getISOValue(paymentDeadlineInput));

        formData.append('status', 'draft');

        fetch('/organizer/competition/create/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccessModal('✓ Черновик сохранён!');
            } else {
                showErrors([data.error || 'Ошибка при сохранении черновика']);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showErrors(['Ошибка сети: ' + error.message]);
        });
    }

    // ====================== ПОКАЗ ОШИБОК ======================
    function showErrors(errors) {
        const oldErrorsDiv = document.getElementById('form-errors-global');
        if (oldErrorsDiv) oldErrorsDiv.remove();

        const errorsDiv = document.createElement('div');
        errorsDiv.id = 'form-errors-global';
        errorsDiv.className = 'form-errors';
        errorsDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #f5c6cb;';

        let errorsHtml = '<ul style="margin: 0; padding-left: 20px;">';
        errors.forEach(error => {
            errorsHtml += `<li>${error}</li>`;
        });
        errorsHtml += '</ul>';
        errorsDiv.innerHTML = errorsHtml;

        const form = document.getElementById('competition-form');
        form.insertBefore(errorsDiv, form.firstChild);
        errorsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => {
            if (errorsDiv) errorsDiv.remove();
        }, 5000);
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

        const requiredFieldsConfig = [
            { selector: '[name="title"]', name: 'Название' },
            { selector: '[name="date"]', name: 'Дата проведения' },
            { selector: '[name="registration_deadline"]', name: 'Дата окончания сбора заявок' },
            { selector: '[name="location"]', name: 'Адрес' },
            { selector: '[name="city"]', name: 'Город' },
            { selector: '[name="location_type"]', name: 'Тип площадки' }
        ];

        requiredFieldsConfig.forEach(config => {
            const field = document.querySelector(config.selector);
            if (field && !field.value.trim()) {
                const errorMsg = `Заполните поле "${config.name}"`;
                errors.push(errorMsg);
                highlightField(field, errorMsg);
            }
        });

        const contactCards = document.querySelectorAll('.contact-card');
        let hasContact = false;
        let firstEmptyContact = null;

        contactCards.forEach(card => {
            const type = card.querySelector('.contact-type').value;
            const value = card.querySelector('.contact-value').value.trim();
            if (type && value) {
                hasContact = true;
            } else if (!firstEmptyContact) {
                firstEmptyContact = card;
            }
        });

        if (!hasContact && contactCards.length > 0) {
            const errorMsg = 'Заполните хотя бы один контакт для связи';
            errors.push(errorMsg);
            if (firstEmptyContact) {
                const typeSelect = firstEmptyContact.querySelector('.contact-type');
                const valueInput = firstEmptyContact.querySelector('.contact-value');
                if (typeSelect) highlightField(typeSelect, errorMsg);
                if (valueInput) highlightField(valueInput, errorMsg);
            }
        } else if (!hasContact && contactCards.length === 0) {
            const errorMsg = 'Добавьте хотя бы один контакт для связи';
            errors.push(errorMsg);
        }

        return { isValid: errors.length === 0, errors };
    }

    function validateEntries() {
        const errors = [];
        const forms = document.querySelectorAll('.entry-form-card');

        forms.forEach((form, index) => {
            const selectedRadio = form.querySelector(`input[type="radio"]:checked`);
            const sportClass = selectedRadio ? selectedRadio.value : null;

            // Проверяем кастомный селект
            const customSelectWrapper = form.querySelector('.custom-select-wrapper');
            let hasJudge = false;

            if (customSelectWrapper) {
                const hiddenInput = customSelectWrapper.querySelector('.custom-select-input');
                const judgeTextInput = form.querySelector('.judge-text');

                if (hiddenInput && hiddenInput.value) {
                    hasJudge = true;
                } else if (judgeTextInput && judgeTextInput.value.trim()) {
                    hasJudge = true;
                }
            } else {
                // Fallback на старый select
                const judgeSelect = form.querySelector('.judge-select');
                const judgeText = form.querySelector('.judge-text');
                if ((judgeSelect && judgeSelect.value) || (judgeText && judgeText.value.trim())) {
                    hasJudge = true;
                }
            }

            if (!sportClass) {
                errors.push(`В зачёте ${index + 1} не выбран класс`);
            }

            if (!hasJudge) {
                errors.push(`В зачёте ${index + 1} не указан судья`);
            }
        });

        return { isValid: errors.length === 0, errors };
    }

    function showSuccessModal(message = '✓ Соревнование успешно создано!') {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.style.display = 'block';
        modalOverlay.style.position = 'fixed';
        modalOverlay.style.top = '0';
        modalOverlay.style.left = '0';
        modalOverlay.style.width = '100%';
        modalOverlay.style.height = '100%';
        modalOverlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
        modalOverlay.style.zIndex = '1000';

        const modalContainer = document.createElement('div');
        modalContainer.className = 'modal-container';
        modalContainer.style.display = 'block';
        modalContainer.style.position = 'fixed';
        modalContainer.style.top = '50%';
        modalContainer.style.left = '50%';
        modalContainer.style.transform = 'translate(-50%, -50%)';
        modalContainer.style.backgroundColor = 'white';
        modalContainer.style.padding = '30px';
        modalContainer.style.borderRadius = '12px';
        modalContainer.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
        modalContainer.style.zIndex = '1001';
        modalContainer.style.textAlign = 'center';
        modalContainer.style.maxWidth = '400px';
        modalContainer.style.width = '90%';

        modalContainer.innerHTML = `
            <h3 style="color: #28a745; margin-bottom: 15px;">${message}</h3>
            <p style="margin-bottom: 20px;">Соревнование добавлено в ваш кабинет организатора.</p>
            <button id="success-modal-ok" class="btn-primary" style="padding: 8px 24px;">ОК</button>
        `;

        document.body.appendChild(modalOverlay);
        document.body.appendChild(modalContainer);

        document.getElementById('success-modal-ok').addEventListener('click', function() {
            modalOverlay.remove();
            modalContainer.remove();
            window.location.href = '/organizer/dashboard/';
        });

        modalOverlay.addEventListener('click', function() {
            modalOverlay.remove();
            modalContainer.remove();
            window.location.href = '/organizer/dashboard/';
        });
    }

    // ====================== ОТПРАВКА ФОРМЫ (ПУБЛИКАЦИЯ) ======================
    const form = document.getElementById('competition-form');

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const mainValidation = validateMainData();
        if (!mainValidation.isValid) {
            document.querySelectorAll('.form-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === 'main') {
                    tab.classList.add('active');
                }
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('tab-main').classList.add('active');
            showErrors(mainValidation.errors);
            return;
        }

        const entriesValidation = validateEntries();
        if (!entriesValidation.isValid) {
            document.querySelectorAll('.form-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.tab === 'entries') {
                    tab.classList.add('active');
                }
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('tab-entries').classList.add('active');
            showErrors(entriesValidation.errors);
            return;
        }

        const formData = new FormData();

        formData.append('title', document.querySelector('[name="title"]').value);
        formData.append('date', getISOValue(document.querySelector('[name="date"]')));
        formData.append('registration_deadline', getISOValue(document.querySelector('[name="registration_deadline"]')));
        formData.append('location', document.querySelector('[name="location"]').value);
        formData.append('location_type', document.querySelector('[name="location_type"]').value);
        formData.append('city', document.querySelector('[name="city"]').value);
        formData.append('description', document.querySelector('[name="description"]').value);
        formData.append('payment_deadline', getISOValue(document.querySelector('[name="payment_deadline"]')) || '');

        formData.append('status', 'published');

        document.querySelectorAll('.payment-method-checkbox:checked').forEach(cb => {
            formData.append('payment_methods', cb.value);
        });

        const contactCards = document.querySelectorAll('.contact-card');
        contactCards.forEach(card => {
            const type = card.querySelector('.contact-type').value;
            const value = card.querySelector('.contact-value').value;
            if (type && value) {
                formData.append('contact_type[]', type);
                formData.append('contact_value[]', value);
            }
        });

        const fileCards = document.querySelectorAll('.file-card');
        fileCards.forEach(card => {
            const filePath = card.dataset.filePath;
            if (filePath) {
                formData.append('temp_files[]', filePath);
            }
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

        fetch('/organizer/competition/create/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                'X-Requested-With': 'XMLHttpRequest',
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showSuccessModal('✓ Соревнование успешно опубликовано!');
            } else {
                showErrors([data.error || 'Ошибка при создании соревнования']);
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            showErrors(['Ошибка сети: ' + error.message]);
        });
    });

    // Обработчики для кнопок "Сохранить черновик"
    const draftButtons = document.querySelectorAll('.btn-secondary');
    draftButtons.forEach(btn => {
        if (btn.textContent.includes('Черновик') || btn.textContent.includes('черновик')) {
            btn.removeEventListener('click', saveAsDraft);
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                saveAsDraft();
            });
        }
    });

    loadTempFiles();
    setupFieldListeners();
});