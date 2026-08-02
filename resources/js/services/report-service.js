const TYPE_LABELS = { income: 'Pemasukan', expense: 'Pengeluaran', transfer: 'Transfer', adjustment: 'Adjustment' };

export class ReportValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'ReportValidationError';
        this.field = field;
    }
}

export class ReportService {
    constructor(database) { this.database = database; }

    async generate(filters = {}) {
        this.validateFilters(filters);
        const [transactions, accounts, categories] = await Promise.all([
            this.filteredTransactions(filters),
            this.database.financial_accounts.toArray(),
            this.database.categories.toArray(),
        ]);
        const accountNames = Object.fromEntries(accounts.map((item) => [item.id, item.name]));
        const categoryNames = Object.fromEntries(categories.map((item) => [item.id, item.name]));
        const rows = transactions.map((item) => ({
            ...item,
            type_label: TYPE_LABELS[item.type] || item.type,
            account_name: accountNames[item.financial_account_id] || 'Akun dihapus',
            destination_account_name: item.destination_account_id ? accountNames[item.destination_account_id] || 'Akun dihapus' : null,
            category_name: item.category_id ? categoryNames[item.category_id] || 'Kategori dihapus' : null,
        }));
        const income = rows.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
        const expense = rows.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);

        return {
            filters,
            rows,
            summary: { income, expense, net_cashflow: income - expense, transaction_count: rows.length },
            expense_by_category: this.expenseByCategory(rows),
            movement_by_account: this.movementByAccount(rows, accounts),
        };
    }

    async filteredTransactions(filters) {
        let rows;
        if (filters.date_from && filters.date_to) {
            rows = await this.database.transactions.where('transaction_date').between(filters.date_from, filters.date_to, true, true).toArray();
        } else if (filters.date_from) {
            rows = await this.database.transactions.where('transaction_date').aboveOrEqual(filters.date_from).toArray();
        } else if (filters.date_to) {
            rows = await this.database.transactions.where('transaction_date').belowOrEqual(filters.date_to).toArray();
        } else {
            rows = await this.database.transactions.toArray();
        }

        return rows.filter((item) => {
            if (item.profile_id !== 'default-profile' || item.status !== 'posted' || item.deleted_at) return false;
            if (filters.type && item.type !== filters.type) return false;
            if (filters.account_id && item.financial_account_id !== filters.account_id && item.destination_account_id !== filters.account_id) return false;
            if (filters.category_id && item.category_id !== filters.category_id) return false;
            return true;
        }).sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at));
    }

    validateFilters(filters) {
        const validDate = (value) => {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
            const date = new Date(`${value}T00:00:00Z`);
            return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
        };
        if (filters.date_from && !validDate(filters.date_from)) throw new ReportValidationError('Tanggal mulai tidak valid.', 'date_from');
        if (filters.date_to && !validDate(filters.date_to)) throw new ReportValidationError('Tanggal akhir tidak valid.', 'date_to');
        if (filters.date_from && filters.date_to && filters.date_from > filters.date_to) {
            throw new ReportValidationError('Tanggal mulai tidak boleh melewati tanggal akhir.', 'date_from');
        }
        if (filters.type && !Object.hasOwn(TYPE_LABELS, filters.type)) throw new ReportValidationError('Tipe transaksi tidak valid.', 'type');
    }

    expenseByCategory(rows) {
        const totals = new Map();
        for (const row of rows.filter((item) => item.type === 'expense')) {
            const name = row.category_name || 'Tanpa Kategori';
            totals.set(name, (totals.get(name) || 0) + row.amount);
        }
        return [...totals.entries()].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
    }

    movementByAccount(rows, accounts) {
        const totals = new Map(accounts.map((account) => [account.id, 0]));
        for (const row of rows) {
            if (row.type === 'income') totals.set(row.financial_account_id, (totals.get(row.financial_account_id) || 0) + row.amount);
            if (row.type === 'expense' || row.type === 'transfer') totals.set(row.financial_account_id, (totals.get(row.financial_account_id) || 0) - row.amount);
            if (row.type === 'adjustment') totals.set(row.financial_account_id, (totals.get(row.financial_account_id) || 0) + row.amount);
            if (row.type === 'transfer') totals.set(row.destination_account_id, (totals.get(row.destination_account_id) || 0) + row.amount);
        }
        return accounts.map((account) => ({ account_id: account.id, name: account.name, movement: totals.get(account.id) || 0 }))
            .filter((item) => item.movement !== 0).sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement));
    }
}
