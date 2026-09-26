const crypto = require('node:crypto');
const { HttpError } = require('../lib/httpError');
const { now, isBlank, pickPresent } = require('../lib/fields');
const { logEvent, diff, describeChanges } = require('../timeline/timeline.service');
const { insertSocial, listSocials } = require('../socials/socials.service');
const { validateSocial } = require('../socials/socials.validation');
const { insertCustomField, listCustomFields } = require('../customFields/customFields.service');
const { validateCustomField } = require('../customFields/customFields.validation');
const { CONTACT_FIELDS, WRITABLE_CONTACT_FIELDS, fullName } = require('./contacts.validation');

const listContacts = (db) => db.all('SELECT * FROM contacts ORDER BY name COLLATE NOCASE');

const findContact = async (db, id) => {
  const contact = await db.get('SELECT * FROM contacts WHERE id = ?', [id]);
  if (!contact) throw new HttpError(404, 'Contact not found');
  return contact;
};

const getContactDetail = async (db, id) => {
  const contact = await findContact(db, id);
  const socials = await listSocials(db, id);
  const customFields = await listCustomFields(db, id);
  return { ...contact, socials, customFields };
};

const createContact = async (db, body) => {
  const fields = {
    ...Object.fromEntries(WRITABLE_CONTACT_FIELDS.map((field) => [field, null])),
    ...pickPresent(body, WRITABLE_CONTACT_FIELDS),
  };
  if (isBlank(fields.firstName)) throw new HttpError(400, 'firstName is required');
  fields.name = fullName(fields);
  const socials = Array.isArray(body.socials) ? body.socials : [];
  const customFields = Array.isArray(body.customFields) ? body.customFields : [];
  socials.forEach(validateSocial);
  customFields.forEach(validateCustomField);

  const id = crypto.randomUUID();
  const timestamp = now();

  await db.withTransaction(async () => {
    await db.run(
      `INSERT INTO contacts (id, ${CONTACT_FIELDS.join(', ')}, createdAt, updatedAt)
       VALUES (?, ${CONTACT_FIELDS.map(() => '?').join(', ')}, ?, ?)`,
      [id, ...CONTACT_FIELDS.map((field) => fields[field]), timestamp, timestamp],
    );
    await logEvent(db, id, 'contact_created', 'contact', id, 'Contact created');
    for (const social of socials) await insertSocial(db, id, social);
    for (const field of customFields) await insertCustomField(db, id, field);
  });

  return id;
};

const updateContact = async (db, id, body) => {
  const updates = pickPresent(body, WRITABLE_CONTACT_FIELDS);
  if ('firstName' in updates && isBlank(updates.firstName)) {
    throw new HttpError(400, 'firstName cannot be empty');
  }

  await db.withTransaction(async () => {
    const existing = await findContact(db, id);
    const merged = { ...existing, ...updates };
    const changes = diff(existing, merged, Object.keys(updates));
    if (!changes) return;

    const fields = Object.keys(changes);
    await db.run(
      `UPDATE contacts SET ${fields.map((field) => `${field} = ?`).join(', ')}, name = ?, updatedAt = ? WHERE id = ?`,
      [...fields.map((field) => updates[field] ?? null), fullName(merged), now(), id],
    );
    await logEvent(db, id, 'contact_updated', 'contact', id, describeChanges(changes), changes);
  });
};

// Socials, custom fields, media and timeline rows are removed by ON DELETE CASCADE.
const removeContact = async (db, id) => {
  const { changes } = await db.run('DELETE FROM contacts WHERE id = ?', [id]);
  if (!changes) throw new HttpError(404, 'Contact not found');
  return changes;
};

module.exports = {
  listContacts,
  findContact,
  getContactDetail,
  createContact,
  updateContact,
  removeContact,
};
