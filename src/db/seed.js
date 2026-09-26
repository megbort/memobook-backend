const config = require('../config');
const { createDb } = require('./connection');
const { migrate } = require('./migrations');
const { logEvent } = require('../timeline/timeline.service');
const { insertSocial } = require('../socials/socials.service');
const { insertCustomField } = require('../customFields/customFields.service');
const { sampleContacts, sampleSocials, sampleCustomFields } = require('./seedData');

const CONTACT_COLUMNS = [
  'id', 'name', 'description', 'avatar', 'firstName', 'lastName', 'otherNames',
  'relation', 'phone', 'email', 'website', 'notes',
  'address', 'city', 'country', 'postalCode', 'createdAt', 'updatedAt',
];

const seedIfEmpty = async (db) => {
  const { count } = await db.get('SELECT COUNT(*) AS count FROM contacts');
  if (count > 0) return false;

  const timestamp = new Date().toISOString();
  await db.withTransaction(async () => {
    for (const contact of sampleContacts) {
      const row = { ...contact, createdAt: timestamp, updatedAt: timestamp };
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
if (require.main === module) {
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

module.exports = { seedIfEmpty };
