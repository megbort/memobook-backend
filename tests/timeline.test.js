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

describe('GET /contacts/:id/timeline', () => {
  it('returns events newest first', async () => {
    const contact = await createContact(api, { phone: '1' });
    await api.put(`/contacts/${contact.id}`).send({ phone: '2' });
    await api.post(`/contacts/${contact.id}/socials`).send({ platform: 'x', handle: '@p' });

    const res = await api.get(`/contacts/${contact.id}/timeline`).expect(200);
    expect(res.body.map((event) => event.type)).toEqual([
      'social_added',
      'contact_updated',
      'contact_created',
    ]);
  });

  it('parses changes into objects and leaves null when there are none', async () => {
    const contact = await createContact(api, { phone: '1' });
    await api.put(`/contacts/${contact.id}`).send({ phone: '2' });

    const [updated, created] = (await api.get(`/contacts/${contact.id}/timeline`)).body;
    expect(updated.changes).toEqual({ phone: { from: '1', to: '2' } });
    expect(created.changes).toBeNull();
    expect(created).toMatchObject({
      contactId: contact.id,
      entityType: 'contact',
      entityId: contact.id,
      summary: 'Contact created',
    });
  });

  it("only returns this contact's events", async () => {
    const a = await createContact(api, { firstName: 'A' });
    await createContact(api, { firstName: 'B' });
    const res = await api.get(`/contacts/${a.id}/timeline`).expect(200);
    expect(res.body.every((event) => event.contactId === a.id)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('404s for an unknown contact', async () => {
    const res = await api.get('/contacts/nope/timeline').expect(404);
    expect(res.body).toEqual({ error: 'Contact not found' });
  });
});
