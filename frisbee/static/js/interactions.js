// static/js/interactions.js

// ===== Универсальная карусель =====
class Carousel {
    constructor(container, options = {}) {
        this.container = container;
        this.grid = container.querySelector('.carousel-grid');
        this.prevBtn = container.querySelector('.carousel-prev');
        this.nextBtn = container.querySelector('.carousel-next');
        this.dotsContainer = container.querySelector('.carousel-dots');

        this.options = {
            cardWidth: null,
            cardSelector: ':first-child',
            gap: null,
            ...options
        };

        if (!this.grid) return;

        let cardWidth = this.options.cardWidth;
        if (!cardWidth) {
            const firstCard = this.grid.querySelector(this.options.cardSelector);
            cardWidth = firstCard ? firstCard.offsetWidth : 320;
        }

        let gap = this.options.gap;
        if (gap === null) {
            gap = parseInt(getComputedStyle(this.grid).gap) || 20;
        }

        this.cardWidth = cardWidth + gap;
        this.scrollAmount = 0;
        this.totalCards = this.grid.children.length;

        this.init();
    }

    init() {
        this.updateButtons();
        setTimeout(() => this.updateButtons(), 100);

        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.scrollPrev());
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.scrollNext());
        }

        this.grid.addEventListener('scroll', () => {
            this.scrollAmount = this.grid.scrollLeft;
            this.updateButtons();
            this.updateDots();
        });

        this.initDots();
    }

    scrollPrev() {
        let newAmount = this.scrollAmount - this.cardWidth;
        if (newAmount <= 0) newAmount = 0;
        this.scrollTo(newAmount);
    }

    scrollNext() {
        const maxScroll = this.grid.scrollWidth - this.grid.clientWidth;
        let newAmount = this.scrollAmount + this.cardWidth;
        if (newAmount >= maxScroll) newAmount = maxScroll;
        this.scrollTo(newAmount);
    }

    scrollTo(amount) {
        this.scrollAmount = amount;
        this.grid.scrollTo({
            left: this.scrollAmount,
            behavior: 'smooth'
        });
        this.updateButtons();
        this.updateDots();
    }

    updateButtons() {
        if (this.prevBtn) {
            this.prevBtn.disabled = this.scrollAmount <= 0;
        }
        if (this.nextBtn) {
            const maxScroll = this.grid.scrollWidth - this.grid.clientWidth;
            this.nextBtn.disabled = this.scrollAmount >= maxScroll - 1;
        }
    }

    // Точки
    initDots() {
        if (!this.dotsContainer || this.totalCards <= 1) return;

        this.dotsContainer.innerHTML = '';
        for (let i = 0; i < this.totalCards; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot';
            dot.addEventListener('click', () => this.scrollToCard(i));
            this.dotsContainer.appendChild(dot);
        }
        this.updateDots();
    }

    updateDots() {
        if (!this.dotsContainer) return;

        const maxScroll = this.grid.scrollWidth - this.grid.clientWidth;
        const progress = maxScroll > 0 ? this.scrollAmount / maxScroll : 0;
        const activeIndex = Math.round(progress * (this.totalCards - 1));

        const dots = this.dotsContainer.querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === activeIndex);
        });
    }

    scrollToCard(index) {
        const targetScroll = index * this.cardWidth;
        const maxScroll = this.grid.scrollWidth - this.grid.clientWidth;
        this.scrollTo(Math.min(targetScroll, maxScroll));
    }

    updateCardWidth() {
        const firstCard = this.grid.querySelector(this.options.cardSelector || ':first-child');
        if (firstCard) {
            const gap = this.options.gap || parseInt(getComputedStyle(this.grid).gap) || 20;
            this.cardWidth = firstCard.offsetWidth + gap;
        }
    }
}

// Инициализация всех каруселей
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== ИНИЦИАЛИЗАЦИЯ КАРУСЕЛЕЙ ===');

    // Все карусели на странице
    const allCarousels = document.querySelectorAll('.carousel-container');
    console.log('Найдено каруселей:', allCarousels.length);

    allCarousels.forEach((container, index) => {
        console.log(`Карусель ${index}:`, container);
        console.log('  Внутри #step-select-dog?', !!container.closest('#step-select-dog'));

        // Для карусели собак — свои настройки
        if (container.closest('#step-select-dog')) {
            console.log('  → Создаём карусель собак');
            window.dogsCarousel = new Carousel(container, {
                cardSelector: '.dog-card',
                cardWidth: 280
            });
        } else {
            console.log('  → Создаём обычную карусель');
            new Carousel(container);
        }
    });
});

