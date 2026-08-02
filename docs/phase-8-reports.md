# Tahap 8 — Laporan dan Export CSV

Laporan dihitung melalui `ReportService` langsung dari IndexedDB tanpa request API.

## Fitur

- filter tanggal mulai/akhir dengan Flatpickr lokal;
- filter tipe, akun, dan kategori;
- ringkasan pemasukan, pengeluaran, cashflow bersih, dan jumlah transaksi;
- rincian transaksi;
- agregasi pengeluaran per kategori;
- pergerakan bersih per akun pada service;
- export CSV client-side dengan UTF-8 BOM.

Transaksi cancelled dan soft-deleted tidak masuk laporan. Export CSV melindungi cell teks yang diawali karakter formula spreadsheet untuk mengurangi risiko formula injection.
