import { afterEach, describe, expect, it } from 'vitest';
import { createDb, type Db } from '../../src/db/connection.ts';
import { BASE_SCHEMA, MIGRATIONS, migrate } from '../../src/db/migrations.ts';
import type { Contact } from '../../src/contacts/contacts.validation.ts';

const silent = { log: () => {} };
let db: Db;

afterEach(async () => {
  await db?.close();
});

const tableNames = async () =>
  (await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")).map(
    (row) => row.name,
  );

const columnNames = async (table: string) =>
  (await db.all<{ name: string }>(`PRAGMA table_info(${table})`)).map((column) => column.name);

describe('migrate', () => {
  it('builds the latest schema on a fresh database', async () => {
    db = createDb(':memory:');
    await migrate(db, silent);

    const { user_version } = (await db.get<{ user_version: number }>('PRAGMA user_version'))!;
    expect(user_version).toBe(MIGRATIONS.length);
    expect(await tableNames()).toEqual([
      'contacts',
      'custom_fields',
      'media',
      'social_links',
      'timeline_events',
    ]);
    expect(await columnNames('contacts')).toEqual(expect.arrayContaining(['createdAt', 'updatedAt']));
  });

  it('turns on foreign keys', async () => {
    db = createDb(':memory:');
    await migrate(db, silent);
    expect(await db.get('PRAGMA foreign_keys')).toEqual({ foreign_keys: 1 });
  });

  it('logs each version it applies', async () => {
    db = createDb(':memory:');
    const messages: string[] = [];
    await migrate(db, { log: (message) => messages.push(message) });
    expect(messages).toEqual(['Database migrated to v1.', 'Database migrated to v2.']);
  });

  it('is a no-op when already current', async () => {
    db = createDb(':memory:');
    await migrate(db, silent);
    const messages: string[] = [];
    await migrate(db, { log: (message) => messages.push(message) });
    expect(messages).toEqual([]);
  });

  it('upgrades a legacy v0 database without losing contacts', async () => {
    db = createDb(':memory:');
    // The original single-table schema, as it exists on older deployments.
    await db.run(BASE_SCHEMA);
    await db.run(`INSERT INTO contacts (id, name, firstName, lastName) VALUES ('01', 'Harold H', 'Harold', 'H')`);
    await db.run(`INSERT INTO contacts (id, name) VALUES ('02', 'Nickname Only')`);

    await migrate(db, silent);

    const contacts = await db.all<Contact>('SELECT * FROM contacts ORDER BY id');
    expect(contacts).toHaveLength(2);
    expect(contacts[0].createdAt).toBeTruthy();
    expect(contacts[0].updatedAt).toBeTruthy();
    expect(contacts[1].firstName).toBe('Nickname Only');
    expect(contacts[0].firstName).toBe('Harold');

    const events = await db.all('SELECT contactId, type FROM timeline_events ORDER BY contactId');
    expect(events).toEqual([
      { contactId: '01', type: 'contact_created' },
      { contactId: '02', type: 'contact_created' },
    ]);
  });

  it('rolls back a failing migration step', async () => {
    db = createDb(':memory:');
    await migrate(db, silent);
    await db.run(`PRAGMA user_version = ${MIGRATIONS.length - 1}`);
    const original = MIGRATIONS[MIGRATIONS.length - 1];
    MIGRATIONS[MIGRATIONS.length - 1] = async (conn) => {
      await conn.run(`INSERT INTO contacts (id, name) VALUES ('x', 'partial')`);
      throw new Error('boom');
    };
    try {
      await expect(migrate(db, silent)).rejects.toThrow('boom');
    } finally {
      MIGRATIONS[MIGRATIONS.length - 1] = original;
    }
    expect(await db.get(`SELECT * FROM contacts WHERE id = 'x'`)).toBeUndefined();
    expect((await db.get<{ user_version: number }>('PRAGMA user_version'))!.user_version).toBe(MIGRATIONS.length - 1);
  });
});
