import { DEFAULT_CATEGORIES } from '../database/default-categories';
import { createEntity, nowIso } from '../database/entity';
import { db } from '../database/database';
import { DATABASE_VERSION } from '../database/schema';

export async function initializeDatabase(database = db) {
    await database.open();

    await database.transaction('rw', database.settings, database.profiles, database.categories, database.planner_tasks, database.habits, async () => {
        const deletedDefaults = new Set((await database.settings.get('deleted_default_category_slugs'))?.value || []);
        if (!(await database.profiles.get('default-profile'))) {
            await database.profiles.add(createEntity({
                id: 'default-profile',
                name: 'Keluarga Saya',
                currency_default: 'IDR',
                month_start_day: 1,
                is_default: 1,
            }));
        }

        for (const category of DEFAULT_CATEGORIES) {
            if (!deletedDefaults.has(category.slug) && !(await database.categories.where('slug').equals(category.slug).first())) {
                await database.categories.add(createEntity({
                    ...category,
                    parent_id: null,
                    icon: null,
                    color: category.type === 'income' ? '#12b76a' : '#f04438',
                    is_default: 1,
                    is_active: 1,
                }));
            }
        }

        if (!(await database.settings.get('planner_defaults_seeded'))) {
            const now = new Date(); const today = now.toLocaleDateString('en-CA'); const profileId = 'default-profile';
            if (!(await database.planner_tasks.count()) && !(await database.habits.count())) {
                const taskDefaults = [
                    { title: 'Rencanakan tiga prioritas hari ini', day_period: 'morning', priority: 'high', time: '07:00' },
                    { title: 'Luangkan waktu untuk bergerak', day_period: 'afternoon', priority: 'normal', time: null },
                    { title: 'Refleksi singkat sebelum istirahat', day_period: 'evening', priority: 'low', time: '21:00' },
                ];
                await database.planner_tasks.bulkAdd(taskDefaults.map((item, sortOrder) => createEntity({ ...item, profile_id: profileId, task_date: today, notes: null, is_completed: 0, completed_at: null, repeat_rule: null, sort_order: sortOrder })));
                const habits = [
                    { name: 'Minum air', icon: '💧', color: '#3b82f6', tracking_type: 'count', target_value: 8, unit: 'gelas' },
                    { name: 'Bergerak aktif', icon: '🏃', color: '#12b76a', tracking_type: 'duration', target_value: 20, unit: 'menit' },
                    { name: 'Membaca', icon: '📖', color: '#8b5cf6', tracking_type: 'duration', target_value: 15, unit: 'menit' },
                ];
                await database.habits.bulkAdd(habits.map((habit, sortOrder) => createEntity({ ...habit, profile_id: profileId, frequency: 'daily', selected_days: [0,1,2,3,4,5,6], sort_order: sortOrder, is_active: 1 })));
            }
            await database.settings.put({ key: 'planner_defaults_seeded', value: true, updated_at: nowIso() });
        }

        await database.settings.bulkPut([
            { key: 'database_version', value: DATABASE_VERSION, updated_at: nowIso() },
            { key: 'currency', value: 'IDR', updated_at: nowIso() },
            { key: 'initialized', value: true, updated_at: nowIso() },
        ]);
    });

    return getDatabaseStatus(database);
}

export async function getDatabaseStatus(database = db) {
    const [profiles, categories, accounts, transactions] = await Promise.all([
        database.profiles.count(),
        database.categories.count(),
        database.financial_accounts.count(),
        database.transactions.count(),
    ]);

    return {
        name: database.name,
        version: database.verno,
        profiles,
        categories,
        accounts,
        transactions,
        ready: database.isOpen(),
    };
}

export async function requestPersistentStorage() {
    if (!navigator.storage?.persist) return false;
    return navigator.storage.persist();
}
