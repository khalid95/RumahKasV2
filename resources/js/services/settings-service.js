import { db } from '../database/database';
import { nowIso } from '../database/entity';

export async function getAppSettings(database = db) {
    await database.open();
    const [profile, reminder, lastBackup] = await Promise.all([
        database.profiles.get('default-profile'),
        database.settings.get('backup_reminder_days'),
        database.settings.get('last_backup_at'),
    ]);
    return { profile, backupReminderDays: reminder?.value ?? 14, lastBackupAt: lastBackup?.value ?? null };
}

export async function saveProfileSettings(values, database = db) {
    const name = String(values.name || '').trim();
    const monthStartDay = Number(values.month_start_day);
    const backupReminderDays = Number(values.backup_reminder_days);
    if (name.length < 2 || name.length > 80) throw new Error('Nama keluarga harus 2–80 karakter.');
    if (!Number.isInteger(monthStartDay) || monthStartDay < 1 || monthStartDay > 28) throw new Error('Awal periode harus antara tanggal 1–28.');
    if (![0, 7, 14, 30].includes(backupReminderDays)) throw new Error('Pilihan pengingat backup tidak valid.');
    await database.transaction('rw', database.profiles, database.settings, database.audit_logs, async () => {
        await database.profiles.update('default-profile', { name, currency_default: 'IDR', month_start_day: monthStartDay, updated_at: nowIso() });
        await database.settings.put({ key: 'backup_reminder_days', value: backupReminderDays, updated_at: nowIso() });
        await database.audit_logs.add({ id: crypto.randomUUID(), entity_type: 'settings', entity_id: 'default-profile', action: 'settings.updated', metadata: { month_start_day: monthStartDay, backup_reminder_days: backupReminderDays }, created_at: nowIso(), updated_at: nowIso() });
    });
}

export async function isBackupDue(database = db, date = new Date()) {
    const settings = await getAppSettings(database);
    if (!settings.backupReminderDays) return false;
    const reference = settings.lastBackupAt || settings.profile?.created_at;
    if (!reference) return false;
    return date.getTime() - new Date(reference).getTime() >= settings.backupReminderDays * 86400000;
}
