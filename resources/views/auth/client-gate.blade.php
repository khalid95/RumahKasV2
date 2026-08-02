<div data-auth-gate class="hidden min-h-screen bg-gray-50 p-4 dark:bg-gray-950">
    <div class="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center">
        <main class="w-full max-w-md">
            <div class="mb-7 flex justify-center">
                <a href="/" class="flex items-center gap-3" aria-label="RumahKas">
                    <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-xl font-bold text-white shadow-theme-md">R</span>
                    <strong class="text-2xl text-gray-900 dark:text-white">Rumah<span class="text-brand-500">Kas</span></strong>
                </a>
            </div>

            <section class="rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                <p data-auth-error class="mb-5 hidden rounded-xl border border-error-100 bg-error-50 px-4 py-3 text-center text-sm text-error-700"></p>

                <form data-pin-form class="hidden">
                    <div class="text-center">
                        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-600 dark:bg-brand-500/10">
                            <span data-user-initial>R</span>
                        </div>
                        <p class="mt-5 text-sm text-gray-500">Selamat datang kembali</p>
                        <h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white" data-user-name></h1>
                        <p class="mt-2 text-sm text-gray-500">Masukkan PIN untuk membuka RumahKas</p>
                    </div>

                    <label data-pin-boxes class="relative mt-7 block cursor-text">
                        <span class="sr-only">PIN 6 digit</span>
                        <input data-pin-input name="pin" type="text" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="current-password" class="absolute inset-0 z-10 h-full w-full cursor-text opacity-0" aria-label="Masukkan PIN 6 digit">
                        <span data-pin-digits class="flex justify-center gap-2 sm:gap-3" aria-hidden="true">
                            @for ($digit = 0; $digit < 6; $digit++)
                                <span data-pin-digit class="flex h-14 w-11 items-center justify-center rounded-xl border border-gray-300 bg-gray-25 text-2xl font-bold text-gray-900 transition duration-150 dark:border-gray-700 dark:bg-gray-800 dark:text-white sm:h-16 sm:w-12"></span>
                            @endfor
                        </span>
                    </label>
                    <button class="mt-4 h-12 w-full rounded-xl bg-brand-500 font-semibold text-white shadow-theme-xs transition hover:bg-brand-600 disabled:opacity-60">Buka RumahKas</button>
                    <button data-switch-account type="button" class="mt-5 w-full text-sm font-medium text-gray-500 hover:text-brand-600">Masuk dengan email dan password</button>
                    <p class="mt-3 text-center text-xs text-gray-400">PIN dapat digunakan tanpa koneksi internet.</p>
                </form>

                <form data-login-form class="hidden space-y-4">
                    <div class="mb-6 text-center"><p class="text-sm font-medium text-brand-600">Akses berlisensi</p><h1 class="mt-1 text-2xl font-bold text-gray-900 dark:text-white">Masuk ke RumahKas</h1><p class="mt-2 text-sm text-gray-500">Aktivasi pertama memerlukan koneksi internet.</p></div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Email<input name="email" type="email" required autocomplete="username" class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 outline-none focus:border-brand-500 dark:border-gray-700"></label>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Password<input name="password" type="password" required autocomplete="current-password" class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 outline-none focus:border-brand-500 dark:border-gray-700"></label>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">PIN offline 6 digit<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" required autocomplete="new-password" placeholder="Buat PIN" class="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-center tracking-[.4em] outline-none focus:border-brand-500 dark:border-gray-700"></label>
                    <button class="h-11 w-full rounded-lg bg-brand-500 font-semibold text-white hover:bg-brand-600 disabled:opacity-60">Masuk dan aktifkan perangkat</button>
                    <button data-back-pin type="button" class="hidden w-full text-sm font-medium text-gray-500 hover:text-brand-600">Kembali masuk dengan PIN</button>
                </form>
            </section>
            <p class="mt-5 text-center text-xs text-gray-400">Data keuangan tersimpan pribadi di perangkat ini.</p>
        </main>
    </div>
    <div data-device-dialog class="app-modal fixed inset-0 z-[99999] hidden items-center justify-center bg-gray-950/60 p-4" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="app-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-theme-xl dark:bg-gray-900">
            <span class="flex h-12 w-12 items-center justify-center rounded-xl bg-warning-50 text-xl text-warning-600 dark:bg-warning-500/10">!</span>
            <h2 class="mt-4 text-xl font-bold text-gray-900 dark:text-white">Ganti perangkat aktif?</h2>
            <p class="mt-2 text-sm leading-6 text-gray-500">Lisensi sudah digunakan pada perangkat berikut. Melanjutkan akan mengeluarkan perangkat lama dan mengaktifkan perangkat ini.</p>
            <div data-device-list class="mt-4 space-y-2"></div>
            <p class="mt-4 rounded-lg bg-warning-50 p-3 text-xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-400">Data pada perangkat lama tidak dihapus, tetapi aplikasi akan terkunci saat kembali online.</p>
            <div class="mt-6 flex justify-end gap-3"><button data-device-cancel type="button" class="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium dark:border-gray-700">Batal</button><button data-device-confirm type="button" class="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600">Ganti dan lanjutkan</button></div>
        </div>
    </div>
</div>
