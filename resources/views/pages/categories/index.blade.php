@extends('layouts.app')

@section('content')
<div data-category-page class="space-y-6">
    <section class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
            <p class="mb-1 text-sm font-medium text-brand-600">Pengaturan transaksi</p>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Kategori</h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Kelompokkan pemasukan dan pengeluaran agar laporan mudah dibaca.</p>
        </div>
        <button type="button" data-add-category="expense" class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">
            <span class="text-lg leading-none">+</span> Tambah kategori
        </button>
    </section>

    <section class="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row dark:border-gray-800 dark:bg-white/[0.03]"><label class="relative flex-1"><span class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">⌕</span><input data-category-search type="search" autocomplete="off" placeholder="Cari kategori…" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent pl-10 pr-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700"></label><select data-category-status class="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm dark:border-gray-700 dark:bg-gray-900"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></section>

    <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <header class="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <div class="flex items-center gap-3">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-success-50 font-bold text-success-600 dark:bg-success-500/10">+</span>
                    <div><h3 class="font-semibold text-gray-900 dark:text-white">Pemasukan</h3><p class="text-xs text-gray-500"><span data-category-count="income">0</span> kategori</p></div>
                </div>
                <button type="button" data-add-category="income" class="rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">Tambah</button>
            </header>
            <div data-category-list="income"><p class="px-5 py-10 text-center text-sm text-gray-500">Memuat kategori…</p></div>
        </article>

        <article class="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <header class="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                <div class="flex items-center gap-3">
                    <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-error-50 font-bold text-error-600 dark:bg-error-500/10">−</span>
                    <div><h3 class="font-semibold text-gray-900 dark:text-white">Pengeluaran</h3><p class="text-xs text-gray-500"><span data-category-count="expense">0</span> kategori</p></div>
                </div>
                <button type="button" data-add-category="expense" class="rounded-lg px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">Tambah</button>
            </header>
            <div data-category-list="expense"><p class="px-5 py-10 text-center text-sm text-gray-500">Memuat kategori…</p></div>
        </article>
    </section>

    <aside class="rounded-2xl border border-brand-100 bg-brand-25 p-5 text-sm text-gray-600 dark:border-brand-500/20 dark:bg-brand-500/5 dark:text-gray-400">
        Semua kategori, termasuk kategori bawaan, dapat diedit, dinonaktifkan, atau dihapus. Kategori yang sudah digunakan transaksi tetap dipertahankan untuk menjaga integritas laporan.
    </aside>
</div>

<div data-category-modal class="app-modal fixed inset-0 z-99999 hidden items-center justify-center bg-gray-950/50 p-4" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="category-modal-title">
    <div class="app-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
        <div class="mb-5 flex items-center justify-between">
            <h2 id="category-modal-title" data-modal-title class="text-xl font-bold text-gray-900 dark:text-white">Tambah kategori</h2>
            <button type="button" data-close-category-modal class="rounded-lg p-2 text-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Tutup">×</button>
        </div>
        <form id="category-form" class="space-y-4">
            <input type="hidden" name="id">
            <div>
                <label for="category-name" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Nama kategori</label>
                <input id="category-name" name="name" type="text" maxlength="60" required autocomplete="off" placeholder="Contoh: Hewan Peliharaan" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:text-white">
            </div>
            <div>
                <label for="category-type" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Tipe</label>
                <select id="category-type" name="type" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-900 outline-none focus:border-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white">
                    <option value="expense">Pengeluaran</option><option value="income">Pemasukan</option>
                </select>
            </div>
            <div>
                <label for="category-icon" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Ikon <span class="font-normal text-gray-400">(opsional)</span></label>
                <input id="category-icon" name="icon" type="text" maxlength="8" autocomplete="off" placeholder="Contoh: 🍔, 🏠, 💼" class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm outline-none focus:border-brand-500 dark:border-gray-700">
                <p class="mt-1 text-xs text-gray-400">Gunakan satu emoji agar kategori mudah dikenali.</p>
            </div>
            <div>
                <label for="category-color" class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Warna</label>
                <input id="category-color" name="color" type="color" value="#f04438" class="h-11 w-full cursor-pointer rounded-lg border border-gray-300 bg-transparent p-1 dark:border-gray-700">
            </div>
            <p data-category-error class="hidden rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400"></p>
            <div class="flex justify-end gap-3 pt-2">
                <button type="button" data-close-category-modal class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
                <button type="submit" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60">Simpan kategori</button>
            </div>
        </form>
    </div>
</div>

<div data-category-toast class="app-toast hidden"></div>
@endsection
