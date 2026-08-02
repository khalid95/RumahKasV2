@extends('layouts.app')

@section('content')
<div data-account-page class="space-y-6">
    <section class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p class="mb-1 text-sm font-medium text-brand-600">Dompet dan rekening</p><h2 class="text-2xl font-bold text-gray-900 dark:text-white">Akun Keuangan</h2><p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Kelola sumber dana dan pantau saldo di satu tempat.</p></div>
        <button data-add-account type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600"><span class="text-lg">+</span> Tambah akun</button>
    </section>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p class="text-sm text-gray-500">Total saldo</p><p data-account-total class="mt-2 text-xl font-bold text-gray-900 dark:text-white">Rp0</p></article>
        <article class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p class="text-sm text-gray-500">Jumlah akun</p><p data-account-count class="mt-2 text-xl font-bold text-gray-900 dark:text-white">0</p></article>
        <article class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><p class="text-sm text-gray-500">Akun aktif</p><p data-active-account-count class="mt-2 text-xl font-bold text-gray-900 dark:text-white">0</p></article>
    </section>

    <section data-account-list class="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"><p class="col-span-full py-10 text-center text-sm text-gray-500">Memuat akun…</p></section>

    <aside class="rounded-2xl border border-brand-100 bg-brand-25 p-5 text-sm text-gray-600 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-gray-400">Saldo saat ini dihitung dari saldo awal dan seluruh transaksi berstatus posted. Akun yang sudah digunakan transaksi tidak dapat dihapus agar histori tetap utuh.</aside>
</div>

<div data-account-modal class="app-modal fixed inset-0 z-99999 hidden items-center justify-center overflow-y-auto bg-gray-950/50 p-4" role="dialog" aria-modal="true" aria-hidden="true">
    <div class="app-modal-panel my-6 w-full max-w-lg rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
        <div class="mb-5 flex items-center justify-between"><h2 data-account-modal-title class="text-xl font-bold text-gray-900 dark:text-white">Tambah akun</h2><button data-close-account-modal type="button" class="rounded-lg p-2 text-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">×</button></div>
        <form id="account-form" class="space-y-4">
            <input type="hidden" name="id">
            <div><label for="account-name" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nama akun</label><input id="account-name" name="name" maxlength="60" required placeholder="Contoh: BCA Utama" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white"></div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div><label for="account-type" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipe akun</label><select id="account-type" name="type" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"><option value="cash">Tunai</option><option value="bank">Bank</option><option value="e_wallet">E-Wallet</option><option value="credit_card">Kartu Kredit</option><option value="savings">Tabungan</option><option value="loan">Pinjaman</option><option value="other">Lainnya</option></select></div>
                <div><label for="opening-balance" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Saldo awal</label><input id="opening-balance" name="opening_balance" type="text" inputmode="numeric" data-money-input data-allow-negative="true" value="0" required autocomplete="off" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"></div>
            </div>
            <div><label for="account-notes" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Catatan <span class="font-normal text-gray-400">(opsional)</span></label><textarea id="account-notes" name="notes" rows="3" maxlength="250" class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:text-white"></textarea></div>
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700"><input name="include_in_total" type="checkbox" value="1" checked class="mt-0.5 h-4 w-4 accent-brand-500"><span><span class="block text-sm font-medium text-gray-800 dark:text-gray-200">Masukkan dalam total saldo</span><span class="mt-0.5 block text-xs text-gray-500">Nonaktifkan untuk akun seperti kartu kredit atau dana terpisah.</span></span></label>
            <p data-account-error class="hidden rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400"></p>
            <div class="flex justify-end gap-3 pt-2"><button data-close-account-modal type="button" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Batal</button><button type="submit" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">Simpan akun</button></div>
        </form>
    </div>
</div>
<div data-account-toast class="app-toast hidden"></div>
@endsection
