import $ from 'jquery';
import { db } from '../database/database';
import { initializeDatabase } from '../services/database-service';
import { BudgetService, BudgetValidationError } from '../services/budget-service';
import { bindMoneyInput, getMoneyValue, setMoneyValue } from '../ui/money-input';
import { confirmDialog, hideModal, showModal, showToast } from '../ui/feedback';
import flatpickr from 'flatpickr';
import monthSelectPlugin from 'flatpickr/dist/plugins/monthSelect/index.js';
import { Indonesian } from 'flatpickr/dist/l10n/id.js';
import 'flatpickr/dist/flatpickr.min.css';
import 'flatpickr/dist/plugins/monthSelect/style.css';

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const statusMap = {
    safe: ['Aman', 'bg-success-500', 'text-success-700 bg-success-50 dark:bg-success-500/10 dark:text-success-400'],
    attention: ['Perhatian', 'bg-warning-400', 'text-warning-700 bg-warning-50 dark:bg-warning-500/10 dark:text-warning-400'],
    almost: ['Hampir habis', 'bg-orange-500', 'text-orange-700 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400'],
    exhausted: ['Budget habis', 'bg-error-500', 'text-error-700 bg-error-50 dark:bg-error-500/10 dark:text-error-400'],
    over: ['Over budget', 'bg-error-500', 'text-error-700 bg-error-50 dark:bg-error-500/10 dark:text-error-400'],
};

function escapeHtml(value) { return $('<div>').text(value ?? '').html(); }
function displayPercentage(value) { return value < 100 ? Math.min(Math.floor(value), 99) : Math.round(value); }
function currentMonth() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
function parsePeriod(value) {
    const [year, month] = value.split('-').map(Number);
    return { year, month };
}

