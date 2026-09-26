import type { Db } from './connection.ts';

export const BASE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    avatar TEXT,
    firstName TEXT,
    lastName TEXT,
    otherNames TEXT,
    relation TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    notes TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    postalCode TEXT
  )
`;

type Migration = (db: Db) => Promise<void>;

// Append only: never edit a migration that has shipped.
export const MIGRATIONS: Migration[] = [
  // v1
  async (db) => {
    const now = new Date().toISOString();
    await db.run('ALTER TABLE contacts ADD COLUMN createdAt TEXT');
    await db.run('ALTER TABLE contacts ADD COLUMN updatedAt TEXT');
    await db.run('UPDATE contacts SET createdAt = ?, updatedAt = ?', [now, now]);

    await db.exec(`
      CREATE TABLE social_links (
        id TEXT PRIMARY KEY,
        contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        label TEXT,
        handle TEXT,
        url TEXT,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX idx_social_links_contact ON social_links(contactId);

      CREATE TABLE custom_fields (
        id TEXT PRIMARY KEY,
        contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        section TEXT NOT NULL CHECK (section IN ('personal', 'address')),
        label TEXT NOT NULL,
        value TEXT,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      CREATE INDEX idx_custom_fields_contact ON custom_fields(contactId);

      CREATE TABLE media (
        id TEXT PRIMARY KEY,
        contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK (type IN ('image', 'video')),
        url TEXT NOT NULL,
        caption TEXT,
        takenAt TEXT,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX idx_media_contact ON media(contactId);

      CREATE TABLE timeline_events (
        id TEXT PRIMARY KEY,
        contactId TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        entityType TEXT NOT NULL,
        entityId TEXT,
        summary TEXT NOT NULL,
        changes TEXT,
        occurredAt TEXT NOT NULL
      );
      CREATE INDEX idx_timeline_events_contact ON timeline_events(contactId, occurredAt);
    `);

    await db.run(
      `INSERT INTO timeline_events (id, contactId, type, entityType, entityId, summary, changes, occurredAt)
       SELECT lower(hex(randomblob(16))), id, 'contact_created', 'contact', id, 'Contact created', NULL, ?
       FROM contacts`,
      [now],
    );
  },

  // v2: name is derived from firstName + lastName, so every contact needs a firstName.
  async (db) => {
    await db.run(`UPDATE contacts SET firstName = name WHERE firstName IS NULL OR trim(firstName) = ''`);
  },
];

export const migrate = async (db: Db, { log = console.log }: { log?: (message: string) => void } = {}) => {
  await db.run('PRAGMA foreign_keys = ON');
  await db.run(BASE_SCHEMA);
  const { user_version: current } = (await db.get<{ user_version: number }>('PRAGMA user_version'))!;
  for (let version = current; version < MIGRATIONS.length; version++) {
    await db.withTransaction(async () => {
      await MIGRATIONS[version](db);
      await db.run(`PRAGMA user_version = ${version + 1}`);
    });
    log(`Database migrated to v${version + 1}.`);
  }
};
