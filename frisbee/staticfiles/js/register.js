// static/js/register.js

// Получаем данные из window
const competitionId = window.competitionId;
const dogsData = window.dogsData || [];
const entriesByDiscipline = window.entriesByDiscipline || {};

let applicationForms = [];
let nextFormId = 0;
let allOtherDogs = [];
let currentDogTab = 'my';

// DOM элементы
const stepSelectDog = document.getElementById('step-select-dog');
const applicationsContainer = document.getElementById('applications-container');

// Модалка выбора собаки (отдельная от модалки добавления)
const dogSelectModalOverlay = document.getElementById('dog-select-modal-overlay');
const dogSelectModal = document.getElementById('dog-select-modal');
const modalSelectContent = document.getElementById('modal-select-content');

// CSRF токен
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

// ====================== ЗАГРУЗКА КАРТОЧЕК ======================
async function fetchDogCard(dogId, showSelectButton = true) {
    console.log('=== fetchDogCard ===');
    console.log('dogId:', dogId);
    console.log('showSelectButton:', showSelectButton);
    try {
        const url = `/users/api/dog-card-html/?dog_id=${dogId}&show_select_button=${showSelectButton}`;
        console.log('url:', url);
        const response = await fetch(url);
        console.log('response status:', response.status);
        const data = await response.json();
        console.log('response data:', data);
        return data.success ? data.html : null;
    } catch (err) {
        console.error('Ошибка загрузки карточки:', err);
        return null;
    }
}