// ===== Features (переключатель) =====
document.addEventListener('DOMContentLoaded', function() {
    const organizerBtn = document.querySelector('.slider-btn:first-child');
    const participantBtn = document.querySelector('.slider-btn:last-child');
    const featuresList = document.querySelector('.features-list');
    const contentBlock = document.querySelector('.features .content');
    const bottomBtn = document.querySelector('.features .btn');

    if (!organizerBtn || !participantBtn || !featuresList) return;

    // Контент для организаторов
    const organizerContent = `
        <div class="feature">
            <img class="feature-image" src="/static/images/table_salad.svg" alt="Иллюстрация">
            <div>
                <p class="header-sm">Создайте соревнование</p>
                <p>Создавайте афиши соревнований по трём популярным дисциплинам в трёх классах</p>
            </div>
        </div>
        <div class="feature">
            <img class="feature-image" src="/static/images/table_salad.svg" alt="Иллюстрация">
            <div>
                <p class="header-sm">Заявки соберутся сами</p>
                <p>Контролируйте полученные заявки и отмечайте их оплату</p>
            </div>
        </div>
        <div class="feature">
            <img class="feature-image" src="/static/images/table_salad.svg" alt="Иллюстрация">
            <div>
                <p class="header-sm">Опубликуйте результаты</p>
                <p>Система сама рассчитает места по зачётам и сразу даст участникам доступ к баллам</p>
            </div>
        </div>
    `;

    // Контент для участников
    const participantContent = `
        <div class="feature">
            <img class="feature-image" src="/static/images/table_purple.svg" alt="Иллюстрация">
            <div>
                <p class="header-sm">Найдите соревнование</p>
                <p>Ищите афиши по всей России и выбирайте подходящие дисциплины</p>
            </div>
        </div>
        <div class="feature">
            <img class="feature-image" src="/static/images/table_purple.svg" alt="Иллюстрация">
            <div>
                <p class="header-sm">Подайте заявку</p>
                <p>Добавляйте своих собак и отправляйте заявки на соревнования</p>
            </div>
        </div>
        <div class="feature">
            <img class="feature-image" src="/static/images/table_purple.svg" alt="Иллюстрация">
            <div>
                <p class="header-sm">Смотрите результаты</p>
                <p>Смотрите свои баллы прямо во время соревнования, а мы соберём все достижения в вашем личном кабинете</p>
            </div>
        </div>
    `;

    function updateButtonsState(activeBtn) {
        if (activeBtn === organizerBtn) {
            organizerBtn.classList.add('active-organizer');
            organizerBtn.classList.remove('active-participant');
            participantBtn.classList.remove('active-organizer', 'active-participant');
        } else {
            participantBtn.classList.add('active-participant');
            participantBtn.classList.remove('active-organizer');
            organizerBtn.classList.remove('active-organizer', 'active-participant');
        }
    }

    // Переключение на организатора
    organizerBtn.addEventListener('click', () => {
        featuresList.style.opacity = '0';
        setTimeout(() => {
            featuresList.innerHTML = organizerContent;
            updateButtonsState(organizerBtn);
            contentBlock.style.backgroundColor = 'var(--color-purple-main)';
            bottomBtn.textContent = 'Как стать организатором?';
            bottomBtn.href = '/organizer/request/';
            bottomBtn.classList.remove('btn-primary');
            bottomBtn.classList.add('btn-salad');
            featuresList.style.opacity = '1';
        }, 150);
    });

    // Переключение на участника
    participantBtn.addEventListener('click', () => {
        featuresList.style.opacity = '0';
        setTimeout(() => {
            featuresList.innerHTML = participantContent;
            updateButtonsState(participantBtn);
            contentBlock.style.backgroundColor = 'var(--color-salad-main)';
            bottomBtn.textContent = 'Выбрать соревнование';
            bottomBtn.href = "{% url 'competitions:competition_list' %}";
            bottomBtn.classList.remove('btn-salad');
            bottomBtn.classList.add('btn-primary');
            featuresList.style.opacity = '1';
        }, 150);
    });

    // Загружаем контент для организаторов по умолчанию
    featuresList.innerHTML = organizerContent;
    updateButtonsState(organizerBtn);
    contentBlock.style.backgroundColor = 'var(--color-purple-main)';
    bottomBtn.textContent = 'Как стать организатором?';
    bottomBtn.href = '/organizer/request/';
    bottomBtn.classList.add('btn-salad');
    bottomBtn.classList.remove('btn-primary');
});

// ===== FAQ =====
document.addEventListener('DOMContentLoaded', function() {
    const questions = document.querySelectorAll('.question');

    questions.forEach(question => {
        question.addEventListener('click', function() {
            const answer = this.nextElementSibling;
            const isActive = this.classList.contains('active');

            questions.forEach(q => {
                if (q !== question && q.classList.contains('active')) {
                    q.classList.remove('active');
                    q.nextElementSibling.classList.remove('open');
                }
            });

            this.classList.toggle('active');
            answer.classList.toggle('open');
        });
    });
});

