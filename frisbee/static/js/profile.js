// static/js/profile.js

console.log('Скрипт profile.js запущен, DOM готов:', document.readyState);

// ====================== ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК (ВЕРТИКАЛЬНОЕ МЕНЮ) ======================
const profileMenuItems = document.querySelectorAll('.profile-menu-item');
const tabContents = {
    applications: document.getElementById('applications'),
    dogs: document.getElementById('dogs'),
    account: document.getElementById('account')
};

function activateTab(tabId) {
    Object.values(tabContents).forEach(content => {
        if (content) content.classList.remove('active');
    });

    if (tabContents[tabId]) {
        tabContents[tabId].classList.add('active');
    }

    profileMenuItems.forEach(item => {
        if (item.dataset.tab === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    window.history.pushState({}, '', url);
}

profileMenuItems.forEach(item => {
    item.addEventListener('click', function() {
        const tabId = this.dataset.tab;
        activateTab(tabId);
    });
});

const urlParams = new URLSearchParams(window.location.search);
const activeTabFromUrl = urlParams.get('tab');
if (activeTabFromUrl && tabContents[activeTabFromUrl]) {
    activateTab(activeTabFromUrl);
} else {
    const activeItem = document.querySelector('.profile-menu-item.active');
    if (activeItem) {
        activateTab(activeItem.dataset.tab);
    } else if (profileMenuItems.length > 0) {
        activateTab(profileMenuItems[0].dataset.tab);
    }
}

// ====================== КНОПКИ ДОБАВЛЕНИЯ/РЕДАКТИРОВАНИЯ СОБАК ======================

// Кнопка добавления собаки
const addDogBtn = document.getElementById('add-dog-btn');
if (addDogBtn) {
    addDogBtn.addEventListener('click', function() {
        window.dogModal.openAdd(function(newDog) {
            // Обновляем карусель после добавления
            loadDogsCarousel();
        });
    });
}

// Функция для инициализации кнопок редактирования собак
function initEditDogButtons() {
    document.querySelectorAll('.edit-dog-btn').forEach(btn => {
        btn.removeEventListener('click', btn._editHandler);
        btn._editHandler = function() {
            const dogId = this.dataset.dogId;
            window.dogModal.openEdit(dogId, function(updatedDog) {
                // Обновляем карусель после редактирования
                loadDogsCarousel();
            });
        };
        btn.addEventListener('click', btn._editHandler);
    });
}

// ====================== МОДАЛЬНОЕ ОКНО ДЛЯ ПРИЧИНЫ ОТКЛОНЕНИЯ ======================
const rejectionModalOverlay = document.getElementById('rejection-modal-overlay');
const rejectionModal = document.getElementById('rejection-modal');
const rejectionCommentText = document.getElementById('rejection-comment-text');
const closeRejectionModalBtn = document.getElementById('close-rejection-modal');

function openRejectionModal(comment) {
    if (rejectionCommentText) rejectionCommentText.textContent = comment || 'Причина отклонения не указана';
    if (rejectionModalOverlay) rejectionModalOverlay.style.display = 'block';
    if (rejectionModal) rejectionModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeRejectionModalFunc() {
    if (rejectionModalOverlay) rejectionModalOverlay.style.display = 'none';
    if (rejectionModal) rejectionModal.style.display = 'none';
    document.body.style.overflow = '';
}

document.addEventListener('click', function(e) {
    if (e.target.closest('.why-rejected-btn')) {
        const btn = e.target.closest('.why-rejected-btn');
        const comment = btn.dataset.comment;
        openRejectionModal(comment);
    }
});

if (closeRejectionModalBtn) {
    closeRejectionModalBtn.addEventListener('click', closeRejectionModalFunc);
}

if (rejectionModalOverlay) {
    rejectionModalOverlay.addEventListener('click', function(e) {
        if (e.target === rejectionModalOverlay) {
            closeRejectionModalFunc();
        }
    });
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && rejectionModal && rejectionModal.style.display === 'block') {
        closeRejectionModalFunc();
    }
});

// ====================== ЗАГРУЗКА ЧЕКА ======================
const receiptUploadModal = document.getElementById('receipt-upload-modal');
const receiptModalOverlay = document.getElementById('receipt-modal-overlay');
const receiptUploadForm = document.getElementById('receipt-upload-form');
const receiptAppId = document.getElementById('receipt-app-id');
const receiptFilesList = document.getElementById('receipt-files-list');
const addReceiptBtn = document.getElementById('add-receipt-btn');
const receiptFileInput = document.getElementById('receipt-file-input');
const receiptUploadProgress = document.getElementById('receipt-upload-progress');
const receiptUploadError = document.getElementById('receipt-upload-error');
const closeReceiptUploadModal = document.getElementById('close-receipt-upload-modal');
const cancelReceiptModal = document.getElementById('cancel-receipt-modal');

let currentReceiptFile = null;

// Форматирование размера файла
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Показать/скрыть область с карточкой файла
function showReceiptFileCard() {
    if (receiptFilesList) {
        receiptFilesList.style.display = 'flex';
    }
}

function hideReceiptFileCard() {
    if (receiptFilesList) {
        receiptFilesList.style.display = 'none';
    }
}

// Добавление файла в UI
function addReceiptFileToUI(file, isTemp = true) {
    // Очищаем список
    receiptFilesList.innerHTML = '';

    const template = document.getElementById('file-card-template');
    if (!template) {
        console.error('Шаблон file-card-template не найден');
        return;
    }

    const clone = template.content.cloneNode(true);
    const fileCard = clone.querySelector('.file-card');
    const fileName = clone.querySelector('.file-name');
    const fileSize = clone.querySelector('.file-size');
    const removeBtn = clone.querySelector('.remove-file');
    const progressDiv = clone.querySelector('.file-progress');

    fileCard.dataset.filePath = file.path || '';
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);

    if (progressDiv) {
        progressDiv.style.display = 'none';
    }

    // Обработчик удаления
    const newRemoveBtn = removeBtn.cloneNode(true);
    removeBtn.parentNode.replaceChild(newRemoveBtn, removeBtn);

    newRemoveBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (confirm('Удалить файл?')) {
            if (fileCard.dataset.filePath) {
                fetch('/users/remove-receipt-temp/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({ path: fileCard.dataset.filePath })
                })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        receiptFilesList.innerHTML = '';
                        currentReceiptFile = null;
                        hideReceiptFileCard();
                    }
                })
                .catch(err => console.error('Ошибка удаления:', err));
            } else {
                receiptFilesList.innerHTML = '';
                currentReceiptFile = null;
                hideReceiptFileCard();
            }
        }
    });

    receiptFilesList.appendChild(clone);
    showReceiptFileCard();
}

