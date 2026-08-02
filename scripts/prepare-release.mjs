import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const notes = JSON.parse(await readFile(new URL('release-notes.json', root), 'utf8'));
const schemaSource = await readFile(new URL('resources/js/database/schema.js', root), 'utf8');
const databaseVersion = Number(schemaSource.match(/DATABASE_VERSION\s*=\s*(\d+)/)?.[1]);
if (!Number.isInteger(databaseVersion)) throw new Error('DATABASE_VERSION tidak dapat dibaca.');
const release = {
    version: packageJson.version,
    database_version: databaseVersion,
    minimum_database_version: 1,
    minimum_version: notes.minimum_version,
    released_at: notes.released_at,
    required: Boolean(notes.required),
    notes: notes.notes,
};

await writeFile(new URL('public/release.json', root), `${JSON.stringify(release, null, 2)}\n`);
await writeFile(new URL('public/app-version.js', root), `self.RUMAHKAS_RELEASE=${JSON.stringify(release)};\n`);
