# Tahap 2 — Fondasi Database Lokal

## Tujuan

Menyediakan IndexedDB sebagai sumber data utama RumahKas melalui Dexie, dengan schema berversi dan akses data yang tidak tersebar di UI.

## Schema versi 1

- `settings`
- `profiles`
- `financial_accounts`
- `categories`
- `transactions`
- `budgets`
- `audit_logs`

Entity utama memakai UUID. Transaksi memiliki index untuk profile, akun, kategori, tipe, status, tanggal, dan gabungan profile/tanggal.

## Inisialisasi pertama

Saat application shell dibuka, RumahKas akan:

1. Membuka atau membuat database `rumahkas`.
2. Membuat profile lokal default `Keluarga Saya`.
3. Membuat 7 kategori pemasukan dan 13 kategori pengeluaran.
4. Menyimpan currency `IDR` dan versi schema.
5. Meminta persistent storage jika browser mendukungnya.

Proses seed berada dalam transaksi Dexie dan aman dijalankan berulang kali.

## Pemeriksaan manual

Di Chrome atau Edge buka **Developer Tools → Application → Storage → IndexedDB → rumahkas**.

## Batas tahap

Repository generik, kategori, dan settings sudah tersedia. Business rule akun, kategori, dan transaksi belum dihubungkan ke form; implementasinya dilakukan sebagai vertical slice pada tahap berikutnya.

## Vertical slice kategori

Halaman kategori kini memakai `CategoryService → CategoryRepository → Dexie`. Fitur yang tersedia:

- daftar kategori pemasukan dan pengeluaran;
- tambah dan edit kategori;
- aktif/nonaktif;
- hapus kategori custom yang belum digunakan;
- proteksi kategori bawaan;
- proteksi integritas kategori yang sudah digunakan transaksi;
- validasi nama wajib, panjang maksimum, tipe, dan nama duplikat.