// ====================== ЗАГРУЗКА ФОРМЫ ЗАЯВКИ ======================
async function fetchApplicationForm(dogId, formId) {
    try {
        const url = `/api/application-form/?dog_id=${dogId}&form_id=${formId}&competition_id=${competitionId}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.success ? data.html : null;
    } catch (err) {
        console.error('Ошибка загрузки формы заявки:', err);
        return null;
    }
}

// ====================== ОБНОВЛЕНИЕ АКТИВНОЙ КАРУСЕЛИ ======================
async function updateActiveCarousel() {
    if (currentDogTab === 'my') {
        await refreshDogsList(dogsData);
    } else {
        await renderOtherDogs(allOtherDogs);
    }

    // Обновляем карусель
    if (window.dogsCarousel) {
        const activeGrid = currentDogTab === 'my'
            ? document.getElementById('my-dogs-carousel')
            : document.getElementById('other-dogs-carousel');
        if (activeGrid) {
            window.dogsCarousel.grid = activeGrid;
            window.dogsCarousel.scrollAmount = 0;
            if (window.dogsCarousel.updateCardWidth) {
                window.dogsCarousel.updateCardWidth();
            }
            window.dogsCarousel.updateButtons();
        }
    }
}

// ====================== МОДАЛКА ВЫБОРА СОБАКИ ======================
function openSelectModal() {
    if (dogSelectModalOverlay) dogSelectModalOverlay.style.display = 'flex';
    if (dogSelectModal) dogSelectModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
}

function closeSelectModal() {
    if (dogSelectModalOverlay) dogSelectModalOverlay.style.display = 'none';
    if (dogSelectModal) dogSelectModal.style.display = 'none';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    if (modalSelectContent) modalSelectContent.innerHTML = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && dogSelectModal && dogSelectModal.style.display === 'flex') closeSelectModal();
});
dogSelectModalOverlay?.addEventListener('click', closeSelectModal);
document.getElementById('close-dog-select-modal')?.addEventListener('click', closeSelectModal);

// ====================== ФОРМА ЗАЯВКИ ======================
function renderApplicationForm(dogId, formId) {
    let dog = dogsData.find(d => d.id == dogId);
    if (!dog && allOtherDogs.length) dog = allOtherDogs.find(d => d.id == dogId);
    if (!dog) return console.error('Собака не найдена!');

    const applicationNumber = applicationForms.length + 1;

    fetchApplicationForm(dogId, formId).then(html => {
        if (html) {
            applicationsContainer.insertAdjacentHTML('beforeend', html);

            const formElement = document.getElementById(`app-form-${formId}`);
            if (formElement) {
                const titleDiv = document.createElement('div');
                titleDiv.className = 'application-title';
                titleDiv.innerHTML = `<h3 class="header-md">Заявка №${applicationNumber}</h3>`;
                formElement.insertAdjacentElement('beforebegin', titleDiv);
            }

            applicationForms.push({ id: formId, dogId });
            updateVisibility();
            initOutOfClassLogic();
        }
    });
}

function updateVisibility() {
    const hasForms = applicationForms.length > 0;

    if (stepSelectDog) stepSelectDog.style.display = hasForms ? 'none' : 'block';

    const actionsGroup = document.querySelector('.actions-group');
    if (actionsGroup) actionsGroup.style.display = hasForms ? 'flex' : 'none';

    if (!hasForms) updateActiveCarousel();
}

// ====================== ОБНОВЛЕНИЕ СПИСКА СОБАК ======================
async function refreshDogsList(filteredDogs = null) {
    const dogsToShow = filteredDogs ?? dogsData;
    const myCarousel = document.getElementById('my-dogs-carousel');
    if (!myCarousel) return;

    if (!dogsToShow.length) {
        myCarousel.innerHTML = '<p class="empty-message">У вас пока нет собак.</p>';
        return;
    }

    let html = '';
    for (const dog of dogsToShow) {
        const card = await fetchDogCard(dog.id, true);
        if (card) html += card;
    }
    myCarousel.innerHTML = html;

    if (myCarousel._clickHandler) {
        myCarousel.removeEventListener('click', myCarousel._clickHandler);
    }

    myCarousel._clickHandler = (e) => {
        const btn = e.target.closest('.select-dog-btn');
        if (!btn) return;
        e.preventDefault();
        const dogId = parseInt(btn.dataset.dogId);
        const formId = nextFormId++;
        renderApplicationForm(dogId, formId);
    };

    myCarousel.addEventListener('click', myCarousel._clickHandler);

    if (window.dogsCarousel) {
        window.dogsCarousel.grid = myCarousel;
        window.dogsCarousel.scrollAmount = 0;
        window.dogsCarousel.updateButtons();
    }
}

// ====================== ЗАГРУЗКА ДРУГИХ СОБАК ======================
async function loadOtherDogs() {
    console.log('=== loadOtherDogs START ===');
    const container = document.getElementById('other-dogs-carousel');
    console.log('container:', container);
    if (!container) return;

    try {
        console.log('Fetching /users/dogs/...');
        const response = await fetch('/users/dogs/');
        console.log('response status:', response.status);
        const data = await response.json();
        console.log('response data:', data);
        if (data.success) {
            console.log('dogs count:', data.dogs.length);
            allOtherDogs = data.dogs;
            console.log('allOtherDogs set:', allOtherDogs);
            await renderOtherDogs(allOtherDogs);
        } else {
            console.log('data.success is false');
            container.innerHTML = '<p class="empty-message">Ошибка загрузки</p>';
        }
    } catch (err) {
        console.error('Ошибка:', err);
        container.innerHTML = '<p class="empty-message">Ошибка загрузки</p>';
    }
}

async function renderOtherDogs(dogs) {
    console.log('=== renderOtherDogs START ===');
    console.log('dogs:', dogs);
    console.log('dogs.length:', dogs.length);

    const container = document.getElementById('other-dogs-carousel');
    console.log('container:', container);
    if (!container) return;

    if (!dogs.length) {
        console.log('No dogs, showing empty message');
        container.innerHTML = '<p class="empty-message">Нет других собак</p>';
        return;
    }

    console.log('Generating HTML for', dogs.length, 'dogs...');
    let html = '';
    for (let i = 0; i < dogs.length; i++) {
        const dog = dogs[i];
        console.log(`Processing dog ${i+1}/${dogs.length}:`, dog.name, 'id:', dog.id);
        const card = await fetchDogCard(dog.id, true);
        console.log(`Card for ${dog.name}:`, card ? `HTML length ${card.length}` : 'null');
        if (card) html += card;
    }

    console.log('Final HTML length:', html.length);
    container.innerHTML = html;
    console.log('container.innerHTML set');

    if (container._clickHandler) {
        container.removeEventListener('click', container._clickHandler);
    }

    container._clickHandler = (e) => {
        const btn = e.target.closest('.select-dog-btn');
        if (!btn) return;
        e.preventDefault();
        const dogId = parseInt(btn.dataset.dogId);
        const formId = nextFormId++;
        renderApplicationForm(dogId, formId);
    };

    container.addEventListener('click', container._clickHandler);

    if (window.dogsCarousel) {
        window.dogsCarousel.grid = container;
        window.dogsCarousel.scrollAmount = 0;
        window.dogsCarousel.updateButtons();
    }
    console.log('=== renderOtherDogs END ===');
}

// ====================== КАРУСЕЛЬ И ТАБЫ ======================
function initDogTabs() {
    const myTab = document.querySelector('#step-select-dog .slider-btn[data-tab="my"]');
    const otherTab = document.querySelector('#step-select-dog .slider-btn[data-tab="other"]');
    const myCarousel = document.getElementById('my-dogs-carousel');
    const otherCarousel = document.getElementById('other-dogs-carousel');
    if (!myTab || !otherTab) return;

    myTab.addEventListener('click', async () => {
        myTab.classList.add('active');
        otherTab.classList.remove('active');
        myCarousel.style.display = 'flex';
        otherCarousel.style.display = 'none';
        currentDogTab = 'my';
        if (window.dogsCarousel) {
            window.dogsCarousel.grid = myCarousel;
            window.dogsCarousel.scrollAmount = 0;
            window.dogsCarousel.updateButtons();
        }
    });

    otherTab.addEventListener('click', async () => {
        otherTab.classList.add('active');
        myTab.classList.remove('active');
        myCarousel.style.display = 'none';
        otherCarousel.style.display = 'flex';
        currentDogTab = 'other';
        if (!allOtherDogs.length) await loadOtherDogs();
        if (window.dogsCarousel) {
            window.dogsCarousel.grid = otherCarousel;
            window.dogsCarousel.scrollAmount = 0;
            window.dogsCarousel.updateButtons();
        }
    });
}

function initDogSearch() {
    const searchInput = document.getElementById('dog-search');
    if (!searchInput) return;

    const debounce = (fn, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    searchInput.addEventListener('input', debounce(async (e) => {
        const query = e.target.value.toLowerCase();
        if (currentDogTab === 'my') {
            const filtered = dogsData.filter(dog => dog.name.toLowerCase().includes(query));
            await refreshDogsList(filtered);
        } else if (allOtherDogs.length) {
            const filtered = allOtherDogs.filter(dog => dog.name.toLowerCase().includes(query));
            await renderOtherDogs(filtered);
        }
    }, 300));
}

// ====================== МОДАЛКА ВЫБОРА СОБАКИ (ОСНОВНАЯ) ======================
async function showDogSelectionModal(callback, excludeDogIds = [], title = 'Выберите собаку') {
    const modalTitle = document.querySelector('#dog-select-modal .modal-header h2');
    if (modalTitle) modalTitle.textContent = title;

    const modalResponse = await fetch('/users/api/dog-modal/');
    const modalData = await modalResponse.json();

    if (!modalData.success) {
        console.error('Ошибка загрузки модалки');
        return;
    }

    modalSelectContent.innerHTML = modalData.html;

    const myDogs = dogsData.filter(dog => !excludeDogIds.includes(dog.id));
    const response = await fetch('/users/dogs/');
    const data = await response.json();
    const otherDogs = data.success ? data.dogs.filter(dog => !excludeDogIds.includes(dog.id)) : [];
    allOtherDogs = otherDogs;

    openSelectModal();

    const renderList = async (dogs, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!dogs.length) {
            container.innerHTML = '<p class="empty-message">Нет доступных собак</p>';
            return;
        }

        let html = '';
        for (const dog of dogs) {
            const card = await fetchDogCard(dog.id, true);
            if (card) html += card;
        }
        container.innerHTML = html;

        container.querySelectorAll('.select-dog-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const dogId = parseInt(btn.dataset.dogId);
                const dog = [...dogsData, ...allOtherDogs].find(d => d.id === dogId);
                if (dog && callback) await callback(dog);
                closeSelectModal();
            });
        });
    };

    await renderList(myDogs, 'modal-my-dogs-list');
    await renderList(otherDogs, 'modal-other-dogs-list');

    // Инициализация карусели
    const modalContainer = modalSelectContent.querySelector('.carousel-container');
    if (modalContainer) {
        const grid = modalContainer.querySelector('.carousel-grid');
        const prevBtn = modalContainer.querySelector('.carousel-prev');
        const nextBtn = modalContainer.querySelector('.carousel-next');

        if (grid && prevBtn && nextBtn) {
            prevBtn.disabled = false;
            nextBtn.disabled = false;

            const firstCard = grid.querySelector('.dog-card');
            const cardWidth = firstCard ? firstCard.offsetWidth : 280;
            const gap = parseInt(getComputedStyle(grid).gap) || 20;

            window.modalCarousel = {
                grid: grid,
                prevBtn: prevBtn,
                nextBtn: nextBtn,
                scrollAmount: 0,
                cardWidth: cardWidth + gap,

                init: function() {
                    this.updateButtons();
                    this.prevBtn.addEventListener('click', () => this.scrollPrev());
                    this.nextBtn.addEventListener('click', () => this.scrollNext());
                    this.grid.addEventListener('scroll', () => {
                        this.scrollAmount = this.grid.scrollLeft;
                        this.updateButtons();
                    });
                },

                scrollPrev: function() {
                    let newAmount = this.scrollAmount - this.cardWidth;
                    if (newAmount <= 0) newAmount = 0;
                    this.scrollTo(newAmount);
                },

                scrollNext: function() {
                    const maxScroll = this.grid.scrollWidth - this.grid.clientWidth;
                    let newAmount = this.scrollAmount + this.cardWidth;
                    if (newAmount >= maxScroll) newAmount = maxScroll;
                    this.scrollTo(newAmount);
                },

                scrollTo: function(amount) {
                    this.scrollAmount = amount;
                    this.grid.scrollTo({ left: this.scrollAmount, behavior: 'smooth' });
                    this.updateButtons();
                },

                updateButtons: function() {
                    if (!this.prevBtn || !this.nextBtn) return;
                    const maxScroll = this.grid.scrollWidth - this.grid.clientWidth;
                    this.prevBtn.disabled = this.scrollAmount <= 0;
                    this.nextBtn.disabled = this.scrollAmount >= maxScroll - 1;
                }
            };
            window.modalCarousel.init();
        }
        // Точки для карусели в модалке
        const dotsContainer = modalContainer.querySelector('.carousel-dots');
        if (dotsContainer && grid.children.length > 1) {
            dotsContainer.innerHTML = '';
            for (let i = 0; i < grid.children.length; i++) {
                const dot = document.createElement('button');
                dot.className = 'carousel-dot';
                if (i === 0) dot.classList.add('active');
                dot.addEventListener('click', (() => {
                    const idx = i;
                    return () => {
                        const targetScroll = idx * window.modalCarousel.cardWidth;
                        const maxScroll = grid.scrollWidth - grid.clientWidth;
                        window.modalCarousel.scrollTo(Math.min(targetScroll, maxScroll));
                    };
                })());
                dotsContainer.appendChild(dot);
            }

            // Обновление активной точки при скролле
            grid.addEventListener('scroll', () => {
                const maxScroll = grid.scrollWidth - grid.clientWidth;
                const progress = maxScroll > 0 ? grid.scrollLeft / maxScroll : 0;
                const activeIndex = Math.round(progress * (grid.children.length - 1));
                dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
                    dot.classList.toggle('active', i === activeIndex);
                });
            });
        }
    }



    // Переключение вкладок в модалке
    const tabMy = modalSelectContent.querySelector('[data-tab="my"]');
    const tabOther = modalSelectContent.querySelector('[data-tab="other"]');
    const myList = document.getElementById('modal-my-dogs-list');
    const otherList = document.getElementById('modal-other-dogs-list');

    if (tabMy && tabOther) {
        tabMy.addEventListener('click', () => {
            tabMy.classList.add('active');
            tabOther.classList.remove('active');
            myList.style.display = 'flex';
            otherList.style.display = 'none';
            if (window.modalCarousel) {
                window.modalCarousel.grid = myList;
                window.modalCarousel.scrollAmount = 0;
                window.modalCarousel.updateButtons();
            }
        });

        tabOther.addEventListener('click', () => {
            tabOther.classList.add('active');
            tabMy.classList.remove('active');
            otherList.style.display = 'flex';
            myList.style.display = 'none';
            if (window.modalCarousel) {
                window.modalCarousel.grid = otherList;
                window.modalCarousel.scrollAmount = 0;
                window.modalCarousel.updateButtons();
            }
        });
    }

    // Поиск в модалке
    const modalSearch = document.getElementById('modal-dog-search');
    const debounce = (fn, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    if (modalSearch) {
        modalSearch.addEventListener('input', debounce(async (e) => {
            const query = e.target.value.toLowerCase();
            const activeTab = modalSelectContent.querySelector('.slider-btn.active')?.dataset.tab || 'my';

            if (activeTab === 'my') {
                const filtered = myDogs.filter(dog => dog.name.toLowerCase().includes(query));
                await renderList(filtered, 'modal-my-dogs-list');
            } else {
                const filtered = otherDogs.filter(dog => dog.name.toLowerCase().includes(query));
                await renderList(filtered, 'modal-other-dogs-list');
            }

            if (window.modalCarousel) {
                const currentGrid = modalSelectContent.querySelector(`#${activeTab === 'my' ? 'modal-my-dogs-list' : 'modal-other-dogs-list'}`);
                if (currentGrid) {
                    window.modalCarousel.grid = currentGrid;
                    window.modalCarousel.scrollAmount = 0;
                    window.modalCarousel.updateButtons();
                }
            }
        }, 300));
    }

    // Кнопка добавления собаки - используем общую модалку
    const addDogBtn = document.getElementById('show-add-dog-form-btn');
    if (addDogBtn) {
        const newAddDogBtn = addDogBtn.cloneNode(true);
        addDogBtn.parentNode.replaceChild(newAddDogBtn, addDogBtn);

        newAddDogBtn.addEventListener('click', () => {
            closeSelectModal();
            window.dogModal.openAdd(async (newDog) => {
                dogsData.push(newDog);
                await updateActiveCarousel();
                if (callback) await callback(newDog);
            });
        });
    }
}

