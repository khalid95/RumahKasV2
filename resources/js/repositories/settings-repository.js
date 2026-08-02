import { nowIso } from '../database/entity';

export class SettingsRepository {
    constructor(database) {
        this.table = database.settings;
    }

    async get(key, fallback = null) {
        const setting = await this.table.get(key);
        return setting?.value ?? fallback;
    }

    async set(key, value) {
        await this.table.put({ key, value, updated_at: nowIso() });
        return value;
    }
}
