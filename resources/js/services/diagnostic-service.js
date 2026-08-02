import { db } from '../database/database';
import { createRecoveryDatabase, RECOVERY_DATABASE_NAME } from './recovery-service';
import { inspectDatabase } from './integrity-service';
import { APP_VERSION } from '../release';

export const REQUIRED_OFFLINE_ROUTES = ['/', '/accounts', '/categories', '/transactions', '/budgets', '/saving-goals', '/planner', '/habits', '/reports', '/backup', '/settings'];
export const ACCEPTANCE_ITEMS = [
    ['restart', 'Tutup browser/PWA lalu buka kembali'], ['server_off', 'Matikan Laravel dan buka aplikasi'], ['pin_offline', 'Login menggunakan PIN tanpa internet'], ['transaction_offline', 'Tambah dan edit transaksi tanpa internet'], ['dashboard_offline', 'Dashboard dan saldo berubah tanpa internet'], ['budget_offline', 'Buat dan periksa budget tanpa internet'], ['saving_goal_offline', 'Buat dan atur target tabungan tanpa internet'], ['planner_offline', 'Kelola aktivitas dan kebiasaan tanpa internet'], ['report_offline', 'Buka laporan dan export CSV tanpa internet'], ['backup_offline', 'Buat backup terenkripsi tanpa internet'], ['restore_offline', 'Restore backup percobaan tanpa internet'], ['update', 'Update versi dan pastikan data tetap tersedia'], ['recovery', 'Uji snapshot recovery pada data percobaan'],
];

const result = (id, label, status, detail) => ({ id, label, status, detail });
export async function runDiagnostics(database = db, environment = globalThis) {
    const results = [];
    results.push(result('secure_context', 'Secure context', environment.isSecureContext || environment.location?.hostname === 'localhost' ? 'pass' : 'fail', environment.isSecureContext ? 'HTTPS/localhost aktif.' : 'Service Worker dan Web Crypto memerlukan HTTPS.'));
    results.push(result('web_crypto', 'Web Crypto API', environment.crypto?.subtle ? 'pass' : 'fail', environment.crypto?.subtle ? 'Enkripsi tersedia.' : 'Web Crypto tidak tersedia.'));
    const swSupported = 'serviceWorker' in (environment.navigator || {}); const controlled = Boolean(environment.navigator?.serviceWorker?.controller);
    results.push(result('service_worker', 'Service Worker', controlled ? 'pass' : swSupported ? 'warn' : 'fail', controlled ? 'Halaman dikontrol Service Worker.' : swSupported ? 'Didukung tetapi halaman belum dikontrol; refresh satu kali.' : 'Browser tidak mendukung Service Worker.'));
    if (environment.caches) {
        const names = await environment.caches.keys(); const active = names.filter((name) => name.startsWith('rumahkas-shell-')).sort().at(-1); let missing = REQUIRED_OFFLINE_ROUTES;
        if (active) { const cache = await environment.caches.open(active); const requests = await cache.keys(); const paths = new Set(requests.map((request) => new URL(request.url).pathname)); missing = REQUIRED_OFFLINE_ROUTES.filter((route) => !paths.has(route)); }
        results.push(result('app_cache', 'Offline application shell', active && missing.length === 0 ? 'pass' : 'fail', active ? missing.length ? `Route belum tercache: ${missing.join(', ')}` : `${active} lengkap.` : 'Cache RumahKas tidak ditemukan.'));
    } else results.push(result('app_cache', 'Offline application shell', 'fail', 'Cache Storage API tidak tersedia.'));
    try {
        await database.open(); const marker = `diagnostic-${crypto.randomUUID()}`; await database.settings.put({ key: marker, value: true, updated_at: new Date().toISOString() }); await database.settings.delete(marker);
        results.push(result('indexeddb', 'IndexedDB baca/tulis', 'pass', `Database schema v${database.verno} dapat digunakan.`));
        const health = await inspectDatabase(database); results.push(result('integrity', 'Integritas database', health.healthy ? 'pass' : 'fail', health.healthy ? `${health.counts.transactions} transaksi dan ${health.balances.length} saldo akun valid.` : `${health.issues.length} masalah ditemukan.`));
        const auth = await database.auth.get('session'); results.push(result('local_license', 'Lisensi dan PIN lokal', auth?.token && auth?.pin_hash ? 'pass' : 'warn', auth?.token && auth?.pin_hash ? `Lisensi lokal ${auth.license?.product || ''} tersedia.` : 'Sesi lokal belum lengkap.'));
    } catch (error) { results.push(result('indexeddb', 'IndexedDB baca/tulis', 'fail', error.message)); }
    const storage = await environment.navigator?.storage?.estimate?.(); const persisted = await environment.navigator?.storage?.persisted?.();
    results.push(result('persistent_storage', 'Persistent storage', persisted ? 'pass' : 'warn', persisted ? `Aktif; penggunaan ${formatBytes(storage?.usage || 0)}.` : `Belum dijamin browser; penggunaan ${formatBytes(storage?.usage || 0)}.`));
    try { const recovery = createRecoveryDatabase(RECOVERY_DATABASE_NAME); await recovery.open(); results.push(result('recovery_db', 'Recovery database', 'pass', 'Snapshot dan migration journal tersedia.')); recovery.close(); } catch (error) { results.push(result('recovery_db', 'Recovery database', 'fail', error.message)); }
    results.push(result('app_version', 'Versi release', 'pass', `RumahKas v${APP_VERSION}.`));
    return { version: APP_VERSION, checkedAt: new Date().toISOString(), results, summary: summarizeDiagnostics(results) };
}

export function summarizeDiagnostics(results) {
    return { passed: results.filter((item) => item.status === 'pass').length, warnings: results.filter((item) => item.status === 'warn').length, failed: results.filter((item) => item.status === 'fail').length, ready: !results.some((item) => item.status === 'fail') };
}

function formatBytes(value) { return value < 1024 * 1024 ? `${Math.round(value / 1024)} KB` : `${(value / 1024 / 1024).toFixed(1)} MB`; }
