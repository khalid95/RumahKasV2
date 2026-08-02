import { CategoryRepository } from '../repositories/category-repository';
import { createEntity, nowIso } from '../database/entity';

const CATEGORY_TYPES = ['income', 'expense'];
const DEFAULT_COLORS = { income: '#12b76a', expense: '#f04438' };

export class CategoryValidationError extends Error {
    constructor(message, field = null) {
        super(message);
        this.name = 'CategoryValidationError';
        this.field = field;
    }
}

function slugify(value) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('id-ID')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'kategori';
}

export class CategoryService {
    constructor(database) {
        this.database = database;
        this.repository = new CategoryRepository(database);
    }

    async list(type) {
        this.validateType(type);
        const categories = await this.repository.byType(type);
        return Promise.all(categories.map(async (category) => ({ ...category, usage_count: await this.repository.countTransactions(category.id) })));
    }

    async find(id) {
        const category = await this.repository.find(id);
        return category ? { ...category, usage_count: await this.repository.countTransactions(id) } : undefined;
    }

    async create(input) {
        const data = await this.validate(input);
        const slug = await this.uniqueSlug(data.name, data.type);

        return this.repository.create({
            ...data,
            slug,
            parent_id: null,
            icon: this.validateIcon(input.icon),
            color: this.validateColor(input.color || DEFAULT_COLORS[data.type]),
            is_default: 0,
            is_active: 1,
        });
    }

    async update(id, input) {
        const existing = await this.requireCategory(id);
        const data = await this.validate({ ...existing, ...input }, id);
        const transactionCount = await this.repository.countTransactions(id);

        if (transactionCount > 0 && data.type !== existing.type) {
            throw new CategoryValidationError('Tipe kategori yang sudah digunakan transaksi tidak dapat diubah.', 'type');
        }

        return this.repository.update(id, {
            name: data.name,
            type: data.type,
            icon: Object.prototype.hasOwnProperty.call(input, 'icon') ? this.validateIcon(input.icon) : existing.icon || null,
            color: this.validateColor(input.color || existing.color || DEFAULT_COLORS[data.type]),
        });
    }

    async setActive(id, active) {
        await this.requireCategory(id);
        return this.repository.update(id, { is_active: active ? 1 : 0 });
    }

    async delete(id) {
        const category = await this.requireCategory(id);
        if (await this.repository.countTransactions(id)) {
            throw new CategoryValidationError('Kategori sudah digunakan transaksi dan tidak dapat dihapus.');
        }
        await this.database.transaction('rw', this.database.categories, this.database.settings, this.database.audit_logs, async () => {
            if (category.is_default) {
                const setting = await this.database.settings.get('deleted_default_category_slugs');
                const slugs = [...new Set([...(setting?.value || []), category.slug])];
                await this.database.settings.put({ key: 'deleted_default_category_slugs', value: slugs, updated_at: nowIso() });
            }
            await this.repository.delete(id);
            await this.database.audit_logs.add(createEntity({ entity_type: 'category', entity_id: id, action: 'category.deleted', metadata: { slug: category.slug, was_default: Boolean(category.is_default) } }));
        });
    }

    async validate(input, exceptId = null) {
        const name = input.name?.trim().replace(/\s+/g, ' ');
        if (!name) throw new CategoryValidationError('Nama kategori wajib diisi.', 'name');
        if (name.length > 60) throw new CategoryValidationError('Nama kategori maksimal 60 karakter.', 'name');

        this.validateType(input.type);
        if (await this.repository.findByNormalizedName(name, input.type, exceptId)) {
            throw new CategoryValidationError('Nama kategori sudah digunakan untuk tipe ini.', 'name');
        }

        return { name, type: input.type };
    }

    validateType(type) {
        if (!CATEGORY_TYPES.includes(type)) {
            throw new CategoryValidationError('Tipe kategori harus pemasukan atau pengeluaran.', 'type');
        }
    }

    validateColor(color) {
        if (!/^#[0-9a-f]{6}$/i.test(color)) {
            throw new CategoryValidationError('Warna kategori tidak valid.', 'color');
        }

        return color.toLocaleLowerCase();
    }

    validateIcon(icon) {
        const value = String(icon || '').trim();
        if ([...value].length > 4) throw new CategoryValidationError('Ikon maksimal 4 karakter.', 'icon');
        return value || null;
    }

    async requireCategory(id) {
        const category = await this.repository.find(id);
        if (!category) throw new CategoryValidationError('Kategori tidak ditemukan.');
        return category;
    }

    async uniqueSlug(name, type) {
        const base = `${type}-${slugify(name)}`;
        let slug = base;
        let suffix = 2;

        while (await this.repository.findBySlug(slug)) {
            slug = `${base}-${suffix++}`;
        }

        return slug;
    }
}
