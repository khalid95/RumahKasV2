import { getLocalAuth, lockSession, onlineLogin, unlockWithPin, verifyOnline } from '../services/auth-service';
import { hideModal, showModal } from '../ui/feedback';

export async function initializeClientAuth() {
    const gate = document.querySelector('[data-auth-gate]');
    const shell = document.querySelector('[data-app-shell]');
    if (!gate || !shell) return true;
    let auth = await getLocalAuth();
    if (auth?.unlocked && await verifyOnline()) { gate.remove(); shell.classList.remove('hidden'); window.rumahkasLogout = lockSession; return true; }
    auth = await getLocalAuth(); gate.classList.remove('hidden');
    gate.querySelector('[data-login-form]').classList.toggle('hidden', Boolean(auth));
    gate.querySelector('[data-pin-form]').classList.toggle('hidden', !auth);
    gate.querySelector('[data-user-name]').textContent = auth?.user?.name || '';
    gate.querySelector('[data-user-initial]').textContent = auth?.user?.name?.trim()?.charAt(0)?.toUpperCase() || 'R';
    const error = (message) => { const el = gate.querySelector('[data-auth-error]'); el.textContent = message; el.classList.remove('hidden'); };
    const confirmReplacement = (devices = []) => new Promise((resolve) => {
        const dialog = gate.querySelector('[data-device-dialog]'); const list = dialog.querySelector('[data-device-list]');
        list.replaceChildren(...devices.map((device) => { const item = document.createElement('div'); item.className = 'rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700'; const name = document.createElement('p'); name.className = 'font-medium text-gray-900 dark:text-white'; name.textContent = device.name; const seen = document.createElement('p'); seen.className = 'mt-1 text-xs text-gray-500'; seen.textContent = device.last_online_at ? `Terakhir online ${new Date(device.last_online_at).toLocaleString('id-ID')}` : 'Belum pernah terhubung kembali'; item.append(name, seen); return item; }));
        const finish = (answer) => { hideModal(dialog); resolve(answer); };
        dialog.querySelector('[data-device-confirm]').onclick = () => finish(true); dialog.querySelector('[data-device-cancel]').onclick = () => finish(false); showModal(dialog);
    });
    gate.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
        event.preventDefault(); const button = event.currentTarget.querySelector('button'); const credentials = Object.fromEntries(new FormData(event.currentTarget)); button.disabled = true;
        try { await onlineLogin(credentials); location.reload(); }
        catch (exception) {
            if (exception.code === 'installation_limit' && await confirmReplacement(exception.devices)) {
                try { await onlineLogin({ ...credentials, replaceInstallation: true }); location.reload(); return; } catch (replacementError) { error(replacementError.message); }
            } else if (exception.code !== 'installation_limit') error(exception.message);
            button.disabled = false;
        }
    });
    const pinForm = gate.querySelector('[data-pin-form]');
    const pinInput = gate.querySelector('[data-pin-input]');
    const pinBoxes = gate.querySelector('[data-pin-boxes]');
    const pinDigits = [...gate.querySelectorAll('[data-pin-digit]')];
    let submittingPin = false;
    const renderPin = () => {
        pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 6);
        pinDigits.forEach((box, index) => {
            box.textContent = index < pinInput.value.length ? '•' : '';
            const active = document.activeElement === pinInput && index === Math.min(pinInput.value.length, 5);
            box.classList.toggle('border-brand-500', active);
            box.classList.toggle('ring-4', active);
            box.classList.toggle('ring-brand-500/10', active);
            box.classList.toggle('border-gray-300', !active);
        });
    };
    pinInput.addEventListener('input', () => {
        renderPin();
        if (pinInput.value.length === 6 && !submittingPin) pinForm.requestSubmit();
    });
    pinInput.addEventListener('focus', renderPin);
    pinInput.addEventListener('blur', renderPin);
    pinForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submittingPin || pinInput.value.length !== 6) return;
        submittingPin = true;
        try { await unlockWithPin(pinInput.value); location.reload(); }
        catch (exception) {
            error(exception.message); pinInput.value = ''; renderPin(); pinBoxes.classList.add('pin-shake');
            setTimeout(() => pinBoxes.classList.remove('pin-shake'), 450); pinInput.focus(); submittingPin = false;
        }
    });
    gate.querySelector('[data-switch-account]').addEventListener('click', () => {
        gate.querySelector('[data-pin-form]').classList.add('hidden');
        gate.querySelector('[data-login-form]').classList.remove('hidden');
        gate.querySelector('[data-back-pin]').classList.remove('hidden');
        gate.querySelector('[data-auth-error]').classList.add('hidden');
    });
    gate.querySelector('[data-back-pin]').addEventListener('click', () => {
        gate.querySelector('[data-login-form]').classList.add('hidden');
        gate.querySelector('[data-pin-form]').classList.remove('hidden');
        gate.querySelector('[data-auth-error]').classList.add('hidden');
        gate.querySelector('[data-pin-input]').focus();
        renderPin();
    });
    if (auth) { pinInput.focus(); renderPin(); }
    return false;
}
