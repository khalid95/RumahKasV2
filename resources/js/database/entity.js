export function createUuid() {
    if (!globalThis.crypto?.randomUUID) {
        throw new Error('Browser ini tidak mendukung pembuatan UUID yang aman.');
    }

    return globalThis.crypto.randomUUID();
}

export function nowIso() {
    return new Date().toISOString();
}

export function createEntity(attributes = {}) {
    const timestamp = nowIso();

    return {
        id: attributes.id ?? createUuid(),
        ...attributes,
        created_at: attributes.created_at ?? timestamp,
        updated_at: attributes.updated_at ?? timestamp,
    };
}

export function updateEntity(attributes = {}) {
    return {
        ...attributes,
        updated_at: nowIso(),
    };
}
