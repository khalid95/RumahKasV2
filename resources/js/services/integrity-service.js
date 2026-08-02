import { db } from '../database/database';
import { nowIso } from '../database/entity';
import { BalanceService } from './balance-service';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
export async function inspectDatabase(database = db) {
    await database.open();
    const [accounts, categories, transactions, budgets, savingGoals, plannerTasks, habits, habitLogs] = await Promise.all([database.financial_accounts.toArray(), database.categories.toArray(), database.transactions.toArray(), database.budgets.toArray(), database.saving_goals.toArray(), database.planner_tasks.toArray(), database.habits.toArray(), database.habit_logs.toArray()]);
    const accountIds = new Set(accounts.map((item) => item.id)); const categoryIds = new Set(categories.map((item) => item.id)); const issues = [];
    const add = (entity, id, code, message) => issues.push({ entity, id, code, message });
    for (const item of transactions) {
        if (!accountIds.has(item.financial_account_id)) add('transaction', item.id, 'missing_account', 'Akun sumber transaksi tidak ditemukan.');
        if (!Number.isSafeInteger(item.amount) || item.amount === 0) add('transaction', item.id, 'invalid_amount', 'Nominal transaksi tidak valid.');
        if (!DATE.test(item.transaction_date || '')) add('transaction', item.id, 'invalid_date', 'Tanggal transaksi tidak valid.');
        if (item.type === 'transfer' && !accountIds.has(item.destination_account_id)) add('transaction', item.id, 'missing_destination', 'Akun tujuan transfer tidak ditemukan.');
        if (['income', 'expense'].includes(item.type) && !categoryIds.has(item.category_id)) add('transaction', item.id, 'missing_category', 'Kategori transaksi tidak ditemukan.');
    }
    for (const item of budgets) {
        if (!categoryIds.has(item.category_id)) add('budget', item.id, 'missing_category', 'Kategori budget tidak ditemukan.');
        if (!Number.isSafeInteger(item.amount) || item.amount <= 0) add('budget', item.id, 'invalid_amount', 'Nominal budget tidak valid.');
    }
    for (const item of savingGoals) {
        if (!Number.isSafeInteger(item.target_amount) || item.target_amount <= 0) add('saving_goal', item.id, 'invalid_target', 'Nominal target tabungan tidak valid.');
        if (!Number.isSafeInteger(item.saved_amount) || item.saved_amount < 0) add('saving_goal', item.id, 'invalid_saved', 'Dana terkumpul target tidak valid.');
    }
    const habitIds = new Set(habits.map((item) => item.id));
    for (const item of plannerTasks) if (!DATE.test(item.task_date || '')) add('planner_task', item.id, 'invalid_date', 'Tanggal aktivitas planner tidak valid.');
    for (const item of habitLogs) if (!habitIds.has(item.habit_id)) add('habit_log', item.id, 'missing_habit', 'Kebiasaan untuk log ini tidak ditemukan.');
    const balances = await Promise.all(accounts.map(async (account) => ({ id: account.id, name: account.name, balance: await new BalanceService(database).calculate(account.id) })));
    return { healthy: issues.length === 0, issues, balances, counts: { accounts: accounts.length, categories: categories.length, transactions: transactions.length, budgets: budgets.length, savingGoals: savingGoals.length, plannerTasks: plannerTasks.length, habits: habits.length, auditLogs: await database.audit_logs.count() }, checkedAt: nowIso() };
}

export async function storageStatus() {
    const estimate = await navigator.storage?.estimate?.() || {}; const persisted = await navigator.storage?.persisted?.() || false;
    return { usage: estimate.usage || 0, quota: estimate.quota || 0, persisted };
}

export async function cleanOldAuditLogs(days = 180, database = db) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const keys = await database.audit_logs.where('created_at').below(cutoff).primaryKeys(); await database.audit_logs.bulkDelete(keys); return keys.length;
}

export async function resetFinancialData(database = db) {
    const names = ['financial_accounts', 'transactions', 'budgets', 'saving_goals', 'audit_logs']; const tables = names.map((name) => database.table(name));
    await database.transaction('rw', tables, async () => { for (const table of tables) await table.clear(); });
}
