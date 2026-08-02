@extends('layouts.app')

@section('content')
<div data-backup-page class="space-y-6">
    <section><p class="mb-1 text-sm font-medium text-brand-600">Perlindungan data lokal</p><h2 class="text-2xl font-bold text-gray-900 dark:text-white">Backup & Restore</h2><p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">Simpan salinan data keuangan terenkripsi. File diproses sepenuhnya di perangkat dan tidak dikirim ke server.</p></section>

    <section class="grid gap-6 xl:grid-cols-2">
        <article class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <div class="flex items-start gap-4"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl text-brand-600 dark:bg-brand-500/10">↓</span><div><h3 class="font-semibold text-gray-900 dark:text-white">Buat backup baru</h3><p class="mt-1 text-sm leading-6 text-gray-500">Akun, transaksi, kategori, budget, dan pengaturan akan dienkripsi dengan AES-256.</p></div></div>
            <form data-export-form class="mt-6 space-y-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password backup<input name="password" type="password" minlength="8" required autocomplete="new-password" placeholder="Minimal 8 karakter" class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 outline-none focus:border-brand-500 dark:border-gray-700"></label>
                <p class="rounded-xl bg-warning-50 p-3 text-xs leading-5 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">Simpan password ini dengan aman. Backup tidak dapat dibuka jika password terlupa.</p>
                <button class="h-11 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50">Download backup terenkripsi</button>
            </form>
        </article>

        <article class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] sm:p-6">
            <div class="flex items-start gap-4"><span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-light-50 text-xl text-blue-light-600 dark:bg-blue-light-500/10">↑</span><div><h3 class="font-semibold text-gray-900 dark:text-white">Buka file backup</h3><p class="mt-1 text-sm leading-6 text-gray-500">Periksa isi backup sebelum memilih cara pemulihan.</p></div></div>
            <form data-preview-form class="mt-6 space-y-4">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">File RumahKas<input name="file" type="file" accept=".rumahkas,application/json" required class="mt-1.5 block w-full rounded-lg border border-gray-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 dark:border-gray-700 dark:file:bg-gray-800"></label>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password file<input name="password" type="password" minlength="8" required autocomplete="current-password" class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 outline-none focus:border-brand-500 dark:border-gray-700"></label>
                <button class="h-11 w-full rounded-lg border border-brand-500 text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-500/10">Buka dan periksa</button>
            </form>
        </article>
    </section>

    <section data-preview class="hidden rounded-2xl border border-brand-200 bg-brand-25 p-5 dark:border-brand-800 dark:bg-brand-500/[0.06] sm:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div class="flex-1"><p class="text-sm font-semibold text-brand-700 dark:text-brand-400">File berhasil dibuka</p><h3 class="mt-1 text-xl font-bold text-gray-900 dark:text-white">Preview backup</h3><p class="mt-1 text-sm text-gray-500">Dibuat pada <span data-preview-date>-</span></p><div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">@foreach ([['accounts','Akun'],['categories','Kategori'],['transactions','Transaksi'],['budgets','Budget']] as [$key,$label])<div class="rounded-xl bg-white p-3 dark:bg-gray-900"><p data-preview-{{ $key }} class="text-xl font-bold">0</p><p class="text-xs text-gray-500">{{ $label }}</p></div>@endforeach</div></div>
            <form data-restore-form class="w-full space-y-3 lg:max-w-xs"><label class="block text-sm font-medium">Cara pemulihan<select name="mode" class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-3 dark:border-gray-700 dark:bg-gray-900"><option value="merge">Gabungkan dengan data saat ini</option><option value="replace">Ganti seluruh data saat ini</option></select></label><button class="h-11 w-full rounded-lg bg-brand-500 text-sm font-semibold text-white hover:bg-brand-600">Pulihkan data</button></form>
        </div>
    </section>

    <section class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><h3 class="font-semibold text-gray-900 dark:text-white">Yang perlu diketahui</h3><ul class="mt-3 grid gap-2 text-sm text-gray-500 md:grid-cols-2"><li>• Login, PIN, dan token lisensi tidak masuk file backup.</li><li>• Mode gabung memperbarui data dengan ID yang sama.</li><li>• Mode ganti menghapus data finansial saat ini terlebih dahulu.</li><li>• Simpan salinan file di lokasi lain yang aman.</li></ul></section>
    <div data-backup-toast class="app-toast hidden"></div>
</div>
@endsection
