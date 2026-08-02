# Platform Komersial dan Admin

RumahKas memakai satu repository dengan dua batas runtime:

- PWA pengguna menyimpan seluruh data finansial di IndexedDB.
- Laravel/MySQL menyimpan identitas pembeli, pembayaran, entitlement, lisensi, instalasi, dan audit admin.

Tidak ada tabel transaksi finansial, akun keuangan, kategori, atau budget pada database server.

## Production MySQL

Atur `DB_CONNECTION=mysql` beserta host, database, username, dan password pada environment production, kemudian jalankan:

```bash
php artisan migrate --force
php artisan db:seed --force
```

## Membuat admin

Tidak ada password admin bawaan. Setelah migration:

```bash
php artisan admin:create
```

Panel tersedia di `/admin/login` dengan guard `admin` yang terpisah dari akun pembeli.

## Modul admin awal

- dashboard metrik;
- pengguna;
- pembayaran;
- lisensi;
- instalasi perangkat;
- login/logout dan audit login.

Endpoint aktivasi, penerbitan signed license, serta local PIN merupakan tahap lanjutan di atas fondasi ini.
