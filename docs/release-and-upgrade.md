# Release dan Upgrade RumahKas

## Sumber versi

- Versi aplikasi: `version` pada `package.json`.
- Versi IndexedDB: `DATABASE_VERSION` pada `resources/js/database/schema.js`.
- Catatan release: `release-notes.json`.
- `public/release.json` dan `public/app-version.js` dibuat otomatis oleh `npm run build`.

## Membuat release

1. Naikkan versi semantik pada `package.json`.
2. Perbarui tanggal, minimum version, status required, dan notes pada `release-notes.json`.
3. Jika schema berubah, tambahkan versi Dexie baru. Jangan mengubah deklarasi versi lama.
4. Jalankan `npm run test:js`, `php artisan test`, lalu `npm run build`.
5. Upload hashed assets dan file aplikasi terlebih dahulu.
6. Jalankan migration MySQL yang backward-compatible.
7. Upload `service-worker.js`, `app-version.js`, dan `release.json` paling terakhir.
8. Pertahankan aset minimal dua release terakhir di server.

## Lifecycle update

Worker baru mengunduh seluruh app shell dan menunggu. Aplikasi lama membuat snapshot di `rumahkas_recovery`, menulis journal `pending`, lalu mengaktifkan worker. Aplikasi baru membuka/migrasikan IndexedDB dan menjalankan integrity check. Setelah sukses, journal menjadi `completed`, aplikasi mengirim `RELEASE_CONFIRMED`, dan worker menghapus cache lama. Jika gagal, journal menjadi `failed` dan recovery screen ditampilkan.

## Aturan migration

- Gunakan expand → migrate → contract.
- Field/store lama dipertahankan minimal dua release.
- Migration harus berada dalam Dexie `upgrade()`.
- Server API harus kompatibel dengan minimal dua versi client.
- Jangan pernah menghapus database otomatis saat migration gagal.

## Cache production

- `service-worker.js`, `release.json`, `app-version.js`, dan `manifest.webmanifest`: `Cache-Control: no-cache`.
- `/build/assets/*`: `Cache-Control: public, max-age=31536000, immutable`.