// Загрузка файла на сервер
function uploadReceiptFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    receiptUploadProgress.style.display = 'flex';
    const progressBar = receiptUploadProgress.querySelector('.progress-bar') ||
        (() => {
            const div = document.createElement('div');
            div.className = 'progress-bar';
            receiptUploadProgress.appendChild(div);
            return div;
        })();
    progressBar.style.width = '0%';

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/users/upload-receipt-temp/');
    xhr.setRequestHeader('X-CSRFToken', document.querySelector('[name=csrfmiddlewaretoken]').value);

    xhr.upload.onprogress = function(e) {
        if (e.lengthComputable) {
            const percent = (e.loaded / e.total) * 100;
            progressBar.style.width = percent + '%';
        }
    };

    xhr.onload = function() {
        receiptUploadProgress.style.display = 'none';
        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
                currentReceiptFile = {
                    path: response.file.path,
                    name: response.file.name,
                    size: response.file.size
                };
                addReceiptFileToUI(currentReceiptFile, true);
                receiptUploadError.style.display = 'none';
            } else {
                receiptUploadError.textContent = response.error || 'Ошибка загрузки файла';
                receiptUploadError.style.display = 'block';
            }
        } else {
            receiptUploadError.textContent = 'Ошибка загрузки файла';
            receiptUploadError.style.display = 'block';
        }
    };

    xhr.onerror = function() {
        receiptUploadProgress.style.display = 'none';
        receiptUploadError.textContent = 'Ошибка сети';
        receiptUploadError.style.display = 'block';
    };

    xhr.send(formData);
}

