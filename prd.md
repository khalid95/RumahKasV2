# PRD RumahKas — Lifetime Offline PWA

## 1. Ringkasan Produk

RumahKas adalah aplikasi personal finance untuk membantu pengguna atau keluarga mencatat dan mengelola keuangan sehari-hari.

RumahKas menggunakan model penjualan:

```txt
Bayar sekali
↓
Dapat akses aplikasi
↓
Install sebagai PWA
↓
Aplikasi tersimpan di perangkat
↓
Semua data disimpan lokal
↓
Dapat digunakan sepenuhnya secara offline
↓
Tidak membutuhkan server RumahKas untuk penggunaan sehari-hari
↓
Tidak ada biaya langganan
```

Setelah aplikasi berhasil di-install, pengguna dapat menggunakan seluruh fitur utama tanpa koneksi internet.

Data keuangan pengguna tidak disimpan pada server RumahKas.

Data disimpan secara lokal di perangkat menggunakan IndexedDB.

RumahKas dirancang sebagai:

```txt
Offline-first
Local-first
Privacy-first
Lifetime purchase
No subscription
No mandatory account
No cloud dependency
```

---

# 2. Prinsip Utama Produk

Prinsip terpenting RumahKas adalah:

> Setelah pengguna membeli dan memperoleh aplikasi, seluruh fungsi utama aplikasi harus dapat berjalan secara lokal di perangkat pengguna tanpa membutuhkan server RumahKas.

Server tidak boleh menjadi dependency untuk:

```txt
Membuka aplikasi
Mencatat transaksi
Mengedit transaksi
Menghapus transaksi
Mengelola akun
Mengelola kategori
Mengelola budget
Melihat dashboard
Menghasilkan laporan
Mengelola tabungan
Mengelola utang/piutang
Mengelola transaksi rutin
Backup data
Restore data
```

Internet hanya diperlukan ketika:

```txt
Pembelian awal
Download/install aplikasi
Mengambil update aplikasi jika tersedia
```

Setelah itu aplikasi harus dapat berjalan tanpa internet.

---

# 3. Model Distribusi

Flow pembelian:

```txt
User membeli RumahKas
        ↓
Pembayaran berhasil
        ↓
User mendapatkan akses instalasi
        ↓
User membuka RumahKas
        ↓
Install / Add to Home Screen
        ↓
PWA menyimpan seluruh application shell
        ↓
Database lokal dibuat
        ↓
RumahKas siap digunakan
```

Setelah instalasi:

```txt
Internet ON  → aplikasi berjalan
Internet OFF → aplikasi tetap berjalan
Server DOWN  → aplikasi tetap berjalan
```

Pengguna tidak membutuhkan koneksi ke database RumahKas.

---

# 4. Tujuan Produk

RumahKas bertujuan untuk:

1. Membantu pengguna mencatat pemasukan dan pengeluaran.
2. Menampilkan kondisi saldo secara cepat.
3. Mengelola beberapa akun keuangan.
4. Membantu mengontrol pengeluaran bulanan.
5. Membantu membuat dan memantau budget.
6. Membantu memantau target tabungan.
7. Mencatat utang dan piutang.
8. Mencatat cicilan dan transaksi rutin.
9. Menyediakan laporan keuangan.
10. Menjaga data keuangan tetap berada di perangkat pengguna.
11. Tetap dapat digunakan tanpa internet.
12. Tidak membebankan biaya server berkelanjutan kepada pemilik produk.
13. Mendukung model pembelian lifetime / sekali bayar.

---

# 5. Target Pengguna

Target utama:

```txt
Individu
Pasangan
Keluarga
Pengguna yang ingin mencatat keuangan pribadi
Pengguna yang tidak ingin data keuangannya berada di cloud
Pengguna yang menginginkan aplikasi sekali bayar
```

RumahKas bukan aplikasi keuangan bisnis atau accounting enterprise.

---

# 6. Scope MVP

Fitur utama versi pertama:

