# Tahap 7 — Budget Bulanan

Budget memakai `BudgetService → BudgetRepository → Dexie` dan dihitung langsung dari expense posted pada periode yang dipilih.

## Aturan

- satu kategori hanya memiliki satu budget per bulan/profile;
- hanya kategori pengeluaran yang dapat diberi budget;
- transfer, income, adjustment, cancelled, dan soft-deleted tidak dihitung;
- budget parent menyertakan pengeluaran child category;
- nominal berupa integer IDR dan menggunakan money mask di UI.

## Status

- sampai 70%: Aman;
- di atas 70% sampai 90%: Perhatian;
- di atas 90% sampai 100%: Hampir habis;
- di atas 100%: Over budget.

Persentase pemakaian budget periode berjalan juga ditampilkan pada dashboard.
