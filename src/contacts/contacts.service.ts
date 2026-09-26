import crypto from 'node:crypto';
import type { Db } from '../db/connection.ts';
import { HttpError } from '../lib/httpError.ts';
import { now, isBlank, pickPresent, type RequestBody } from '../lib/fields.ts';
import { logEvent, diff, describeChanges } from '../timeline/timeline.service.ts';
import { insertSocial, listSocials } from '../socials/socials.service.ts';
import { validateSocial } from '../socials/socials.validation.ts';
import { insertCustomField, listCustomFields } from '../customFields/customFields.service.ts';
import { validateCustomField } from '../customFields/customFields.validation.ts';
import {
  CONTACT_FIELDS,
  WRITABLE_CONTACT_FIELDS,
  fullName,
  type Contact,
  type ContactField,
  type WritableContactField,
} from './contacts.validation.ts';

export const listContacts = (db: Db) => db.all<Contact>('SELECT * FROM contacts ORDER BY name COLLATE NOCASE');

export const findContact = async (db: Db, id: string) => {
  const contact = await db.get<Contact>('SELECT * FROM contacts WHERE id = ?', [id]);
  if (!contact) throw new HttpError(404, 'Contact not found');
  return contact;
};

export const getContactDetail = async (db: Db, id: string) => {
  const contact = await findContact(db, id);
  const socials = await listSocials(db, id);
  const customFields = await listCustomFields(db, id);
  return { ...contact, socials, customFields };
};

export const createContact = async (db: Db, body: RequestBody) => {
  const fields: Record<ContactField, unknown> = {
    ...(Object.fromEntries(CONTACT_FIELDS.map((field) => [field, null])) as Record<ContactField, null>),
    ...pickPresent(body, WRITABLE_CONTACT_FIELDS),
  };
  if (isBlank(fields.firstName)) throw new HttpError(400, 'firstName is required');
  fields.name = fullName(fields);
  const socials: RequestBody[] = Array.isArray(body.socials) ? body.socials : [];
  const customFields: RequestBody[] = Array.isArray(body.customFields) ? body.customFields : [];
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

export const updateContact = async (db: Db, id: string, body: RequestBody) => {
  const updates = pickPresent(body, WRITABLE_CONTACT_FIELDS);
  if ('firstName' in updates && isBlank(updates.firstName)) {
    throw new HttpError(400, 'firstName cannot be empty');
  }

  await db.withTransaction(async () => {
    const existing = await findContact(db, id);
    const merged = { ...existing, ...updates };
    const changes = diff(existing, merged, Object.keys(updates));
    if (!changes) return;

    const fields = Object.keys(changes) as WritableContactField[];
    await db.run(
      `UPDATE contacts SET ${fields.map((field) => `${field} = ?`).join(', ')}, name = ?, updatedAt = ? WHERE id = ?`,
      [...fields.map((field) => updates[field] ?? null), fullName(merged), now(), id],
    );
    await logEvent(db, id, 'contact_updated', 'contact', id, describeChanges(changes), changes);
  });
};

// Socials, custom fields, media and timeline rows are removed by ON DELETE CASCADE.
export const removeContact = async (db: Db, id: string) => {
  const { changes } = await db.run('DELETE FROM contacts WHERE id = ?', [id]);
  if (!changes) throw new HttpError(404, 'Contact not found');
  return changes;
};
