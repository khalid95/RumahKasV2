import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabase } from '../../resources/js/database/database';
import { DATABASE_VERSION } from '../../resources/js/database/schema';
import { DEFAULT_CATEGORIES } from '../../resources/js/database/default-categories';
import { initializeDatabase } from '../../resources/js/services/database-service';
import { CategoryRepository } from '../../resources/js/repositories/category-repository';
import { CategoryService, CategoryValidationError } from '../../resources/js/services/category-service';
import { AccountService, AccountValidationError } from '../../resources/js/services/account-service';
import { BalanceService } from '../../resources/js/services/balance-service';
import { TransactionService, TransactionValidationError } from '../../resources/js/services/transaction-service';
import { DashboardService } from '../../resources/js/services/dashboard-service';
import { formatMoney, sanitizeMoney } from '../../resources/js/ui/money-input';
import { BudgetService, BudgetValidationError } from '../../resources/js/services/budget-service';
import { ReportService, ReportValidationError } from '../../resources/js/services/report-service';
import { createTransactionCsv } from '../../resources/js/services/csv-export-service';
import { BACKUP_FORMAT, createEncryptedBackup, readEncryptedBackup, restoreBackup } from '../../resources/js/services/backup-service';
import { getAppSettings, isBackupDue, saveProfileSettings } from '../../resources/js/services/settings-service';
import { inspectDatabase } from '../../resources/js/services/integrity-service';
import Dexie from 'dexie';
import { schemaV1 } from '../../resources/js/database/schema';
import { createRecoveryDatabase, prepareUpgrade, pendingUpgrade, restoreRecoverySnapshot, verifyAndFinalizeUpgrade } from '../../resources/js/services/recovery-service';
import { REQUIRED_OFFLINE_ROUTES, runDiagnostics, summarizeDiagnostics } from '../../resources/js/services/diagnostic-service';
import { compareVersions } from '../../resources/js/pwa-manager';
import { SavingGoalService, SavingGoalValidationError } from '../../resources/js/services/saving-goal-service';
import { appendCalculatorKey, evaluateCalculation } from '../../resources/js/services/calculator-service';
import { PlannerService, PlannerValidationError } from '../../resources/js/services/planner-service';
import { HabitService, HabitValidationError } from '../../resources/js/services/habit-service';

let database;

beforeEach(() => {
    database = createDatabase(`rumahkas-test-${crypto.randomUUID()}`);
});

afterEach(async () => {
    database.close();
    await database.delete();
});

describe('database RumahKas', () => {
    it('membuat seluruh object store termasuk autentikasi lokal', async () => {
        await database.open();

        expect(database.verno).toBe(DATABASE_VERSION);
        expect(database.tables.map((table) => table.name).sort()).toEqual([
            'audit_logs',
            'auth',
            'budgets',
            'categories',
            'financial_accounts',
            'habit_logs',
            'habits',
            'planner_tasks',
            'profiles',
            'saving_goals',
            'settings',
            'transactions',
        ]);
    });

    it('menginisialisasi profile, settings, dan kategori default', async () => {
        const status = await initializeDatabase(database);

        expect(status.ready).toBe(true);
        expect(status.version).toBe(DATABASE_VERSION);
        expect(status.profiles).toBe(1);
        expect(status.categories).toBe(DEFAULT_CATEGORIES.length);
        expect(await database.settings.get('currency')).toMatchObject({ value: 'IDR' });
        expect(await database.planner_tasks.count()).toBe(3);
        expect(await database.habits.count()).toBe(3);
        expect(await database.profiles.get('default-profile')).toMatchObject({
            name: 'Keluarga Saya',
            currency_default: 'IDR',
        });
    });

    it('menjalankan seed berulang kali tanpa duplikasi', async () => {
        await initializeDatabase(database);
        await initializeDatabase(database);

        expect(await database.categories.count()).toBe(DEFAULT_CATEGORIES.length);
        expect(await database.profiles.count()).toBe(1);
    });

    it('meng-upgrade database v1 ke versi terbaru tanpa menghapus data', async () => {
        const name = `rumahkas-upgrade-${crypto.randomUUID()}`;
        const legacy = new Dexie(name); legacy.version(1).stores(schemaV1); await legacy.open();
        await legacy.profiles.put({ id: 'default-profile', name: 'Data Lama', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }); legacy.close();
        const upgraded = createDatabase(name); await upgraded.open();
        expect(upgraded.verno).toBe(DATABASE_VERSION); expect(await upgraded.profiles.get('default-profile')).toMatchObject({ name: 'Data Lama' }); expect(upgraded.auth).toBeTruthy();
        upgraded.close(); await upgraded.delete();
    });
});

