import { changeLocalPin, getLocalAuth } from '../services/auth-service';
import { getAppSettings, saveProfileSettings } from '../services/settings-service';
import { confirmDialog, showToast } from '../ui/feedback';
import { cleanOldAuditLogs, inspectDatabase, resetFinancialData, storageStatus } from '../services/integrity-service';
import { APP_VERSION } from '../release';

export async function initializeSettingsPage() {
    const page = document.querySelector('[data-settings-page]'); if (!page) return;
    const toast = page.querySelector('[data-settings-toast]'); const notify = (message, variant = 'success') => showToast(toast, message, variant);
    const settings = await getAppSettings(); const auth = await getLocalAuth();
    page.querySelector('[name=name]').value = settings.profile?.name || 'Keluarga Saya';
    page.querySelector('[name=month_start_day]').value = settings.profile?.month_start_day || 1;
    page.querySelector('[name=backup_reminder_days]').value = settings.backupReminderDays;
    page.querySelector('[data-account-name]').textContent = auth?.user?.name || '-'; page.querySelector('[data-account-email]').textContent = auth?.user?.email || '-';
    page.querySelector('[data-license-product]').textContent = auth?.license?.product || '-'; page.querySelector('[data-last-backup]').textContent = settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString('id-ID') : 'Belum pernah';
    page.querySelector('[data-app-version]').textContent = `v${APP_VERSION}`;
    const offlineReady = page.querySelector('[data-offline-ready]');
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const ready = Boolean(navigator.serviceWorker.controller && registration?.active);
        offlineReady.textContent = ready ? 'Siap digunakan offline' : 'Buka ulang aplikasi';
        offlineReady.classList.toggle('text-success-600', ready);
        offlineReady.classList.toggle('text-warning-600', !ready);
        offlineReady.classList.remove('text-gray-500');
    } else {
        offlineReady.textContent = 'Tidak didukung browser'; offlineReady.classList.add('text-error-600'); offlineReady.classList.remove('text-gray-500');
    }

    page.querySelector('[data-profile-form]').addEventListener('submit', async (event) => { event.preventDefault(); const button = event.currentTarget.querySelector('button'); button.disabled = true; try { await saveProfileSettings(Object.fromEntries(new FormData(event.currentTarget))); notify('Pengaturan berhasil disimpan.'); } catch (error) { notify(error.message, 'error'); } finally { button.disabled = false; } });
    page.querySelector('[data-pin-change-form]').addEventListener('submit', async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget)); if (data.new_pin !== data.new_pin_confirmation) return notify('Konfirmasi PIN baru tidak sama.', 'error'); try { await changeLocalPin(data.current_pin, data.new_pin); event.currentTarget.reset(); notify('PIN offline berhasil diganti.'); } catch (error) { notify(error.message, 'error'); } });
    page.querySelectorAll('[data-theme-choice]').forEach((button) => button.addEventListener('click', () => { const theme = button.dataset.themeChoice; localStorage.setItem('theme', theme); const store = window.Alpine?.store('theme'); if (store) { store.theme = theme; store.updateTheme(); } else document.documentElement.classList.toggle('dark', theme === 'dark'); page.querySelectorAll('[data-theme-choice]').forEach((item) => item.classList.toggle('border-brand-500', item === button)); notify('Tema tampilan diperbarui.'); }));
    const bytes = (value) => value ? `${(value / 1024 / 1024).toFixed(1)} MB` : '0 MB';
    const storage = await storageStatus(); page.querySelector('[data-storage-usage]').textContent = storage.quota ? `${bytes(storage.usage)} / ${bytes(storage.quota)}` : bytes(storage.usage); page.querySelector('[data-storage-persistent]').textContent = storage.persisted ? 'Aktif' : 'Belum aktif';
    const runHealth = async () => { const result = await inspectDatabase(); page.querySelector('[data-health-status]').textContent = result.healthy ? 'Sehat' : `${result.issues.length} masalah`; page.querySelector('[data-local-count]').textContent = `${result.counts.transactions} transaksi`; const output = page.querySelector('[data-health-results]'); output.classList.remove('hidden'); output.replaceChildren(); const summary = document.createElement('p'); summary.className = result.healthy ? 'font-medium text-success-600' : 'font-medium text-error-600'; summary.textContent = result.healthy ? `Tidak ditemukan masalah. ${result.balances.length} saldo akun berhasil dihitung ulang.` : `Ditemukan ${result.issues.length} masalah. Buat backup sebelum melakukan perubahan data.`; output.append(summary); result.issues.slice(0, 20).forEach((issue) => { const row = document.createElement('p'); row.className = 'mt-2 text-gray-500'; row.textContent = `• ${issue.entity} ${issue.id}: ${issue.message}`; output.append(row); }); return result; };
    page.querySelector('[data-run-health]').addEventListener('click', async () => { try { await runHealth(); notify('Pemeriksaan database selesai.'); } catch (error) { notify(error.message, 'error'); } });
    page.querySelector('[data-clean-audit]').addEventListener('click', async () => { const count = await cleanOldAuditLogs(); notify(`${count} audit log lama dibersihkan.`); await runHealth(); });
    page.querySelector('[data-reset-data]').addEventListener('click', async () => { if (!await confirmDialog({ title: 'Hapus seluruh data finansial?', message: 'Akun, transaksi, budget, target tabungan, dan audit lokal akan dihapus. Kategori dan login tetap disimpan. Siapkan backup terlebih dahulu.', confirmText: 'Hapus seluruh data', requireText: 'HAPUS' })) return; await resetFinancialData(); notify('Seluruh data finansial lokal telah dihapus.'); setTimeout(() => location.href = '/', 900); });
    page.querySelector('[data-check-update]').addEventListener('click', async () => { if (!navigator.onLine) return notify('Hubungkan perangkat ke internet untuk memeriksa update.', 'error'); const button = page.querySelector('[data-check-update]'); button.disabled = true; try { const found = await window.rumahkasCheckUpdate?.(); if (!found) notify('RumahKas sudah menggunakan versi terbaru.'); } catch (error) { notify(error.message || 'Pemeriksaan update gagal.', 'error'); } finally { button.disabled = false; } });
}
