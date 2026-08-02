import { db } from '../database/database';

const encoder = new TextEncoder();
const toHex = (buffer) => [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
async function pinHash(pin, salt) {
    const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits']);
    return toHex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 210000, hash: 'SHA-256' }, key, 256));
}
export async function getLocalAuth() { await db.open(); return db.auth.get('session'); }
export async function onlineLogin({ email, password, pin, replaceInstallation = false }) {
    const existing = await getLocalAuth();
    const installationId = existing?.installation_id || crypto.randomUUID();
    const response = await fetch('/api/client/login', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '' }, body: JSON.stringify({ email, password, installation_id: installationId, device_name: navigator.userAgent.slice(0, 100), replace_installation: replaceInstallation }) });
    const data = await response.json();
    if (!response.ok) { const error = new Error(Object.values(data.errors || {})[0]?.[0] || data.message || 'Login gagal.'); error.code = data.code; error.devices = data.devices; throw error; }
    const salt = crypto.randomUUID();
    await db.auth.put({ key: 'session', installation_id: installationId, token: data.token, user: data.user, license: data.license, pin_salt: salt, pin_hash: await pinHash(pin, salt), unlocked: true, updated_at: new Date().toISOString() });
    return data;
}
export async function unlockWithPin(pin) {
    const auth = await getLocalAuth();
    if (!auth || await pinHash(pin, auth.pin_salt) !== auth.pin_hash) throw new Error('PIN salah.');
    await db.auth.update('session', { unlocked: true, updated_at: new Date().toISOString() });
}
export async function changeLocalPin(currentPin, newPin) {
    if (!/^\d{6}$/.test(String(newPin))) throw new Error('PIN baru harus terdiri dari 6 angka.');
    const auth = await getLocalAuth();
    if (!auth || await pinHash(currentPin, auth.pin_salt) !== auth.pin_hash) throw new Error('PIN lama tidak sesuai.');
    if (String(currentPin) === String(newPin)) throw new Error('PIN baru harus berbeda dari PIN lama.');
    const salt = crypto.randomUUID();
    await db.auth.update('session', { pin_salt: salt, pin_hash: await pinHash(newPin, salt), updated_at: new Date().toISOString() });
}
export async function lockSession() { await db.auth.update('session', { unlocked: false, updated_at: new Date().toISOString() }); location.reload(); }
export async function forgetSession() { await db.auth.delete('session'); location.reload(); }
export async function verifyOnline() {
    const auth = await getLocalAuth();
    if (!auth?.token || !navigator.onLine) return true;
    try {
        const response = await fetch('/api/client/verify', { headers: { Accept: 'application/json', Authorization: `Bearer ${auth.token}` } });
        if (response.status === 401 || response.status === 403) {
            await db.auth.delete('session');
            return false;
        }
        // Gangguan server tidak boleh mengunci lisensi yang sudah aktif lokal.
        return response.ok || response.status >= 500;
    } catch {
        return true;
    }
}
