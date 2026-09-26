const crypto = require('node:crypto');
const { HttpError } = require('../lib/httpError');
const { now, pickPresent } = require('../lib/fields');
const { nextSortOrder } = require('../lib/sortOrder');
const { logEvent, diff } = require('../timeline/timeline.service');
const { CUSTOM_FIELD_FIELDS, validateCustomField } = require('./customFields.validation');

// Callers must check the contact exists and wrap writes in db.withTransaction.

const insertCustomField = async (db, contactId, field) => {
  const id = crypto.randomUUID();
  const timestamp = now();
  const sortOrder = field.sortOrder ?? (await nextSortOrder(db, 'custom_fields', contactId));
  await db.run(
    `INSERT INTO custom_fields (id, contactId, section, label, value, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, contactId, field.section, field.label, field.value ?? null, sortOrder, timestamp, timestamp],
  );
  await logEvent(db, contactId, 'field_added', 'custom_field', id, `Added ${field.label}`);
  return db.get('SELECT * FROM custom_fields WHERE id = ?', [id]);
};

const findCustomField = async (db, contactId, fieldId) => {
  const field = await db.get('SELECT * FROM custom_fields WHERE id = ? AND contactId = ?', [
    fieldId,
    contactId,
  ]);
  if (!field) throw new HttpError(404, 'Custom field not found');
  return field;
};

const listCustomFields = (db, contactId) =>
  db.all(
    'SELECT * FROM custom_fields WHERE contactId = ? ORDER BY section, sortOrder, createdAt',
    [contactId],
  );

const updateCustomField = async (db, contactId, fieldId, body) => {
  const existing = await findCustomField(db, contactId, fieldId);
  const merged = { ...existing, ...pickPresent(body, CUSTOM_FIELD_FIELDS) };
  validateCustomField(merged);
  const changes = diff(existing, merged, CUSTOM_FIELD_FIELDS);
  if (changes) {
    await db.run(
      'UPDATE custom_fields SET section = ?, label = ?, value = ?, sortOrder = ?, updatedAt = ? WHERE id = ?',
      [merged.section, merged.label, merged.value ?? null, merged.sortOrder, now(), existing.id],
    );
    await logEvent(db, contactId, 'field_updated', 'custom_field', existing.id, `Updated ${merged.label}`, changes);
  }
  return db.get('SELECT * FROM custom_fields WHERE id = ?', [existing.id]);
};

const removeCustomField = async (db, contactId, fieldId) => {
  const existing = await findCustomField(db, contactId, fieldId);
  await db.run('DELETE FROM custom_fields WHERE id = ?', [existing.id]);
  await logEvent(db, contactId, 'field_removed', 'custom_field', existing.id, `Removed ${existing.label}`);
};

module.exports = { insertCustomField, listCustomFields, updateCustomField, removeCustomField };
