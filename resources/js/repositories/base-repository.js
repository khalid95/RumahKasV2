import { createEntity, updateEntity } from '../database/entity';

export class BaseRepository {
    constructor(database, tableName) {
        if (!database[tableName]) {
            throw new Error(`Object store "${tableName}" tidak ditemukan.`);
        }

        this.database = database;
        this.table = database[tableName];
    }

    all() {
        return this.table.toArray();
    }

    find(id) {
        return this.table.get(id);
    }

    count() {
        return this.table.count();
    }

    async create(attributes) {
        const entity = createEntity(attributes);
        await this.table.add(entity);
        return entity;
    }

    async update(id, attributes) {
        const existing = await this.find(id);
        if (!existing) throw new Error(`Data dengan ID "${id}" tidak ditemukan.`);

        const entity = updateEntity({ ...existing, ...attributes, id });
        await this.table.put(entity);
        return entity;
    }

    async delete(id) {
        await this.table.delete(id);
    }
}
