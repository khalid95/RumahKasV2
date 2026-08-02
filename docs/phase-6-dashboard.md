# Tahap 6 — Dashboard Lokal

Dashboard memakai `DashboardService` dan menghitung seluruh nilai langsung dari IndexedDB.

## Data yang ditampilkan

- total saldo dari akun aktif dengan `include_in_total`;
- pemasukan dan pengeluaran bulan berjalan;
- cashflow bersih;
- grafik harian pemasukan/pengeluaran;
- lima kategori pengeluaran terbesar;
- lima transaksi terbaru.

Saldo awal langsung memengaruhi total saldo. Transaksi posted memengaruhi saldo dan ringkasan periodik, sedangkan cancelled dan soft-deleted diabaikan. Transfer dan adjustment memengaruhi saldo akun, tetapi tidak diklasifikasikan sebagai pemasukan atau pengeluaran bulanan.
