import Alpine from 'alpinejs';
import $ from 'jquery';
import { bootstrapRumahKas } from './bootstrap-rumahkas';
import { APP_VERSION } from './release';

window.Alpine = Alpine;
window.$ = window.jQuery = $;

Alpine.start();

// Initialize components on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    const isClientApp = Boolean(document.querySelector('[data-auth-gate]'));
    if (isClientApp) {
        const { initializeClientAuth } = await import('./pages/client-auth');
        if (!await initializeClientAuth()) return;
        try {
            await bootstrapRumahKas();
            const { pendingUpgrade, verifyAndFinalizeUpgrade } = await import('./services/recovery-service');
            const pending = await pendingUpgrade();
            if (pending?.status === 'failed') throw new Error(pending.error || 'Update sebelumnya gagal diverifikasi.');
            await verifyAndFinalizeUpgrade(APP_VERSION);
            navigator.serviceWorker?.controller?.postMessage({ type: 'RELEASE_CONFIRMED', version: APP_VERSION });
        } catch (error) {
            const { showRecoveryScreen } = await import('./pages/recovery'); await showRecoveryScreen(error); return;
        }
        if (!sessionStorage.getItem('rumahkas-backup-reminded')) {
            const { isBackupDue } = await import('./services/settings-service');
            if (await isBackupDue()) {
                const { showToast } = await import('./ui/feedback'); const reminder = document.createElement('div'); reminder.className = 'app-toast hidden'; document.body.append(reminder); showToast(reminder, 'Sudah waktunya membuat backup data RumahKas.'); sessionStorage.setItem('rumahkas-backup-reminded', '1');
            }
        }
    }

    if (document.querySelector('[data-category-page]')) {
        import('./pages/categories').then(({ initializeCategoryPage }) => initializeCategoryPage());
    }
    if (document.querySelector('[data-account-page]')) {
        import('./pages/accounts').then(({ initializeAccountPage }) => initializeAccountPage());
    }
    if (document.querySelector('[data-transaction-page]')) {
        import('./pages/transactions').then(({ initializeTransactionPage }) => initializeTransactionPage());
    }
    if (document.querySelector('[data-dashboard-page]')) {
        import('./pages/dashboard').then(({ initializeDashboardPage }) => initializeDashboardPage());
    }
    if (document.querySelector('[data-budget-page]')) {
        import('./pages/budgets').then(({ initializeBudgetPage }) => initializeBudgetPage());
    }
    if (document.querySelector('[data-saving-goal-page]')) {
        import('./pages/saving-goals').then(({ initializeSavingGoalPage }) => initializeSavingGoalPage());
    }
    if (document.querySelector('[data-planner-page]')) {
        import('./pages/planner').then(({ initializePlannerPage }) => initializePlannerPage());
    }
    if (document.querySelector('[data-habit-page]')) {
        import('./pages/habits').then(({ initializeHabitPage }) => initializeHabitPage());
    }
    if (document.querySelector('[data-report-page]')) {
        import('./pages/reports').then(({ initializeReportPage }) => initializeReportPage());
    }
    if (document.querySelector('[data-backup-page]')) {
        import('./pages/backup').then(({ initializeBackupPage }) => initializeBackupPage());
    }
    if (document.querySelector('[data-settings-page]')) {
        import('./pages/settings').then(({ initializeSettingsPage }) => initializeSettingsPage());
    }
    if (document.querySelector('[data-diagnostics-page]')) {
        import('./pages/diagnostics').then(({ initializeDiagnosticsPage }) => initializeDiagnosticsPage());
    }

    const networkStatus = document.querySelector('#network-status');
    const renderNetworkStatus = () => {
        if (!networkStatus) return;

        const online = navigator.onLine;
        networkStatus.classList.toggle('bg-success-50', online);
        networkStatus.classList.toggle('text-success-700', online);
        networkStatus.classList.toggle('bg-warning-50', !online);
        networkStatus.classList.toggle('text-warning-700', !online);
        networkStatus.querySelector('span:first-child').className = `h-2 w-2 rounded-full ${online ? 'bg-success-500' : 'bg-warning-500'}`;
        networkStatus.querySelector('span:last-child').textContent = online ? 'Online' : 'Offline';
    };

    renderNetworkStatus();
    window.addEventListener('online', renderNetworkStatus);
    window.addEventListener('offline', renderNetworkStatus);

});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', async () => {
        try {
            const { registerPwa } = await import('./pwa-manager'); await registerPwa();
        } catch (error) {
            console.error('Service worker gagal didaftarkan:', error);
        }
    });
}
