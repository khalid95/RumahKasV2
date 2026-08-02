import { db } from '../database/database';
import { createEntity, updateEntity } from '../database/entity';

export class SavingGoalValidationError extends Error {
    constructor(message, field = null) { super(message); this.name = 'SavingGoalValidationError'; this.field = field; }
}

const integer = (value) => Number(String(value ?? '').replace(/\D/g, ''));

export class SavingGoalService {
    constructor(database = db) { this.db = database; }

    validate(values) {
        const name = String(values.name || '').trim();
        const targetAmount = integer(values.target_amount);
        const savedAmount = integer(values.saved_amount);
        if (name.length < 2) throw new SavingGoalValidationError('Nama target minimal 2 karakter.', 'name');
        if (!Number.isSafeInteger(targetAmount) || targetAmount <= 0) throw new SavingGoalValidationError('Nominal target harus lebih dari nol.', 'target_amount');
        if (!Number.isSafeInteger(savedAmount) || savedAmount < 0) throw new SavingGoalValidationError('Dana terkumpul tidak valid.', 'saved_amount');
        if (values.target_date && !/^\d{4}-\d{2}-\d{2}$/.test(values.target_date)) throw new SavingGoalValidationError('Tanggal target tidak valid.', 'target_date');
        return { name, target_amount: targetAmount, saved_amount: savedAmount, target_date: values.target_date || null, notes: String(values.notes || '').trim().slice(0, 250) };
    }

    async list() {
        const items = await this.db.saving_goals.orderBy('created_at').reverse().toArray();
        return items.map((item) => this.decorate(item));
    }

    async find(id) { const item = await this.db.saving_goals.get(id); return item ? this.decorate(item) : null; }

    decorate(item) {
        const percentage = item.target_amount ? Math.min((item.saved_amount / item.target_amount) * 100, 100) : 0;
        return { ...item, percentage, remaining: Math.max(item.target_amount - item.saved_amount, 0), status: item.saved_amount >= item.target_amount ? 'completed' : 'active' };
    }

    async create(values) {
        const data = this.validate(values); const profile = await this.db.profiles.toCollection().first();
        const goal = createEntity({ ...data, profile_id: profile?.id || 'default-profile', status: data.saved_amount >= data.target_amount ? 'completed' : 'active' });
        await this.db.transaction('rw', this.db.saving_goals, this.db.audit_logs, async () => { await this.db.saving_goals.add(goal); await this.db.audit_logs.add(createEntity({ entity_type: 'saving_goal', entity_id: goal.id, action: 'saving_goal.created' })); });
        return goal;
    }

    async update(id, values) {
        if (!await this.db.saving_goals.get(id)) throw new SavingGoalValidationError('Target tabungan tidak ditemukan.');
        const data = this.validate(values); const changes = updateEntity({ ...data, status: data.saved_amount >= data.target_amount ? 'completed' : 'active' });
        await this.db.transaction('rw', this.db.saving_goals, this.db.audit_logs, async () => { await this.db.saving_goals.update(id, changes); await this.db.audit_logs.add(createEntity({ entity_type: 'saving_goal', entity_id: id, action: 'saving_goal.updated' })); });
        return this.find(id);
    }

    async contribute(id, amount) {
        const goal = await this.db.saving_goals.get(id); const value = Number(amount);
        if (!goal) throw new SavingGoalValidationError('Target tabungan tidak ditemukan.');
        if (!Number.isSafeInteger(value) || value === 0 || goal.saved_amount + value < 0) throw new SavingGoalValidationError('Nominal perubahan dana tidak valid.', 'contribution');
        return this.update(id, { ...goal, saved_amount: goal.saved_amount + value });
    }

    async delete(id) {
        await this.db.transaction('rw', this.db.saving_goals, this.db.audit_logs, async () => { await this.db.saving_goals.delete(id); await this.db.audit_logs.add(createEntity({ entity_type: 'saving_goal', entity_id: id, action: 'saving_goal.deleted' })); });
    }
}