1. Dashboard.
2. Akun keuangan.
3. Kategori transaksi.
4. Pemasukan.
5. Pengeluaran.
6. Transfer antar akun.
7. Adjustment saldo.
8. Budget bulanan.
9. Filter dan pencarian transaksi.
10. Laporan dasar.
11. Local database.
12. Offline operation.
13. Installable PWA.
14. Backup data.
15. Restore data.
16. Export data.
17. Single currency IDR.
18. Dark mode.
19. Pengaturan aplikasi.

---

# 7. Scope Lanjutan

Fitur setelah MVP:

1. Target tabungan.
2. Utang dan piutang.
3. Cicilan.
4. Transaksi rutin.
5. Reminder lokal.
6. Upload bukti transaksi.
7. Export PDF.
8. Export Excel/CSV.
9. Import CSV.
10. Local notifications.
11. PIN lock.
12. Backup terenkripsi.
13. Multiple local profile.
14. Advanced financial report.

Cloud sync tidak menjadi bagian wajib dari arsitektur RumahKas.

Jika suatu saat tersedia, cloud merupakan produk atau fitur terpisah dan tidak boleh menjadi requirement bagi aplikasi offline.

---

# 8. Batasan Produk

RumahKas tidak mencakup:

```txt
Multi-currency pada MVP
Sinkronisasi otomatis dengan bank
Realtime stock/crypto
Akuntansi bisnis kompleks
Perhitungan pajak
Mandatory cloud account
Mandatory internet connection
Mandatory server authentication
Server-side storage transaksi pengguna
AI / LLM
Chatbot finansial
Financial advice otomatis
```

---

# 9. Arsitektur Sistem

## 9.1 Arsitektur Lama

Aplikasi saat ini menggunakan:

```txt
Blade
 ↓
jQuery
 ↓
Laravel Route
 ↓
Controller
 ↓
Model / Eloquent
 ↓
MySQL
```

Arsitektur tersebut tetap dipertahankan selama proses migrasi agar perubahan dapat dilakukan secara bertahap.

---

# 9.2 Arsitektur Target

Arsitektur runtime RumahKas:

```txt
PWA
 │
 ├── HTML
 ├── CSS
 ├── JavaScript
 ├── jQuery
 ├── Service Worker
 │
 └── Local Data Layer
           │
           ▼
       Dexie.js
           │
           ▼
       IndexedDB
```

Flow data:

```txt
Blade-generated UI / HTML
        ↓
jQuery
        ↓
Repository / Service JS
        ↓
Dexie.js
        ↓
IndexedDB
```

Tidak lagi:

```txt
Form
↓
AJAX
↓
Laravel Controller
↓
MySQL
```

untuk operasi data keuangan utama.

---

# 10. Tech Stack

## 10.1 Existing Development Stack

Stack existing tetap digunakan sebanyak mungkin:

```txt
Laravel
PHP
Blade
jQuery
JavaScript
Tailwind CSS
TailAdmin existing UI
Vite
```

Tidak melakukan rewrite menggunakan:

```txt
React
Vue
Inertia
Livewire
Flutter
```

---

# 10.2 PWA Stack

Tambahan untuk kemampuan PWA:

```txt
Web App Manifest
Service Worker
Cache Storage API
PWA installability
Offline application shell
```

Web App Manifest menangani:

```txt
App name
Icons
Theme
Display standalone
Start URL
Orientation
```

Service Worker menangani:

```txt
Offline application assets
HTML cache
CSS cache
JavaScript cache
Font cache
Icon cache
Offline fallback
Application update
```

---

# 10.3 Local Database

Database utama aplikasi yang sudah diterima pengguna adalah:

```txt
IndexedDB
```

Wrapper:

```txt
Dexie.js
```

Tidak menggunakan:

```txt
localStorage
```

sebagai database transaksi.

localStorage hanya boleh digunakan untuk preference ringan jika diperlukan.

Contoh:

```txt
theme
last selected menu
UI preference
```

