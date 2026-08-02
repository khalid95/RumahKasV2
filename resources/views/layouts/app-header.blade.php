<header class="sticky top-0 z-9999 flex w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
    <div class="flex grow items-center justify-between px-4 py-3 md:px-6">
        <div class="flex items-center gap-3">
            <button class="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-gray-800"
                @click="$store.sidebar.toggleMobileOpen()" aria-label="Buka menu">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </button>
            <div>
                <p class="text-xs font-medium text-gray-400">RumahKas</p>
                <h1 class="text-base font-semibold text-gray-900 dark:text-white">{{ $title ?? 'Dashboard' }}</h1>
            </div>
        </div>

        <div class="flex items-center gap-2">
            <span id="network-status" class="hidden items-center gap-2 rounded-full bg-success-50 px-3 py-1.5 text-xs font-medium text-success-700 sm:flex dark:bg-success-500/10 dark:text-success-400">
                <span class="h-2 w-2 rounded-full bg-success-500"></span>
                <span>Online</span>
            </span>
            <button class="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800"
                @click="$store.theme.toggle()" aria-label="Ganti tema">
                <svg class="dark:hidden" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 2.5v1.25M10 16.25v1.25M2.5 10h1.25M16.25 10h1.25M4.7 4.7l.9.9M14.4 14.4l.9.9M15.3 4.7l-.9.9M5.6 14.4l-.9.9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="10" r="3.25" stroke="currentColor" stroke-width="1.5"/></svg>
                <svg class="hidden dark:block" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M16.5 12.2A6.75 6.75 0 0 1 7.8 3.5a6.75 6.75 0 1 0 8.7 8.7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>
            </button>
            <button type="button" onclick="window.rumahkasLogout?.()" aria-label="Logout dari RumahKas" title="Logout" class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 px-2.5 text-sm font-medium text-gray-600 hover:border-error-200 hover:bg-error-50 hover:text-error-600 dark:border-gray-700 dark:text-gray-300 dark:hover:border-error-800 dark:hover:bg-error-500/10 dark:hover:text-error-400 sm:px-3">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M8 3.5H5.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2H8M12.5 6.5 16 10l-3.5 3.5M7 10h9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                <span class="hidden sm:inline">Logout</span>
            </button>
            <a href="/transactions" class="hidden items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 sm:inline-flex">
                <span class="text-lg leading-none">+</span> Transaksi
            </a>
        </div>
    </div>
</header>
