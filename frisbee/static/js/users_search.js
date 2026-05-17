// static/js/users_search.js

let currentFilters = {
    search: '',
    type: 'all' // all, athletes, organizers, dogs
};

let allUsers = [];
let allDogs = [];

// Инициализация
document.addEventListener('DOMContentLoaded', async function() {
    await loadData();
    initEventListeners();
    applyFilters();
});

// Загрузка данных
async function loadData() {
    try {
        const [usersRes, dogsRes] = await Promise.all([
            fetch('/users/api/users/'),
            fetch('/users/api/dogs/')
        ]);

        const usersData = await usersRes.json();
        const dogsData = await dogsRes.json();

        if (usersData.success) {
            allUsers = usersData.users;
        }
        if (dogsData.success) {
            allDogs = dogsData.dogs;
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}

// Инициализация обработчиков
function initEventListeners() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            currentFilters.search = e.target.value;
            applyFilters();
        }, 300));
    }

    document.querySelectorAll('.chip[data-filter="type"]').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.chip[data-filter="type"]').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentFilters.type = this.dataset.value;
            applyFilters();
        });
    });
}

// Применение фильтров
function applyFilters() {
    let results = [];

    if (currentFilters.type === 'dogs') {
        results = allDogs.filter(dog => {
            if (currentFilters.search) {
                const searchLower = currentFilters.search.toLowerCase();
                return dog.name.toLowerCase().includes(searchLower);
            }
            return true;
        }).map(dog => ({ type: 'dog', data: dog }));
    } else {
        let filteredUsers = allUsers;

        if (currentFilters.type === 'athletes') {
            filteredUsers = allUsers.filter(user => user.is_athlete);
        } else if (currentFilters.type === 'organizers') {
            filteredUsers = allUsers.filter(user => user.is_organizer);
        }

        if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            filteredUsers = filteredUsers.filter(user =>
                (user.first_name + ' ' + user.last_name).toLowerCase().includes(searchLower)
            );
        }

        results = filteredUsers.map(user => ({ type: 'user', data: user }));
    }

    renderResults(results);
}

// Рендер результатов через шаблоны
async function renderResults(results) {
    const container = document.getElementById('results-container');
    const emptyBlock = document.getElementById('results-empty');
    if (!container) return;

    if (results.length === 0) {
        container.style.display = 'none';
        if (emptyBlock) emptyBlock.style.display = 'flex';
        return;
    }

    container.style.display = 'flex';
    if (emptyBlock) emptyBlock.style.display = 'none';

    container.innerHTML = '<div class="loader">Загрузка...</div>';

    const promises = results.map(async (item) => {
        if (item.type === 'user') {
            let ageText = item.data.age_display;
            if (!ageText && item.data.age) {
                ageText = `${item.data.age} ${getAgeDeclension(item.data.age)}`;
            } else if (!ageText) {
                ageText = 'Возраст не указан';
            }

            const role = item.data.is_organizer ? 'Организатор' : 'Спортсмен';
            const sportClass = item.data.sport_class || 'Не указан';

            const response = await fetch('/users/api/user-card-html/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    user: item.data,
                    age_text: ageText,
                    role: role,
                    sport_class: sportClass
                })
            });
            const data = await response.json();
            return data.success ? data.html : '';
        } else {
            const genderText = item.data.gender === 'male' ? 'Кобель' : (item.data.gender === 'female' ? 'Сука' : 'Пол не указан');
            let ageText = item.data.age_display;
            if (!ageText && item.data.age) {
                ageText = `${item.data.age} ${getAgeDeclension(item.data.age)}`;
            } else if (!ageText) {
                ageText = 'Возраст не указан';
            }
            const heightText = item.data.height ? `${item.data.height} см` : 'рост неизвестен';
            const breed = item.data.breed || 'Порода не указана';
            const sportClass = item.data.sport_class || 'Не указан';
            const dogClass = item.data.dog_class || 'Не указан';

            const response = await fetch('/users/api/dog-card-html-for-list/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({
                    dog: item.data,
                    gender_text: genderText,
                    age_text: ageText,
                    height_text: heightText,
                    breed: breed,
                    dog_class: dogClass
                })
            });
            const data = await response.json();
            return data.success ? data.html : '';
        }
    });

    const cards = await Promise.all(promises);
    container.innerHTML = cards.join('');
}

// Получение CSRF токена
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

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getAgeDeclension(age) {
    if (age >= 11 && age <= 19) return 'лет';
    const lastDigit = age % 10;
    if (lastDigit === 1) return 'год';
    if (lastDigit >= 2 && lastDigit <= 4) return 'года';
    return 'лет';
}