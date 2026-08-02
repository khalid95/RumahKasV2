# Tahap 4 — Akun Keuangan

Modul akun menggunakan `AccountService → AccountRepository → Dexie` dan tidak melakukan request ke Laravel.

## Fitur

- tambah, edit, aktif/nonaktif, dan hapus akun yang belum digunakan;
- tipe Tunai, Bank, E-Wallet, Kartu Kredit, Tabungan, Pinjaman, dan Lainnya;
- saldo awal dalam integer IDR;
- pilihan `include_in_total`;
- nama unik per profile lokal;
- proteksi akun yang sudah menjadi sumber atau tujuan transaksi.

## Perhitungan saldo

`BalanceService` menghitung saldo dari `opening_balance` dan transaksi posted:

- income menambah saldo sumber;
- expense mengurangi saldo sumber;
- transfer mengurangi sumber dan menambah tujuan;
- adjustment menggunakan delta bertanda (positif menambah, negatif mengurangi);
- cancelled dan soft-deleted diabaikan.

Nilai saldo pada UI selalu hasil kalkulasi dan tidak disimpan sebagai sumber kebenaran.
