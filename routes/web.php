<?php

use App\Http\Controllers\Admin\AuthController as AdminAuthController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\ResourceController as AdminResourceController;
use App\Http\Controllers\ClientAuthController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest:admin')->group(function () {
    Route::get('/admin/login', [AdminAuthController::class, 'create'])->name('admin.login');
    Route::post('/admin/login', [AdminAuthController::class, 'store'])->name('admin.login.store');
});

Route::prefix('admin')->name('admin.')->middleware('auth:admin')->group(function () {
    Route::get('/', AdminDashboardController::class)->name('dashboard');
    Route::get('/users', [AdminResourceController::class, 'users'])->name('users');
    Route::post('/users', [AdminResourceController::class, 'storeUser'])->name('users.store');
    Route::put('/users/{user}', [AdminResourceController::class, 'updateUser'])->name('users.update');
    Route::get('/payments', [AdminResourceController::class, 'payments'])->name('payments');
    Route::post('/payments', [AdminResourceController::class, 'storePayment'])->name('payments.store');
    Route::put('/payments/{payment}', [AdminResourceController::class, 'updatePayment'])->name('payments.update');
    Route::get('/licenses', [AdminResourceController::class, 'licenses'])->name('licenses');
    Route::put('/licenses/{license}', [AdminResourceController::class, 'updateLicense'])->name('licenses.update');
    Route::get('/installations', [AdminResourceController::class, 'installations'])->name('installations');
    Route::put('/installations/{installation}', [AdminResourceController::class, 'updateInstallation'])->name('installations.update');
    Route::post('/logout', [AdminAuthController::class, 'destroy'])->name('logout');
});

Route::prefix('api/client')->middleware('throttle:20,1')->group(function () {
    Route::post('/login', [ClientAuthController::class, 'login'])->name('client.login');
    Route::get('/verify', [ClientAuthController::class, 'verify'])->name('client.verify');
});

Route::get('/', function () {
    return view('pages.dashboard.index', ['title' => 'Dashboard']);
})->name('dashboard');

Route::view('/categories', 'pages.categories.index', ['title' => 'Kategori'])->name('categories');
Route::view('/accounts', 'pages.accounts.index', ['title' => 'Akun Keuangan'])->name('accounts');
Route::view('/transactions', 'pages.transactions.index', ['title' => 'Transaksi'])->name('transactions');
Route::view('/budgets', 'pages.budgets.index', ['title' => 'Budget'])->name('budgets');
Route::view('/saving-goals', 'pages.saving-goals.index', ['title' => 'Target Tabungan'])->name('saving-goals');
Route::view('/planner', 'pages.planner.index', ['title' => 'Planner'])->name('planner');
Route::view('/habits', 'pages.habits.index', ['title' => 'Habit Tracker'])->name('habits');
Route::view('/reports', 'pages.reports.index', ['title' => 'Laporan'])->name('reports');
Route::view('/backup', 'pages.backup.index', ['title' => 'Backup & Restore'])->name('backup');
Route::view('/settings', 'pages.settings.index', ['title' => 'Pengaturan'])->name('settings');

if (app()->environment('local')) {
    Route::view('/diagnostics', 'pages.diagnostics.index', ['title' => 'PWA Diagnostic'])->name('diagnostics');
}

$modules = [
];

foreach ($modules as $path => $title) {
    Route::view("/{$path}", 'pages.coming-soon', compact('title'))->name($path);
}