// Открытие модального окна
function openReceiptUploadModal(appId) {
    if (receiptAppId) receiptAppId.value = appId;
    currentReceiptFile = null;
    receiptFilesList.innerHTML = '';
    receiptUploadError.style.display = 'none';
    receiptUploadProgress.style.display = 'none';

    // Скрываем карточку файла (файла пока нет)
    hideReceiptFileCard();

    if (receiptUploadModal) receiptUploadModal.style.display = 'flex';
    if (receiptModalOverlay) receiptModalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Закрытие модального окна
function closeReceiptUploadModalFunc() {
    if (receiptUploadModal) receiptUploadModal.style.display = 'none';
    if (receiptModalOverlay) receiptModalOverlay.style.display = 'none';
    document.body.style.overflow = '';

    if (currentReceiptFile && currentReceiptFile.path) {
        fetch('/users/remove-receipt-temp/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
            },
            body: JSON.stringify({ path: currentReceiptFile.path })
        }).catch(err => console.error('Ошибка очистки:', err));
        currentReceiptFile = null;
    }
}

// Отправка формы
if (receiptUploadForm) {
    receiptUploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!currentReceiptFile) {
            receiptUploadError.textContent = 'Выберите файл для загрузки';
            receiptUploadError.style.display = 'block';
            return;
        }

        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]');
        if (!csrfToken) {
            receiptUploadError.textContent = 'Ошибка безопасности: CSRF токен не найден';
            receiptUploadError.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/users/application/upload-receipt/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken.value,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    app_id: receiptAppId.value,
                    file_path: currentReceiptFile.path
                })
            });

            const data = await response.json();

            if (response.status === 403) {
                receiptUploadError.textContent = 'Ошибка авторизации. Обновите страницу и попробуйте снова.';
                receiptUploadError.style.display = 'block';
                return;
            }

            if (data.success) {
                location.reload();
            } else {
                receiptUploadError.textContent = data.error || 'Ошибка загрузки';
                receiptUploadError.style.display = 'block';
            }
        } catch (error) {
            console.error('Ошибка:', error);
            receiptUploadError.textContent = 'Ошибка сети. Проверьте соединение.';
            receiptUploadError.style.display = 'block';
        }
    });
}

// Обработчики событий
if (addReceiptBtn) {
    addReceiptBtn.addEventListener('click', () => receiptFileInput.click());
}

if (receiptFileInput) {
    receiptFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            uploadReceiptFile(e.target.files[0]);
        }
        receiptFileInput.value = '';
    });
}

if (closeReceiptUploadModal) {
    closeReceiptUploadModal.addEventListener('click', closeReceiptUploadModalFunc);
}

if (cancelReceiptModal) {
    cancelReceiptModal.addEventListener('click', closeReceiptUploadModalFunc);
}

if (receiptModalOverlay) {
    receiptModalOverlay.addEventListener('click', closeReceiptUploadModalFunc);
}

// Инициализируем обработчики для кнопок загрузки чека
document.addEventListener('click', function(e) {
    if (e.target.closest('.upload-receipt-btn')) {
        const btn = e.target.closest('.upload-receipt-btn');
        const appId = btn.dataset.appId;
        openReceiptUploadModal(appId);
    }
});

// ====================== РЕДАКТИРОВАНИЕ ПРОФИЛЯ ======================
const profileViewMode = document.getElementById('profile-view-mode');
const profileEditMode = document.getElementById('profile-edit-mode');
const editProfileBtn = document.getElementById('edit-profile-btn');
const cancelEditProfile = document.getElementById('cancel-edit-profile');
const profileEditForm = document.getElementById('profile-edit-form');
const profileEditError = document.getElementById('profile-edit-error');