export async function initializeBudgetPage() {
    await initializeDatabase();
    const service = new BudgetService(db);
    const $page = $('[data-budget-page]');
    const $modal = $('[data-budget-modal]');
    const $form = $('#budget-form');
    const $amount = $form.find('[name="amount"]');
    const $period = $('[data-budget-period]');
    const $modalPeriod = $form.find('[name="period"]');
    bindMoneyInput($amount);
    const pickerOptions = {
        locale: Indonesian,
        disableMobile: true,
        allowInput: false,
        dateFormat: 'Y-m',
        altInput: true,
        altFormat: 'F Y',
        plugins: [new monthSelectPlugin({ shorthand: false, dateFormat: 'Y-m', altFormat: 'F Y' })],
    };
    const periodPicker = flatpickr($period[0], {
        ...pickerOptions,
        defaultDate: currentMonth(),
        onChange: () => render(),
    });
    const modalPeriodPicker = flatpickr($modalPeriod[0], pickerOptions);

    const notify = (message, variant = 'success') => showToast($('[data-budget-toast]'), message, variant);
    const render = async () => {
        const period = parsePeriod($period.val());
        const budgets = await service.list(period.year, period.month);
        const total = budgets.reduce((sum, item) => sum + item.amount, 0);
        const spent = budgets.reduce((sum, item) => sum + item.spent, 0);
        $('[data-budget-total]').text(idr.format(total));
        $('[data-budget-spent]').text(idr.format(spent));
        $('[data-budget-remaining]').text(idr.format(total - spent));
        $('[data-budget-list]').html(budgets.length ? budgets.map((budget) => {
            const [label, bar, badge] = statusMap[budget.status];
            const width = Math.min(budget.percentage, 100);
            return `<article data-budget-id="${budget.id}" class="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]"><div class="mb-5 flex items-start justify-between gap-3"><div><h3 class="font-semibold text-gray-900 dark:text-white">${escapeHtml(budget.category?.name || 'Kategori dihapus')}</h3><p class="mt-1 text-xs text-gray-500">${String(budget.month).padStart(2, '0')}/${budget.year}</p></div><span class="rounded-full px-2.5 py-1 text-xs font-medium ${badge}">${label}</span></div><div class="mb-2 flex items-end justify-between gap-3"><div><p class="text-xs text-gray-500">Terpakai</p><p class="font-semibold text-gray-900 dark:text-white">${idr.format(budget.spent)}</p></div><p class="text-sm font-bold text-gray-700 dark:text-gray-300">${displayPercentage(budget.percentage)}%</p></div><div class="mb-4 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]"><div class="h-full rounded-full ${bar} transition-all duration-500" style="width:${width}%"></div></div><div class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800"><span class="text-xs ${budget.remaining < 0 ? 'text-error-600' : 'text-gray-500'}">${budget.remaining < 0 ? 'Melebihi ' + idr.format(Math.abs(budget.remaining)) : 'Sisa ' + idr.format(budget.remaining)}</span><div class="flex gap-1"><button data-action="edit" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-600">✎</button><button data-action="delete" class="rounded-lg p-2 text-gray-500 hover:bg-error-50 hover:text-error-600">×</button></div></div></article>`;
        }).join('') : '<div class="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center dark:border-gray-700 dark:bg-white/[0.03]"><p class="font-semibold text-gray-800 dark:text-white">Belum ada budget</p><p class="mt-1 text-sm text-gray-500">Buat batas pengeluaran untuk kategori pilihanmu.</p></div>');
    };

    const openModal = async (budget = null) => {
        const categories = await db.categories.where('type').equals('expense').toArray();
        $form[0].reset();
        $form.find('[name="category_id"]').html(categories.filter((item) => item.is_active || item.id === budget?.category_id).map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join(''));
        $form.find('[name="id"]').val(budget?.id || '');
        $form.find('[name="category_id"]').val(budget?.category_id || '');
        const period = budget ? `${budget.year}-${String(budget.month).padStart(2, '0')}` : $period.val();
        modalPeriodPicker.setDate(period, false);
        setMoneyValue($amount, budget?.amount || '');
        $form.find('[name="notes"]').val(budget?.notes || '');
        $('[data-budget-modal-title]').text(budget ? 'Edit budget' : 'Tambah budget');
        $('[data-budget-error]').addClass('hidden').text('');
        showModal($modal);
    };
    const closeModal = () => hideModal($modal);
    $page.on('click', '[data-add-budget]', () => openModal());
    $('[data-close-budget-modal]').on('click', closeModal);
    $modal.on('click', function (event) { if (event.target === this) closeModal(); });
    $(document).on('keydown.budget-modal', (event) => { if (event.key === 'Escape') closeModal(); });

    $page.on('click', '[data-budget-id] [data-action]', async function () {
        const id = $(this).closest('[data-budget-id]').data('budget-id');
        const action = $(this).data('action');
        const budget = await service.find(id);
        try {
            if (action === 'edit') await openModal(budget);
            if (action === 'delete' && await confirmDialog({ title: 'Hapus budget?', message: 'Batas budget untuk periode ini akan dihapus permanen.', confirmText: 'Hapus budget' })) { await service.delete(id); notify('Budget dihapus.'); await render(); }
        } catch (error) { notify(error.message, 'error'); }
    });

    $form.on('submit', async function (event) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(this));
        const period = parsePeriod(values.period);
        Object.assign(values, period, { amount: getMoneyValue($amount) });
        const $submit = $form.find('[type="submit"]');
        $submit.prop('disabled', true).text('Menyimpan…');
        try {
            if (values.id) await service.update(values.id, values); else await service.create(values);
            closeModal(); notify(values.id ? 'Budget diperbarui.' : 'Budget ditambahkan.'); periodPicker.setDate(values.period, false); await render();
        } catch (error) {
            $('[data-budget-error]').removeClass('hidden').text(error instanceof BudgetValidationError ? error.message : 'Budget gagal disimpan.');
            if (error.field) $form.find(`[name="${error.field}"]`).trigger('focus');
        } finally { $submit.prop('disabled', false).text('Simpan budget'); }
    });
    await render();
}
