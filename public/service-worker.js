importScripts('/app-version.js');

const RELEASE = self.RUMAHKAS_RELEASE;
const CACHE_PREFIX = 'rumahkas-shell-';
const CACHE_VERSION = `${CACHE_PREFIX}${RELEASE.version}`;
const APP_ROUTES = ['/', '/accounts', '/categories', '/transactions', '/budgets', '/saving-goals', '/planner', '/habits', '/reports', '/backup', '/settings'];
const STATIC_ASSETS = ['/offline.html', '/manifest.webmanifest', '/release.json', '/app-version.js', '/icons/rumahkas.svg', '/icons/rumahkas-192.png', '/icons/rumahkas-512.png', '/icons/rumahkas-maskable-512.png'];

async function cacheApplicationShell() {
    const cache = await caches.open(CACHE_VERSION); const urls = [...APP_ROUTES, ...STATIC_ASSETS];
    const response = await fetch('/build/manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Vite manifest tidak tersedia.');
    const manifest = await response.json(); urls.push('/build/manifest.json');
    for (const entry of Object.values(manifest)) {
        if (entry.file) urls.push(`/build/${entry.file}`);
        for (const css of entry.css || []) urls.push(`/build/${css}`);
        for (const asset of entry.assets || []) urls.push(`/build/${asset}`);
    }
    const results = await Promise.all([...new Set(urls)].map(async (url) => { const result = await fetch(url, { cache: 'no-store' }); if (!result.ok) throw new Error(`Gagal cache ${url}`); await cache.put(url, result); return url; }));
    return results;
}

self.addEventListener('install', (event) => event.waitUntil(cacheApplicationShell()));
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (event.data?.type === 'RELEASE_CONFIRMED' && event.data.version === RELEASE.version) {
        event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_VERSION).map((key) => caches.delete(key)))));
    }
});
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url); if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;
    if (event.request.mode === 'navigate') {
        event.respondWith(fetch(event.request).then((response) => { if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, response.clone())); return response; }).catch(async () => (await caches.match(event.request, { ignoreSearch: true })) || (await caches.match('/offline.html')))); return;
    }
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => { if (response.ok) caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, response.clone())); return response; })));
});
