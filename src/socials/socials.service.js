const crypto = require('node:crypto');
const { HttpError } = require('../lib/httpError');
const { now, pickPresent } = require('../lib/fields');
const { nextSortOrder } = require('../lib/sortOrder');
const { logEvent, diff } = require('../timeline/timeline.service');
const { SOCIAL_FIELDS, validateSocial, socialName } = require('./socials.validation');

// Callers must check the contact exists and wrap writes in db.withTransaction.

const insertSocial = async (db, contactId, social) => {
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
  return db.get('SELECT * FROM social_links WHERE id = ?', [id]);
};

const findSocial = async (db, contactId, socialId) => {
  const social = await db.get('SELECT * FROM social_links WHERE id = ? AND contactId = ?', [
    socialId,
    contactId,
  ]);
  if (!social) throw new HttpError(404, 'Social link not found');
  return social;
};

const listSocials = (db, contactId) =>
  db.all('SELECT * FROM social_links WHERE contactId = ? ORDER BY sortOrder, createdAt', [
    contactId,
  ]);

const updateSocial = async (db, contactId, socialId, body) => {
  const existing = await findSocial(db, contactId, socialId);
  const merged = { ...existing, ...pickPresent(body, SOCIAL_FIELDS) };
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
  return db.get('SELECT * FROM social_links WHERE id = ?', [existing.id]);
};

const removeSocial = async (db, contactId, socialId) => {
  const existing = await findSocial(db, contactId, socialId);
  await db.run('DELETE FROM social_links WHERE id = ?', [existing.id]);
  await logEvent(db, contactId, 'social_removed', 'social', existing.id, `Removed ${socialName(existing)}`);
};

module.exports = { insertSocial, listSocials, updateSocial, removeSocial };
