import { fileURLToPath } from 'node:url';
import config from '../config.ts';
import { createDb, type Db } from './connection.ts';
import { migrate } from './migrations.ts';
import { logEvent } from '../timeline/timeline.service.ts';
import { insertSocial } from '../socials/socials.service.ts';
import { insertCustomField } from '../customFields/customFields.service.ts';
import { sampleContacts, sampleSocials, sampleCustomFields } from './seedData.ts';

const CONTACT_COLUMNS = [
  'id', 'name', 'description', 'avatar', 'firstName', 'lastName', 'otherNames',
  'relation', 'phone', 'email', 'website', 'notes',
  'address', 'city', 'country', 'postalCode', 'createdAt', 'updatedAt',
];

export const seedIfEmpty = async (db: Db) => {
  const { count } = (await db.get<{ count: number }>('SELECT COUNT(*) AS count FROM contacts'))!;
  if (count > 0) return false;

  const timestamp = new Date().toISOString();
  await db.withTransaction(async () => {
    for (const contact of sampleContacts) {
      const row: Record<string, unknown> = { ...contact, createdAt: timestamp, updatedAt: timestamp };
      await db.run(
        `INSERT INTO contacts (${CONTACT_COLUMNS.join(', ')}) VALUES (${CONTACT_COLUMNS.map(() => '?').join(', ')})`,
        CONTACT_COLUMNS.map((column) => row[column] ?? null),
      );
      await logEvent(db, contact.id, 'contact_created', 'contact', contact.id, 'Contact created');
      for (const social of sampleSocials[contact.id] ?? []) {
        await insertSocial(db, contact.id, social);
      }
      for (const field of sampleCustomFields[contact.id] ?? []) {
        await insertCustomField(db, contact.id, field);
      }
    }
  });
  return true;
};

/* v8 ignore start */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const db = createDb(config.dbPath);
  migrate(db)
    .then(() => seedIfEmpty(db))
    .then((seeded) =>
      console.log(
        seeded ? 'Sample contacts inserted successfully!' : 'Contacts already exist, skipping seed.',
      ),
    )
    .catch((err) => {
      console.error('Seed failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => db.close());
}
/* v8 ignore stop */