// Инициализация календаря для даты рождения
function initProfileDatePicker() {
    const birthDateInput = document.getElementById('edit-birth-date');
    if (birthDateInput && typeof flatpickr !== 'undefined' && !birthDateInput._flatpickr) {
        let initialDate = null;
        if (birthDateInput.value && birthDateInput.value.includes('-')) {
            const parts = birthDateInput.value.split('-');
            if (parts.length === 3) {
                initialDate = `${parts[2]}.${parts[1]}.${parts[0]}`;
                birthDateInput.value = initialDate;
            }
        }

        const fp = flatpickr(birthDateInput, {
            dateFormat: "d.m.Y",
            locale: "ru",
            allowInput: true,
            maxDate: "today",
            defaultDate: initialDate,
            onChange: function(selectedDates, dateStr, instance) {
                if (dateStr) {
                    const parts = dateStr.split('.');
                    if (parts.length === 3) {
                        birthDateInput.setAttribute('data-iso-date', `${parts[2]}-${parts[1]}-${parts[0]}`);
                    }
                } else {
                    birthDateInput.removeAttribute('data-iso-date');
                }
            }
        });

        birthDateInput._flatpickr = fp;
    }
}

// Инициализация аватара в профиле
function initProfileAvatar() {
    const fileInput = document.getElementById('edit-avatar');
    const avatarPreview = document.getElementById('profile-avatar-preview');
    const deleteFlag = document.getElementById('profile-delete-avatar-flag');

    if (!fileInput || !avatarPreview) return;

    function updatePreview(imageUrl) {
        const previewImg = document.getElementById('profile-avatar-preview-img');
        const deleteIcon = avatarPreview?.querySelector('.avatar-delete-icon');

        if (!previewImg) return;

        if (imageUrl && imageUrl !== '' && !imageUrl.includes('dog_avatar_placeholder')) {
            previewImg.src = imageUrl;
            if (deleteFlag) deleteFlag.value = 'false';
            if (deleteIcon) deleteIcon.style.display = 'flex';
        } else {
            previewImg.src = '/static/images/dog_avatar_placeholder.svg';
            if (deleteFlag) deleteFlag.value = 'true';
            if (deleteIcon) deleteIcon.style.display = 'none';
        }
    }

    avatarPreview.addEventListener('click', (e) => {
        if (!e.target.closest('.avatar-edit-icon') && !e.target.closest('.avatar-delete-icon')) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function(event) {
                updatePreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    const editIcon = avatarPreview.querySelector('.avatar-edit-icon');
    if (editIcon) {
        editIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fileInput.click();
        });
    }

    const deleteIcon = avatarPreview.querySelector('.avatar-delete-icon');
    if (deleteIcon) {
        deleteIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            updatePreview(null);
            fileInput.value = '';
        });
    }
}

// Инициализация стилей радио-кнопок в профиле
function initProfileRadioStyles() {
    const groups = document.querySelectorAll('#profile-edit-mode .radio-options-row');
    groups.forEach(group => {
        const radios = group.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => {
            const label = radio.closest('.radio-option');
            if (label) {
                if (radio.checked) {
                    label.classList.add('active');
                } else {
                    label.classList.remove('active');
                }

                radio.addEventListener('change', function() {
                    group.querySelectorAll('.radio-option').forEach(opt => {
                        opt.classList.remove('active');
                    });
                    if (this.checked) {
                        this.closest('.radio-option').classList.add('active');
                    }
                });
            }
        });
    });
}

if (editProfileBtn) {
    editProfileBtn.addEventListener('click', function() {
        if (profileViewMode) profileViewMode.style.display = 'none';
        if (profileEditMode) profileEditMode.style.display = 'block';

        setTimeout(() => {
            initProfileDatePicker();
            initProfileAvatar();
            initProfileRadioStyles();
        }, 50);
    });
}

