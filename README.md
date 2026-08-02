# RumahKas PWA

RumahKas adalah aplikasi keuangan pribadi local-first berbasis Laravel 12 dan PWA.
Data keuangan disimpan di IndexedDB perangkat pengguna. Backend Laravel/MySQL hanya
mengelola admin, pelanggan, pembayaran, lisensi, dan aktivasi perangkat.

## Stack

- Laravel 12 dan PHP 8.2+
- Blade, Tailwind CSS 4, Alpine.js, dan Vite
- Dexie/IndexedDB untuk data keuangan lokal
- MySQL untuk platform komersial
- Service worker untuk instalasi, offline shell, dan pembaruan PWA
- Docker Compose, Nginx, dan PHP-FPM untuk production

## Menjalankan development

```bash
composer install
npm ci
cp .env.example .env
php artisan key:generate
touch database/database.sqlite
php artisan migrate
composer run dev
```

## Pengujian

```bash
npm run test:js
php artisan test
npm run build
```

## Deployment production

Stack production menggunakan Nginx, PHP-FPM, dan MySQL. Port web hanya terikat ke
localhost sehingga cocok diteruskan melalui Cloudflare Tunnel.

Panduan lengkap GitHub, konfigurasi secret, Cloudflare, backup, update, dan rollback:
[`docs/deployment-production.md`](docs/deployment-production.md).

Contoh konfigurasi production tersedia di `.env.production.example`. Jangan commit
`.env.production` atau backup database.

## Dokumentasi

- [Deployment production](docs/deployment-production.md)
- [Rilis dan upgrade PWA](docs/release-and-upgrade.md)
- [Platform komersial](docs/server-commercial-platform.md)

## Lisensi template UI

Antarmuka awal dikembangkan dari TailAdmin Laravel. Periksa `LICENSE` dan lisensi
aset/template sebelum distribusi komersial.
