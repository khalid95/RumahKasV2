import { BaseRepository } from './base-repository';

export class BudgetRepository extends BaseRepository {
    constructor(database) {
        super(database, 'budgets');
    }

    byPeriod(profileId, year, month) {
        return this.table.where('[profile_id+year+month]').equals([profileId, year, month]).toArray();
    }

    async findForCategory(profileId, categoryId, year, month, exceptId = null) {
        const budgets = await this.byPeriod(profileId, year, month);
        return budgets.find((budget) => budget.category_id === categoryId && budget.id !== exceptId);
    }
}
