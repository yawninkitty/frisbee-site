// static/js/export.js

class ExportManager {
    constructor() {
        this.modal = null;
        this.modalOverlay = null;
        this.currentCompetitionId = null;
        this.init();
    }

    init() {
        this.modalOverlay = document.createElement('div');
        this.modalOverlay.className = 'modal-overlay';
        this.modalOverlay.id = 'export-modal-overlay';
        this.modalOverlay.style.cssText = `
            display: none;
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
        `;
        document.body.appendChild(this.modalOverlay);

        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) {
                this.close();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modalOverlay.style.display === 'flex') {
                this.close();
            }
        });
    }

    async show(competitionId) {
        this.currentCompetitionId = competitionId;

        try {
            const response = await fetch('/static/templates/export_modal.html');
            const modalHtml = await response.text();

            this.modalOverlay.innerHTML = modalHtml;
            this.modal = this.modalOverlay.querySelector('.export-modal-container');
            this.modalOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';

            await this.loadEntries(competitionId);
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

        entriesList.innerHTML = '<div class="export-loading body-text-sm color-gray-middle">Загрузка зачётов...</div>';

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
                entriesList.innerHTML = '<div class="export-loading body-text-sm color-gray-middle">Нет доступных зачётов</div>';
            }
        } catch (err) {
            console.error('Ошибка загрузки зачётов:', err);
            entriesList.innerHTML = '<div class="export-loading body-text-sm color-gray-middle">Ошибка загрузки зачётов</div>';
        }
    }

    bindEvents() {
        const closeBtn = this.modalOverlay.querySelector('.export-modal-close');
        const cancelBtn = this.modalOverlay.querySelector('.export-cancel-btn');
        const confirmBtn = this.modalOverlay.querySelector('.export-confirm-btn');

        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.export());
    }

    async export() {
        if (!this.modal) return;

        const formatRadio = this.modal.querySelector('input[name="export_format"]:checked');
        if (!formatRadio) {
            this.showError('Выберите формат экспорта');
            return;
        }

        const format = formatRadio.value;
        const checkboxes = this.modal.querySelectorAll('.export-entry-checkbox:checked');
        const selectedEntries = Array.from(checkboxes).map(cb => parseInt(cb.value));

        if (selectedEntries.length === 0) {
            this.showError('Выберите хотя бы один зачёт');
            return;
        }

        const confirmBtn = this.modal.querySelector('.export-confirm-btn');
        const errorDiv = this.modal.querySelector('#export-error');

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
                body: JSON.stringify({ format, entries: selectedEntries })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;

                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `results_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
                if (contentDisposition) {
                    const match = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (match && match[1]) filename = match[1].replace(/['"]/g, '');
                }
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.close();
            } else {
                let errorMessage = 'Ошибка при экспорте';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (e) {
                    errorMessage = `Ошибка сервера: ${response.status}`;
                }
                this.showError(errorMessage);
            }
        } catch (err) {
            console.error('Ошибка:', err);
            this.showError('Ошибка соединения.');
        } finally {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Скачать';
        }
    }

    showError(message) {
        if (!this.modal) return;
        const errorDiv = this.modal.querySelector('#export-error');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            setTimeout(() => { errorDiv.style.display = 'none'; }, 5000);
        } else {
            alert(message);
        }
    }

    close() {
        if (this.modalOverlay) {
            this.modalOverlay.style.display = 'none';
            this.modalOverlay.innerHTML = '';
        }
        document.body.style.overflow = '';
        this.modal = null;
        this.currentCompetitionId = null;
    }

    getCsrfToken() {
        const cookie = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

let exportManagerInstance = null;

window.showExportModal = function(competitionId) {
    if (!exportManagerInstance) {
        exportManagerInstance = new ExportManager();
    }
    exportManagerInstance.show(competitionId);
};