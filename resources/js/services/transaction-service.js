import { createEntity, nowIso, updateEntity } from '../database/entity';
import { TransactionRepository } from '../repositories/transaction-repository';
import { evaluateCalculation } from './calculator-service';

const TYPES = ['income', 'expense', 'transfer', 'adjustment'];
const STATUSES = ['draft', 'posted', 'cancelled'];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class TransactionValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'TransactionValidationError';
        this.field = field;
    }
}

export class TransactionService {
    constructor(database) {
        this.database = database;
        this.repository = new TransactionRepository(database);
    }

    list(filters = {}) {
        return this.repository.list({ profile_id: 'default-profile', ...filters });
    }

    find(id) {
        return this.repository.find(id);
    }

    async create(input) {
        return this.database.transaction(
            'rw',
            this.database.transactions,
            this.database.financial_accounts,
            this.database.categories,
            this.database.audit_logs,
            async () => {
                const data = await this.validate(input);
                const transaction = createEntity({
                    ...data,
                    profile_id: 'default-profile',
                    attachment_id: null,
                    source: 'manual',
                    recurring_transaction_id: null,
                    deleted_at: null,
                });
                await this.database.transactions.add(transaction);
                await this.writeAudit('created', transaction.id, null, transaction);
                return transaction;
            },
        );
    }

    async update(id, input) {
        return this.database.transaction(
            'rw',
            this.database.transactions,
            this.database.financial_accounts,
            this.database.categories,
            this.database.audit_logs,
            async () => {
                const existing = await this.requireTransaction(id);
                if (existing.deleted_at) throw new TransactionValidationError('Transaksi yang sudah dihapus tidak dapat diedit.');
                if (existing.status === 'cancelled') throw new TransactionValidationError('Transaksi yang sudah dibatalkan tidak dapat diedit.');
                const data = await this.validate({ ...existing, ...input });
                const updated = updateEntity({ ...existing, ...data, id });
                await this.database.transactions.put(updated);
                await this.writeAudit('updated', id, existing, updated);
                return updated;
            },
        );
    }

    async cancel(id) {
        return this.database.transaction('rw', this.database.transactions, this.database.audit_logs, async () => {
            const existing = await this.requireTransaction(id);
            if (existing.deleted_at) throw new TransactionValidationError('Transaksi sudah dihapus.');
            if (existing.status === 'cancelled') throw new TransactionValidationError('Transaksi sudah dibatalkan.');
            const updated = updateEntity({ ...existing, status: 'cancelled' });
            await this.database.transactions.put(updated);
            await this.writeAudit('cancelled', id, existing, updated);
            return updated;
        });
    }

    async delete(id) {
        return this.database.transaction('rw', this.database.transactions, this.database.audit_logs, async () => {
            const existing = await this.requireTransaction(id);
            if (existing.deleted_at) throw new TransactionValidationError('Transaksi sudah dihapus.');
            const updated = updateEntity({ ...existing, deleted_at: nowIso() });
            await this.database.transactions.put(updated);
            await this.writeAudit('deleted', id, existing, updated);
            return updated;
        });
    }

    async validate(input) {
        if (!TYPES.includes(input.type)) throw new TransactionValidationError('Tipe transaksi tidak valid.', 'type');
        if (!STATUSES.includes(input.status || 'posted')) throw new TransactionValidationError('Status transaksi tidak valid.', 'status');

        const amount = Number(input.amount);
        if (!Number.isSafeInteger(amount) || amount === 0) {
            throw new TransactionValidationError('Nominal harus berupa angka bulat dan tidak boleh nol.', 'amount');
        }
        if (input.type !== 'adjustment' && amount < 0) {
            throw new TransactionValidationError('Nominal transaksi harus lebih besar dari nol.', 'amount');
        }
        if (Math.abs(amount) > 999_999_999_999) {
            throw new TransactionValidationError('Nominal transaksi melebihi batas.', 'amount');
        }

        const title = input.title?.trim().replace(/\s+/g, ' ');
        if (!title) throw new TransactionValidationError('Judul transaksi wajib diisi.', 'title');
        if (title.length > 100) throw new TransactionValidationError('Judul maksimal 100 karakter.', 'title');
        const description = input.description?.trim() || null;
        if (description?.length > 500) throw new TransactionValidationError('Catatan maksimal 500 karakter.', 'description');
        const calculationExpression = input.calculation_expression?.trim() || null;
        if (calculationExpression && (calculationExpression.length > 60 || !/^\d+(?:[+\-*/]\d+)+$/.test(calculationExpression))) throw new TransactionValidationError('Rumus kalkulator tidak valid.', 'amount');
        if (calculationExpression && evaluateCalculation(calculationExpression) !== Math.abs(amount)) throw new TransactionValidationError('Hasil kalkulator tidak sesuai nominal.', 'amount');

        const transactionDate = input.transaction_date;
        const parsedDate = DATE_PATTERN.test(transactionDate) ? new Date(`${transactionDate}T00:00:00Z`) : null;
        if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== transactionDate) {
            throw new TransactionValidationError('Tanggal transaksi tidak valid.', 'transaction_date');
        }

        const account = await this.database.financial_accounts.get(input.financial_account_id);
        if (!account) throw new TransactionValidationError('Akun sumber tidak ditemukan.', 'financial_account_id');
        if (!account.is_active) throw new TransactionValidationError('Akun sumber sedang nonaktif.', 'financial_account_id');

        let destinationAccountId = null;
        let categoryId = null;
        if (input.type === 'transfer') {
            destinationAccountId = input.destination_account_id;
            if (!destinationAccountId) throw new TransactionValidationError('Akun tujuan wajib dipilih.', 'destination_account_id');
            if (destinationAccountId === input.financial_account_id) throw new TransactionValidationError('Akun sumber dan tujuan harus berbeda.', 'destination_account_id');
            const destinationAccount = await this.database.financial_accounts.get(destinationAccountId);
            if (!destinationAccount) {
                throw new TransactionValidationError('Akun tujuan tidak ditemukan.', 'destination_account_id');
            }
            if (!destinationAccount.is_active) throw new TransactionValidationError('Akun tujuan sedang nonaktif.', 'destination_account_id');
        }

        if (input.type === 'income' || input.type === 'expense') {
            categoryId = input.category_id;
            const category = categoryId ? await this.database.categories.get(categoryId) : null;
            if (!category || !category.is_active || category.type !== input.type) {
                throw new TransactionValidationError('Kategori tidak sesuai dengan tipe transaksi.', 'category_id');
            }
        }

        return {
            financial_account_id: input.financial_account_id,
            destination_account_id: destinationAccountId,
            category_id: categoryId,
            type: input.type,
            amount,
            transaction_date: transactionDate,
            title,
            description,
            calculation_expression: calculationExpression,
            status: input.status || 'posted',
        };
    }

    async requireTransaction(id) {
        const transaction = await this.database.transactions.get(id);
        if (!transaction) throw new TransactionValidationError('Transaksi tidak ditemukan.');
        return transaction;
    }

    writeAudit(action, entityId, before, after) {
        return this.database.audit_logs.add(createEntity({
            entity_type: 'transaction',
            entity_id: entityId,
            action,
            before,
            after,
        }));
    }
}
