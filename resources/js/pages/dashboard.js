import $ from 'jquery';
import { db } from '../database/database';
import { initializeDatabase } from '../services/database-service';
import { DashboardService } from '../services/dashboard-service';
import { financialInsight, productivityInsight } from '../services/insight-service';

const idr = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const shortIdr = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
const typeLabels = { income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer', adjustment: 'Adjustment' };
const accountTypeLabels = { cash: 'Tunai', bank: 'Bank', ewallet: 'E-Wallet', investment: 'Investasi', other: 'Lainnya' };
const transferIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8h13m0 0-3-3m3 3-3 3M19 16H6m0 0 3 3m-3-3 3-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function escapeHtml(value) { return $('<div>').text(value ?? '').html(); }

function renderChart(days) {
    const activeDays = days.filter((item) => item.income || item.expense);
    if (!activeDays.length) return '<p class="max-w-xs text-center text-sm text-gray-500 dark:text-gray-400">Grafik akan muncul setelah kamu menambahkan transaksi bulan ini.</p>';
    const max = Math.max(...days.flatMap((item) => [item.income, item.expense]), 1);
    return `<div class="w-full"><div class="mb-3 flex justify-end gap-4 text-xs text-gray-500"><span><i class="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-success-400"></i>Pemasukan</span><span><i class="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-error-400"></i>Pengeluaran</span></div><div class="flex h-40 items-end gap-1">${days.map((item) => {
        const incomeHeight = Math.max(item.income ? 4 : 0, Math.round((item.income / max) * 132));
        const expenseHeight = Math.max(item.expense ? 4 : 0, Math.round((item.expense / max) * 132));
        return `<div class="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-px" title="Tgl ${item.day}: +${idr.format(item.income)} / -${idr.format(item.expense)}"><span class="w-1/2 rounded-t bg-success-400" style="height:${incomeHeight}px"></span><span class="w-1/2 rounded-t bg-error-400" style="height:${expenseHeight}px"></span>${item.day % 5 === 0 || item.day === 1 ? `<small class="absolute -bottom-4 text-[9px] text-gray-400">${item.day}</small>` : ''}</div>`;
    }).join('')}</div></div>`;
}

async function renderExpenseChart(items, totalExpense) {
    const element = document.querySelector('[data-expense-categories]');
    if (!element) return;
    if (!items.length) { element.innerHTML = '<div class="flex min-h-56 items-center justify-center text-center"><div><span class="text-2xl text-gray-300">◌</span><p class="mt-2 text-sm text-gray-500">Belum ada pengeluaran bulan ini.</p></div></div>'; return; }
    const visible = items.slice(0, 5); const remainder = items.slice(5).reduce((sum, item) => sum + item.amount, 0);
    if (remainder) visible.push({ name: 'Lainnya', amount: remainder });
    element.replaceChildren();
    const { default: ApexCharts } = await import('apexcharts');
    const dark = document.documentElement.classList.contains('dark');
    const chart = new ApexCharts(element, {
        chart: { type: 'donut', height: 270, fontFamily: 'Inter, sans-serif', animations: { enabled: true, speed: 450 }, toolbar: { show: false } },
        series: visible.map((item) => item.amount), labels: visible.map((item) => item.name),
        colors: ['#12b76a', '#0ba5ec', '#f79009', '#f04438', '#7a5af8', '#667085'],
        stroke: { width: 3, colors: [dark ? '#101828' : '#ffffff'] }, dataLabels: { enabled: false },
        plotOptions: { pie: { expandOnClick: false, donut: { size: '68%', labels: { show: true, name: { show: true, color: dark ? '#98a2b3' : '#667085', fontSize: '11px', offsetY: 18 }, value: { show: true, color: dark ? '#ffffff' : '#101828', fontSize: '17px', fontWeight: 700, offsetY: -4, formatter: (value) => shortIdr.format(Number(value)) }, total: { show: true, showAlways: true, label: 'Total', color: dark ? '#98a2b3' : '#667085', fontSize: '11px', formatter: () => shortIdr.format(totalExpense) } } } } },
        legend: { show: true, position: 'bottom', horizontalAlign: 'left', fontSize: '11px', labels: { colors: dark ? '#d0d5dd' : '#475467' }, markers: { size: 6, offsetX: -2 }, itemMargin: { horizontal: 8, vertical: 4 } },
        tooltip: { theme: dark ? 'dark' : 'light', y: { formatter: (value) => idr.format(value), title: { formatter: (name) => `${name}: ` } } },
        states: { hover: { filter: { type: 'lighten', value: 0.04 } }, active: { filter: { type: 'none' } } },
        responsive: [{ breakpoint: 420, options: { chart: { height: 250 }, legend: { fontSize: '10px' } } }],
    });
    await chart.render();
}

export async function initializeDashboardPage() {
    await initializeDatabase();
    const summary = await new DashboardService(db).summary();
    $('[data-dashboard-total]').text(idr.format(summary.total_balance));
    $('[data-dashboard-income]').text(idr.format(summary.income));
    $('[data-dashboard-expense]').text(idr.format(summary.expense));
    $('[data-dashboard-net]').text(idr.format(summary.net_cashflow));
    $('[data-dashboard-budget]').text(`${Math.round(summary.budget_percentage)}%`);
    $('[data-cashflow-chart]').html(renderChart(summary.daily_cashflow));
    const planner = summary.planner_today;
    $('[data-planner-task-progress]').text(`${planner.tasks_completed}/${planner.tasks_total}`); $('[data-planner-habit-progress]').text(`${planner.habits_completed}/${planner.habits_total}`); $('[data-planner-today-detail]').text(planner.next_tasks.length ? planner.next_tasks.map((item) => `${item.time || 'Hari ini'} ${item.title}`).join(' · ') : planner.tasks_total ? 'Semua aktivitas sudah selesai.' : 'Belum ada aktivitas.');
    const financeInsight = financialInsight(summary); const workInsight = productivityInsight(planner);
    $('[data-financial-insight-icon]').text(financeInsight.icon); $('[data-financial-insight-eyebrow]').text(financeInsight.eyebrow); $('[data-financial-insight-title]').text(financeInsight.title); $('[data-financial-insight-detail]').text(financeInsight.detail);
    $('[data-productivity-insight-icon]').text(workInsight.icon); $('[data-productivity-insight-eyebrow]').text(workInsight.eyebrow); $('[data-productivity-insight-title]').text(workInsight.title); $('[data-productivity-insight-detail]').text(workInsight.detail);

    $('[data-saving-summary]').text(summary.saving_goals.length ? `${idr.format(summary.saving_saved)} dari ${idr.format(summary.saving_target)}` : 'Mulai target pertamamu');
    $('[data-saving-goals]').html(summary.saving_goals.length ? summary.saving_goals.slice(0, 3).map((goal) => `<div><div class="mb-2 flex items-center justify-between gap-3"><span class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">${escapeHtml(goal.name)}</span><span class="text-xs font-semibold text-brand-600">${Math.round(goal.percentage)}%</span></div><div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.06]"><div class="h-full rounded-full ${goal.percentage >= 100 ? 'bg-success-500' : 'bg-brand-500'}" style="width:${goal.percentage}%"></div></div><p class="mt-1.5 text-xs text-gray-500">${goal.percentage >= 100 ? 'Target tercapai' : `Kurang ${idr.format(goal.remaining)}`}</p></div>`).join('') : '<div class="rounded-xl bg-gray-50 p-4 text-center dark:bg-white/[0.03]"><p class="text-sm text-gray-500">Belum ada target tabungan.</p><a href="/saving-goals" class="mt-2 inline-block text-sm font-semibold text-brand-600">Buat target</a></div>');

    $('[data-account-summary]').html(summary.account_summaries.length ? summary.account_summaries.slice(0, 5).map((account) => `<div class="flex items-center gap-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-sm font-bold text-brand-600 dark:bg-brand-500/10">${escapeHtml(account.name.charAt(0).toUpperCase())}</span><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">${escapeHtml(account.name)}</p><p class="text-xs text-gray-500">${escapeHtml(accountTypeLabels[account.type] || 'Akun')}</p></div><span class="text-sm font-semibold ${account.current_balance < 0 ? 'text-error-600' : 'text-gray-900 dark:text-white'}">${idr.format(account.current_balance)}</span></div>`).join('') : '<div class="rounded-xl bg-gray-50 p-4 text-center dark:bg-white/[0.03]"><p class="text-sm text-gray-500">Belum ada akun aktif.</p><a href="/accounts" class="mt-2 inline-block text-sm font-semibold text-brand-600">Tambah akun</a></div>');

    await renderExpenseChart(summary.expense_by_category, summary.expense);

    $('[data-recent-transactions]').html(summary.recent_transactions.length
        ? `<div class="w-full divide-y divide-gray-100 dark:divide-gray-800">${summary.recent_transactions.slice(0, 4).map((item) => {
            const positive = item.type === 'income' || (item.type === 'adjustment' && item.amount > 0);
            const account = summary.accounts[item.financial_account_id] || 'Akun dihapus';
            const icon = item.type === 'transfer' ? transferIcon : positive ? '↓' : '↑';
            const iconClass = item.type === 'transfer' ? 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/10' : positive ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600';
            return `<div class="flex items-center gap-3 py-3"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClass}">${icon}</span><div class="min-w-0 flex-1 text-left"><p class="truncate text-sm font-medium text-gray-800 dark:text-gray-200">${escapeHtml(item.title)}</p><p class="truncate text-xs text-gray-500">${escapeHtml(account)} · ${typeLabels[item.type]}</p></div><span class="text-xs font-semibold ${positive ? 'text-success-600' : 'text-gray-900 dark:text-white'}">${positive ? '+' : item.type === 'transfer' ? '' : '−'}${idr.format(Math.abs(item.amount))}</span></div>`;
        }).join('')}</div>`
        : '<div class="flex min-h-32 flex-col items-center justify-center text-center"><p class="font-medium text-gray-700 dark:text-gray-300">Belum ada transaksi</p><p class="mt-1 text-sm text-gray-500">Transaksi terbaru akan tampil di sini.</p></div>');
}
