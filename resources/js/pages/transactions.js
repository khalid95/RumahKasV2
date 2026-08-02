import $ from 'jquery';
import { db } from '../database/database';
import { initializeDatabase } from '../services/database-service';
import { AccountService } from '../services/account-service';
import { CategoryService } from '../services/category-service';
import { TransactionService, TransactionValidationError } from '../services/transaction-service';
import { confirmDialog, hideModal, showModal, showToast } from '../ui/feedback';
import { bindMoneyInput, getMoneyValue, setMoneyNegativeAllowed, setMoneyValue } from '../ui/money-input';
import { appendCalculatorKey, evaluateCalculation } from '../services/calculator-service';
import flatpickr from 'flatpickr';
import monthSelectPlugin from 'flatpickr/dist/plugins/monthSelect/index.js';
import { Indonesian } from 'flatpickr/dist/l10n/id.js';
import 'flatpickr/dist/flatpickr.min.css';
import 'flatpickr/dist/plugins/monthSelect/style.css';

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const typeLabels = { income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer', adjustment: 'Adjustment' };
const transferIcon = '<svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h13m0 0-3-3m3 3-3 3M19 16H6m0 0 3 3m-3-3 3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function escapeHtml(value) { return $('<div>').text(value ?? '').html(); }

export async function initializeTransactionPage() {
    await initializeDatabase();
    const service = new TransactionService(db);
    const accountService = new AccountService(db);
    const categoryService = new CategoryService(db);
    const $page = $('[data-transaction-page]');
    const $modal = $('[data-transaction-modal]');
    const $form = $('#transaction-form');
    const $amount = $form.find('[name="amount"]');
    const $calculator = $('[data-calculator-modal]');
    let calculatorExpression = ''; let calculatorResult = 0;
    bindMoneyInput($amount);
    let accounts = [];
    let categories = [];
    const monthInput = $('[data-filter-month]')[0];
    const currentMonth = new Date().toLocaleDateString('en-CA').slice(0, 7);
    const monthPicker = flatpickr(monthInput, { locale: Indonesian, disableMobile: true, allowInput: false, dateFormat: 'Y-m', altInput: true, altFormat: 'F Y', defaultDate: currentMonth, plugins: [new monthSelectPlugin({ shorthand: false, dateFormat: 'Y-m', altFormat: 'F Y' })], onChange: () => render() });

    const notify = (message, variant = 'success') => {
        showToast($('[data-transaction-toast]'), message, variant);
    };

    const refreshReferences = async () => {
        [accounts, categories] = await Promise.all([accountService.list(), db.categories.toArray()]);
        const activeAccounts = accounts.filter((item) => item.is_active);
        const options = activeAccounts.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('');
        $form.find('[name="financial_account_id"]').html(`<option value="">Pilih akun</option>${options}`);
        $form.find('[name="destination_account_id"]').html(`<option value="">Pilih akun tujuan</option>${options}`);
        $('[data-filter-account]').html(`<option value="">Semua akun</option>${accounts.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')}`);
    };

    const nameOf = (items, id, fallback = '—') => items.find((item) => item.id === id)?.name || fallback;
    const render = async () => {
        const selectedMonth = $('[data-filter-month]').val();
        const filters = {
            search: $('[data-filter-search]').val(), type: $('[data-filter-type]').val(), account_id: $('[data-filter-account]').val(),
        };
        if (selectedMonth) { const [year, month] = selectedMonth.split('-').map(Number); filters.date_from = `${selectedMonth}-01`; filters.date_to = `${selectedMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`; }
        const transactions = await service.list(filters);
        $('[data-transaction-count]').text(transactions.length);
        $('[data-filter-active]').toggleClass('hidden', !filters.type && !filters.account_id);
        $('[data-transaction-list]').html(transactions.length ? `<div class="hidden grid-cols-[40px_minmax(160px,1.4fr)_100px_minmax(110px,1fr)_minmax(100px,.8fr)_130px_32px] items-center gap-3 border-b border-gray-100 bg-gray-50/70 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 lg:grid dark:border-gray-800 dark:bg-white/[0.025]"><span></span><span>Transaksi</span><span>Tanggal</span><span>Akun</span><span>Kategori</span><span class="text-right">Nominal</span><span></span></div>${transactions.map((transaction) => {
            const positive = transaction.type === 'income' || (transaction.type === 'adjustment' && transaction.amount > 0);
            const amountPrefix = positive ? '+' : transaction.type === 'transfer' ? '' : '−';
            const shownAmount = Math.abs(transaction.amount);
            const accountText = transaction.type === 'transfer'
                ? `${nameOf(accounts, transaction.financial_account_id)} → ${nameOf(accounts, transaction.destination_account_id)}`
                : nameOf(accounts, transaction.financial_account_id);
            const categoryText = nameOf(categories, transaction.category_id, typeLabels[transaction.type]);
            const cancelled = transaction.status === 'cancelled';
            const icon = transaction.type === 'transfer' ? transferIcon : positive ? '↓' : '↑';
            const iconClass = transaction.type === 'transfer' ? 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10' : positive ? 'bg-success-50 text-success-600 dark:bg-success-500/10' : 'bg-error-50 text-error-600 dark:bg-error-500/10';
            const dateLabel = new Date(`${transaction.transaction_date}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
            const amountClass = positive ? 'text-success-600' : transaction.type === 'transfer' ? 'text-blue-light-600' : 'text-gray-900 dark:text-white';
            const cancelledBadge = cancelled ? '<span class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-medium text-gray-500 dark:bg-white/[0.06]">Dibatalkan</span>' : '';
            return `<article data-transaction-id="${transaction.id}" class="relative border-b border-gray-100 last:border-0 dark:border-gray-800 ${cancelled ? 'opacity-60' : 'hover:bg-gray-50/70 dark:hover:bg-white/[0.02]'}"><div class="grid grid-cols-[40px_minmax(0,1fr)_32px] gap-x-3 px-3 py-3 lg:hidden"><span class="row-span-3 flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${iconClass}">${icon}</span><div class="flex min-w-0 items-start gap-2"><h3 class="line-clamp-2 break-words text-sm font-semibold leading-5 text-gray-900 dark:text-white">${escapeHtml(transaction.title)}</h3>${cancelledBadge}</div><button data-transaction-menu type="button" aria-label="Aksi transaksi" class="grid h-8 w-8 place-items-center rounded-lg text-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]">⋯</button><div class="col-start-2 col-span-2 mt-1 flex items-center justify-between gap-3"><p class="text-[11px] text-gray-400">${dateLabel}</p><p class="shrink-0 text-sm font-bold ${amountClass}">${amountPrefix}${idr.format(shownAmount)}</p></div><div class="col-start-2 col-span-2 mt-2 flex min-w-0 flex-wrap gap-1.5"><span class="max-w-full truncate rounded-lg bg-gray-50 px-2 py-1 text-[10px] text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">${escapeHtml(accountText)}</span><span class="max-w-full truncate rounded-lg bg-gray-50 px-2 py-1 text-[10px] text-gray-600 dark:bg-white/[0.04] dark:text-gray-300">${escapeHtml(categoryText)}</span></div>${transaction.description ? `<p class="col-start-2 col-span-2 mt-1.5 line-clamp-1 text-[10px] text-gray-400">${escapeHtml(transaction.description)}</p>` : ''}</div><div class="hidden grid-cols-[40px_minmax(160px,1.4fr)_100px_minmax(110px,1fr)_minmax(100px,.8fr)_130px_32px] items-center gap-3 px-4 py-3 lg:grid"><span class="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${iconClass}">${icon}</span><div class="min-w-0"><div class="flex items-center gap-2"><h3 class="truncate text-sm font-semibold text-gray-900 dark:text-white">${escapeHtml(transaction.title)}</h3>${cancelledBadge}</div>${transaction.description ? `<p class="mt-0.5 truncate text-[10px] text-gray-400">${escapeHtml(transaction.description)}</p>` : ''}</div><p class="text-xs text-gray-500">${dateLabel}</p><p class="truncate text-xs text-gray-600 dark:text-gray-300" title="${escapeHtml(accountText)}">${escapeHtml(accountText)}</p><p class="truncate text-xs text-gray-600 dark:text-gray-300">${escapeHtml(categoryText)}</p><p class="text-right text-sm font-bold ${amountClass}">${amountPrefix}${idr.format(shownAmount)}</p><button data-transaction-menu type="button" aria-label="Aksi transaksi" class="grid h-8 w-8 place-items-center rounded-lg text-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]">⋯</button></div><div data-transaction-actions class="absolute right-3 top-11 z-30 hidden min-w-36 rounded-xl border border-gray-200 bg-white p-1.5 shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">${cancelled ? '' : `<button data-action="edit" class="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/[0.06]"><span>✎</span>Edit</button><button data-action="cancel" class="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-medium text-warning-700 hover:bg-warning-50 dark:hover:bg-warning-500/10"><span>⊘</span>Batalkan</button>`}<button data-action="delete" class="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-xs font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-500/10"><span>×</span>Hapus</button></div></article>`;
        }).join('')}` : '<div class="px-6 py-14 text-center"><p class="font-semibold text-gray-800 dark:text-white">Belum ada transaksi</p><p class="mt-1 text-sm text-gray-500">Tidak ada transaksi untuk filter ini.</p></div>');
    };

    const updateTypeFields = () => {
        const type = $form.find('[name="type"]').val();
        setMoneyNegativeAllowed($amount, type === 'adjustment');
        const needsCategory = type === 'income' || type === 'expense';
        $('[data-category-field]').toggleClass('hidden', !needsCategory);
        $('[data-destination-field]').toggleClass('hidden', type !== 'transfer');
        $('[data-adjustment-help]').toggleClass('hidden', type !== 'adjustment');
        const filtered = categories.filter((category) => category.type === type && category.is_active);
        $form.find('[name="category_id"]').html(`<option value="">Pilih kategori</option>${filtered.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join('')}`);
    };

    const openModal = async (transaction = null, initialType = 'expense') => {
        if (!accounts.some((account) => account.is_active)) {
            notify('Buat akun keuangan aktif terlebih dahulu.', 'error'); return;
        }
        $form[0].reset();
        $form.find('[name="id"]').val(transaction?.id || '');
        $form.find('[name="type"]').val(transaction?.type || initialType);
        updateTypeFields();
        $form.find('[name="financial_account_id"]').val(transaction?.financial_account_id || '');
        $form.find('[name="destination_account_id"]').val(transaction?.destination_account_id || '');
        $form.find('[name="category_id"]').val(transaction?.category_id || '');
        setMoneyValue($amount, transaction?.amount || '');
        $form.find('[name="calculation_expression"]').val(transaction?.calculation_expression || '');
        const savedCalculation = transaction?.calculation_expression?.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/-/g, ' − ');
        $('[data-calculation-note]').toggleClass('hidden', !savedCalculation).text(savedCalculation ? `Hasil dari ${savedCalculation}` : '');
        $form.find('[name="transaction_date"]').val(transaction?.transaction_date || new Date().toLocaleDateString('en-CA'));
        $form.find('[name="title"]').val(transaction?.title || '');
        $form.find('[name="description"]').val(transaction?.description || '');
        $('[data-transaction-modal-title]').text(transaction ? 'Edit transaksi' : 'Tambah transaksi');
        $('[data-transaction-error]').addClass('hidden').text('');
        showModal($modal);
    };

    const closeModal = () => hideModal($modal);
    $page.on('click', '[data-add-transaction]', () => openModal());
    $form.find('[name="type"]').on('change', updateTypeFields);
    $('[data-close-transaction-modal]').on('click', closeModal);
    $modal.on('click', function (event) { if (event.target === this) closeModal(); });
    $(document).on('keydown.transaction-modal', (event) => { if (event.key === 'Escape') closeModal(); });
    $('[data-filter-search], [data-filter-type], [data-filter-account]').on('input change', render);
    $('[data-clear-month]').on('click', () => { monthPicker.clear(); render(); });
    $('[data-toggle-filters]').on('click', (event) => { event.stopPropagation(); $('[data-filter-panel]').toggleClass('hidden'); });
    $('[data-filter-panel]').on('click', (event) => event.stopPropagation());
    $('[data-reset-filters]').on('click', () => { $('[data-filter-type], [data-filter-account]').val(''); monthPicker.setDate(currentMonth, false); $('[data-filter-panel]').addClass('hidden'); render(); });
    $(document).on('click.transaction-filters', () => $('[data-filter-panel]').addClass('hidden'));
    $page.on('click', '[data-transaction-menu]', function (event) { event.stopPropagation(); const $actions = $(this).closest('[data-transaction-id]').find('[data-transaction-actions]'); $('[data-transaction-actions]').not($actions).addClass('hidden'); $actions.toggleClass('hidden'); });
    $(document).on('click.transaction-actions', () => $('[data-transaction-actions]').addClass('hidden'));

    const renderCalculator = (error = null) => {
        $('[data-calculator-expression]').text(calculatorExpression.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/\+/g, ' + ').replace(/-/g, ' − ') || '0');
        try { calculatorResult = calculatorExpression && !/[+\-*/]$/.test(calculatorExpression) ? evaluateCalculation(calculatorExpression) : 0; $('[data-calculator-result]').text(idr.format(calculatorResult)).toggleClass('text-error-600', false); } catch (exception) { calculatorResult = 0; $('[data-calculator-result]').text(error || exception.message).toggleClass('text-error-600', true); }
    };
    const openCalculator = () => { const current = getMoneyValue($amount); calculatorExpression = current ? String(Math.abs(current)) : ''; renderCalculator(); showModal($calculator); };
    const closeCalculator = () => hideModal($calculator);
    $('[data-open-calculator]').on('click', openCalculator); $('[data-close-calculator]').on('click', closeCalculator);
    $('[data-calculator-keys]').on('click', '[data-calculator-key]', function () { const key = String($(this).attr('data-calculator-key')); if (key === 'equals') { try { calculatorResult = evaluateCalculation(calculatorExpression); calculatorExpression = String(calculatorResult); renderCalculator(); } catch (error) { renderCalculator(error.message); } return; } calculatorExpression = appendCalculatorKey(calculatorExpression, key); renderCalculator(); });
    $('[data-use-calculator]').on('click', () => { try { const result = evaluateCalculation(calculatorExpression); if (result <= 0) throw new Error('Hasil nominal harus lebih dari nol.'); setMoneyValue($amount, result); const hasCalculation = /[+\-*/]/.test(calculatorExpression); $form.find('[name="calculation_expression"]').val(hasCalculation ? calculatorExpression : ''); const readable = calculatorExpression.replace(/\*/g, ' × ').replace(/\//g, ' ÷ ').replace(/-/g, ' − '); $('[data-calculation-note]').toggleClass('hidden', !hasCalculation).text(`Hasil dari ${readable}`); closeCalculator(); } catch (error) { renderCalculator(error.message); } });
    $amount.on('input', () => { if (!document.activeElement?.matches('[data-open-calculator]')) { $form.find('[name="calculation_expression"]').val(''); $('[data-calculation-note]').addClass('hidden').text(''); } });
    $calculator.on('click', function (event) { if (event.target === this) closeCalculator(); });
    $(document).on('keydown.transaction-calculator', (event) => { if (!$calculator.hasClass('is-open')) return; if (/^[0-9+\-*/]$/.test(event.key)) { event.preventDefault(); calculatorExpression = appendCalculatorKey(calculatorExpression, event.key); renderCalculator(); } else if (event.key === 'Backspace') { event.preventDefault(); calculatorExpression = appendCalculatorKey(calculatorExpression, 'backspace'); renderCalculator(); } else if (event.key === 'Enter') { event.preventDefault(); $('[data-use-calculator]').trigger('click'); } else if (event.key === 'Escape') closeCalculator(); });

    $page.on('click', '[data-transaction-id] [data-action]', async function () {
        const id = $(this).closest('[data-transaction-id]').data('transaction-id');
        const action = $(this).data('action');
        const transaction = await service.find(id);
        try {
            if (action === 'edit') await openModal(transaction);
            if (action === 'cancel' && await confirmDialog({ title: `Batalkan “${transaction.title}”?`, message: 'Transaksi tetap tersimpan sebagai riwayat, tetapi tidak lagi memengaruhi saldo.', confirmText: 'Batalkan transaksi', variant: 'primary' })) { await service.cancel(id); notify('Transaksi dibatalkan.'); await render(); }
            if (action === 'delete' && await confirmDialog({ title: `Hapus transaksi “${transaction.title}”?`, message: 'Transaksi akan dihapus permanen dan saldo akun dihitung ulang.', confirmText: 'Hapus transaksi' })) { await service.delete(id); notify('Transaksi dihapus.'); await render(); }
        } catch (error) { notify(error.message, 'error'); }
    });

    $form.on('submit', async function (event) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(this));
        values.amount = getMoneyValue($amount);
        values.status = 'posted';
        const $submit = $form.find('[type="submit"]');
        $submit.prop('disabled', true).text('Menyimpan…');
        try {
            if (values.id) await service.update(values.id, values); else await service.create(values);
            closeModal(); notify(values.id ? 'Transaksi diperbarui.' : 'Transaksi ditambahkan.'); await refreshReferences(); await render();
        } catch (error) {
            const message = error instanceof TransactionValidationError ? error.message : 'Transaksi gagal disimpan.';
            $('[data-transaction-error]').removeClass('hidden').text(message);
            if (error.field) $form.find(`[name="${error.field}"]`).trigger('focus');
        } finally { $submit.prop('disabled', false).text('Simpan transaksi'); }
    });

    await refreshReferences(); await render();
    const quickType = new URLSearchParams(location.search).get('create');
    if (['expense', 'income', 'transfer', 'adjustment'].includes(quickType)) { await openModal(null, quickType); history.replaceState({}, '', location.pathname); }
}
