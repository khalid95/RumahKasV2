import { BaseRepository } from './base-repository';

export class AccountRepository extends BaseRepository {
    constructor(database) {
        super(database, 'financial_accounts');
    }

    byProfile(profileId = 'default-profile') {
        return this.table.where('profile_id').equals(profileId).sortBy('name');
    }

    async findByNormalizedName(name, profileId = 'default-profile', exceptId = null) {
        const normalized = name.trim().toLocaleLowerCase('id-ID');
        const accounts = await this.table.where('profile_id').equals(profileId).toArray();

        return accounts.find((account) => (
            account.id !== exceptId
            && account.name.trim().toLocaleLowerCase('id-ID') === normalized
        ));
    }

    async countTransactions(id) {
        const [source, destination] = await Promise.all([
            this.database.transactions.where('financial_account_id').equals(id).count(),
            this.database.transactions.where('destination_account_id').equals(id).count(),
        ]);

        return source + destination;
    }
}