describe('target tabungan', () => {
    it('membuat target, menghitung progres, dan mengatur dana', async () => {
        await initializeDatabase(database); const service = new SavingGoalService(database);
        const goal = await service.create({ name: 'Dana Darurat', target_amount: 10_000_000, saved_amount: 2_000_000, target_date: '2027-01-01' });
        expect(await service.find(goal.id)).toMatchObject({ percentage: 20, remaining: 8_000_000, status: 'active' });
        await service.contribute(goal.id, 8_000_000);
        expect(await service.find(goal.id)).toMatchObject({ saved_amount: 10_000_000, percentage: 100, status: 'completed' });
        await service.contribute(goal.id, -500_000);
        expect(await service.find(goal.id)).toMatchObject({ saved_amount: 9_500_000, status: 'active' });
    });

    it('menolak nominal target dan pengurangan dana yang tidak valid', async () => {
        await initializeDatabase(database); const service = new SavingGoalService(database);
        await expect(service.create({ name: 'Liburan', target_amount: 0, saved_amount: 0 })).rejects.toBeInstanceOf(SavingGoalValidationError);
        const goal = await service.create({ name: 'Liburan', target_amount: 1_000_000, saved_amount: 100_000 });
        await expect(service.contribute(goal.id, -200_000)).rejects.toBeInstanceOf(SavingGoalValidationError);
    });
});

describe('money input', () => {
    it('memformat tampilan IDR tetapi menghasilkan nilai integer mentah', () => {
        expect(sanitizeMoney('Rp 1.500.000')).toBe('1500000');
        expect(formatMoney('1500000')).toBe('Rp 1.500.000');
        expect(sanitizeMoney('abc12x500')).toBe('12500');
        expect(formatMoney('-250000', true)).toBe('-Rp 250.000');
        expect(sanitizeMoney('-Rp 250.000', true)).toBe('-250000');
        expect(formatMoney('-', true)).toBe('-Rp ');
    });
});

describe('kalkulator nominal', () => {
    it('menghitung rangkaian nilai dengan prioritas operator', () => {
        expect(evaluateCalculation('25000+15000+10000')).toBe(50000);
        expect(evaluateCalculation('10000+5000*2')).toBe(20000);
        expect(evaluateCalculation('50000/2-5000')).toBe(20000);
    });

    it('menangani input keypad dan perhitungan tidak valid', () => {
        expect(appendCalculatorKey('100+', '+')).toBe('100+');
        expect(appendCalculatorKey('100+', '-')).toBe('100-');
        expect(appendCalculatorKey('100', 'backspace')).toBe('10');
        expect(() => evaluateCalculation('100/0')).toThrow('membagi dengan nol');
        expect(() => evaluateCalculation('100+')).toThrow('belum lengkap');
    });
});

describe('daily planner', () => {
    it('mengelola aktivitas, checklist, dan pindah ke besok', async () => {
        await initializeDatabase(database); const service = new PlannerService(database);
        const task = await service.create({ title: 'Olahraga pagi', task_date: '2030-08-02', day_period: 'morning', priority: 'high', time: '06:30' });
        expect(await service.list('2030-08-02')).toHaveLength(1);
        expect(await service.toggle(task.id, true)).toMatchObject({ is_completed: 1 });
        expect(await service.moveTomorrow(task.id)).toMatchObject({ task_date: '2030-08-03', is_completed: 0 });
        await expect(service.create({ title: '', task_date: 'bad', day_period: 'night' })).rejects.toBeInstanceOf(PlannerValidationError);
    });
});

describe('habit tracker', () => {
    it('mencatat target, progress, riwayat, dan streak', async () => {
        await initializeDatabase(database); const service = new HabitService(database);
        const habit = await service.create({ name: 'Minum air', icon: '💧', tracking_type: 'count', target_value: 8, unit: 'gelas', selected_days: [0,1,2,3,4,5,6], color: '#3b82f6' });
        await service.setValue(habit.id, '2026-08-01', 8); await service.setValue(habit.id, '2026-08-02', 8);
        const item = (await service.list('2026-08-02')).find((entry) => entry.id === habit.id);
        expect(item).toMatchObject({ value: 8, is_completed: true, streak: 2 }); expect(item.history).toHaveLength(7);
        const month = await service.month(2026, 8);
        const row = month.rows.find((entry) => entry.id === habit.id);
        expect(row.days).toHaveLength(31); expect(row.completed_count).toBe(2); expect(month.completedTotal).toBeGreaterThanOrEqual(2);
        await service.delete(habit.id); expect(await database.habit_logs.count()).toBe(0);
        await expect(service.create({ name: '', tracking_type: 'invalid' })).rejects.toBeInstanceOf(HabitValidationError);
    });
});

