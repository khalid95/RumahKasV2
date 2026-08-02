import { AccountRepository } from '../repositories/account-repository';
import { BalanceService } from './balance-service';

export const ACCOUNT_TYPES = {
    cash: 'Tunai',
    bank: 'Bank',
    e_wallet: 'E-Wallet',
    credit_card: 'Kartu Kredit',
    savings: 'Tabungan',
    loan: 'Pinjaman',
    other: 'Lainnya',
};

export class AccountValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'AccountValidationError';
        this.field = field;
    }
}

export class AccountService {
    constructor(database) {
        this.database = database;
        this.repository = new AccountRepository(database);
        this.balanceService = new BalanceService(database);
    }

    async list(profileId = 'default-profile') {
        const accounts = await this.repository.byProfile(profileId);
        return Promise.all(accounts.map(async (account) => ({
            ...account,
            current_balance: await this.balanceService.calculate(account.id),
        })));
    }

    find(id) {
        return this.repository.find(id);
    }

    async create(input, profileId = 'default-profile') {
        const data = await this.validate(input, profileId);
        const notes = this.validateNotes(input.notes);
        return this.repository.create({
            ...data,
            profile_id: profileId,
            include_in_total: input.include_in_total ? 1 : 0,
            is_active: 1,
            notes,
        });
    }

    async update(id, input) {
        const existing = await this.requireAccount(id);
        const data = await this.validate({ ...existing, ...input }, existing.profile_id, id);

        return this.repository.update(id, {
            ...data,
            include_in_total: input.include_in_total ? 1 : 0,
            notes: this.validateNotes(input.notes),
        });
    }

    async setActive(id, active) {
        await this.requireAccount(id);
        return this.repository.update(id, { is_active: active ? 1 : 0 });
    }

    async delete(id) {
        await this.requireAccount(id);
        if (await this.repository.countTransactions(id)) {
            throw new AccountValidationError('Akun sudah digunakan transaksi dan tidak dapat dihapus.');
        }
        await this.repository.delete(id);
    }

    async validate(input, profileId, exceptId = null) {
        const name = input.name?.trim().replace(/\s+/g, ' ');
        if (!name) throw new AccountValidationError('Nama akun wajib diisi.', 'name');
        if (name.length > 60) throw new AccountValidationError('Nama akun maksimal 60 karakter.', 'name');
        if (!Object.hasOwn(ACCOUNT_TYPES, input.type)) throw new AccountValidationError('Tipe akun tidak valid.', 'type');

        const openingBalance = Number(input.opening_balance ?? 0);
        if (!Number.isSafeInteger(openingBalance)) {
            throw new AccountValidationError('Saldo awal harus berupa angka bulat yang valid.', 'opening_balance');
        }
        if (Math.abs(openingBalance) > 999_999_999_999) {
            throw new AccountValidationError('Saldo awal melebihi batas Rp999.999.999.999.', 'opening_balance');
        }
        if (await this.repository.findByNormalizedName(name, profileId, exceptId)) {
            throw new AccountValidationError('Nama akun sudah digunakan.', 'name');
        }

        return { name, type: input.type, opening_balance: openingBalance };
    }

    async requireAccount(id) {
        const account = await this.repository.find(id);
        if (!account) throw new AccountValidationError('Akun keuangan tidak ditemukan.');
        return account;
    }

    validateNotes(notes) {
        const normalized = notes?.trim() || null;
        if (normalized && normalized.length > 250) {
            throw new AccountValidationError('Catatan maksimal 250 karakter.', 'notes');
        }
        return normalized;
    }
}