---

# 10.4 Runtime Production

Yang berjalan pada perangkat pengguna:

```txt
HTML
CSS
JavaScript
jQuery
Dexie.js
IndexedDB
Service Worker
Cache Storage
Web APIs browser
```

Yang TIDAK dibutuhkan ketika aplikasi digunakan:

```txt
PHP
Laravel server
Nginx
Apache
MySQL
Redis
Laravel Queue
Laravel Scheduler
Laravel Sanctum
```

---

# 11. Peran Laravel

Laravel tidak dibuang dari project existing.

Laravel tetap dapat digunakan selama development untuk:

```txt
Existing Blade views
Existing UI
Existing source code
Development environment
Build process
Migration reference
Landing/download system jika dibutuhkan
Payment integration jika pembayaran dikelola sendiri
```

Namun Laravel tidak menjadi dependency runtime aplikasi setelah aplikasi terinstall.

Target akhir:

```txt
Laravel project
      ↓
build
      ↓
PWA assets
      ↓
user install
      ↓
offline application
```

---

# 12. Peran MySQL

MySQL existing tetap dipertahankan sementara selama proses migrasi.

Tujuannya:

```txt
Referensi struktur database lama
Menjaga aplikasi lama tetap berjalan selama migration
Membandingkan hasil IndexedDB dengan database lama
Migration testing
```

Setelah seluruh modul berhasil dipindahkan ke IndexedDB:

```txt
MySQL tidak digunakan untuk data finansial pengguna pada versi offline production.
```

---

# 13. Local Data Architecture

Database lokal:

```txt
rumahkas
```

Object stores utama:

```txt
settings
profiles
financial_accounts
categories
transactions
budgets
saving_goals
saving_goal_contributions
debts
debt_payments
recurring_transactions
attachments
notifications
audit_logs
```

---

# 14. Identifier

ID database tidak sebaiknya lagi hanya bergantung pada auto increment sederhana.

Gunakan UUID untuk entity utama.

Contoh:

```txt
transaction_id:
550e8400-e29b-41d4-a716-446655440000
```

Tujuannya:

```txt
Backup lebih aman
Restore lebih mudah
Menghindari collision
Mempermudah migrasi data
Mempermudah kemungkinan sync di masa depan
```

---

# 15. Repository Layer

UI tidak boleh berkomunikasi langsung dengan Dexie di berbagai file.

Gunakan repository layer.

Contoh arsitektur:

```txt
Transaction Form
       ↓
TransactionService
       ↓
TransactionRepository
       ↓
Dexie
       ↓
IndexedDB
```

Contoh repository:

```txt
AccountRepository
CategoryRepository
TransactionRepository
BudgetRepository
SavingGoalRepository
DebtRepository
RecurringTransactionRepository
SettingsRepository
```

Tujuannya agar data-access logic tidak tersebar pada seluruh kode jQuery.

---

# 16. Business Service Layer

Business rule dipisahkan dari UI.

Contoh:

```txt
TransactionService
BalanceService
BudgetService
DashboardService
ReportService
BackupService
RestoreService
RecurringTransactionService
```

jQuery bertanggung jawab terutama untuk:

```txt
DOM
event handler
form interaction
modal
rendering UI
```

Business logic tidak boleh seluruhnya ditulis langsung di event handler jQuery.

---

# 17. Akun Keuangan

Contoh:

```txt
Cash
BCA
Mandiri
BRI
BNI
Dana
OVO
GoPay
Tabungan
Kartu Kredit
Dompet
```

Tipe:

```txt
Cash
Bank
E-wallet
Credit Card
Savings
Loan
Other
```

Data:

```txt
id
name
type
opening_balance
include_in_total
is_active
notes
created_at
updated_at
```

`current_balance` sebaiknya dapat dihitung kembali berdasarkan transaksi.

Jika disimpan sebagai cached value, harus tersedia mekanisme recalculation.

---

# 18. Kategori

Kategori pemasukan default:

```txt
Gaji
Bonus
Usaha
Freelance
Hadiah
Investasi
Lainnya
```

Kategori pengeluaran default:

```txt
Makanan
Belanja Rumah
Transportasi
Pendidikan
Kesehatan
Tagihan
Cicilan
Hiburan
Donasi
Anak
Orang Tua
Pulsa & Internet
Lainnya
```

Data:

```txt
id
parent_id
name
type
icon
color
is_default
is_active
created_at
updated_at
```

---

# 19. Transaksi

Jenis transaksi:

```txt
income
expense
transfer
adjustment
```

Status:

```txt
draft
posted
cancelled
```

Field utama:

```txt
id
profile_id
financial_account_id
destination_account_id
category_id
type
amount
transaction_date
title
description
status
attachment_id
source
recurring_transaction_id
created_at
updated_at
deleted_at
```

Source:

```txt
manual
import
recurring
```

---

# 20. Business Rule Transaksi

Income:

```txt
Menambah saldo akun
```

Expense:

```txt
Mengurangi saldo akun
```

Transfer:

```txt
Mengurangi saldo akun sumber
Menambah saldo akun tujuan
```

Adjustment:

```txt
Menyesuaikan saldo berdasarkan koreksi user
```

Edit:

```txt
Rollback efek transaksi lama
↓
Update transaksi
↓
Apply transaksi baru
```

Delete:

```txt
Rollback efek transaksi
↓
Soft delete / delete
```

Cancel:

```txt
Rollback efek transaksi
↓
status = cancelled
```

Seluruh perubahan harus melalui:

```txt
TransactionService
```

---

# 21. Dashboard

Dashboard menampilkan:

```txt
Total Saldo
Pemasukan Bulan Ini
Pengeluaran Bulan Ini
Cashflow Bersih
Budget Bulan Ini
Cashflow Chart
Expense by Category
Recent Transactions
Saving Goals
Upcoming Bills
Quick Actions
```

Semua kalkulasi dilakukan terhadap IndexedDB.

Tidak boleh membutuhkan API Laravel untuk menampilkan dashboard.

---

# 22. Budget

Field:

```txt
id
category_id
profile_id
month
year
amount
notes
created_at
updated_at
```

Business rules:

```txt
Expense masuk perhitungan budget
Transfer tidak masuk
Cancelled transaction tidak masuk
Budget berdasarkan periode
Parent category dapat menghitung child category
```

Status:

```txt
0–70%   Aman
71–90%  Perhatian
91–100% Hampir habis
>100%   Over budget
```

---

# 23. Target Tabungan

Data:

```txt
id
financial_account_id
name
target_amount
current_amount
target_date
status
notes
created_at
updated_at
```

Status:

```txt
on_track
behind
completed
cancelled
```

---

# 24. Utang dan Piutang

Jenis:

```txt
debt
receivable
installment
credit_card
paylater
```

Data:

```txt
id
profile_id
type
person_name
title
initial_amount
remaining_amount
start_date
due_date
status
notes
created_at
updated_at
```

Payment history disimpan pada:

```txt
debt_payments
```

---

# 25. Transaksi Rutin

Contoh:

```txt
Gaji
Listrik
Internet
Cicilan
SPP
Asuransi
Langganan aplikasi
```

Data:

```txt
id
financial_account_id
destination_account_id
category_id
type
title
amount
frequency
interval
start_date
end_date
next_run_date
is_active
notes
created_at
updated_at
```

Karena aplikasi sepenuhnya offline, recurring transaction tidak bergantung pada Laravel Scheduler.

Saat aplikasi dibuka:

```txt
App startup
    ↓
RecurringTransactionService
    ↓
Check next_run_date
    ↓
Generate transaction yang jatuh tempo
    ↓
Update next_run_date
```

---

# 26. Laporan

Jenis laporan:

```txt
Cashflow
Income
Expense
Category
Account
Budget
Saving Goal
Debt / Receivable
```

Filter:

```txt
Tanggal
Bulan
Tahun
Kategori
Akun
Tipe transaksi
```

Laporan dihitung lokal menggunakan IndexedDB.

Output:

```txt
On-screen report
CSV
Excel jika library memungkinkan sepenuhnya client-side
PDF jika library memungkinkan sepenuhnya client-side
```

Export tidak boleh membutuhkan server.

---

# 27. Backup Data

Backup merupakan fitur WAJIB.

Karena database berada di perangkat pengguna:

```txt
Clear browser data
Uninstall PWA
Device rusak
Factory reset
Browser profile terhapus
```

dapat menyebabkan kehilangan database.

Pengguna harus dapat memilih:

```txt
Settings
↓
Backup Data
↓
Download backup
```

Format:

```txt
rumahkas-backup-YYYY-MM-DD.rumahkas
```

atau:

```txt
.json
```

Backup mencakup:

```txt
Accounts
Categories
Transactions
Budgets
Saving Goals
Debts
Recurring Transactions
Settings
```

---

# 28. Restore

Flow:

```txt
Install RumahKas
↓
Restore Backup
↓
Pilih file
↓
Validasi backup
↓
Tampilkan informasi backup
↓
Konfirmasi user
↓
Restore IndexedDB
↓
Recalculate balance
↓
Dashboard
```

Restore wajib memvalidasi:

```txt
backup version
schema version
required stores
invalid data
duplicate UUID
```

---

# 29. Backup Encryption

Untuk versi lanjutan dapat disediakan:

```txt
Encrypted Backup
```

Menggunakan:

```txt
Web Crypto API
```

Flow:

```txt
User membuat backup
↓
Masukkan backup password
↓
Data dienkripsi
↓
File didownload
```

Password tidak dikirim ke server.

---

# 30. Attachment / Bukti Transaksi

Attachment tidak boleh dikirim ke server.

Attachment dapat disimpan:

```txt
IndexedDB Blob
```

Namun perlu diberikan batas ukuran agar database browser tidak membengkak.

Fitur attachment dapat dibuat optional.

---

# 31. Offline Requirement

Setelah instalasi sukses:

```txt
Airplane mode ON
```

seluruh fitur utama tetap harus bisa digunakan.

Acceptance test wajib:

```txt
Install aplikasi
Buka aplikasi sekali
Matikan internet
Tutup browser
Buka kembali dari home screen
Tambah transaksi
Edit transaksi
Hapus transaksi
Lihat dashboard
Buat budget
Lihat laporan
Backup database
```

Semua harus berhasil.

---

# 32. PWA Requirement

Manifest harus memiliki minimal:

```txt
name
short_name
start_url
display = standalone
background_color
theme_color
icons
```

Service Worker harus melakukan cache terhadap application shell.

Contoh:

```txt
/
dashboard
assets/app.css
assets/app.js
assets/vendor.js
icons
fonts
```

Strategi caching harus memastikan aplikasi yang sudah terinstall tetap bisa dibuka ketika server tidak tersedia.

---

# 33. Update Aplikasi

Karena aplikasi offline, update harus dirancang hati-hati.

Flow normal:

```txt
App mendeteksi versi baru ketika online
↓
Download assets terbaru
↓
Service Worker install
↓
User diberi informasi:
"Versi baru tersedia"
↓
User memilih Update
↓
Service Worker activate
↓
Reload
```

Update aplikasi tidak boleh:

```txt
Menghapus IndexedDB
Reset transaksi
Menghapus backup
Mengganti database tanpa migration
```

Setiap perubahan schema IndexedDB wajib memiliki migration.

---

# 34. Schema Versioning

Dexie menggunakan database version.

Contoh:

```txt
Version 1
accounts
categories
transactions
budgets

Version 2
saving_goals

Version 3
debts
debt_payments
```

Setiap versi aplikasi harus kompatibel dengan data existing.

---

# 35. Authentication Lokal

Karena tidak ada server, register/login online tidak diperlukan.