describe('backup terenkripsi', () => {
    it('mengenkripsi, mempreview, dan memulihkan data tanpa menyertakan auth', async () => {
        await initializeDatabase(database);
        await database.financial_accounts.add({ id: 'cash-test', profile_id: 'default-profile', name: 'Kas', type: 'cash', balance_initial: 100000, is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        await database.auth.put({ key: 'session', token: 'secret-token', pin_hash: 'secret-pin' });

        const encrypted = await createEncryptedBackup('password-kuat', database);
        expect(JSON.parse(encrypted)).toMatchObject({ format: BACKUP_FORMAT, cipher: 'AES-256-GCM' });
        expect(encrypted).not.toContain('secret-token');
        await expect(readEncryptedBackup(encrypted, 'password-salah')).rejects.toThrow('Password salah');

        const backup = await readEncryptedBackup(encrypted, 'password-kuat');
        expect(backup.data.financial_accounts).toHaveLength(1);
        expect(backup.data.auth).toBeUndefined();
        await database.financial_accounts.clear();
        await restoreBackup(backup, 'replace', database);
        expect(await database.financial_accounts.get('cash-test')).toMatchObject({ name: 'Kas', balance_initial: 100000 });
        expect(await database.auth.get('session')).toMatchObject({ token: 'secret-token' });
    });
});

describe('pengaturan lokal', () => {
    it('menyimpan profil, awal periode, dan pengingat backup', async () => {
        await initializeDatabase(database);
        await saveProfileSettings({ name: 'Keluarga Bahagia', month_start_day: 25, backup_reminder_days: 7 }, database);
        const settings = await getAppSettings(database);
        expect(settings.profile).toMatchObject({ name: 'Keluarga Bahagia', month_start_day: 25, currency_default: 'IDR' });
        expect(settings.backupReminderDays).toBe(7);
        expect(await database.audit_logs.where('action').equals('settings.updated').count()).toBe(1);
    });

    it('mendeteksi jadwal backup yang sudah lewat', async () => {
        await initializeDatabase(database);
        await saveProfileSettings({ name: 'Keluarga Saya', month_start_day: 1, backup_reminder_days: 7 }, database);
        await database.settings.put({ key: 'last_backup_at', value: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z' });
        expect(await isBackupDue(database, new Date('2026-01-09T00:00:00.000Z'))).toBe(true);
    });
});

describe('database health', () => {
    it('mendeteksi transaksi dengan relasi akun yang rusak', async () => {
        await initializeDatabase(database);
        const category = await database.categories.where('type').equals('expense').first();
        await database.transactions.add({ id: crypto.randomUUID(), profile_id: 'default-profile', financial_account_id: 'missing-account', category_id: category.id, type: 'expense', amount: 50000, transaction_date: '2026-08-02', title: 'Data rusak', status: 'posted', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        const result = await inspectDatabase(database);
        expect(result.healthy).toBe(false);
        expect(result.issues).toContainEqual(expect.objectContaining({ code: 'missing_account' }));
    });
});

describe('release recovery', () => {
    it('membuat snapshot, journal, memulihkan data, dan mengonfirmasi upgrade', async () => {
        await initializeDatabase(database);
        await database.financial_accounts.add({ id: 'recovery-cash', profile_id: 'default-profile', name: 'Kas Recovery', type: 'cash', opening_balance: 75000, include_in_total: 1, is_active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
        const recovery = createRecoveryDatabase(`rumahkas-recovery-test-${crypto.randomUUID()}`);
        const migration = await prepareUpgrade({ version: '1.0.0' }, database, recovery);
        expect(migration.status).toBe('pending'); expect((await pendingUpgrade(recovery)).snapshot_id).toBeTruthy();
        await database.financial_accounts.clear(); await restoreRecoverySnapshot(migration, database, recovery);
        expect(await database.financial_accounts.get('recovery-cash')).toMatchObject({ opening_balance: 75000 });
        await recovery.migrations.update(migration.id, { status: 'pending' });
        const completed = await verifyAndFinalizeUpgrade('1.0.0', database, recovery); expect(completed.status).toBe('completed');
        recovery.close(); await recovery.delete();
    });
});

describe('PWA diagnostic', () => {
    it('merangkum hasil diagnostic dan memeriksa seluruh route offline', async () => {
        await initializeDatabase(database);
        const environment = {
            isSecureContext: true, location: { hostname: 'localhost' }, crypto,
            navigator: { serviceWorker: { controller: {} }, storage: { estimate: async () => ({ usage: 1024, quota: 1024 * 1024 }), persisted: async () => true } },
            caches: { keys: async () => ['rumahkas-shell-test'], open: async () => ({ keys: async () => REQUIRED_OFFLINE_ROUTES.map((path) => ({ url: `http://localhost${path}` })) }) },
        };
        const diagnostic = await runDiagnostics(database, environment);
        expect(diagnostic.summary.failed).toBe(0); expect(diagnostic.results.find((item) => item.id === 'app_cache')).toMatchObject({ status: 'pass' });
        expect(summarizeDiagnostics([{ status: 'pass' }, { status: 'warn' }, { status: 'fail' }])).toEqual({ passed: 1, warnings: 1, failed: 1, ready: false });
        const recovery = createRecoveryDatabase(); recovery.close(); await recovery.delete();
    });
});

describe('PWA release version', () => {
    it('hanya menganggap nomor release yang lebih tinggi sebagai update', () => {
        expect(compareVersions('0.9.2', '0.9.2')).toBe(0);
        expect(compareVersions('0.9.3', '0.9.2')).toBe(1);
        expect(compareVersions('0.10.0', '0.9.9')).toBe(1);
        expect(compareVersions('0.9.1', '0.9.2')).toBe(-1);
    });
});

describe('CategoryRepository', () => {
    it('menyediakan CRUD dengan UUID dan timestamp', async () => {
        await initializeDatabase(database);
        const repository = new CategoryRepository(database);
        const category = await repository.create({
            slug: 'expense-hewan-peliharaan',
            name: 'Hewan Peliharaan',
            type: 'expense',
            parent_id: null,
            is_default: 0,
            is_active: 1,
        });

        expect(category.id).toMatch(/^[0-9a-f-]{36}$/);
        expect(category.created_at).toBeTruthy();
        expect(await repository.find(category.id)).toMatchObject({ name: 'Hewan Peliharaan' });

        const updated = await repository.update(category.id, { name: 'Peliharaan' });
        expect(updated.name).toBe('Peliharaan');
        expect(updated.id).toBe(category.id);

        await repository.delete(category.id);
        expect(await repository.find(category.id)).toBeUndefined();
    });

    it('mengambil kategori aktif berdasarkan tipe', async () => {
        await initializeDatabase(database);
        const repository = new CategoryRepository(database);
        const categories = await repository.activeByType('income');

        expect(categories).toHaveLength(7);
        expect(categories.every((category) => category.type === 'income')).toBe(true);
    });
});

describe('CategoryService', () => {
    it('memvalidasi nama dan mencegah kategori duplikat', async () => {
        await initializeDatabase(database);
        const service = new CategoryService(database);

        await expect(service.create({ name: '  ', type: 'expense' })).rejects.toMatchObject({
            name: 'CategoryValidationError',
            field: 'name',
        });
        await expect(service.create({ name: 'Makanan', type: 'expense' })).rejects.toBeInstanceOf(CategoryValidationError);
        await expect(service.create({ name: 'Tidak Aman', type: 'expense', color: 'red;display:none' })).rejects.toMatchObject({
            field: 'color',
        });
    });

    it('membuat, mengubah, dan menonaktifkan kategori custom', async () => {
        await initializeDatabase(database);
        const service = new CategoryService(database);
        const category = await service.create({ name: 'Hewan Peliharaan', type: 'expense', color: '#8b5cf6' });

        expect(category).toMatchObject({
            slug: 'expense-hewan-peliharaan',
            is_default: 0,
            is_active: 1,
        });

        const updated = await service.update(category.id, { name: 'Peliharaan', type: 'expense' });
        expect(updated.name).toBe('Peliharaan');
        expect(updated.slug).toBe(category.slug);

        await service.update(category.id, { name: 'Peliharaan', type: 'expense', icon: '🐾' });
        expect(await service.find(category.id)).toMatchObject({ icon: '🐾', usage_count: 0 });
        await service.update(category.id, { name: 'Peliharaan', type: 'expense', icon: '' });
        expect(await service.find(category.id)).toMatchObject({ icon: null });

        const inactive = await service.setActive(category.id, false);
        expect(inactive.is_active).toBe(0);

        await service.delete(category.id);
        expect(await service.find(category.id)).toBeUndefined();
    });

    it('mengizinkan hapus kategori bawaan tanpa memunculkannya kembali dan melindungi kategori terpakai', async () => {
        await initializeDatabase(database);
        const service = new CategoryService(database);
        const defaultCategory = await database.categories.where('slug').equals('expense-makanan').first();

        await service.delete(defaultCategory.id);
        await initializeDatabase(database);
        expect(await database.categories.where('slug').equals('expense-makanan').count()).toBe(0);
        expect(await database.settings.get('deleted_default_category_slugs')).toMatchObject({ value: expect.arrayContaining(['expense-makanan']) });

        const custom = await service.create({ name: 'Kendaraan', type: 'expense' });
        await database.transactions.add({
            id: crypto.randomUUID(),
            profile_id: 'default-profile',
            financial_account_id: 'account-test',
            destination_account_id: null,
            category_id: custom.id,
            type: 'expense',
            status: 'posted',
            amount: 10000,
            transaction_date: '2026-08-01',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
        });

        await expect(service.delete(custom.id)).rejects.toThrow('sudah digunakan transaksi');
        await expect(service.update(custom.id, { name: 'Kendaraan', type: 'income' })).rejects.toThrow('tidak dapat diubah');
    });
});

describe('AccountService', () => {
    it('memvalidasi dan mengelola akun keuangan', async () => {
        await initializeDatabase(database);
        const service = new AccountService(database);

        await expect(service.create({ name: '', type: 'cash', opening_balance: 0 })).rejects.toMatchObject({ field: 'name' });
        await expect(service.create({ name: 'Cash', type: 'invalid', opening_balance: 0 })).rejects.toMatchObject({ field: 'type' });
        await expect(service.create({ name: 'Cash', type: 'cash', opening_balance: 1.5 })).rejects.toBeInstanceOf(AccountValidationError);

        const account = await service.create({
            name: 'BCA Utama', type: 'bank', opening_balance: 1_500_000, include_in_total: true,
        });
        expect(account).toMatchObject({ is_active: 1, include_in_total: 1, opening_balance: 1_500_000 });

        await expect(service.create({ name: '  bca utama ', type: 'bank', opening_balance: 0 })).rejects.toThrow('sudah digunakan');

        const updated = await service.update(account.id, {
            name: 'BCA Keluarga', type: 'bank', opening_balance: 2_000_000, include_in_total: false,
        });
        expect(updated).toMatchObject({ name: 'BCA Keluarga', include_in_total: 0, opening_balance: 2_000_000 });

        expect((await service.setActive(account.id, false)).is_active).toBe(0);
        await service.delete(account.id);
        expect(await service.find(account.id)).toBeUndefined();
    });

    it('melindungi akun yang sudah digunakan transaksi', async () => {
        await initializeDatabase(database);
        const service = new AccountService(database);
        const account = await service.create({ name: 'Tunai', type: 'cash', opening_balance: 0, include_in_total: true });
        await database.transactions.add({
            id: crypto.randomUUID(), profile_id: 'default-profile', financial_account_id: account.id,
            destination_account_id: null, category_id: null, type: 'income', status: 'posted', amount: 100_000,
            transaction_date: '2026-08-01', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), deleted_at: null,
        });

        await expect(service.delete(account.id)).rejects.toThrow('sudah digunakan transaksi');
    });
});

describe('BalanceService', () => {
    it('menghitung ulang income, expense, transfer, adjustment, dan mengabaikan transaksi non-posted', async () => {
        await initializeDatabase(database);
        const accounts = new AccountService(database);
        const balances = new BalanceService(database);
        const cash = await accounts.create({ name: 'Cash', type: 'cash', opening_balance: 1_000_000, include_in_total: true });
        const bank = await accounts.create({ name: 'Bank', type: 'bank', opening_balance: 500_000, include_in_total: true });
        const timestamp = new Date().toISOString();
        const transaction = (attributes) => ({
            id: crypto.randomUUID(), profile_id: 'default-profile', financial_account_id: cash.id,
            destination_account_id: null, category_id: null, status: 'posted', transaction_date: '2026-08-01',
            created_at: timestamp, updated_at: timestamp, deleted_at: null, ...attributes,
        });

        await database.transactions.bulkAdd([
            transaction({ type: 'income', amount: 200_000 }),
            transaction({ type: 'expense', amount: 50_000 }),
            transaction({ type: 'transfer', amount: 100_000, destination_account_id: bank.id }),
            transaction({ type: 'adjustment', amount: -25_000 }),
            transaction({ type: 'income', amount: 999_000, status: 'cancelled' }),
            transaction({ type: 'expense', amount: 999_000, deleted_at: timestamp }),
        ]);

        expect(await balances.calculate(cash.id)).toBe(1_025_000);
        expect(await balances.calculate(bank.id)).toBe(600_000);
        expect(await balances.total()).toBe(1_625_000);
    });
});

describe('TransactionService', () => {
    async function setupTransactions() {
        await initializeDatabase(database);
        const accountService = new AccountService(database);
        const cash = await accountService.create({ name: 'Cash', type: 'cash', opening_balance: 1_000_000, include_in_total: true });
        const bank = await accountService.create({ name: 'Bank', type: 'bank', opening_balance: 0, include_in_total: true });
        const incomeCategory = await database.categories.where('slug').equals('income-gaji').first();
        const expenseCategory = await database.categories.where('slug').equals('expense-makanan').first();
        return { cash, bank, incomeCategory, expenseCategory };
    }

    it('membuat income, expense, transfer, dan adjustment secara valid', async () => {
        const refs = await setupTransactions();
        const service = new TransactionService(database);
        const balances = new BalanceService(database);
        const common = { transaction_date: '2026-08-02', status: 'posted' };

        await service.create({ ...common, type: 'income', amount: 500_000, title: 'Gaji', financial_account_id: refs.cash.id, category_id: refs.incomeCategory.id });
        await service.create({ ...common, type: 'expense', amount: 100_000, title: 'Makan', financial_account_id: refs.cash.id, category_id: refs.expenseCategory.id });
        await service.create({ ...common, type: 'transfer', amount: 200_000, title: 'Pindah dana', financial_account_id: refs.cash.id, destination_account_id: refs.bank.id });
        await service.create({ ...common, type: 'adjustment', amount: -50_000, title: 'Koreksi', financial_account_id: refs.cash.id });

        expect(await balances.calculate(refs.cash.id)).toBe(1_150_000);
        expect(await balances.calculate(refs.bank.id)).toBe(200_000);
        expect(await database.audit_logs.where('entity_type').equals('transaction').count()).toBe(4);
    });

    it('mengoreksi saldo setelah edit, cancel, dan soft delete', async () => {
        const refs = await setupTransactions();
        const service = new TransactionService(database);
        const balances = new BalanceService(database);
        const transaction = await service.create({
            type: 'expense', amount: 100_000, title: 'Belanja', transaction_date: '2026-08-02', status: 'posted',
            financial_account_id: refs.cash.id, category_id: refs.expenseCategory.id,
        });
        expect(await balances.calculate(refs.cash.id)).toBe(900_000);

        await service.update(transaction.id, { amount: 250_000 });
        expect(await balances.calculate(refs.cash.id)).toBe(750_000);

        await service.cancel(transaction.id);
        expect(await balances.calculate(refs.cash.id)).toBe(1_000_000);
        await expect(service.update(transaction.id, { amount: 1 })).rejects.toThrow('dibatalkan');

        await service.delete(transaction.id);
        expect(await service.list()).toHaveLength(0);
        expect((await database.transactions.get(transaction.id)).deleted_at).toBeTruthy();
        expect(await database.audit_logs.where('entity_id').equals(transaction.id).count()).toBe(4);
    });

    it('menolak akun, kategori, nominal, tanggal, dan transfer yang tidak valid', async () => {
        const refs = await setupTransactions();
        const service = new TransactionService(database);
        const base = { type: 'expense', amount: 10_000, title: 'Test', transaction_date: '2026-08-02', status: 'posted', financial_account_id: refs.cash.id, category_id: refs.expenseCategory.id };

        await expect(service.create({ ...base, amount: -1 })).rejects.toMatchObject({ field: 'amount' });
        await expect(service.create({ ...base, transaction_date: '2026-02-31' })).rejects.toMatchObject({ field: 'transaction_date' });
        await expect(service.create({ ...base, category_id: refs.incomeCategory.id })).rejects.toMatchObject({ field: 'category_id' });
        await expect(service.create({ ...base, type: 'transfer', category_id: null, destination_account_id: refs.cash.id })).rejects.toBeInstanceOf(TransactionValidationError);
        await expect(service.create({ ...base, financial_account_id: 'missing' })).rejects.toMatchObject({ field: 'financial_account_id' });
    });

    it('mendukung filter transaksi lokal', async () => {
        const refs = await setupTransactions();
        const service = new TransactionService(database);
        await service.create({ type: 'income', amount: 10_000, title: 'Bonus proyek', transaction_date: '2026-08-01', financial_account_id: refs.bank.id, category_id: refs.incomeCategory.id });
        await service.create({ type: 'expense', amount: 5_000, title: 'Makan siang', transaction_date: '2026-08-02', financial_account_id: refs.cash.id, category_id: refs.expenseCategory.id });

        expect(await service.list({ type: 'expense' })).toHaveLength(1);
        expect(await service.list({ account_id: refs.bank.id })).toHaveLength(1);
        expect(await service.list({ search: 'proyek' })).toHaveLength(1);
    });
});

describe('DashboardService', () => {
    it('menghitung dashboard dari akun dan transaksi periode aktif', async () => {
        await initializeDatabase(database);
        const accounts = new AccountService(database);
        const transactions = new TransactionService(database);
        const dashboard = new DashboardService(database);
        const cash = await accounts.create({ name: 'Cash', type: 'cash', opening_balance: 1_000_000, include_in_total: true });
        const hidden = await accounts.create({ name: 'Dana Terpisah', type: 'savings', opening_balance: 5_000_000, include_in_total: false });
        const incomeCategory = await database.categories.where('slug').equals('income-gaji').first();
        const expenseCategory = await database.categories.where('slug').equals('expense-makanan').first();

        await transactions.create({ type: 'income', amount: 500_000, title: 'Gaji', transaction_date: '2026-08-01', financial_account_id: cash.id, category_id: incomeCategory.id });
        await transactions.create({ type: 'expense', amount: 125_000, title: 'Belanja', transaction_date: '2026-08-02', financial_account_id: cash.id, category_id: expenseCategory.id });
        await transactions.create({ type: 'income', amount: 9_000_000, title: 'Bulan lalu', transaction_date: '2026-07-31', financial_account_id: hidden.id, category_id: incomeCategory.id });

        const summary = await dashboard.summary({ year: 2026, month: 8 });
        expect(summary.total_balance).toBe(1_375_000);
        expect(summary.income).toBe(500_000);
        expect(summary.expense).toBe(125_000);
        expect(summary.net_cashflow).toBe(375_000);
        expect(summary.daily_cashflow[0]).toMatchObject({ day: 1, income: 500_000, expense: 0 });
        expect(summary.daily_cashflow[1]).toMatchObject({ day: 2, income: 0, expense: 125_000 });
        expect(summary.expense_by_category[0]).toMatchObject({ name: 'Makanan', amount: 125_000 });
        expect(summary.recent_transactions).toHaveLength(3);
    });

    it('mengabaikan transaksi cancelled dan deleted dari ringkasan', async () => {
        await initializeDatabase(database);
        const accounts = new AccountService(database);
        const transactions = new TransactionService(database);
        const account = await accounts.create({ name: 'Cash', type: 'cash', opening_balance: 100_000, include_in_total: true });
        const category = await database.categories.where('slug').equals('expense-makanan').first();
        const cancelled = await transactions.create({ type: 'expense', amount: 50_000, title: 'Cancel', transaction_date: '2026-08-02', financial_account_id: account.id, category_id: category.id });
        const deleted = await transactions.create({ type: 'expense', amount: 40_000, title: 'Delete', transaction_date: '2026-08-02', financial_account_id: account.id, category_id: category.id });
        await transactions.cancel(cancelled.id);
        await transactions.delete(deleted.id);

        const summary = await new DashboardService(database).summary({ year: 2026, month: 8 });
        expect(summary.total_balance).toBe(100_000);
        expect(summary.expense).toBe(0);
    });
});

describe('BudgetService', () => {
    async function setupBudget() {
        await initializeDatabase(database);
        const account = await new AccountService(database).create({ name: 'Cash', type: 'cash', opening_balance: 0, include_in_total: true });
        const category = await database.categories.where('slug').equals('expense-makanan').first();
        return { account, category, transactions: new TransactionService(database), budgets: new BudgetService(database) };
    }

    it('membedakan budget hampir habis, habis tepat, dan terlewati', () => {
        const budgets = new BudgetService(database);
        expect(budgets.statusFor(99.9)).toBe('almost');
        expect(budgets.statusFor(100)).toBe('exhausted');
        expect(budgets.statusFor(100.01)).toBe('over');
    });

    it('membuat budget unik per kategori dan periode', async () => {
        const { category, budgets } = await setupBudget();
        const budget = await budgets.create({ category_id: category.id, year: 2026, month: 8, amount: 1_000_000, notes: 'Bulanan' });
        expect(budget).toMatchObject({ amount: 1_000_000, year: 2026, month: 8 });
        await expect(budgets.create({ category_id: category.id, year: 2026, month: 8, amount: 2_000_000 })).rejects.toBeInstanceOf(BudgetValidationError);
        await expect(budgets.create({ category_id: category.id, year: 2026, month: 13, amount: 1 })).rejects.toMatchObject({ field: 'month' });
        await expect(budgets.create({ category_id: category.id, year: 2026, month: 9, amount: 0 })).rejects.toMatchObject({ field: 'amount' });
    });

    it('menghitung pemakaian dan status budget dari expense posted', async () => {
        const { account, category, transactions, budgets } = await setupBudget();
        const budget = await budgets.create({ category_id: category.id, year: 2026, month: 8, amount: 100_000 });
        const expense = (amount, title = 'Makan') => transactions.create({ type: 'expense', amount, title, transaction_date: '2026-08-02', financial_account_id: account.id, category_id: category.id });
        await expense(95_000);
        expect((await budgets.list(2026, 8))[0]).toMatchObject({ spent: 95_000, remaining: 5_000, status: 'almost' });
        const cancelled = await expense(10_000, 'Dibatalkan');
        await transactions.cancel(cancelled.id);
        expect((await budgets.list(2026, 8))[0].spent).toBe(95_000);
        await expense(10_000);
        expect((await budgets.list(2026, 8))[0]).toMatchObject({ spent: 105_000, remaining: -5_000, status: 'over' });
        await budgets.update(budget.id, { amount: 150_000 });
        expect((await budgets.list(2026, 8))[0].status).toBe('safe');
    });

    it('mengikutkan transaksi child category pada budget parent', async () => {
        const { account, category, transactions, budgets } = await setupBudget();
        const child = await new CategoryRepository(database).create({
            slug: 'expense-jajan', name: 'Jajan', type: 'expense', parent_id: category.id,
            color: '#f04438', icon: null, is_default: 0, is_active: 1,
        });
        await budgets.create({ category_id: category.id, year: 2026, month: 8, amount: 100_000 });
        await transactions.create({ type: 'expense', amount: 25_000, title: 'Jajan', transaction_date: '2026-08-02', financial_account_id: account.id, category_id: child.id });
        expect((await budgets.list(2026, 8))[0].spent).toBe(25_000);
    });
});

describe('ReportService', () => {
    async function setupReport() {
        await initializeDatabase(database);
        const accounts = new AccountService(database);
        const transactions = new TransactionService(database);
        const cash = await accounts.create({ name: 'Cash', type: 'cash', opening_balance: 0, include_in_total: true });
        const bank = await accounts.create({ name: 'Bank', type: 'bank', opening_balance: 0, include_in_total: true });
        const incomeCategory = await database.categories.where('slug').equals('income-gaji').first();
        const expenseCategory = await database.categories.where('slug').equals('expense-makanan').first();
        await transactions.create({ type: 'income', amount: 1_000_000, title: 'Gaji', transaction_date: '2026-08-01', financial_account_id: bank.id, category_id: incomeCategory.id });
        await transactions.create({ type: 'expense', amount: 200_000, title: 'Belanja', transaction_date: '2026-08-02', financial_account_id: cash.id, category_id: expenseCategory.id });
        await transactions.create({ type: 'transfer', amount: 300_000, title: 'Tarik tunai', transaction_date: '2026-08-03', financial_account_id: bank.id, destination_account_id: cash.id });
        await transactions.create({ type: 'expense', amount: 99_000, title: 'September', transaction_date: '2026-09-01', financial_account_id: cash.id, category_id: expenseCategory.id });
        return { cash, bank, expenseCategory, report: new ReportService(database) };
    }

    it('menghasilkan ringkasan dan agregasi berdasarkan periode', async () => {
        const { report } = await setupReport();
        const result = await report.generate({ date_from: '2026-08-01', date_to: '2026-08-31' });
        expect(result.summary).toEqual({ income: 1_000_000, expense: 200_000, net_cashflow: 800_000, transaction_count: 3 });
        expect(result.expense_by_category[0]).toMatchObject({ name: 'Makanan', amount: 200_000 });
        expect(result.movement_by_account).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Bank', movement: 700_000 }),
            expect.objectContaining({ name: 'Cash', movement: 100_000 }),
        ]));
    });

    it('memfilter akun, kategori, dan tipe serta memvalidasi tanggal', async () => {
        const { cash, expenseCategory, report } = await setupReport();
        expect((await report.generate({ account_id: cash.id })).rows).toHaveLength(3);
        expect((await report.generate({ category_id: expenseCategory.id })).rows).toHaveLength(2);
        expect((await report.generate({ type: 'transfer' })).rows).toHaveLength(1);
        await expect(report.generate({ date_from: '2026-02-31' })).rejects.toBeInstanceOf(ReportValidationError);
        await expect(report.generate({ date_from: '2026-09-01', date_to: '2026-08-01' })).rejects.toThrow('tidak boleh melewati');
    });

    it('membuat CSV lokal yang aman untuk spreadsheet', () => {
        const csv = createTransactionCsv([{
            transaction_date: '2026-08-02', type_label: 'Pengeluaran', title: '=HYPERLINK("bad")',
            account_name: 'Cash', destination_account_name: null, category_name: 'Makanan', amount: 25000,
            status: 'posted', description: 'Makan, minum',
        }]);
        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv).toContain("'=HYPERLINK");
        expect(csv).toContain('"Makan, minum"');
    });
});
