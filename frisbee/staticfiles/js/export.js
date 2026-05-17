// static/js/export.js

class ExportManager {
    constructor() {
        this.modal = null;
        this.modalOverlay = null;
        this.currentCompetitionId = null;
        this.init();
    }

    init() {
        // Создаём глобальный оверлей для модального окна
        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'export-modal-overlay';
        this.modalOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: none;
            align-items: center;
            justify-content: center;
        `;
        document.body.appendChild(this.modalOverlay);

        // Закрытие по клику на оверлей
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.close();
            }
        });

        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.style.display === 'flex') {
                this.close();
            }
        });
    }

    async show(competitionId) {
        this.currentCompetitionId = competitionId;

        // Загружаем HTML модального окна
        try {
            const response = await fetch('/static/templates/export_modal.html');
            const modalHtml = await response.text();

            this.modalOverlay.innerHTML = modalHtml;
            this.modal = this.modalOverlay.querySelector('.export-modal-container');
            this.modalOverlay.style.display = 'flex';

            // Загружаем зачёты для этого соревнования
            await this.loadEntries(competitionId);

            // Навешиваем обработчики
            this.bindEvents();

        } catch (err) {
            console.error('Ошибка загрузки модального окна:', err);
            alert('Не удалось загрузить окно экспорта');
            this.close();
        }
    }

    async loadEntries(competitionId) {
        const entriesList = document.getElementById('export-entries-list');
        if (!entriesList) return;

        entriesList.innerHTML = '<div class="export-loading">Загрузка зачётов...</div>';

        try {
            const response = await fetch(`/competitions/${competitionId}/entries-api/`);
            const data = await response.json();

            if (data.success && data.entries && data.entries.length > 0) {
                entriesList.innerHTML = '';
                data.entries.forEach(entry => {
                    const item = document.createElement('div');
                    item.className = 'export-entry-item';
                    item.innerHTML = `
                        <input type="checkbox" class="export-entry-checkbox" value="${entry.id}" checked id="entry_${entry.id}">
                        <label for="entry_${entry.id}">${this.escapeHtml(entry.discipline_name)} — ${this.escapeHtml(entry.class_name)}</label>
                    `;
                    entriesList.appendChild(item);
                });
            } else {
                entriesList.innerHTML = '<div class="export-loading">Нет доступных зачётов</div>';
            }
        } catch (err) {
            console.error('Ошибка загрузки зачётов:', err);
            entriesList.innerHTML = '<div class="export-loading">Ошибка загрузки зачётов</div>';
        }
    }

    bindEvents() {
        // Кнопка закрытия
        const closeBtn = this.modalOverlay.querySelector('.export-modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Кнопка Отмена
        const cancelBtn = this.modalOverlay.querySelector('.export-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        // Кнопка подтверждения
        const confirmBtn = this.modalOverlay.querySelector('.export-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.export());
        }
    }

    async export() {
        const formatRadio = this.modalOverlay.querySelector('input[name="export_format"]:checked');
        if (!formatRadio) {
            this.showError('Выберите формат экспорта');
            return;
        }

        const format = formatRadio.value;
        const checkboxes = this.modalOverlay.querySelectorAll('.export-entry-checkbox:checked');
        const selectedEntries = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (selectedEntries.length === 0) {
            this.showError('Выберите хотя бы один зачёт');
            return;
        }

        const confirmBtn = this.modalOverlay.querySelector('.export-confirm-btn');
        const errorDiv = this.modalOverlay.querySelector('#export-error');

        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Загрузка...';
        if (errorDiv) errorDiv.style.display = 'none';

        try {
            const response = await fetch(`/competitions/${this.currentCompetitionId}/export/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken(),
                },
                body: JSON.stringify({
                    format: format,
                    entries: selectedEntries
                })
            });

            if (response.ok) {
                // Получаем blob
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                // Получаем имя файла из заголовка Content-Disposition
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `results_${Date.now()}.${format}`;
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (match && match[1]) {
                        filename = match[1].replace(/['"]/g, '');
                    }
                }
                a.download = filename;

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);

                this.close();
            } else {
                // Обработка ошибки
                let errorMessage = 'Ошибка при экспорте';
                try {
                    const errorText = await response.text();
                    try {
                        const errorJson = JSON.parse(errorText);
                        errorMessage = errorJson.error || errorJson.message || errorText;
                    } catch (e) {
                        errorMessage = errorText || errorMessage;
                    }
                } catch (e) {
                    errorMessage = `Ошибка сервера: ${response.status} ${response.statusText}`;
                }
                this.showError(errorMessage);
            }
        } catch (err) {
            console.error('Ошибка:', err);
            this.showError('Ошибка соединения. Проверьте интернет-соединение и попробуйте снова.');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Скачать';
        }
    }

    showError(message) {
        const errorDiv = this.modalOverlay.querySelector('#export-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    close() {
        if (this.modalOverlay) {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.innerHTML = '';
        }
        this.currentCompetitionId = null;
    }

    getCsrfToken() {
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

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Создаём глобальный экземпляр
let exportManagerInstance = null;

window.showExportModal = function(competitionId) {
    if (!exportManagerInstance) {
        exportManagerInstance = new ExportManager();
    }
    exportManagerInstance.show(competitionId);
};