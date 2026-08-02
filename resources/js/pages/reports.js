import $ from 'jquery';
import flatpickr from 'flatpickr';
import { Indonesian } from 'flatpickr/dist/l10n/id.js';
import 'flatpickr/dist/flatpickr.min.css';
import { db } from '../database/database';
import { initializeDatabase } from '../services/database-service';
import { ReportService } from '../services/report-service';
import { downloadTransactionCsv } from '../services/csv-export-service';
import { showToast } from '../ui/feedback';

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
function escapeHtml(value) { return $('<div>').text(value ?? '').html(); }
function localDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }

export async function initializeReportPage() {
    await initializeDatabase();
    const service = new ReportService(db);
    const $page = $('[data-report-page]');
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    let currentReport = null;

    const [accounts, categories] = await Promise.all([db.financial_accounts.toArray(), db.categories.toArray()]);
    $('[data-report-account]').append(accounts.map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join(''));
    $('[data-report-category]').append(categories.filter((item) => item.type === 'expense' || item.type === 'income').map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`).join(''));

    const dateOptions = { locale: Indonesian, disableMobile: true, allowInput: false, dateFormat: 'Y-m-d', altInput: true, altFormat: 'j F Y' };
    flatpickr($('[data-report-from]')[0], { ...dateOptions, defaultDate: localDate(firstDay), onChange: () => render() });
    flatpickr($('[data-report-to]')[0], { ...dateOptions, defaultDate: localDate(today), onChange: () => render() });

    const filters = () => ({
        date_from: $('[data-report-from]').val(), date_to: $('[data-report-to]').val(),
        type: $('[data-report-type]').val(), account_id: $('[data-report-account]').val(), category_id: $('[data-report-category]').val(),
    });

    const render = async () => {
        try {
            currentReport = await service.generate(filters());
            const { summary, rows, expense_by_category: byCategory } = currentReport;
            $('[data-report-income]').text(idr.format(summary.income));
            $('[data-report-expense]').text(idr.format(summary.expense));
            $('[data-report-net]').text(idr.format(summary.net_cashflow));
            $('[data-report-count]').text(summary.transaction_count);
            $('[data-report-export]').prop('disabled', !rows.length);
            $('[data-report-rows]').html(rows.length ? rows.map((row) => {
                const positive = row.type === 'income' || (row.type === 'adjustment' && row.amount > 0);
                const account = row.type === 'transfer' ? `${row.account_name} → ${row.destination_account_name}` : row.account_name;
                return `<tr class="border-b border-gray-100 last:border-0 dark:border-gray-800"><td class="whitespace-nowrap px-5 py-4 text-sm text-gray-600 dark:text-gray-400">${escapeHtml(row.transaction_date)}</td><td class="px-5 py-4"><p class="whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(row.title)}</p><p class="mt-1 text-xs text-gray-500">${escapeHtml(row.category_name || row.type_label)}</p></td><td class="whitespace-nowrap px-5 py-4 text-sm text-gray-600 dark:text-gray-400">${escapeHtml(account)}</td><td class="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold ${positive ? 'text-success-600' : 'text-gray-900 dark:text-white'}">${positive ? '+' : row.type === 'transfer' ? '' : '−'}${idr.format(Math.abs(row.amount))}</td></tr>`;
            }).join('') : '<tr><td colspan="4" class="px-5 py-14 text-center text-sm text-gray-500">Tidak ada transaksi pada filter ini.</td></tr>');
            const totalExpense = summary.expense || 1;
            $('[data-report-categories]').html(byCategory.length ? byCategory.slice(0, 8).map((item) => `<div><div class="mb-2 flex justify-between gap-3"><span class="truncate text-sm text-gray-700 dark:text-gray-300">${escapeHtml(item.name)}</span><span class="text-xs font-semibold text-gray-900 dark:text-white">${idr.format(item.amount)}</span></div><div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]"><div class="h-full rounded-full bg-brand-500" style="width:${Math.round((item.amount / totalExpense) * 100)}%"></div></div></div>`).join('') : '<p class="py-8 text-center text-sm text-gray-500">Belum ada pengeluaran.</p>');
            $('[data-report-error]').addClass('hidden').text('');
        } catch (error) {
            $('[data-report-error]').removeClass('hidden').text(error.message);
        }
    };

    $('[data-report-type], [data-report-account], [data-report-category]').on('change', render);
    $('[data-report-export]').on('click', () => {
        if (!currentReport?.rows.length) return;
        const { date_from: from, date_to: to } = currentReport.filters;
        downloadTransactionCsv(currentReport.rows, `rumahkas-transaksi-${from || 'awal'}-${to || 'akhir'}.csv`);
        showToast($('[data-report-toast]'), 'Laporan CSV berhasil dibuat.');
    });
    await render();
}
