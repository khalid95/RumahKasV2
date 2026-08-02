import { db } from '../database/database';
import { createEntity } from '../database/entity';
import { DATABASE_VERSION } from '../database/schema';

export const BACKUP_FORMAT = 'rumahkas.encrypted-backup';
export const BACKUP_VERSION = 1;
export const BACKUP_TABLES = ['settings', 'profiles', 'financial_accounts', 'categories', 'transactions', 'budgets', 'saving_goals', 'planner_tasks', 'habits', 'habit_logs', 'audit_logs'];
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const bytesToBase64 = (bytes) => btoa(String.fromCharCode(...bytes));
const base64ToBytes = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

function validatePassword(password) {
    if (String(password || '').length < 8) throw new Error('Password backup minimal 8 karakter.');
}

export async function createEncryptedBackup(password, database = db) {
    validatePassword(password);
    await database.open();
    const data = {};
    for (const table of BACKUP_TABLES) data[table] = await database.table(table).toArray();
    const payload = { app: 'RumahKas', schema_version: database.verno, created_at: new Date().toISOString(), data };
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await deriveKey(password, salt), encoder.encode(JSON.stringify(payload)));
    await database.audit_logs.add(createEntity({ entity_type: 'backup', entity_id: 'local', action: 'backup.created', metadata: { tables: BACKUP_TABLES.length } }));
    await database.settings.put({ key: 'last_backup_at', value: new Date().toISOString(), updated_at: new Date().toISOString() });
    return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, cipher: 'AES-256-GCM', kdf: 'PBKDF2-SHA256', iterations: 250000, salt: bytesToBase64(salt), iv: bytesToBase64(iv), payload: bytesToBase64(new Uint8Array(ciphertext)) });
}

export async function readEncryptedBackup(content, password) {
    validatePassword(password);
    let envelope;
    try { envelope = JSON.parse(content); } catch { throw new Error('File backup bukan JSON RumahKas yang valid.'); }
    if (envelope.format !== BACKUP_FORMAT || envelope.version !== BACKUP_VERSION) throw new Error('Format atau versi backup tidak didukung.');
    let backup;
    try {
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(envelope.iv) }, await deriveKey(password, base64ToBytes(envelope.salt)), base64ToBytes(envelope.payload));
        backup = JSON.parse(decoder.decode(decrypted));
    } catch { throw new Error('Password salah atau file backup rusak.'); }
    if (backup.app !== 'RumahKas' || !backup.data) throw new Error('Struktur backup RumahKas tidak valid.');
    // Store yang ditambahkan pada schema baru harus tetap menerima backup lama.
    if (backup.schema_version < 3 && !backup.data.saving_goals) backup.data.saving_goals = [];
    if (backup.schema_version < 4) for (const name of ['planner_tasks', 'habits', 'habit_logs']) if (!backup.data[name]) backup.data[name] = [];
    for (const table of BACKUP_TABLES) if (!Array.isArray(backup.data[table])) throw new Error(`Object store ${table} tidak ditemukan pada backup.`);
    validateBackupData(backup);
    return backup;
}

function validateBackupData(backup) {
    if (!Number.isFinite(backup.schema_version) || backup.schema_version > DATABASE_VERSION) throw new Error('Backup dibuat dengan versi RumahKas yang lebih baru. Update aplikasi terlebih dahulu.');
    for (const table of BACKUP_TABLES.filter((name) => name !== 'settings')) {
        const ids = backup.data[table].map((item) => item?.id);
        if (ids.some((id) => typeof id !== 'string' || !id)) throw new Error(`Data ${table} memiliki ID tidak valid.`);
        if (new Set(ids).size !== ids.length) throw new Error(`Backup memiliki UUID duplikat pada ${table}.`);
    }
    const accounts = new Set(backup.data.financial_accounts.map((item) => item.id)); const categories = new Set(backup.data.categories.map((item) => item.id));
    for (const item of backup.data.transactions) {
        if (!['income', 'expense', 'transfer', 'adjustment'].includes(item.type) || !Number.isSafeInteger(item.amount) || item.amount === 0 || !/^\d{4}-\d{2}-\d{2}$/.test(item.transaction_date || '')) throw new Error('Backup memiliki transaksi dengan nilai tidak valid.');
        if (!accounts.has(item.financial_account_id) || (item.type === 'transfer' && !accounts.has(item.destination_account_id)) || (['income', 'expense'].includes(item.type) && !categories.has(item.category_id))) throw new Error('Backup memiliki relasi transaksi yang rusak.');
    }
    for (const item of backup.data.budgets) if (!categories.has(item.category_id) || !Number.isSafeInteger(item.amount) || item.amount <= 0) throw new Error('Backup memiliki data budget yang tidak valid.');
    for (const item of backup.data.saving_goals) if (!Number.isSafeInteger(item.target_amount) || item.target_amount <= 0 || !Number.isSafeInteger(item.saved_amount) || item.saved_amount < 0) throw new Error('Backup memiliki target tabungan yang tidak valid.');
    for (const item of backup.data.planner_tasks) if (!/^\d{4}-\d{2}-\d{2}$/.test(item.task_date || '') || !['morning', 'afternoon', 'evening'].includes(item.day_period)) throw new Error('Backup memiliki task planner yang tidak valid.');
    const habitIds = new Set(backup.data.habits.map((item) => item.id));
    for (const item of backup.data.habit_logs) if (!habitIds.has(item.habit_id) || !/^\d{4}-\d{2}-\d{2}$/.test(item.log_date || '')) throw new Error('Backup memiliki log kebiasaan yang tidak valid.');
}

export function backupSummary(backup) {
    return { createdAt: backup.created_at, schemaVersion: backup.schema_version, profiles: backup.data.profiles.length, accounts: backup.data.financial_accounts.length, categories: backup.data.categories.length, transactions: backup.data.transactions.length, budgets: backup.data.budgets.length, savingGoals: backup.data.saving_goals.length, plannerTasks: backup.data.planner_tasks.length, habits: backup.data.habits.length };
}

export async function restoreBackup(backup, mode = 'merge', database = db) {
    if (!['merge', 'replace'].includes(mode)) throw new Error('Mode restore tidak valid.');
    await database.open();
    const tables = BACKUP_TABLES.map((name) => database.table(name));
    await database.transaction('rw', tables, async () => {
        if (mode === 'replace') for (const table of tables) await table.clear();
        for (const name of BACKUP_TABLES) if (backup.data[name].length) await database.table(name).bulkPut(backup.data[name]);
        await database.audit_logs.add(createEntity({ entity_type: 'backup', entity_id: 'local', action: 'backup.restored', metadata: { mode, created_at: backup.created_at } }));
    });
}