Default:

```txt
User membuka aplikasi
↓
langsung menggunakan RumahKas
```

Optional security:

```txt
Local PIN
```

PIN hanya melindungi akses aplikasi pada perangkat tersebut.

PIN tidak bergantung pada Laravel.

PIN tidak dikirim ke server.

---

# 36. Profile / Household

Konsep household lama disederhanakan agar cocok untuk local-first.

Default:

```txt
1 installation
=
1 household
```

Household menyimpan:

```txt
id
name
currency_default
month_start_day
created_at
updated_at
```

Optional multiple local profiles:

```txt
Ayah
Ibu
Bersama
```

Profile bukan akun server.

Tidak ada:

```txt
Email invitation
Remote member management
Online permission
Server-side role
```

untuk versi offline.

---

# 37. UI Stack

UI existing dipertahankan.

```txt
Blade
Tailwind CSS
TailAdmin existing design
jQuery
JavaScript
Chart.js / ApexCharts
Flatpickr
Tom Select
AutoNumeric / Cleave
SweetAlert2
Lucide / Heroicons
```

Jangan menambahkan:

```txt
React
Vue
Inertia
Livewire
```

hanya untuk implementasi PWA.

---

# 38. UI Direction

Tema:

```txt
RumahKas Finance Dashboard
```

Karakter:

```txt
Modern
Clean
Soft
Minimal
Responsive
Personal finance
Mobile friendly
Family friendly
```

Dashboard harus terasa seperti aplikasi personal finance, bukan admin panel.

Komponen utama:

```txt
Hero balance
Quick action
Recent transactions
Cashflow chart
Expense category
Budget progress
Saving goal
Upcoming payment
```

---

# 39. Navigasi

```txt
Dashboard
Transaksi
Akun Keuangan
Kategori
Budget
Target Tabungan
Utang & Piutang
Transaksi Rutin
Laporan
Backup & Restore
Pengaturan
```

Topbar:

```txt
Periode
Search
Tambah Transaksi
Backup Status
Dark Mode
Settings
```

Tidak ada tombol AI.

---

# 40. Security

Karena data bersifat lokal:

```txt
Tidak mengirim transaksi ke server
Tidak mengirim histori transaksi
Tidak mengirim saldo
Tidak mengirim kategori
Tidak mengirim data finansial
```

Tambahan security:

```txt
CSP
Secure dependency versions
Input validation
File validation
XSS prevention
Backup validation
Optional backup encryption
Optional local PIN
```

---

# 41. Privacy

Prinsip privacy:

> Data keuangan pengguna adalah milik pengguna dan tetap berada pada perangkat pengguna.

RumahKas tidak memerlukan telemetry data finansial.

Jika analytics penggunaan website digunakan, analytics tidak boleh membaca IndexedDB keuangan.

---

# 42. Performance Requirement

Target:

```txt
App startup < 2 detik setelah cached
Input transaksi < 300 ms
Dashboard calculation < 1 detik untuk penggunaan normal
Search transaksi terasa instant
Offline startup tersedia
```

IndexedDB perlu menggunakan index untuk field penting:

```txt
transaction_date
financial_account_id
category_id
type
status
created_at
```

---

# 43. Data Integrity

Aplikasi wajib mampu melakukan:

```txt
Balance recalculation
Database integrity check
Backup validation
Migration validation
Transaction rollback
Duplicate UUID detection
```

Saldo tidak boleh hanya bergantung pada nilai cached.

Harus tersedia mekanisme:

```txt
Recalculate Balance
```

berdasarkan seluruh transaksi posted.

---

# 44. Payment dan Ownership

Pembayaran dilakukan sebelum pengguna memperoleh akses aplikasi.

Setelah pembayaran selesai:

```txt
User mendapatkan hak menggunakan versi yang dibeli
```

Aplikasi yang sudah berhasil di-install tidak membutuhkan pengecekan pembayaran secara terus-menerus.

Tidak boleh terjadi:

