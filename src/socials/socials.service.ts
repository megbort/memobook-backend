import crypto from 'node:crypto';
import type { Db } from '../db/connection.ts';
import { HttpError } from '../lib/httpError.ts';
import { now, pickPresent, type RequestBody } from '../lib/fields.ts';
import { nextSortOrder } from '../lib/sortOrder.ts';
import { logEvent, diff } from '../timeline/timeline.service.ts';
import { SOCIAL_FIELDS, validateSocial, socialName, type Social } from './socials.validation.ts';

// Callers must check the contact exists and wrap writes in db.withTransaction.

export const insertSocial = async (db: Db, contactId: string, body: RequestBody) => {
  const social = pickPresent(body, SOCIAL_FIELDS);
  const id = crypto.randomUUID();
  const timestamp = now();
  const sortOrder = social.sortOrder ?? (await nextSortOrder(db, 'social_links', contactId));
  await db.run(
    `INSERT INTO social_links (id, contactId, platform, label, handle, url, sortOrder, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      contactId,
      social.platform,
      social.label ?? null,
      social.handle ?? null,
      social.url ?? null,
      sortOrder,
      timestamp,
      timestamp,
    ],
  );
  await logEvent(db, contactId, 'social_added', 'social', id, `Added ${socialName(social)}`);
  return db.get<Social>('SELECT * FROM social_links WHERE id = ?', [id]);
};

const findSocial = async (db: Db, contactId: string, socialId: string) => {
  const social = await db.get<Social>('SELECT * FROM social_links WHERE id = ? AND contactId = ?', [
    socialId,
    contactId,
  ]);
  if (!social) throw new HttpError(404, 'Social link not found');
  return social;
};

export const listSocials = (db: Db, contactId: string) =>
  db.all<Social>('SELECT * FROM social_links WHERE contactId = ? ORDER BY sortOrder, createdAt', [
    contactId,
  ]);

export const updateSocial = async (db: Db, contactId: string, socialId: string, body: RequestBody) => {
  const existing = await findSocial(db, contactId, socialId);
  const merged = { ...existing, ...pickPresent(body, SOCIAL_FIELDS) };
  // A blank sortOrder keeps the current position rather than hitting the NOT NULL column.
  merged.sortOrder ??= existing.sortOrder;
  validateSocial(merged);
  const changes = diff(existing, merged, SOCIAL_FIELDS);
  if (changes) {
    await db.run(
      'UPDATE social_links SET platform = ?, label = ?, handle = ?, url = ?, sortOrder = ?, updatedAt = ? WHERE id = ?',
      [
        merged.platform,
        merged.label ?? null,
        merged.handle ?? null,
        merged.url ?? null,
        merged.sortOrder,
        now(),
        existing.id,
      ],
    );
    await logEvent(db, contactId, 'social_updated', 'social', existing.id, `Updated ${socialName(merged)}`, changes);
  }
  return db.get<Social>('SELECT * FROM social_links WHERE id = ?', [existing.id]);
};

export const removeSocial = async (db: Db, contactId: string, socialId: string) => {
  const existing = await findSocial(db, contactId, socialId);
  await db.run('DELETE FROM social_links WHERE id = ?', [existing.id]);
  await logEvent(db, contactId, 'social_removed', 'social', existing.id, `Removed ${socialName(existing)}`);
};
