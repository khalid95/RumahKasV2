import $ from 'jquery';
import { db } from '../database/database';
import { initializeDatabase } from '../services/database-service';
import { AccountService, ACCOUNT_TYPES, AccountValidationError } from '../services/account-service';
import { confirmDialog, hideModal, showModal, showToast } from '../ui/feedback';
import { bindMoneyInput, getMoneyValue, setMoneyValue } from '../ui/money-input';

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

function escapeHtml(value) {
    return $('<div>').text(value ?? '').html();
}

function accountCard(account) {
    const balanceClass = account.current_balance < 0 ? 'text-error-600' : 'text-gray-900 dark:text-white';
    return `
        <article data-account-id="${account.id}" class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
            <div class="mb-5 flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-center gap-3">
                    <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-bold text-brand-600 dark:bg-brand-500/10">${escapeHtml(account.name.charAt(0).toUpperCase())}</span>
                    <div class="min-w-0"><h3 class="truncate font-semibold text-gray-900 dark:text-white">${escapeHtml(account.name)}</h3><p class="text-xs text-gray-500">${escapeHtml(ACCOUNT_TYPES[account.type])}</p></div>
                </div>
                <span class="rounded-full px-2.5 py-1 text-xs font-medium ${account.is_active ? 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400' : 'bg-gray-100 text-gray-500 dark:bg-white/[0.06]'}">${account.is_active ? 'Aktif' : 'Nonaktif'}</span>
            </div>
            <p class="mb-1 text-xs text-gray-500">Saldo saat ini</p>
            <p class="mb-5 text-xl font-bold ${balanceClass}">${idr.format(account.current_balance)}</p>
            <div class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <span class="text-xs text-gray-500">${account.include_in_total ? 'Masuk total saldo' : 'Tidak masuk total'}</span>
                <div class="flex gap-1">
                    <button data-action="toggle" type="button" class="rounded-lg px-2.5 py-1.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/[0.06]">${account.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                    <button data-action="edit" type="button" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/[0.06]">✎</button>
                    <button data-action="delete" type="button" class="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10">×</button>
                </div>
            </div>
        </article>`;
}

export async function initializeAccountPage() {
    await initializeDatabase();
    const service = new AccountService(db);
    const $page = $('[data-account-page]');
    const $modal = $('[data-account-modal]');
    const $form = $('#account-form');
    const $openingBalance = $form.find('[name="opening_balance"]');
    bindMoneyInput($openingBalance);

    const notify = (message, variant = 'success') => {
        showToast($('[data-account-toast]'), message, variant);
    };

    const render = async () => {
        const accounts = await service.list();
        $('[data-account-list]').html(accounts.length
            ? accounts.map(accountCard).join('')
            : '<div class="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-white/[0.03]"><p class="font-semibold text-gray-800 dark:text-white">Belum ada akun keuangan</p><p class="mt-1 text-sm text-gray-500">Buat akun Tunai, Bank, atau E-Wallet pertamamu.</p></div>');

        const active = accounts.filter((account) => account.is_active).length;
        const total = accounts.filter((account) => account.is_active && account.include_in_total)
            .reduce((sum, account) => sum + account.current_balance, 0);
        $('[data-account-count]').text(accounts.length);
        $('[data-active-account-count]').text(active);
        $('[data-account-total]').text(idr.format(total));
    };

    const openModal = (account = null) => {
        $form[0].reset();
        $form.find('[name="id"]').val(account?.id || '');
        $form.find('[name="name"]').val(account?.name || '');
        $form.find('[name="type"]').val(account?.type || 'cash');
        setMoneyValue($openingBalance, account?.opening_balance ?? 0);
        $form.find('[name="include_in_total"]').prop('checked', account ? Boolean(account.include_in_total) : true);
        $form.find('[name="notes"]').val(account?.notes || '');
        $('[data-account-modal-title]').text(account ? 'Edit akun' : 'Tambah akun');
        $('[data-account-error]').addClass('hidden').text('');
        showModal($modal);
        $form.find('[name="name"]').trigger('focus');
    };

    const closeModal = () => hideModal($modal);
    $page.on('click', '[data-add-account]', () => openModal());
    $('[data-close-account-modal]').on('click', closeModal);
    $modal.on('click', function (event) { if (event.target === this) closeModal(); });
    $(document).on('keydown.account-modal', (event) => { if (event.key === 'Escape') closeModal(); });

    $page.on('click', '[data-account-id] [data-action]', async function () {
        const id = $(this).closest('[data-account-id]').data('account-id');
        const action = $(this).data('action');
        const account = await service.find(id);

        try {
            if (action === 'edit') openModal(account);
            if (action === 'toggle') {
                await service.setActive(id, !account.is_active);
                notify(account.is_active ? 'Akun dinonaktifkan.' : 'Akun diaktifkan.');
                await render();
            }
            if (action === 'delete' && await confirmDialog({ title: `Hapus akun “${account.name}”?`, message: 'Akun hanya dapat dihapus jika belum digunakan transaksi. Tindakan ini tidak dapat dibatalkan.', confirmText: 'Hapus akun' })) {
                await service.delete(id);
                notify('Akun berhasil dihapus.');
                await render();
            }
        } catch (error) {
            notify(error.message, 'error');
        }
    });

    $form.on('submit', async function (event) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(this));
        values.opening_balance = getMoneyValue($openingBalance);
        values.include_in_total = $form.find('[name="include_in_total"]').is(':checked');
        const $submit = $form.find('[type="submit"]');
        $submit.prop('disabled', true).text('Menyimpan…');

        try {
            if (values.id) await service.update(values.id, values);
            else await service.create(values);
            closeModal();
            notify(values.id ? 'Akun berhasil diperbarui.' : 'Akun berhasil ditambahkan.');
            await render();
        } catch (error) {
            const message = error instanceof AccountValidationError ? error.message : 'Akun gagal disimpan.';
            $('[data-account-error]').removeClass('hidden').text(message);
            if (error.field) $form.find(`[name="${error.field}"]`).trigger('focus');
        } finally {
            $submit.prop('disabled', false).text('Simpan akun');
        }
    });

    await render();
}
