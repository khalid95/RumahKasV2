const MODAL_DURATION = 220;
const TOAST_DURATION = 3000;
const timers = new WeakMap();

export function showModal(modal) {
    const element = modal instanceof Element ? modal : modal?.[0];
    if (!element) return;

    window.clearTimeout(timers.get(element));
    element.classList.remove('hidden');
    element.classList.add('flex');
    element.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');

    requestAnimationFrame(() => requestAnimationFrame(() => element.classList.add('is-open')));
}

export function hideModal(modal) {
    const element = modal instanceof Element ? modal : modal?.[0];
    if (!element || element.classList.contains('hidden')) return;

    element.classList.remove('is-open');
    element.setAttribute('aria-hidden', 'true');
    const timer = window.setTimeout(() => {
        element.classList.add('hidden');
        element.classList.remove('flex');
        document.body.classList.remove('overflow-hidden');
    }, MODAL_DURATION);
    timers.set(element, timer);
}

export function showToast(toast, message, variant = 'success') {
    const element = toast instanceof Element ? toast : toast?.[0];
    if (!element) return;

    window.clearTimeout(timers.get(element));
    const icon = document.createElement('span');
    icon.className = 'app-toast-icon';
    icon.textContent = variant === 'error' ? '!' : '✓';
    const content = document.createElement('span');
    content.textContent = message;
    element.replaceChildren(icon, content);
    element.classList.remove('hidden', 'is-visible', 'app-toast-success', 'app-toast-error');
    element.classList.add(variant === 'error' ? 'app-toast-error' : 'app-toast-success');
    element.setAttribute('role', variant === 'error' ? 'alert' : 'status');

    requestAnimationFrame(() => requestAnimationFrame(() => element.classList.add('is-visible')));
    const timer = window.setTimeout(() => {
        element.classList.remove('is-visible');
        const hideTimer = window.setTimeout(() => element.classList.add('hidden'), MODAL_DURATION);
        timers.set(element, hideTimer);
    }, TOAST_DURATION);
    timers.set(element, timer);
}

let confirmElement;
function ensureConfirmDialog() {
    if (confirmElement) return confirmElement;
    const wrapper = document.createElement('div');
    wrapper.className = 'app-modal fixed inset-0 z-[100000] hidden items-center justify-center bg-gray-950/55 p-4';
    wrapper.setAttribute('role', 'alertdialog'); wrapper.setAttribute('aria-modal', 'true'); wrapper.setAttribute('aria-hidden', 'true');
    wrapper.innerHTML = `<div class="app-modal-panel w-full max-w-sm rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900"><span data-confirm-icon class="flex h-12 w-12 items-center justify-center rounded-full bg-error-50 text-xl font-bold text-error-600 dark:bg-error-500/10">!</span><h2 data-confirm-title class="mt-4 text-xl font-bold text-gray-900 dark:text-white"></h2><p data-confirm-message class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400"></p><label data-confirm-input-wrap class="mt-4 hidden text-sm font-medium text-gray-700 dark:text-gray-300"><span data-confirm-input-label></span><input data-confirm-input type="text" autocomplete="off" class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 outline-none focus:border-error-500 dark:border-gray-700"></label><div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button data-confirm-cancel type="button" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button><button data-confirm-accept type="button" class="rounded-lg bg-error-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-error-600">Hapus</button></div></div>`;
    document.body.append(wrapper); confirmElement = wrapper; return wrapper;
}

export function confirmDialog({ title = 'Konfirmasi tindakan', message = 'Tindakan ini tidak dapat dibatalkan.', confirmText = 'Lanjutkan', variant = 'danger', requireText = null } = {}) {
    const dialog = ensureConfirmDialog(); const accept = dialog.querySelector('[data-confirm-accept]'); const cancel = dialog.querySelector('[data-confirm-cancel]');
    const inputWrap = dialog.querySelector('[data-confirm-input-wrap]'); const input = dialog.querySelector('[data-confirm-input]');
    dialog.querySelector('[data-confirm-title]').textContent = title; dialog.querySelector('[data-confirm-message]').textContent = message; accept.textContent = confirmText;
    accept.className = `rounded-lg px-4 py-2.5 text-sm font-semibold text-white ${variant === 'danger' ? 'bg-error-500 hover:bg-error-600' : 'bg-brand-500 hover:bg-brand-600'}`;
    inputWrap.classList.toggle('hidden', !requireText); input.value = ''; dialog.querySelector('[data-confirm-input-label]').textContent = requireText ? `Ketik ${requireText} untuk melanjutkan` : '';
    accept.disabled = Boolean(requireText); accept.classList.toggle('opacity-50', Boolean(requireText)); showModal(dialog);
    return new Promise((resolve) => {
        let settled = false; const finish = (result) => { if (settled) return; settled = true; hideModal(dialog); accept.removeEventListener('click', onAccept); cancel.removeEventListener('click', onCancel); dialog.removeEventListener('click', onBackdrop); document.removeEventListener('keydown', onKey); input.oninput = null; resolve(result); };
        const onAccept = () => finish(true); const onCancel = () => finish(false); const onBackdrop = (event) => { if (event.target === dialog) finish(false); }; const onKey = (event) => { if (event.key === 'Escape') finish(false); };
        const onInput = () => { accept.disabled = input.value !== requireText; accept.classList.toggle('opacity-50', accept.disabled); };
        accept.addEventListener('click', onAccept); cancel.addEventListener('click', onCancel); dialog.addEventListener('click', onBackdrop); document.addEventListener('keydown', onKey); input.oninput = onInput; window.setTimeout(() => (requireText ? input : cancel).focus(), 30);
    });
}