if (cancelEditProfile) {
    cancelEditProfile.addEventListener('click', function() {
        if (profileViewMode) profileViewMode.style.display = 'block';
        if (profileEditMode) profileEditMode.style.display = 'none';
        if (profileEditError) profileEditError.style.display = 'none';
    });
}

if (profileEditForm) {
    profileEditForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const formData = new FormData();
        const editFirstName = document.getElementById('edit-first-name');
        const editLastName = document.getElementById('edit-last-name');
        const editBirthDate = document.getElementById('edit-birth-date');
        const editSportClassRadios = document.querySelectorAll('#profile-edit-mode input[name="sport_class"]');
        const genderRadios = document.querySelectorAll('#profile-edit-mode input[name="gender"]');

        if (editFirstName) formData.append('first_name', editFirstName.value);
        if (editLastName) formData.append('last_name', editLastName.value);

        let birthDate = '';
        if (editBirthDate) {
            const isoDate = editBirthDate.getAttribute('data-iso-date');
            if (isoDate) {
                birthDate = isoDate;
            } else if (editBirthDate.value) {
                let dateValue = editBirthDate.value;
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

        let selectedSportClass = '';
        editSportClassRadios.forEach(radio => {
            if (radio.checked) selectedSportClass = radio.value;
        });
        if (selectedSportClass) formData.append('sport_class', selectedSportClass);

        let selectedGender = '';
        genderRadios.forEach(radio => {
            if (radio.checked) selectedGender = radio.value;
        });
        if (selectedGender) formData.append('gender', selectedGender);

        const avatarFile = document.getElementById('edit-avatar');
        if (avatarFile && avatarFile.files && avatarFile.files[0]) {
            formData.append('avatar', avatarFile.files[0]);
        }

        const deleteFlag = document.getElementById('profile-delete-avatar-flag');
        if (deleteFlag && deleteFlag.value === 'true') {
            formData.append('delete_avatar', 'true');
        }

        fetch('/users/profile/edit/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                location.reload();
            } else {
                if (profileEditError) {
                    profileEditError.textContent = data.error || 'Ошибка сохранения';
                    profileEditError.style.display = 'block';
                }
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            if (profileEditError) {
                profileEditError.textContent = 'Ошибка сети';
                profileEditError.style.display = 'block';
            }
        });
    });
}

// ====================== СМЕНА ПАРОЛЯ ======================
const changePasswordBtn = document.getElementById('change-password-btn');
if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', function() {
        window.location.href = '/users/password-change/';
    });
}

// ====================== ЗАПРОС РОЛИ ОРГАНИЗАТОРА ======================
const requestOrganizerBtn = document.getElementById('request-organizer-btn');
if (requestOrganizerBtn) {
    requestOrganizerBtn.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите запросить роль организатора? После модерации вы сможете создавать соревнования.')) {
            fetch('/users/request-organizer/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error || 'Ошибка при отправке заявки');
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('Ошибка сети');
            });
        }
    });
}

// ====================== ОТМЕНА ЗАЯВКИ ======================
document.querySelectorAll('.cancel-application-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const appId = this.dataset.appId;

        if (confirm('Вы уверены, что хотите отменить эту заявку? Отменить действие будет невозможно.')) {
            fetch(`/users/application/${appId}/cancel/`, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error || 'Ошибка при отмене заявки');
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('Ошибка сети');
            });
        }
    });
});

// ====================== ФИЛЬТРАЦИЯ ЗАЯВОК ======================
const filterChips = document.querySelectorAll('.applications-filters .chip');
const applicationsContainer = document.getElementById('applications-container');