```txt
App meminta server setiap startup
App logout karena server down
App terkunci karena internet mati
App gagal dibuka karena payment API unavailable
```

Jika activation digunakan, activation hanya boleh menjadi proses awal dan setelahnya aplikasi harus dapat berjalan offline.

---

# 45. Lifetime Access

Definisi Lifetime Access RumahKas:

> Pengguna yang sudah membeli dapat terus menggunakan versi aplikasi yang telah diperolehnya tanpa biaya langganan dan tanpa ketergantungan pada server RumahKas.

Lifetime tidak berarti semua layanan cloud masa depan harus diberikan gratis.

Karena versi ini tidak bergantung pada cloud, biaya operasional per pengguna dapat ditekan seminimal mungkin.

---

# 46. Ownership Data

Pengguna memiliki kontrol penuh terhadap data.

Pengguna harus dapat:

```txt
Backup seluruh data
Restore seluruh data
Export transaksi
Menghapus seluruh database lokal
Memindahkan backup ke perangkat lain
```

RumahKas tidak menjadi satu-satunya tempat user dapat memperoleh kembali data mereka.

---

# 47. Install ke Perangkat Baru

Flow:

```txt
Device Lama
↓
Backup
↓
rumahkas-backup.rumahkas
↓
Device Baru
↓
Install RumahKas
↓
Restore
↓
Seluruh data kembali
```

Tidak membutuhkan akun cloud.

---

# 48. Development Strategy

Migrasi dilakukan bertahap.

## Phase 1 — Audit Existing Application

Tidak mengubah behaviour.

Analisis:

```txt
Laravel routes
Controllers
Models
Blade
jQuery
AJAX
MySQL tables
Business logic
Dependencies
```

---

## Phase 2 — JavaScript Data Architecture

Tambahkan:

```txt
Repository layer
Service layer
Database module
```

Belum menghapus Laravel/MySQL.

---

## Phase 3 — IndexedDB Foundation

Tambahkan:

```txt
Dexie.js
Database schema
Database version
Database initialization
Seed default category
```

Belum memindahkan seluruh aplikasi.

---

## Phase 4 — Category Migration

Kategori menjadi modul pertama yang menggunakan IndexedDB.

Verifikasi:

```txt
Create
Read
Update
Delete
Offline
```

---

## Phase 5 — Financial Account Migration

Pindahkan akun ke IndexedDB.

---

## Phase 6 — Transaction Migration

Pindahkan:

```txt
Income
Expense
Transfer
Adjustment
```

ke IndexedDB.

Implement:

```txt
TransactionService
BalanceService
```

---

## Phase 7 — Dashboard Local

Dashboard berhenti mengambil data dari Laravel API/controller.

Seluruh summary dihitung dari local database.

---

## Phase 8 — Budget dan Report Local

Budget dan report menggunakan IndexedDB.

---

## Phase 9 — Full PWA

Implement:

```txt
manifest
service worker
offline caching
installability
offline fallback
update strategy
```

---

## Phase 10 — Backup & Restore

Implement:

```txt
full export
restore
schema validation
balance recalculation
```

Tahap ini wajib sebelum produk dijual.

---

## Phase 11 — Advanced Modules

Migrasi:

```txt
Saving goals
Debt
Receivable
Recurring transactions
Attachments
```

---

## Phase 12 — Remove Runtime Server Dependency

Audit seluruh:

```txt
AJAX
fetch
form action
server API
Laravel routes
auth dependency
```

Tidak boleh ada request server yang dibutuhkan untuk fungsi utama.

---

## Phase 13 — Offline Acceptance Test

Testing dilakukan dengan server/internet dimatikan.

---

# 49. Acceptance Criteria

Produk dianggap siap dijual jika:

