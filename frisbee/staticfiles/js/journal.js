// static/js/journal.js

let currentTag = '';
let currentSearch = '';
let currentPage = 1;
let isLoading = false;

function loadArticles() {
    if (isLoading) return;
    isLoading = true;

    const loader = document.getElementById('loader');
    if (loader) loader.style.display = 'block';

    const emptyBlock = document.getElementById('articles-empty');
    if (emptyBlock) emptyBlock.style.display = 'none';  // скрываем при загрузке

    fetch(`/journal/api/articles/?page=${currentPage}&tag=${currentTag}&q=${encodeURIComponent(currentSearch)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const container = document.getElementById('articles-container');

                if (currentPage === 1) {
                    container.innerHTML = data.html;
                } else {
                    container.insertAdjacentHTML('beforeend', data.html);
                }

                // Проверяем, есть ли статьи
                const hasArticles = container.children.length > 0;
                if (emptyBlock) {
                    emptyBlock.style.display = hasArticles ? 'none' : 'flex';
                }

                if (!data.has_next) {
                    window.removeEventListener('scroll', handleScroll);
                } else {
                    window.addEventListener('scroll', handleScroll);
                }
            }
        })
        .catch(error => console.error('Ошибка загрузки:', error))
        .finally(() => {
            isLoading = false;
            if (loader) loader.style.display = 'none';
        });
}

function handleScroll() {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        currentPage++;
        loadArticles();
    }
}

function resetAndSearch() {
    currentPage = 1;
    document.getElementById('articles-container').innerHTML = '';
    loadArticles();
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

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            currentSearch = e.target.value;
            resetAndSearch();
        }, 300));
    }

    const tagChips = document.querySelectorAll('#tag-chips .chip');
    tagChips.forEach(chip => {
        chip.addEventListener('click', function() {
            tagChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            currentTag = this.dataset.tag;
            resetAndSearch();
        });
    });

    window.addEventListener('scroll', handleScroll);
    loadArticles();
});