// ====================== FLOATING LABEL ДЛЯ SELECT ======================
function initFloatingLabels() {
    document.querySelectorAll('.floating-label-group select.input').forEach(select => {
        // Убираем старый обработчик, если есть
        if (select._floatHandler) {
            select.removeEventListener('change', select._floatHandler);
        }

        const label = select.nextElementSibling;
        if (select.value && label) {
            label.classList.add('float-up');
        }

        const handler = () => {
            const currentLabel = select.nextElementSibling;
            if (select.value && currentLabel) {
                currentLabel.classList.add('float-up');
            } else if (currentLabel) {
                currentLabel.classList.remove('float-up');
            }
        };

        select._floatHandler = handler;
        select.addEventListener('change', handler);
    });
}

// Вызываем при загрузке
document.addEventListener('DOMContentLoaded', initFloatingLabels);

// Для динамических элементов (например, в модалке) используем MutationObserver
const observer = new MutationObserver(() => {
    initFloatingLabels();
});
observer.observe(document.body, { childList: true, subtree: true });

// Инициализация кастомных селектов
function initCustomSelects(container = document) {
    const wrappers = container.querySelectorAll('.custom-select-wrapper:not(.initialized)');

    wrappers.forEach(wrapper => {
        wrapper.classList.add('initialized');

        const field = wrapper.querySelector('.custom-select-field');
        const trigger = wrapper.querySelector('.custom-select-trigger');
        const valueSpan = wrapper.querySelector('.custom-select-value');
        const dropdown = wrapper.querySelector('.custom-select-dropdown');
        const options = wrapper.querySelectorAll('.custom-select-option');
        const hiddenInput = wrapper.querySelector('.custom-select-input');

        // Установка плейсхолдера
        valueSpan.classList.add('placeholder');
        valueSpan.textContent = ' ';

        // Если есть сохранённое значение (для редактирования)
        if (hiddenInput && hiddenInput.value) {
            const selectedOption = wrapper.querySelector(`.custom-select-option[data-value="${hiddenInput.value}"]`);
            if (selectedOption) {
                valueSpan.textContent = selectedOption.textContent;
                valueSpan.classList.remove('placeholder');
                field.classList.add('has-value');
                selectedOption.classList.add('selected');
            }
        }

        // Открытие/закрытие
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('show');

            // Закрываем все остальные
            document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
            document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.custom-select-field').forEach(f => f.classList.remove('active'));

            if (!isOpen) {
                dropdown.classList.add('show');
                trigger.classList.add('active');
                field.classList.add('active');
            }
        });

        // Выбор опции
        options.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                const text = option.textContent;

                valueSpan.textContent = text;
                valueSpan.classList.remove('placeholder');
                field.classList.add('has-value');
                if (hiddenInput) hiddenInput.value = value;

                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                dropdown.classList.remove('show');
                trigger.classList.remove('active');
                field.classList.remove('active');
            });
        });
    });
}

// Глобальный обработчик закрытия (добавляем один раз)
if (!window.customSelectsGlobalListener) {
    window.customSelectsGlobalListener = true;
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-dropdown').forEach(d => d.classList.remove('show'));
        document.querySelectorAll('.custom-select-trigger').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.custom-select-field').forEach(f => f.classList.remove('active'));
    });
}

// Автоматическая инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initCustomSelects());
} else {
    initCustomSelects();
}

// Мобильное меню
const menuBtn = document.getElementById('mobile-menu-btn');
const menuOverlay = document.getElementById('mobile-menu-overlay');
const menuBackdrop = document.getElementById('mobile-menu-backdrop');

if (menuBtn && menuOverlay && menuBackdrop) {
    menuBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = menuOverlay.classList.contains('show');
        if (isOpen) {
            closeMobileMenu();
        } else {
            openMobileMenu();
        }
    });

    menuBackdrop.addEventListener('click', closeMobileMenu);

    // Закрытие по свайпу вниз
    let touchStartY = 0;
    menuOverlay.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    });
    menuOverlay.addEventListener('touchmove', function(e) {
        const touchY = e.touches[0].clientY;
        if (touchY - touchStartY > 50) {
            closeMobileMenu();
        }
    });
}

function openMobileMenu() {
    menuOverlay.classList.add('show');
    menuBackdrop.classList.add('show');
    menuBtn.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileMenu() {
    menuOverlay.classList.remove('show');
    menuBackdrop.classList.remove('show');
    menuBtn.classList.remove('active');
    document.body.style.overflow = '';
}