```txt
PWA bisa di-install
Aplikasi bisa dibuka offline
Database dibuat di IndexedDB
Account CRUD berjalan offline
Category CRUD berjalan offline
Transaction CRUD berjalan offline
Income menghitung saldo benar
Expense menghitung saldo benar
Transfer menghitung saldo benar
Edit mengoreksi saldo
Delete mengoreksi saldo
Cancel mengoreksi saldo
Dashboard berjalan offline
Budget berjalan offline
Report berjalan offline
Search berjalan offline
Backup berjalan offline
Restore berjalan offline
App tetap berjalan ketika server tidak tersedia
App tetap berjalan setelah browser ditutup
Data tetap tersedia setelah restart device
Database migration tidak menghapus data
```

---

# 50. Risiko

## Risiko — User menghapus browser data

Dampak:

```txt
IndexedDB dapat terhapus
```

Mitigasi:

```txt
Backup reminder
Manual backup
Encrypted backup
Clear warning sebelum reset data
```

---

## Risiko — Device hilang/rusak

Mitigasi:

```txt
User dianjurkan menyimpan backup di tempat lain
```

---

## Risiko — Update merusak schema

Mitigasi:

```txt
Dexie database versioning
Migration testing
Backup sebelum major migration
```

---

## Risiko — Service Worker cache versi lama

Mitigasi:

```txt
Cache versioning
Controlled update strategy
Old cache cleanup
```

---

## Risiko — Perhitungan saldo salah

Mitigasi:

```txt
Central TransactionService
Central BalanceService
Recalculate balance
Automated tests
```

---

## Risiko — Browser storage limitation

Mitigasi:

```txt
Request persistent storage jika didukung
Monitor storage usage
Batasi ukuran attachment
Backup reminder
```

---

# 51. Tech Stack Final

## Development / Existing Codebase

```txt
Laravel
PHP
Blade
jQuery
JavaScript
Tailwind CSS
TailAdmin existing UI
Vite
MySQL existing selama masa migrasi
```

## Offline Production Runtime

```txt
Progressive Web App
Web App Manifest
Service Worker
Cache Storage API
IndexedDB
Dexie.js
jQuery
JavaScript
HTML
CSS
Chart.js / ApexCharts
Web Crypto API
```

## Tidak Digunakan pada Runtime Offline

```txt
MySQL
Laravel database connection
Laravel Sanctum
Laravel Queue
Laravel Scheduler
Redis
Server-side session
Server-side authentication
Cloud database
LLM
OpenRouter
```

---

# 52. Arsitektur Final

```txt
                   RUMAHKAS
                       │
                       ▼
               Installable PWA
                       │
        ┌──────────────┴──────────────┐
        │                             │
 Application Layer               Data Layer
        │                             │
 Blade-based HTML                 Dexie.js
 Tailwind CSS                        │
 jQuery                              ▼
 JavaScript                       IndexedDB
 Chart.js                            │
        │                     User Financial Data
        │
 Service Worker
        │
 Cache Storage
        │
 Offline Application
```

Tidak ada dependency wajib:

```txt
PWA
 ↓
Internet
 ↓
Laravel
 ↓
MySQL
```

untuk operasi sehari-hari.

---

# 53. Definisi Selesai

RumahKas versi offline lifetime dinyatakan selesai apabila skenario berikut berhasil:

```txt
User membeli aplikasi.

User menginstall RumahKas.

User membuka aplikasi.

User membuat akun Cash dan BCA.

User membuat kategori.

User mencatat pemasukan.

User mencatat pengeluaran.

User melakukan transfer.

User membuat budget.

User melihat dashboard dan laporan.

User membuat backup.

User menutup aplikasi.

Internet dimatikan.

Server RumahKas tidak dapat diakses.

User membuka RumahKas dari home screen.

Seluruh data masih tersedia.

User menambahkan transaksi baru.

Dashboard berubah dengan benar.

User melakukan backup baru.

Semua fungsi tersebut berhasil tanpa server.
```

Jika skenario tersebut berhasil, maka tujuan utama:

```txt
BUY ONCE
INSTALL
OWN YOUR DATA
USE OFFLINE
NO SUBSCRIPTION
```

telah tercapai.
