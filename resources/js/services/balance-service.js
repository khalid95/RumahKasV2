export class BalanceService {
    constructor(database) {
        this.database = database;
    }

    async calculate(accountId) {
        const account = await this.database.financial_accounts.get(accountId);
        if (!account) throw new Error('Akun keuangan tidak ditemukan.');

        const [sourceTransactions, destinationTransfers] = await Promise.all([
            this.database.transactions.where('financial_account_id').equals(accountId).toArray(),
            this.database.transactions.where('destination_account_id').equals(accountId).toArray(),
        ]);

        const posted = (transaction) => transaction.status === 'posted' && !transaction.deleted_at;
        let balance = account.opening_balance;

        for (const transaction of sourceTransactions.filter(posted)) {
            if (transaction.type === 'income') balance += transaction.amount;
            if (transaction.type === 'expense' || transaction.type === 'transfer') balance -= transaction.amount;
            if (transaction.type === 'adjustment') balance += transaction.amount;
        }

        for (const transaction of destinationTransfers.filter(posted)) {
            if (transaction.type === 'transfer') balance += transaction.amount;
        }

        return balance;
    }

    async total(profileId = 'default-profile') {
        const accounts = await this.database.financial_accounts.where('profile_id').equals(profileId).toArray();
        const included = accounts.filter((account) => account.is_active && account.include_in_total);
        const balances = await Promise.all(included.map((account) => this.calculate(account.id)));
        return balances.reduce((total, balance) => total + balance, 0);
    }
}
