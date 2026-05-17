// static/js/dog_add_edit_modal.js
// Общий модуль для работы с модальным окном добавления/редактирования собаки

let fileUploadInitialized = false;

// ====================== ИНИЦИАЛИЗАЦИЯ СТИЛЕЙ РАДИО-КНОПОК ======================
function updateRadioStyles(container = document) {
    container.querySelectorAll('.radio-options-row').forEach(group => {
        const radios = group.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => {
            const label = radio.closest('.radio-option');
            if (label) {
                if (radio.checked) {
                    label.classList.add('active');
                } else {
                    label.classList.remove('active');
                }

                radio.removeEventListener('change', radio._styleChangeHandler);
                radio._styleChangeHandler = function() {
                    group.querySelectorAll('.radio-option').forEach(opt => {
                        opt.classList.remove('active');
                    });
                    if (this.checked) {
                        const parentLabel = this.closest('.radio-option');
                        if (parentLabel) parentLabel.classList.add('active');
                    }
                };
                radio.addEventListener('change', radio._styleChangeHandler);
            }
        });
    });
}

// ====================== FLATPICKR ДЛЯ ДАТЫ РОЖДЕНИЯ ======================
function initDatePicker(inputElement) {
    if (!inputElement || typeof flatpickr === 'undefined') return;

    if (!inputElement._flatpickr) {
        const fp = flatpickr(inputElement, {
            dateFormat: "d.m.Y",
            locale: "ru",
            allowInput: true,
            disableMobile: true,
            maxDate: "today",
            onChange: function(selectedDates, dateStr, instance) {
                if (dateStr) {
                    const parts = dateStr.split('.');
                    if (parts.length === 3) {
                        inputElement.setAttribute('data-iso-date', `${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                } else {
                    inputElement.removeAttribute('data-iso-date');
                }
            }
        });

        inputElement._flatpickr = fp;
    }
        // На мобилке запрещаем ввод с клавиатуры
    if (window.innerWidth <= 768) {
        inputElement.setAttribute('readonly', true);
    }
}

// ====================== КАСТОМНЫЙ ФАЙЛ-ИНПУТ С ПРЕВЬЮ ======================
function initFileUpload(container = document) {
    if (fileUploadInitialized && container === document) return;

    const fileInput = container.querySelector('#dog-avatar');
    const avatarPreview = container.querySelector('#avatar-preview');
    const deleteFlag = container.querySelector('#delete-avatar-flag');

    if (!fileInput || !avatarPreview) return;

    function updatePreview(imageUrl) {
        const currentPreviewImg = container.querySelector('#avatar-preview-img');
        const currentAvatarPreview = container.querySelector('#avatar-preview');
        const currentDeleteFlag = container.querySelector('#delete-avatar-flag');

        if (!currentPreviewImg) return;

        const deleteIcon = currentAvatarPreview?.querySelector('.avatar-delete-icon');

        if (imageUrl && imageUrl !== '' && !imageUrl.includes('dog_avatar_placeholder')) {
            if (currentPreviewImg.src !== imageUrl) {
                currentPreviewImg.src = imageUrl;
            }
            if (currentDeleteFlag) currentDeleteFlag.value = 'false';
            if (deleteIcon) deleteIcon.style.display = 'flex';
        } else {
            if (!currentPreviewImg.src.includes('dog_avatar_placeholder')) {
                currentPreviewImg.src = '/static/images/dog_avatar_placeholder.svg';
            }
            if (currentDeleteFlag) currentDeleteFlag.value = 'true';
            if (deleteIcon) deleteIcon.style.display = 'none';
        }
    }

    if (!container._updatePreview) {
        container._updatePreview = updatePreview;
    }

    if (!avatarPreview.hasAttribute('data-initialized')) {
        const newAvatarPreview = avatarPreview.cloneNode(true);
        avatarPreview.parentNode.replaceChild(newAvatarPreview, avatarPreview);
        newAvatarPreview.setAttribute('data-initialized', 'true');

        newAvatarPreview.addEventListener('click', (e) => {
            if (!e.target.closest('.avatar-edit-icon') && !e.target.closest('.avatar-delete-icon')) {
                fileInput.click();
            }
        });
    }

    if (!fileInput._changeHandler) {
        fileInput._changeHandler = (e) => {
            if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = function(event) {
                    if (container._updatePreview) {
                        container._updatePreview(event.target.result);
                    }
                };
                reader.readAsDataURL(file);
            }
        };
        fileInput.addEventListener('change', fileInput._changeHandler);
    }

    const currentAvatarPreview = container.querySelector('#avatar-preview');
    const editIcon = currentAvatarPreview?.querySelector('.avatar-edit-icon');
    if (editIcon && !editIcon.hasClickHandler) {
        const newEditIcon = editIcon.cloneNode(true);
        editIcon.parentNode.replaceChild(newEditIcon, editIcon);
        newEditIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
        newEditIcon.hasClickHandler = true;
    }

    const deleteIcon = currentAvatarPreview?.querySelector('.avatar-delete-icon');
    if (deleteIcon && !deleteIcon.hasClickHandler) {
        const newDeleteIcon = deleteIcon.cloneNode(true);
        deleteIcon.parentNode.replaceChild(newDeleteIcon, deleteIcon);
        newDeleteIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (container._updatePreview) {
                container._updatePreview(null);
            }
            if (fileInput) fileInput.value = '';
        });
        newDeleteIcon.hasClickHandler = true;
    }

    if (container === document) {
        fileUploadInitialized = true;
    }
}

// ====================== ОТКРЫТИЕ/ЗАКРЫТИЕ МОДАЛКИ ======================
function openDogModal() {
    const overlay = document.getElementById('dog-modal-overlay');
    const modal = document.getElementById('dog-modal');
    if (overlay) overlay.style.display = 'flex';
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
}

function closeDogModal() {
    const overlay = document.getElementById('dog-modal-overlay');
    const modal = document.getElementById('dog-modal');
    const form = document.getElementById('dog-form');
    const dogIdInput = document.getElementById('dog-id');
    const deleteDogBtn = document.getElementById('delete-dog-btn');
    const dogFormError = document.getElementById('dog-form-error');

    if (overlay) overlay.style.display = 'none';
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    if (form) form.reset();
    if (dogIdInput) dogIdInput.value = '';
    if (deleteDogBtn) deleteDogBtn.style.display = 'none';
    if (dogFormError) dogFormError.style.display = 'none';
}

// ====================== ДОБАВЛЕНИЕ СОБАКИ ======================
function openAddDogModal(onSuccessCallback) {
    const modalTitle = document.getElementById('dog-modal-title');
    const dogIdInput = document.getElementById('dog-id');
    const dogForm = document.getElementById('dog-form');
    const deleteDogBtn = document.getElementById('delete-dog-btn');
    const dogFormError = document.getElementById('dog-form-error');

    if (modalTitle) modalTitle.textContent = 'Добавить собаку';
    if (dogIdInput) dogIdInput.value = '';
    if (dogForm) dogForm.reset();
    if (deleteDogBtn) deleteDogBtn.style.display = 'none';
    if (dogFormError) dogFormError.style.display = 'none';

    const genderRadios = document.querySelectorAll('input[name="gender"]');
    const classRadios = document.querySelectorAll('input[name="sport_class_dog"]');
    genderRadios.forEach(radio => radio.checked = false);
    classRadios.forEach(radio => radio.checked = false);

    updateRadioStyles();

    const previewImg = document.getElementById('avatar-preview-img');
    const deleteFlag = document.getElementById('delete-avatar-flag');
    const fileInput = document.getElementById('dog-avatar');
    const avatarPreview = document.getElementById('avatar-preview');

    if (previewImg) previewImg.src = '/static/images/dog_avatar_placeholder.svg';
    if (deleteFlag) deleteFlag.value = 'false';
    if (fileInput) fileInput.value = '';

    if (avatarPreview) {
        const deleteIcon = avatarPreview.querySelector('.avatar-delete-icon');
        if (deleteIcon) deleteIcon.style.display = 'none';
    }

    fileUploadInitialized = false;

    openDogModal();

    setTimeout(() => {
        const birthDateInput = document.getElementById('dog-birth-date');
        if (birthDateInput) initDatePicker(birthDateInput);
        initFileUpload();
    }, 50);

    window.dogModalSuccessCallback = onSuccessCallback;
}

// ====================== РЕДАКТИРОВАНИЕ СОБАКИ ======================
function openEditDogModal(dogId, onSuccessCallback) {
    console.log('=== openEditDogModal START ===');
    console.log('dogId:', dogId);

    fetch(`/users/dog/${dogId}/`)
        .then(response => response.json())
        .then(data => {
            console.log('=== API RESPONSE ===', data);
            if (data.success) {
                const modalTitle = document.getElementById('dog-modal-title');
                const dogIdInput = document.getElementById('dog-id');
                const dogNameInput = document.getElementById('dog-name');
                const dogBreedInput = document.getElementById('dog-breed');
                const dogBirthDateInput = document.getElementById('dog-birth-date');
                const dogHeightInput = document.getElementById('dog-height');
                const deleteDogBtn = document.getElementById('delete-dog-btn');
                const genderRadios = document.querySelectorAll('input[name="gender"]');
                const classRadios = document.querySelectorAll('input[name="sport_class_dog"]');

                if (modalTitle) modalTitle.textContent = 'Редактировать собаку';
                if (dogIdInput) dogIdInput.value = data.dog.id;
                if (dogNameInput) dogNameInput.value = data.dog.name;
                if (dogBreedInput) dogBreedInput.value = data.dog.breed === '—' ? '' : data.dog.breed;
                if (dogHeightInput) dogHeightInput.value = data.dog.height || '';

                if (data.dog.birth_date && dogBirthDateInput) {
                    const dateParts = data.dog.birth_date.split('-');
                    if (dateParts.length === 3) {
                        dogBirthDateInput.value = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
                        dogBirthDateInput.setAttribute('data-iso-date', data.dog.birth_date);
                    }
                }

                console.log('=== УСТАНОВКА ПОЛА ===');
                console.log('data.dog.gender:', data.dog.gender);
                genderRadios.forEach(radio => {
                    console.log('gender radio value:', radio.value, 'checked:', radio.value === data.dog.gender);
                    radio.checked = radio.value === data.dog.gender;
                });

                console.log('=== УСТАНОВКА КЛАССА ===');
                console.log('data.dog.sport_class_code:', data.dog.sport_class_code);
                classRadios.forEach(radio => {
                    console.log('class radio value:', radio.value, 'should be checked:', radio.value === data.dog.sport_class_code);
                    radio.checked = radio.value === data.dog.sport_class_code;
                    if (radio.checked) {
                        console.log('ВЫБРАН РАДИО КЛАССА:', radio.value);
                    }
                });

                classRadios.forEach(radio => {
                    radio.removeEventListener('change', radio._classChangeHandler);
                    radio._classChangeHandler = function() {
                        if (this.checked) {
                            console.log('=== ПОЛЬЗОВАТЕЛЬ ВЫБРАЛ КЛАСС ===', this.value);
                        }
                    };
                    radio.addEventListener('change', radio._classChangeHandler);
                });

                updateRadioStyles();

                const previewImg = document.getElementById('avatar-preview-img');
                const deleteFlag = document.getElementById('delete-avatar-flag');
                const avatarPreview = document.getElementById('avatar-preview');

                if (previewImg) {
                    if (data.dog.avatar_url) {
                        previewImg.src = data.dog.avatar_url;
                        if (deleteFlag) deleteFlag.value = 'false';
                        const deleteIcon = avatarPreview?.querySelector('.avatar-delete-icon');
                        if (deleteIcon) deleteIcon.style.display = 'flex';
                    } else {
                        previewImg.src = '/static/images/dog_avatar_placeholder.svg';
                        if (deleteFlag) deleteFlag.value = 'true';
                        const deleteIcon = avatarPreview?.querySelector('.avatar-delete-icon');
                        if (deleteIcon) deleteIcon.style.display = 'none';
                    }
                }

                if (deleteDogBtn) {
                    deleteDogBtn.style.display = 'block';
                    deleteDogBtn.dataset.dogId = dogId;
                }

                fileUploadInitialized = false;

                openDogModal();

                setTimeout(() => {
                    const birthDateInput = document.getElementById('dog-birth-date');
                    if (birthDateInput) initDatePicker(birthDateInput);
                    initFileUpload();

                    const checkedClass = document.querySelector('input[name="sport_class_dog"]:checked');
                    console.log('=== ЧЕРЕЗ 1 СЕКУНДУ ПОСЛЕ ОТКРЫТИЯ ===');
                    console.log('Выбранный класс (checked):', checkedClass ? checkedClass.value : 'НИЧЕГО НЕ ВЫБРАНО');
                }, 1000);
            }
        })
        .catch(error => console.error('Ошибка загрузки собаки:', error));

    window.dogModalSuccessCallback = onSuccessCallback;
}

// ====================== ИНИЦИАЛИЗАЦИЯ ФОРМЫ ======================
function initDogForm() {
    const dogForm = document.getElementById('dog-form');
    if (!dogForm) return;

    if (dogForm._submitHandler) {
        dogForm.removeEventListener('submit', dogForm._submitHandler);
    }

    dogForm._submitHandler = function(e) {
        e.preventDefault();

        const submitBtn = dogForm.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : 'Сохранить';
        if (submitBtn) {
            submitBtn.textContent = 'Сохранение...';
            submitBtn.disabled = true;
        }

        const formData = new FormData();
        const dogIdInput = document.getElementById('dog-id');
        const dogNameInput = document.getElementById('dog-name');
        const dogBreedInput = document.getElementById('dog-breed');
        const dogBirthDateInput = document.getElementById('dog-birth-date');
        const dogHeightInput = document.getElementById('dog-height');
        const dogFormError = document.getElementById('dog-form-error');

        if (dogNameInput) formData.append('name', dogNameInput.value);
        if (dogBreedInput) formData.append('breed', dogBreedInput.value);

        let birthDate = '';
        if (dogBirthDateInput) {
            const isoDate = dogBirthDateInput.getAttribute('data-iso-date');
            if (isoDate) {
                birthDate = isoDate;
            } else if (dogBirthDateInput.value) {
                let dateValue = dogBirthDateInput.value;
                if (dateValue.includes('.')) {
                    const parts = dateValue.split('.');
                    if (parts.length === 3) {
                        birthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                } else if (dateValue.includes('-')) {
                    birthDate = dateValue;
                }
            }
        }
        formData.append('birth_date', birthDate);

        if (dogHeightInput) formData.append('height', dogHeightInput.value);

        const selectedGender = document.querySelector('input[name="gender"]:checked')?.value || '';
        console.log('=== ОТЛАДКА GENDER ===', selectedGender);
        if (selectedGender) formData.append('gender', selectedGender);

        const classRadios = document.querySelectorAll('input[name="sport_class_dog"]');
        console.log('=== ОТЛАДКА КЛАССА ===');
        console.log('Всего радио-кнопок класса:', classRadios.length);

        let selectedClass = '';
        classRadios.forEach(radio => {
            console.log(`radio value: ${radio.value}, checked: ${radio.checked}`);
            if (radio.checked) {
                selectedClass = radio.value;
                console.log(`ВЫБРАН РАДИО: ${radio.value}`);
            }
        });

        console.log('selectedClass итоговый:', selectedClass);

        if (selectedClass) formData.append('sport_class', selectedClass);

        const checkedRadio = document.querySelector('input[name="sport_class_dog"]:checked');
        console.log('querySelector выбранный класс:', checkedRadio ? checkedRadio.value : 'НИЧЕГО НЕ ВЫБРАНО');

        const fileInput = document.getElementById('dog-avatar');
        if (fileInput && fileInput.files && fileInput.files[0]) {
            formData.append('avatar', fileInput.files[0]);
        }

        const deleteFlag = document.getElementById('delete-avatar-flag');
        if (deleteFlag && deleteFlag.value === 'true') {
            formData.append('delete_avatar', 'true');
        }

        const dogId = dogIdInput ? dogIdInput.value : '';
        const url = dogId ? `/users/dog/${dogId}/edit/` : '/users/dog/add/';

        console.log('=== ОТЛАДКА URL ===', url);
        console.log('=== ОТЛАДКА DOG_ID ===', dogId);
        console.log('=== ОТЛАДКА FORMDATA (sport_class) ===', formData.get('sport_class'));

        fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.json().then(data => {
                    throw new Error(data.error || `HTTP ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('=== ОТЛАДКА RESPONSE DATA ===', data);
            if (data.success) {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }

                if (window.dogModalSuccessCallback) {
                    window.dogModalSuccessCallback(data.dog);
                }
                closeDogModal();
                if (!window.dogModalSuccessCallback) {
                    location.reload();
                }
            } else {
                if (dogFormError) {
                    dogFormError.textContent = data.error || 'Ошибка сохранения';
                    dogFormError.style.display = 'block';
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            if (dogFormError) {
                dogFormError.textContent = error.message || 'Ошибка сети. Попробуйте позже.';
                dogFormError.style.display = 'block';
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    };

    dogForm.addEventListener('submit', dogForm._submitHandler);

    const deleteDogBtn = document.getElementById('delete-dog-btn');
    if (deleteDogBtn && !deleteDogBtn._clickHandler) {
        deleteDogBtn._clickHandler = function() {
            const dogId = this.dataset.dogId;
            if (confirm('Вы уверены, что хотите удалить эту собаку?')) {
                fetch(`/users/dog/${dogId}/delete/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        location.reload();
                    } else {
                        alert(data.error || 'Ошибка удаления');
                    }
                })
                .catch(error => console.error('Ошибка удаления:', error));
            }
        };
        deleteDogBtn.addEventListener('click', deleteDogBtn._clickHandler);
    }
}

// ====================== ИНИЦИАЛИЗАЦИЯ ЗАКРЫТИЯ ======================
function initModalCloseHandlers() {
    const closeDogModalBtn = document.getElementById('close-dog-modal');
    const crossCloseModalBtn = document.getElementById('cross-close-modal');
    const dogModalOverlay = document.getElementById('dog-modal-overlay');
    const dogModal = document.getElementById('dog-modal');

    if (closeDogModalBtn && !closeDogModalBtn._closeHandler) {
        closeDogModalBtn._closeHandler = closeDogModal;
        closeDogModalBtn.addEventListener('click', closeDogModalBtn._closeHandler);
    }

    if (crossCloseModalBtn && !crossCloseModalBtn._closeHandler) {
        crossCloseModalBtn._closeHandler = closeDogModal;
        crossCloseModalBtn.addEventListener('click', crossCloseModalBtn._closeHandler);
    }

    if (dogModalOverlay && !dogModalOverlay._closeHandler) {
        dogModalOverlay._closeHandler = closeDogModal;
        dogModalOverlay.addEventListener('click', dogModalOverlay._closeHandler);
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && dogModal && dogModal.style.display === 'flex') {
            closeDogModal();
        }
    });
}

// ====================== ЭКСПОРТ ФУНКЦИЙ (ГЛОБАЛЬНЫЕ) ======================
window.dogModal = {
    openAdd: openAddDogModal,
    openEdit: openEditDogModal,
    close: closeDogModal,
    initForm: initDogForm,
    initCloseHandlers: initModalCloseHandlers,
    updateRadioStyles: updateRadioStyles
};