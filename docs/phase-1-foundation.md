# Tahap 1 — Fondasi RumahKas

## Tujuan

Menyediakan application shell Laravel/Blade bergaya TailAdmin yang responsif, dapat dibangun oleh Vite, bisa diinstal sebagai PWA, dan dapat dibuka kembali ketika koneksi atau server tidak tersedia.

## Cakupan

- Laravel 12, Blade, Tailwind CSS 4, Vite, Alpine.js bawaan TailAdmin, dan jQuery untuk modul RumahKas berikutnya.
- Layout dashboard, sidebar, header, dark mode, status koneksi, dan halaman placeholder modul MVP.
- Web App Manifest, icon aplikasi, service worker, offline fallback, dan versioned application cache.
- Tidak ada login atau database server sebagai dependency shell aplikasi.

## Keputusan

- TailAdmin Laravel free digunakan sebagai design foundation dan disesuaikan menjadi dashboard personal finance.
- Font memakai system font agar tidak ada dependency Google Fonts saat offline.
- Service worker hanya didaftarkan pada production build untuk menghindari cache yang mengganggu Vite HMR.
- IndexedDB/Dexie dan repository layer mulai dibangun pada Tahap 2.

## Kriteria selesai

- `composer test` dan `npm run build` berhasil.
- Halaman utama serta seluruh route placeholder merespons sukses.
- Manifest valid dan memiliki icon 192px, 512px, serta maskable.
- Production service worker dapat terdaftar dan menyimpan application shell.
- Setelah halaman dibuka sekali, dashboard tetap dapat dibuka saat server tidak tersedia.
