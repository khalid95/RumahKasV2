import Dexie from 'dexie';
import { DATABASE_NAME, schemaV1, schemaV2, schemaV3, schemaV4 } from './schema';

export function createDatabase(name = DATABASE_NAME) {
    const database = new Dexie(name);

    database.version(1).stores(schemaV1);
    database.version(2).stores(schemaV2);
    database.version(3).stores(schemaV3);
    database.version(4).stores(schemaV4);

    return database;
}

export const db = createDatabase();
