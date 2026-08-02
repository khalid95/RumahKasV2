import Dexie from 'dexie';
import { db } from '../database/database';
import { BACKUP_TABLES } from './backup-service';
import { inspectDatabase } from './integrity-service';

export const RECOVERY_DATABASE_NAME = 'rumahkas_recovery';

export function createRecoveryDatabase(name = RECOVERY_DATABASE_NAME) {
    const recovery = new Dexie(name);
    recovery.version(1).stores({ snapshots: '&id, created_at, source_version, target_version', migrations: '&id, status, target_version, created_at, updated_at' });
    return recovery;
}

export const recoveryDb = createRecoveryDatabase();

export async function prepareUpgrade(targetRelease, database = db, recovery = recoveryDb) {
    await database.open(); await recovery.open();
    const health = await inspectDatabase(database);
    if (!health.healthy) throw new Error('Database memiliki masalah. Jalankan Database Health sebelum update.');
    const data = {}; for (const name of BACKUP_TABLES) data[name] = await database.table(name).toArray();
    const snapshot = { id: crypto.randomUUID(), created_at: new Date().toISOString(), source_version: globalThis.__APP_VERSION__ || 'unknown', target_version: targetRelease.version, database_version: database.verno, data };
    const size = new Blob([JSON.stringify(snapshot)]).size; const estimate = await navigator.storage?.estimate?.();
    if (estimate?.quota && estimate.quota - (estimate.usage || 0) < size * 2) throw new Error('Storage tidak cukup untuk membuat snapshot recovery update.');
    const migration = { id: `upgrade-${targetRelease.version}`, status: 'pending', target_version: targetRelease.version, target_database_version: targetRelease.database_version, source_version: snapshot.source_version, snapshot_id: snapshot.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), error: null };
    await recovery.transaction('rw', recovery.snapshots, recovery.migrations, async () => { await recovery.snapshots.put(snapshot); await recovery.migrations.put(migration); });
    return migration;
}

export async function pendingUpgrade(recovery = recoveryDb) {
    await recovery.open(); return recovery.migrations.where('status').anyOf('pending', 'failed').last();
}

export async function verifyAndFinalizeUpgrade(version, database = db, recovery = recoveryDb) {
    const migration = await pendingUpgrade(recovery); if (!migration || migration.target_version !== version) return null;
    try {
        const health = await inspectDatabase(database);
        if (migration.target_database_version && database.verno !== migration.target_database_version) throw new Error(`Schema database v${database.verno} tidak sesuai target v${migration.target_database_version}.`);
        if (!health.healthy) throw new Error(`Integrity check menemukan ${health.issues.length} masalah.`);
        await recovery.migrations.update(migration.id, { status: 'completed', updated_at: new Date().toISOString(), completed_at: new Date().toISOString(), error: null });
        const snapshots = await recovery.snapshots.orderBy('created_at').reverse().toArray();
        if (snapshots.length > 2) await recovery.snapshots.bulkDelete(snapshots.slice(2).map((item) => item.id));
        navigator.serviceWorker?.controller?.postMessage({ type: 'RELEASE_CONFIRMED', version });
        return { ...migration, status: 'completed', health };
    } catch (error) {
        await recovery.migrations.update(migration.id, { status: 'failed', updated_at: new Date().toISOString(), error: error.message });
        throw error;
    }
}

export async function getRecoverySnapshot(migration, recovery = recoveryDb) {
    await recovery.open(); return migration?.snapshot_id ? recovery.snapshots.get(migration.snapshot_id) : null;
}

export async function restoreRecoverySnapshot(migration, database = db, recovery = recoveryDb) {
    const snapshot = await getRecoverySnapshot(migration, recovery); if (!snapshot) throw new Error('Snapshot recovery tidak ditemukan.');
    await database.open(); const tables = BACKUP_TABLES.map((name) => database.table(name));
    await database.transaction('rw', tables, async () => { for (const table of tables) await table.clear(); for (const name of BACKUP_TABLES) if (snapshot.data[name]?.length) await database.table(name).bulkPut(snapshot.data[name]); });
    await recovery.migrations.update(migration.id, { status: 'recovered', updated_at: new Date().toISOString() }); return snapshot;
}

export async function downloadRecoverySnapshot(migration, recovery = recoveryDb) {
    const snapshot = await getRecoverySnapshot(migration, recovery); if (!snapshot) throw new Error('Snapshot recovery tidak ditemukan.');
    return JSON.stringify({ format: 'rumahkas.recovery-snapshot', version: 1, ...snapshot });
}
