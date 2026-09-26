import crypto from 'node:crypto';
import type { Db } from '../db/connection.ts';
import { HttpError } from '../lib/httpError.ts';
import { now, pickPresent, type RequestBody } from '../lib/fields.ts';
import { nextSortOrder } from '../lib/sortOrder.ts';
import { logEvent, diff } from '../timeline/timeline.service.ts';
import { CUSTOM_FIELD_FIELDS, validateCustomField, type CustomField } from './customFields.validation.ts';

// Callers must check the contact exists and wrap writes in db.withTransaction.

export const insertCustomField = async (db: Db, contactId: string, field: RequestBody) => {
  const id = crypto.randomUUID();
  const timestamp = now();
  const sortOrder = field.sortOrder ?? (await nextSortOrder(db, 'custom_fields', contactId));
  await db.run(
    `INSERT INTO custom_fields (id, contactId, section, label, value, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, contactId, field.section, field.label, field.value ?? null, sortOrder, timestamp, timestamp],
  );
  await logEvent(db, contactId, 'field_added', 'custom_field', id, `Added ${field.label}`);
  return db.get<CustomField>('SELECT * FROM custom_fields WHERE id = ?', [id]);
};

const findCustomField = async (db: Db, contactId: string, fieldId: string) => {
  const field = await db.get<CustomField>('SELECT * FROM custom_fields WHERE id = ? AND contactId = ?', [
    fieldId,
    contactId,
  ]);
  if (!field) throw new HttpError(404, 'Custom field not found');
  return field;
};

export const listCustomFields = (db: Db, contactId: string) =>
  db.all<CustomField>(
    'SELECT * FROM custom_fields WHERE contactId = ? ORDER BY section, sortOrder, createdAt',
    [contactId],
  );

export const updateCustomField = async (db: Db, contactId: string, fieldId: string, body: RequestBody) => {
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
  return db.get<CustomField>('SELECT * FROM custom_fields WHERE id = ?', [existing.id]);
};

export const removeCustomField = async (db: Db, contactId: string, fieldId: string) => {
  const existing = await findCustomField(db, contactId, fieldId);
  await db.run('DELETE FROM custom_fields WHERE id = ?', [existing.id]);
  await logEvent(db, contactId, 'field_removed', 'custom_field', existing.id, `Removed ${existing.label}`);
};