// ====================== ИНИЦИАЛИЗАЦИЯ ======================
document.getElementById('show-add-dog-from-select')?.addEventListener('click', () => {
    window.dogModal.openAdd(async (newDog) => {
        dogsData.push(newDog);
        await updateActiveCarousel();
    });
});

document.getElementById('add-another-dog-btn')?.addEventListener('click', () => {
    showDogSelectionModal(async (selectedDog) => {
        const formId = nextFormId++;
        renderApplicationForm(selectedDog.id, formId);
    }, applicationForms.map(f => f.dogId));
});

// ====================== ОТПРАВКА ЗАЯВОК ======================
document.getElementById('submit-all-applications')?.addEventListener('click', async () => {
    const formsData = [];

    for (const form of applicationForms) {
        const el = document.getElementById(`app-form-${form.id}`);
        if (!el) continue;

        const selectedEntries = [];

        // Находим все основные чекбоксы "Участвовать в зачёте"
        el.querySelectorAll('.entry-checkbox:checked').forEach(cb => {
            const entryId = parseInt(cb.value);
            const canOutOfClass = cb.dataset.canOutOfClass === 'true';

            let isOutOfClass = false;

            // Если разрешено "вне зачёта" — проверяем второй чекбокс
            if (canOutOfClass) {
                const outCheckbox = el.querySelector(`.entry-checkbox-out[value="${entryId}"]`);
                if (outCheckbox && outCheckbox.checked) {
                    isOutOfClass = true;
                }
            }

            selectedEntries.push({
                entry_id: entryId,
                is_out_of_class: isOutOfClass
            });
        });

        if (selectedEntries.length === 0) {
            alert(`Для собаки ${dogsData.find(d => d.id === form.dogId)?.name || 'неизвестной'} не выбраны зачёты`);
            return;
        }

        formsData.push({
            dog_id: form.dogId,
            entries: selectedEntries,
            comment: el.querySelector('.comment-input')?.value || ''
        });
    }

    if (!formsData.length) return;

    try {
        const response = await fetch(`/competitions/${competitionId}/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify({ applications: formsData })
        });
        window.scrollTo({ top: 0, behavior: 'instant' });
        const html = await response.text();
        document.open();
        document.write(html);
        document.close();
    } catch (err) {
        alert('Ошибка сети при отправке заявок');
    }
});

// Делегирование событий для кнопок в формах
applicationsContainer?.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-dog-btn')) {
        const formId = parseInt(e.target.dataset.formId);
        const formElement = document.getElementById(`app-form-${formId}`);
        if (formElement) {
            const titleDiv = formElement.previousElementSibling;
            if (titleDiv && titleDiv.classList.contains('application-title')) {
                titleDiv.remove();
            }
            formElement.remove();
        }
        applicationForms = applicationForms.filter(f => f.id !== formId);
        updateVisibility();
    }
    if (e.target.classList.contains('change-dog-btn')) {
        const formId = parseInt(e.target.dataset.formId);
        const form = applicationForms.find(f => f.id === formId);
        if (!form) return;

        const excludeIds = applicationForms.filter(f => f.id !== formId).map(f => f.dogId);
        if (form.dogId) excludeIds.push(form.dogId);

        showDogSelectionModal(async (selectedDog) => {
            form.dogId = selectedDog.id;
            const oldForm = document.getElementById(`app-form-${formId}`);
            if (oldForm) {
                const newFormHtml = await fetchApplicationForm(selectedDog.id, formId);
                if (newFormHtml) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = newFormHtml;
                    oldForm.replaceWith(tempDiv.firstElementChild);
                }
            }
        }, excludeIds, 'Поменять собаку');
    }
});

// Инициализация обработчиков для изначально загруженных карточек
function initInitialDogCards() {
    const myCarousel = document.getElementById('my-dogs-carousel');
    if (!myCarousel) return;
    if (myCarousel._clickHandler) myCarousel.removeEventListener('click', myCarousel._clickHandler);
    myCarousel._clickHandler = (e) => {
        const btn = e.target.closest('.select-dog-btn');
        if (!btn) return;
        e.preventDefault();
        const formId = nextFormId++;
        renderApplicationForm(parseInt(btn.dataset.dogId), formId);
    };
    myCarousel.addEventListener('click', myCarousel._clickHandler);
}

function initInitialOtherDogCards() {
    const otherCarousel = document.getElementById('other-dogs-carousel');
    if (!otherCarousel) return;
    if (otherCarousel._clickHandler) otherCarousel.removeEventListener('click', otherCarousel._clickHandler);
    otherCarousel._clickHandler = (e) => {
        const btn = e.target.closest('.select-dog-btn');
        if (!btn) return;
        e.preventDefault();
        const formId = nextFormId++;
        renderApplicationForm(parseInt(btn.dataset.dogId), formId);
    };
    otherCarousel.addEventListener('click', otherCarousel._clickHandler);
}

function initDogSelection() {
    initInitialDogCards();
    initInitialOtherDogCards();
    initDogTabs();
    initDogSearch();
}

// Инициализация общей модалки собаки
if (window.dogModal) {
    window.dogModal.initForm();
    window.dogModal.initCloseHandlers();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDogSelection);
} else {
    initDogSelection();
}

// ====================== ЛОГИКА ЧЕКБОКСОВ "ВНЕ ЗАЧЁТА" ======================
function initOutOfClassLogic() {
    const container = document.getElementById('applications-container');
    if (!container) return;

    // Удаляем старый обработчик, если есть
    if (container._outOfClassHandler) {
        container.removeEventListener('change', container._outOfClassHandler);
    }

    container._outOfClassHandler = function(e) {
        const target = e.target;

        // Находим родительскую форму заявки
        const form = target.closest('.application-form');
        if (!form) return;

        // Обработка основного чекбокса "Участвовать"
        if (target.classList.contains('entry-checkbox')) {
            const entryId = target.value;
            // Ищем чекбокс "Вне зачёта" ТОЛЬКО в пределах этой формы
            const outCheckbox = form.querySelector(`.entry-checkbox-out[value="${entryId}"]`);

            if (outCheckbox) {
                // Если сняли основной чекбокс — снимаем и "Вне зачёта"
                if (!target.checked) {
                    outCheckbox.checked = false;
                }
            }
        }

        // Обработка чекбокса "Вне зачёта"
        if (target.classList.contains('entry-checkbox-out')) {
            const entryId = target.value;
            // Ищем основной чекбокс ТОЛЬКО в пределах этой формы
            const mainCheckbox = form.querySelector(`.entry-checkbox[value="${entryId}"]`);

            // Если поставили "Вне зачёта" — автоматически ставим основной чекбокс
            if (target.checked && mainCheckbox && !mainCheckbox.checked) {
                mainCheckbox.checked = true;
            }
        }
    };

    container.addEventListener('change', container._outOfClassHandler);
}

// Вызываем после загрузки страницы
document.addEventListener('DOMContentLoaded', function() {
    initOutOfClassLogic();
});

// Переключение классов по табам на мобилке
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('mobile-class-tab')) {
        const discipline = e.target.dataset.discipline;
        const className = e.target.dataset.class;

        // Обновляем активный таб
        const group = e.target.closest('.entries-cards-group');
        group.querySelectorAll('.mobile-class-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');

        // Показываем нужную карточку, скрываем остальные
        group.querySelectorAll('.entry-card-info').forEach(card => {
            if (card.dataset.class === className) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }
});