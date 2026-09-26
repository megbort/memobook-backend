import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedIfEmpty } from '../../src/db/seed.js';
import { sampleContacts, sampleCustomFields, sampleSocials } from '../../src/db/seedData.js';
import { makeTestDb } from '../helpers.js';

const count = async (db, table) => (await db.get(`SELECT COUNT(*) AS n FROM ${table}`)).n;
const total = (byContact) => Object.values(byContact).flat().length;

let db;

beforeEach(async () => {
  db = await makeTestDb();
});

afterEach(async () => {
  await db.close();
});

describe('seedIfEmpty', () => {
  it('inserts the sample contacts, socials and custom fields into an empty database', async () => {
    expect(await seedIfEmpty(db)).toBe(true);

    expect(await count(db, 'contacts')).toBe(sampleContacts.length);
    expect(await count(db, 'social_links')).toBe(total(sampleSocials));
    expect(await count(db, 'custom_fields')).toBe(total(sampleCustomFields));
  });

  it('logs a timeline event for every inserted row', async () => {
    await seedIfEmpty(db);
    const expected = sampleContacts.length + total(sampleSocials) + total(sampleCustomFields);
    expect(await count(db, 'timeline_events')).toBe(expected);
  });

  it('keeps the fixed ids and orders socials per contact', async () => {
    await seedIfEmpty(db);
    const socials = await db.all(
      "SELECT platform, label, sortOrder FROM social_links WHERE contactId = '01' ORDER BY sortOrder",
    );
    expect(socials).toEqual([
      { platform: 'instagram', label: null, sortOrder: 0 },
      { platform: 'other', label: 'Flickr', sortOrder: 1 },
    ]);
  });

  it('skips when contacts already exist', async () => {
    await seedIfEmpty(db);
    expect(await seedIfEmpty(db)).toBe(false);
    expect(await count(db, 'contacts')).toBe(sampleContacts.length);
  });
});
