import { initializeDatabase, requestPersistentStorage } from './services/database-service';

export async function bootstrapRumahKas() {
    const statusElement = document.querySelector('[data-database-status]');

    try {
        const status = await initializeDatabase();
        await requestPersistentStorage();

        document.documentElement.dataset.databaseReady = 'true';
        window.dispatchEvent(new CustomEvent('rumahkas:database-ready', { detail: status }));

        if (statusElement) {
            statusElement.querySelector('[data-status-label]').textContent = 'Database lokal siap';
            statusElement.querySelector('[data-status-detail]').textContent = `${status.categories} kategori default • schema v${status.version}`;
            statusElement.classList.remove('border-warning-200', 'bg-warning-25');
            statusElement.classList.add('border-success-200', 'bg-success-25');
        }

        return status;
    } catch (error) {
        console.error('Database RumahKas gagal diinisialisasi:', error);
        document.documentElement.dataset.databaseReady = 'false';
        window.dispatchEvent(new CustomEvent('rumahkas:database-error', { detail: error }));

        if (statusElement) {
            statusElement.querySelector('[data-status-label]').textContent = 'Database lokal bermasalah';
            statusElement.querySelector('[data-status-detail]').textContent = error.message;
            statusElement.classList.add('border-error-200', 'bg-error-25');
        }

        throw error;
    }
}
