import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createContact, makeTestApp } from './helpers.js';

let db;
let api;

beforeEach(async () => {
  ({ db, api } = await makeTestApp());
});

afterEach(async () => {
  await db.close();
});

describe('GET /contacts/:id/media', () => {
  it('returns an empty list while uploads are not built', async () => {
    const contact = await createContact(api);
    const res = await api.get(`/contacts/${contact.id}/media`).expect(200);
    expect(res.body).toEqual([]);
  });

  it('returns rows stored in the media table, newest first', async () => {
    const contact = await createContact(api);
    const insert = (id, createdAt) =>
      db.run(
        `INSERT INTO media (id, contactId, type, url, createdAt) VALUES (?, ?, 'image', 'https://img/x.jpg', ?)`,
        [id, contact.id, createdAt],
      );
    await insert('old', '2026-01-01T00:00:00.000Z');
    await insert('new', '2026-02-01T00:00:00.000Z');

    const res = await api.get(`/contacts/${contact.id}/media`).expect(200);
    expect(res.body.map((m) => m.id)).toEqual(['new', 'old']);
  });

  it('404s for an unknown contact', async () => {
    await api.get('/contacts/nope/media').expect(404);
  });
});
