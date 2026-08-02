@extends('layouts.app')

@section('content')
<div class="flex min-h-[65vh] items-center justify-center">
    <div class="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
        <span class="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-2xl text-brand-600 dark:bg-brand-500/10">⌁</span>
        <p class="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">Tahap berikutnya</p>
        <h2 class="mb-3 text-2xl font-bold text-gray-900 dark:text-white">{{ $title }}</h2>
        <p class="mx-auto mb-6 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">Shell halaman sudah siap. Fitur dan penyimpanan lokal akan dibangun bertahap di atas fondasi PWA RumahKas.</p>
        <a href="/" class="inline-flex rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Kembali ke dashboard</a>
    </div>
</div>
@endsection