function filterApplications(filter) {
    if (!applicationsContainer) return;

    const cards = applicationsContainer.querySelectorAll('.application-card');
    let visibleCount = 0;

    cards.forEach(card => {
        const status = card.dataset.appStatus;
        if (filter === 'all' || status === filter) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    const emptyMessage = applicationsContainer.querySelector('.empty-message-filter');
    if (emptyMessage) emptyMessage.remove();

    if (visibleCount === 0) {
        const msg = document.createElement('p');
        msg.className = 'empty-message empty-message-filter';
        msg.textContent = 'Нет заявок в этой категории';
        applicationsContainer.appendChild(msg);
    }
}

filterChips.forEach(chip => {
    chip.addEventListener('click', function() {
        filterChips.forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        filterApplications(this.dataset.filter);
    });
});

// ====================== ПОДТВЕРЖДЕНИЕ/ОТКЛОНЕНИЕ ЗАЯВКИ ВЛАДЕЛЬЦЕМ ======================
document.querySelectorAll('.approve-owner-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
        const appId = this.dataset.appId;

        if (confirm('Подтвердить участие вашей собаки в этом соревновании?')) {
            try {
                const response = await fetch(`/users/application/${appId}/approve/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({})
                });

                const data = await response.json();
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error || 'Ошибка при подтверждении');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка сети');
            }
        }
    });
});

document.querySelectorAll('.reject-owner-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
        const appId = this.dataset.appId;

        if (confirm('Вы уверены, что хотите отклонить эту заявку? Она будет удалена.')) {
            try {
                const response = await fetch(`/users/application/${appId}/reject/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({})
                });

                const data = await response.json();
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error || 'Ошибка при отклонении');
                }
            } catch (error) {
                console.error('Ошибка:', error);
                alert('Ошибка сети');
            }
        }
    });
});

// ====================== КАРУСЕЛЬ СОБАК В ЛК ======================
async function loadDogsCarousel() {
    const container = document.getElementById('dogs-carousel-grid');
    if (!container) return;

    try {
        const response = await fetch('/users/api/user-dogs/');
        const data = await response.json();

        if (data.success) {
            container.innerHTML = data.html;
            initLKDogsCarousel();
            initEditDogButtons();
        } else {
            container.innerHTML = '<p class="empty-message">Ошибка загрузки собак</p>';
        }
    } catch (err) {
        console.error('Ошибка загрузки собак:', err);
        container.innerHTML = '<p class="empty-message">Ошибка загрузки</p>';
    }
}

function initLKDogsCarousel() {
    const dogsTab = document.getElementById('dogs');
    if (!dogsTab) return;

    const carouselContainer = dogsTab.querySelector('.carousel-container');
    if (!carouselContainer) return;

    const grid = carouselContainer.querySelector('.carousel-grid');
    const prevBtn = carouselContainer.querySelector('.carousel-prev');
    const nextBtn = carouselContainer.querySelector('.carousel-next');

    if (!grid) return;

    const firstCard = grid.querySelector('.dog-card');
    const cardWidth = firstCard ? firstCard.offsetWidth : 280;
    const gap = parseInt(getComputedStyle(grid).gap) || 20;

    let scrollAmount = 0;

    function updateButtons() {
        if (!prevBtn || !nextBtn) return;
        const maxScroll = grid.scrollWidth - grid.clientWidth;
        prevBtn.disabled = scrollAmount <= 0;
        nextBtn.disabled = scrollAmount >= maxScroll - 1;
    }

    function scrollPrev() {
        let newAmount = scrollAmount - (cardWidth + gap);
        if (newAmount <= 0) newAmount = 0;
        scrollTo(newAmount);
    }

    function scrollNext() {
        const maxScroll = grid.scrollWidth - grid.clientWidth;
        let newAmount = scrollAmount + (cardWidth + gap);
        if (newAmount >= maxScroll) newAmount = maxScroll;
        scrollTo(newAmount);
    }

    function scrollTo(amount) {
        scrollAmount = amount;
        grid.scrollTo({ left: scrollAmount, behavior: 'smooth' });
        updateButtons();
    }

    if (prevBtn) prevBtn.addEventListener('click', scrollPrev);
    if (nextBtn) nextBtn.addEventListener('click', scrollNext);
    grid.addEventListener('scroll', () => {
        scrollAmount = grid.scrollLeft;
        updateButtons();
    });

    updateButtons();
}

