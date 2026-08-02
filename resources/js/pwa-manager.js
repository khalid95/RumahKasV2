import { prepareUpgrade } from './services/recovery-service';
import { APP_VERSION, fetchRelease } from './release';

export function compareVersions(left, right) {
    const normalize = (value) => String(value || '0').split('.').map((part) => Number.parseInt(part, 10) || 0);
    const a = normalize(left); const b = normalize(right); const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
        if ((a[index] || 0) > (b[index] || 0)) return 1;
        if ((a[index] || 0) < (b[index] || 0)) return -1;
    }
    return 0;
}

function updateDialog(worker, release) {
    if (!worker || document.querySelector('[data-pwa-update]')) return;
    const overlay = document.createElement('div'); overlay.dataset.pwaUpdate = ''; overlay.className = 'app-modal fixed inset-0 z-[99998] hidden items-center justify-center bg-gray-950/60 p-4';
    const panel = document.createElement('section'); panel.className = 'app-modal-panel w-full max-w-lg rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900';
    const title = document.createElement('h2'); title.className = 'text-xl font-bold text-gray-900 dark:text-white'; title.textContent = `RumahKas ${release.version} tersedia`;
    const detail = document.createElement('p'); detail.className = 'mt-2 text-sm text-gray-500'; detail.textContent = release.database_version > 2 ? `Update mencakup migration database v${release.database_version}. Snapshot recovery akan dibuat otomatis.` : 'Update aplikasi tidak akan menghapus data keuangan.';
    const notes = document.createElement('ul'); notes.className = 'mt-4 space-y-2 rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300';
    for (const note of release.notes || []) { const item = document.createElement('li'); item.textContent = `• ${note}`; notes.append(item); }
    const status = document.createElement('p'); status.className = 'mt-4 hidden rounded-lg p-3 text-sm';
    const actions = document.createElement('div'); actions.className = 'mt-6 flex justify-end gap-3';
    const later = document.createElement('button'); later.className = 'rounded-lg border border-gray-300 px-4 py-2.5 text-sm'; later.textContent = release.required ? 'Update diperlukan' : 'Nanti'; later.disabled = Boolean(release.required); later.onclick = () => overlay.remove();
    const update = document.createElement('button'); update.className = 'rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white'; update.textContent = 'Backup & Update';
    update.onclick = async () => { update.disabled = true; later.disabled = true; status.className = 'mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-700'; status.textContent = 'Membuat snapshot dan memeriksa database…'; try { await prepareUpgrade(release); status.textContent = 'Snapshot aman. Mengaktifkan versi baru…'; worker.postMessage({ type: 'SKIP_WAITING' }); } catch (error) { status.className = 'mt-4 rounded-lg bg-error-50 p-3 text-sm text-error-700'; status.textContent = error.message; update.disabled = false; later.disabled = false; } };
    actions.append(later, update); panel.append(title, detail, notes, status, actions); overlay.append(panel); document.body.append(overlay); overlay.classList.remove('hidden'); overlay.classList.add('flex'); requestAnimationFrame(() => overlay.classList.add('is-open'));
}

export async function registerPwa() {
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    let reloading = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
    const offer = async (worker) => {
        let release; try { release = await fetchRelease(); } catch { return false; }
        if (compareVersions(release.version, APP_VERSION) <= 0) { worker?.postMessage({ type: 'SKIP_WAITING' }); return false; }
        updateDialog(worker, release); return true;
    };
    if (registration.waiting && navigator.serviceWorker.controller) await offer(registration.waiting);
    registration.addEventListener('updatefound', () => { const worker = registration.installing; worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) offer(worker); }); });
    window.rumahkasCheckUpdate = async () => { await registration.update(); if (registration.waiting) return offer(registration.waiting); return Boolean(registration.installing); };
    return registration;
}
