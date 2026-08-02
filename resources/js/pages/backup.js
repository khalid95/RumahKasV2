import { backupSummary, createEncryptedBackup, readEncryptedBackup, restoreBackup } from '../services/backup-service';
import { confirmDialog, showToast } from '../ui/feedback';

export function initializeBackupPage() {
    const page = document.querySelector('[data-backup-page]');
    if (!page) return;
    const toast = page.querySelector('[data-backup-toast]');
    const error = (message) => showToast(toast, message, 'error');
    let pendingBackup = null;

    page.querySelector('[data-export-form]').addEventListener('submit', async (event) => {
        event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true;
        try {
            const content = await createEncryptedBackup(new FormData(event.currentTarget).get('password'));
            const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([content], { type: 'application/json' })); link.download = `rumahkas-backup-${new Date().toISOString().slice(0, 10)}.rumahkas`; link.click(); URL.revokeObjectURL(link.href); event.currentTarget.reset(); showToast(toast, 'Backup terenkripsi berhasil dibuat.');
        } catch (exception) { error(exception.message); } finally { button.disabled = false; }
    });

    page.querySelector('[data-preview-form]').addEventListener('submit', async (event) => {
        event.preventDefault(); const form = event.currentTarget; const file = form.querySelector('[name=file]').files[0];
        if (!file) return error('Pilih file backup terlebih dahulu.');
        try {
            pendingBackup = await readEncryptedBackup(await file.text(), new FormData(form).get('password'));
            const summary = backupSummary(pendingBackup); page.querySelector('[data-preview]').classList.remove('hidden');
            page.querySelector('[data-preview-date]').textContent = new Date(summary.createdAt).toLocaleString('id-ID');
            for (const key of ['accounts', 'categories', 'transactions', 'budgets']) page.querySelector(`[data-preview-${key}]`).textContent = summary[key].toLocaleString('id-ID');
        } catch (exception) { pendingBackup = null; page.querySelector('[data-preview]').classList.add('hidden'); error(exception.message); }
    });

    page.querySelector('[data-restore-form]').addEventListener('submit', async (event) => {
        event.preventDefault(); if (!pendingBackup) return error('Buka dan periksa file backup terlebih dahulu.');
        const mode = new FormData(event.currentTarget).get('mode');
        if (mode === 'replace' && !await confirmDialog({ title: 'Ganti seluruh data lokal?', message: 'Data finansial saat ini akan diganti dengan isi backup. Pastikan file yang dipilih benar.', confirmText: 'Ganti dan pulihkan', requireText: 'PULIHKAN' })) return;
        try { await restoreBackup(pendingBackup, mode); showToast(toast, 'Data berhasil dipulihkan. Memuat ulang…'); setTimeout(() => location.reload(), 900); } catch (exception) { error(exception.message); }
    });
}
