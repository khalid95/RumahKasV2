import $ from 'jquery';
import { db } from '../database/database';
import { initializeDatabase } from '../services/database-service';
import { CategoryService, CategoryValidationError } from '../services/category-service';
import { confirmDialog, hideModal, showModal, showToast } from '../ui/feedback';

function escapeHtml(value) {
    return $('<div>').text(value ?? '').html();
}

function categoryCard(category) {
    const initial = escapeHtml(category.icon || category.name.charAt(0).toUpperCase());
    const status = category.is_active
        ? '<span class="rounded-full bg-success-50 px-2.5 py-1 text-xs font-medium text-success-700 dark:bg-success-500/10 dark:text-success-400">Aktif</span>'
        : '<span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">Nonaktif</span>';

    return `
        <article class="flex items-center gap-4 border-b border-gray-100 px-5 py-4 last:border-0 dark:border-gray-800" data-category-id="${category.id}">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style="background:${escapeHtml(category.color)}">${initial}</span>
            <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                    <h3 class="truncate text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(category.name)}</h3>
                    ${category.is_default ? '<span class="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-400">Bawaan</span>' : ''}
                </div>
                <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">${category.type === 'income' ? 'Pemasukan' : 'Pengeluaran'} · ${category.usage_count || 0} transaksi</p>
            </div>
            ${status}
            <div class="flex items-center gap-1">
                <button type="button" data-action="toggle" title="${category.is_active ? 'Nonaktifkan' : 'Aktifkan'}" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/[0.06]">${category.is_active ? '○' : '●'}</button>
                <button type="button" data-action="edit" title="Edit" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600 dark:hover:bg-white/[0.06]">✎</button>
                <button type="button" data-action="delete" title="Hapus" class="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-600 dark:hover:bg-error-500/10">×</button>
            </div>
        </article>`;
}

export async function initializeCategoryPage() {
    await initializeDatabase();
    const service = new CategoryService(db);
    const $page = $('[data-category-page]');
    const $modal = $('[data-category-modal]');
    const $form = $('#category-form');

    const notify = (message, variant = 'success') => {
        showToast($('[data-category-toast]'), message, variant);
    };

    const render = async () => {
        const [income, expense] = await Promise.all([service.list('income'), service.list('expense')]);
        const query = String($('[data-category-search]').val() || '').trim().toLocaleLowerCase('id-ID');
        const statusFilter = $('[data-category-status]').val() || 'all';
        const filter = (items) => items.filter((item) => (!query || item.name.toLocaleLowerCase('id-ID').includes(query)) && (statusFilter === 'all' || (statusFilter === 'active' ? item.is_active : !item.is_active)));
        const filteredIncome = filter(income); const filteredExpense = filter(expense);
        const renderList = (items) => items.length
            ? items.map(categoryCard).join('')
            : '<p class="px-5 py-10 text-center text-sm text-gray-500">Belum ada kategori.</p>';

        $('[data-category-list="income"]').html(renderList(filteredIncome));
        $('[data-category-list="expense"]').html(renderList(filteredExpense));
        $('[data-category-count="income"]').text(income.length);
        $('[data-category-count="expense"]').text(expense.length);
    };

    const openModal = async (category = null, initialType = 'expense') => {
        $form[0].reset();
        $form.find('[name="id"]').val(category?.id || '');
        $form.find('[name="name"]').val(category?.name || '');
        $form.find('[name="type"]').val(category?.type || initialType);
        $form.find('[name="color"]').val(category?.color || (initialType === 'income' ? '#12b76a' : '#f04438'));
        $form.find('[name="icon"]').val(category?.icon || '');
        $('[data-modal-title]').text(category ? 'Edit kategori' : 'Tambah kategori');
        $('[data-category-error]').addClass('hidden').text('');
        showModal($modal);
        $form.find('[name="name"]').trigger('focus');
    };

    const closeModal = () => hideModal($modal);

    $page.on('click', '[data-add-category]', function () {
        openModal(null, $(this).data('add-category'));
    });

    $page.on('click', '[data-category-id] [data-action]', async function () {
        const id = $(this).closest('[data-category-id]').data('category-id');
        const action = $(this).data('action');
        const category = await service.find(id);

        try {
            if (action === 'edit') await openModal(category);
            if (action === 'toggle') {
                await service.setActive(id, !category.is_active);
                notify(category.is_active ? 'Kategori dinonaktifkan.' : 'Kategori diaktifkan.');
                await render();
            }
            if (action === 'delete' && category.usage_count) {
                await confirmDialog({ title: 'Kategori masih digunakan', message: `“${category.name}” digunakan oleh ${category.usage_count} transaksi. Ubah kategori pada transaksi terkait atau nonaktifkan kategori ini.`, confirmText: 'Mengerti', variant: 'primary' });
            } else if (action === 'delete' && await confirmDialog({ title: `Hapus “${category.name}”?`, message: `${category.is_default ? 'Ini kategori bawaan. Setelah dihapus, kategori tidak akan dibuat kembali pada inisialisasi berikutnya. ' : ''}Kategori akan dihapus permanen dari perangkat ini.`, confirmText: 'Hapus kategori' })) {
                await service.delete(id);
                notify('Kategori berhasil dihapus.');
                await render();
            }
        } catch (error) {
            notify(error.message, 'error');
        }
    });

    $('[data-close-category-modal]').on('click', closeModal);
    $('[data-category-search], [data-category-status]').on('input change', render);
    $modal.on('click', function (event) {
        if (event.target === this) closeModal();
    });
    $(document).on('keydown.category-modal', (event) => {
        if (event.key === 'Escape') closeModal();
    });

    $form.on('submit', async function (event) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(this));
        const $submit = $form.find('[type="submit"]');
        $submit.prop('disabled', true).text('Menyimpan…');

        try {
            if (values.id) await service.update(values.id, values);
            else await service.create(values);

            closeModal();
            notify(values.id ? 'Kategori berhasil diperbarui.' : 'Kategori berhasil ditambahkan.');
            await render();
        } catch (error) {
            const message = error instanceof CategoryValidationError ? error.message : 'Kategori gagal disimpan.';
            $('[data-category-error]').removeClass('hidden').text(message);
            if (error.field) $form.find(`[name="${error.field}"]`).trigger('focus');
        } finally {
            $submit.prop('disabled', false).text('Simpan kategori');
        }
    });

    await render();
}
