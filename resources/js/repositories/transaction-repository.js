import { BaseRepository } from './base-repository';

export class TransactionRepository extends BaseRepository {
    constructor(database) {
        super(database, 'transactions');
    }

    async list(filters = {}) {
        let transactions = await this.table.orderBy('transaction_date').reverse().toArray();

        transactions = transactions.filter((transaction) => !transaction.deleted_at);
        if (filters.profile_id) transactions = transactions.filter((item) => item.profile_id === filters.profile_id);
        if (filters.type) transactions = transactions.filter((item) => item.type === filters.type);
        if (filters.status) transactions = transactions.filter((item) => item.status === filters.status);
        if (filters.account_id) {
            transactions = transactions.filter((item) => (
                item.financial_account_id === filters.account_id || item.destination_account_id === filters.account_id
            ));
        }
        if (filters.category_id) transactions = transactions.filter((item) => item.category_id === filters.category_id);
        if (filters.date_from) transactions = transactions.filter((item) => item.transaction_date >= filters.date_from);
        if (filters.date_to) transactions = transactions.filter((item) => item.transaction_date <= filters.date_to);
        if (filters.search) {
            const search = filters.search.trim().toLocaleLowerCase('id-ID');
            transactions = transactions.filter((item) => (
                item.title.toLocaleLowerCase('id-ID').includes(search)
                || item.description?.toLocaleLowerCase('id-ID').includes(search)
            ));
        }

        return transactions.sort((a, b) => (
            b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at)
        ));
    }
}
