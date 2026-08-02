export const APP_VERSION = __APP_VERSION__;
globalThis.__APP_VERSION__ = APP_VERSION;
export const RELEASE_URL = '/release.json';

export async function fetchRelease() {
    const response = await fetch(`${RELEASE_URL}?t=${Date.now()}`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Informasi versi tidak dapat diperiksa.');
    return response.json();
}
