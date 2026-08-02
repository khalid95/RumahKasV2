import { BudgetRepository } from '../repositories/budget-repository';

export class BudgetValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'BudgetValidationError';
        this.field = field;
    }
}

export class BudgetService {
    constructor(database) {
        this.database = database;
        this.repository = new BudgetRepository(database);
    }

    async list(year, month, profileId = 'default-profile') {
        this.validatePeriod(year, month);
        const [budgets, categories, transactions] = await Promise.all([
            this.repository.byPeriod(profileId, year, month),
            this.database.categories.toArray(),
            this.periodExpenses(year, month, profileId),
        ]);
        const categoryMap = new Map(categories.map((category) => [category.id, category]));

        return budgets.map((budget) => {
            const categoryIds = this.descendantIds(budget.category_id, categories);
            const spent = transactions
                .filter((transaction) => categoryIds.includes(transaction.category_id))
                .reduce((sum, transaction) => sum + transaction.amount, 0);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            return {
                ...budget,
                category: categoryMap.get(budget.category_id) || null,
                spent,
                remaining: budget.amount - spent,
                percentage,
                status: this.statusFor(percentage),
            };
        }).sort((a, b) => (b.percentage - a.percentage) || (a.category?.name || '').localeCompare(b.category?.name || '', 'id'));
    }

    find(id) { return this.repository.find(id); }

    async create(input, profileId = 'default-profile') {
        const data = await this.validate(input, profileId);
        return this.repository.create({ ...data, profile_id: profileId, notes: this.validateNotes(input.notes) });
    }

    async update(id, input) {
        const existing = await this.requireBudget(id);
        const data = await this.validate({ ...existing, ...input }, existing.profile_id, id);
        return this.repository.update(id, { ...data, notes: this.validateNotes(input.notes) });
    }

    async delete(id) {
        await this.requireBudget(id);
        await this.repository.delete(id);
    }

    async validate(input, profileId, exceptId = null) {
        const year = Number(input.year);
        const month = Number(input.month);
        this.validatePeriod(year, month);
        const amount = Number(input.amount);
        if (!Number.isSafeInteger(amount) || amount <= 0) throw new BudgetValidationError('Nominal budget harus lebih besar dari nol.', 'amount');
        if (amount > 999_999_999_999) throw new BudgetValidationError('Nominal budget melebihi batas.', 'amount');

        const category = await this.database.categories.get(input.category_id);
        if (!category || category.type !== 'expense') throw new BudgetValidationError('Budget hanya dapat dibuat untuk kategori pengeluaran.', 'category_id');
        if (await this.repository.findForCategory(profileId, category.id, year, month, exceptId)) {
            throw new BudgetValidationError('Budget kategori ini sudah ada pada periode yang dipilih.', 'category_id');
        }
        return { category_id: category.id, year, month, amount };
    }

    validatePeriod(year, month) {
        if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new BudgetValidationError('Tahun budget tidak valid.', 'year');
        if (!Number.isInteger(month) || month < 1 || month > 12) throw new BudgetValidationError('Bulan budget tidak valid.', 'month');
    }

    validateNotes(notes) {
        const value = notes?.trim() || null;
        if (value?.length > 250) throw new BudgetValidationError('Catatan maksimal 250 karakter.', 'notes');
        return value;
    }

    async periodExpenses(year, month, profileId) {
        const prefix = `${year}-${String(month).padStart(2, '0')}`;
        return (await this.database.transactions.where('transaction_date').startsWith(prefix).toArray())
            .filter((item) => item.profile_id === profileId && item.type === 'expense' && item.status === 'posted' && !item.deleted_at);
    }

    descendantIds(categoryId, categories) {
        const ids = [categoryId];
        for (const category of categories.filter((item) => item.parent_id === categoryId)) {
            ids.push(...this.descendantIds(category.id, categories));
        }
        return ids;
    }

    statusFor(percentage) {
        if (percentage <= 70) return 'safe';
        if (percentage <= 90) return 'attention';
        if (percentage < 100) return 'almost';
        if (percentage === 100) return 'exhausted';
        return 'over';
    }

    async requireBudget(id) {
        const budget = await this.repository.find(id);
        if (!budget) throw new BudgetValidationError('Budget tidak ditemukan.');
        return budget;
    }
}