function initDogsTab() {
    const dogsTab = document.getElementById('dogs');
    if (!dogsTab) return;

    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.target.classList.contains('active')) {
                loadDogsCarousel();
                observer.disconnect();
            }
        });
    });

    observer.observe(dogsTab, { attributes: true, attributeFilter: ['class'] });

    if (dogsTab.classList.contains('active')) {
        loadDogsCarousel();
        observer.disconnect();
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    if (window.dogModal) {
        window.dogModal.initForm();
        window.dogModal.initCloseHandlers();
    }

    initDogsTab();
    initEditDogButtons();
});

// ====================== РАСКРЫТИЕ СПИСКА ЗАЧЁТОВ ======================
document.querySelectorAll('.btn-show-entries').forEach(btn => {
    btn.addEventListener('click', function() {
        const appId = this.dataset.appId;
        const shortList = document.getElementById(`entries-list-${appId}`);
        const fullList = document.getElementById(`entries-full-${appId}`);
        if (!shortList || !fullList) return;

        const isExpanded = fullList.style.display === 'flex';

        if (isExpanded) {
            fullList.style.display = 'none';
            shortList.style.display = 'flex';
            this.textContent = `Показать все (${fullList.children.length})`;
        } else {
            shortList.style.display = 'none';
            fullList.style.display = 'flex';
            this.textContent = 'Скрыть';
        }
    });
});

// ====================== УДАЛЕНИЕ АККАУНТА ======================
const deleteAccountBtn = document.getElementById('delete-account-btn');
if (deleteAccountBtn) {
    deleteAccountBtn.addEventListener('click', function() {
        if (confirm('Вы уверены, что хотите удалить аккаунт? Это действие необратимо. Все ваши данные будут удалены.')) {
            fetch('/users/profile/delete/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({})
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = '/';
                } else {
                    alert(data.error || 'Ошибка при удалении аккаунта');
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('Ошибка сети');
            });
        }
    });
}

// Смена почты
const changeEmailBtn = document.querySelector('.change-email-btn');
if (changeEmailBtn) {
    changeEmailBtn.addEventListener('click', function() {
        const newEmail = prompt('Введите новый email:', '{{ user.email }}');
        if (newEmail && newEmail !== '{{ user.email }}') {
            fetch('/users/profile/change-email/', {
                method: 'POST',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: newEmail })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload();
                } else {
                    alert(data.error || 'Ошибка при смене email');
                }
            })
            .catch(error => {
                console.error('Ошибка:', error);
                alert('Ошибка сети');
            });
        }
    });
}

// Мобильный дропдаун статусов — открытие/закрытие
document.querySelector('.mobile-filter-dropdown .dropdown-btn')?.addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('status-dropdown');
    const isOpen = dropdown.classList.contains('show');
    document.querySelectorAll('.dropdown-content').forEach(d => d.classList.remove('show'));
    if (!isOpen) dropdown.classList.add('show');
});

document.addEventListener('click', function(e) {
    if (!e.target.closest('.mobile-filter-dropdown')) {
        document.getElementById('status-dropdown')?.classList.remove('show');
    }
});

// Мобильный дропдаун статусов — выбор опции
const statusDropdown = document.getElementById('status-dropdown');
const statusDropdownText = document.getElementById('status-dropdown-text');

statusDropdown?.querySelectorAll('.custom-select-option').forEach(option => {
    option.addEventListener('click', function(e) {
        e.stopPropagation();
        const value = this.dataset.value;
        const text = this.textContent;

        if (statusDropdownText) statusDropdownText.textContent = text;

        statusDropdown.querySelectorAll('.custom-select-option').forEach(o => o.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.desktop-filters .chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === value);
        });

        filterApplications(value);
        statusDropdown.classList.remove('show');
    });
});