# Tahap 5 — Transaction Engine

Seluruh perubahan transaksi berjalan melalui `TransactionService → TransactionRepository → Dexie` dalam transaksi database atomik.

## Jenis dan efek saldo

- `income`: menambah saldo akun.
- `expense`: mengurangi saldo akun.
- `transfer`: mengurangi akun sumber dan menambah akun tujuan.
- `adjustment`: delta bertanda; positif menambah dan negatif mengurangi.

Hanya transaksi `posted` yang tidak dihapus yang memengaruhi saldo. Edit langsung mengganti efek lama karena saldo selalu dihitung ulang dari sumber transaksi. Cancel dan soft delete mengeluarkan transaksi dari perhitungan.

## Integritas

- nominal disimpan sebagai integer IDR;
- akun sumber/tujuan wajib ada dan aktif;
- transfer tidak boleh menuju akun yang sama;
- kategori wajib aktif dan tipenya harus sesuai income/expense;
- tanggal divalidasi secara ketat;
- transaksi cancelled/deleted tidak dapat diedit;
- create, update, cancel, dan delete dicatat di `audit_logs`;
- delete menggunakan `deleted_at`, bukan menghilangkan histori langsung.

## UI

Halaman `/transactions` menyediakan tambah, edit, cancel, delete, pencarian, filter tipe, dan filter akun. Seluruh operasi bekerja langsung terhadap IndexedDB tanpa API Laravel.
