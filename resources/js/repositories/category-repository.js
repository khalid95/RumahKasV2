import { BaseRepository } from './base-repository';

export class CategoryRepository extends BaseRepository {
    constructor(database) {
        super(database, 'categories');
    }

    activeByType(type) {
        return this.table.where({ type, is_active: 1 }).sortBy('name');
    }

    byType(type) {
        return this.table.where('type').equals(type).sortBy('name');
    }

    findBySlug(slug) {
        return this.table.where('slug').equals(slug).first();
    }

    async findByNormalizedName(name, type, exceptId = null) {
        const normalizedName = name.trim().toLocaleLowerCase('id-ID');
        const categories = await this.table.where('type').equals(type).toArray();

        return categories.find((category) => (
            category.id !== exceptId
            && category.name.trim().toLocaleLowerCase('id-ID') === normalizedName
        ));
    }

    countTransactions(id) {
        return this.database.transactions.where('category_id').equals(id).count();
    }
}
