import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedIfEmpty } from '../src/db/seed.js';
import { contactBody, createContact, makeTestApp, timelineTypes } from './helpers.js';

let db;
let api;

beforeEach(async () => {
  ({ db, api } = await makeTestApp());
});

afterEach(async () => {
  await db.close();
});

describe('GET /contacts', () => {
  it('returns an empty list for a new database', async () => {
    const res = await api.get('/contacts').expect(200);
    expect(res.body).toEqual([]);
  });

  it('lists contacts sorted by name, case-insensitive', async () => {
    await createContact(api, { firstName: 'bob', lastName: null });
    await createContact(api, { firstName: 'Charlie', lastName: null });
    await createContact(api, { firstName: 'Ann', lastName: null });
    const res = await api.get('/contacts').expect(200);
    expect(res.body.map((c) => c.name)).toEqual(['Ann', 'bob', 'Charlie']);
  });

  it('includes the seeded contacts', async () => {
    await seedIfEmpty(db);
    const res = await api.get('/contacts').expect(200);
    expect(res.body).toHaveLength(5);
  });
});

describe('GET /contacts/:id', () => {
  it('returns the contact with its socials and custom fields', async () => {
    await seedIfEmpty(db);
    const res = await api.get('/contacts/01').expect(200);
    expect(res.body).toMatchObject({ id: '01', name: 'Harold Hidethepain', firstName: 'Harold' });
    expect(res.body.socials).toHaveLength(2);
    expect(res.body.customFields).toHaveLength(2);
  });

  it('404s for an unknown id', async () => {
    const res = await api.get('/contacts/nope').expect(404);
    expect(res.body).toEqual({ error: 'Contact not found' });
  });
});

describe('POST /contacts', () => {
  it('creates a contact and returns it with 201', async () => {
    const res = await api
      .post('/contacts')
      .send(contactBody({ phone: '555', description: 'Pottery friend' }))
      .expect(201);
    expect(res.body).toMatchObject({
      name: 'Priya Patel',
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '555',
      description: 'Pottery friend',
      socials: [],
      customFields: [],
    });
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.createdAt).toBe(res.body.updatedAt);
  });

  it('derives name from first and last name and ignores a client-sent name', async () => {
    const res = await api
      .post('/contacts')
      .send({ firstName: 'Ann', name: 'Something Else' })
      .expect(201);
    expect(res.body.name).toBe('Ann');
  });

  it('stores empty strings as null', async () => {
    const res = await api.post('/contacts').send(contactBody({ email: '', city: '  ' })).expect(201);
    expect(res.body.email).toBeNull();
    expect(res.body.city).toBeNull();
  });

  it('ignores unknown fields', async () => {
    const res = await api.post('/contacts').send(contactBody({ hacker: 'x' })).expect(201);
    expect(res.body).not.toHaveProperty('hacker');
  });

  it('creates nested socials and custom fields in one request', async () => {
    const res = await api
      .post('/contacts')
      .send(
        contactBody({
          socials: [
            { platform: 'instagram', handle: '@priya' },
            { platform: 'other', label: 'Etsy', url: 'https://etsy.com/shop/priya' },
          ],
          customFields: [{ section: 'personal', label: 'Birthday', value: 'June 2' }],
        }),
      )
      .expect(201);
    expect(res.body.socials.map((s) => [s.platform, s.sortOrder])).toEqual([
      ['instagram', 0],
      ['other', 1],
    ]);
    expect(res.body.customFields).toMatchObject([{ label: 'Birthday', value: 'June 2' }]);
    expect(await timelineTypes(api, res.body.id)).toEqual([
      'field_added',
      'social_added',
      'social_added',
      'contact_created',
    ]);
  });

  it('400s without a first name', async () => {
    const res = await api.post('/contacts').send({ lastName: 'Only' }).expect(400);
    expect(res.body).toEqual({ error: 'firstName is required' });
  });

  it('400s with a blank first name', async () => {
    await api.post('/contacts').send({ firstName: '   ' }).expect(400);
  });

  it('400s with no body at all', async () => {
    await api.post('/contacts').expect(400);
  });

  it('rejects an invalid nested social and saves nothing', async () => {
    const res = await api
      .post('/contacts')
      .send(contactBody({ socials: [{ platform: 'myspace', handle: 'x' }] }))
      .expect(400);
    expect(res.body.error).toMatch(/platform must be one of/);
    expect((await api.get('/contacts')).body).toEqual([]);
  });

  it('rejects an invalid nested custom field and saves nothing', async () => {
    await api
      .post('/contacts')
      .send(contactBody({ customFields: [{ section: 'work', label: 'Team' }] }))
      .expect(400);
    expect((await api.get('/contacts')).body).toEqual([]);
  });

  it('ignores socials / customFields that are not arrays', async () => {
    const res = await api
      .post('/contacts')
      .send(contactBody({ socials: 'nope', customFields: { a: 1 } }))
      .expect(201);
    expect(res.body.socials).toEqual([]);
    expect(res.body.customFields).toEqual([]);
  });
});

describe('PUT /contacts/:id', () => {
  it('updates only the fields sent', async () => {
    const created = await createContact(api, { phone: '1', email: 'a@x.com' });
    const res = await api.put(`/contacts/${created.id}`).send({ phone: '2' }).expect(200);
    expect(res.body.phone).toBe('2');
    expect(res.body.email).toBe('a@x.com');
    expect(res.body.socials).toEqual([]);
  });

  it('rebuilds name when first or last name changes', async () => {
    const created = await createContact(api);
    const res = await api.put(`/contacts/${created.id}`).send({ lastName: 'Singh' }).expect(200);
    expect(res.body.name).toBe('Priya Singh');
  });

  it('ignores a client-sent name', async () => {
    const created = await createContact(api);
    const res = await api.put(`/contacts/${created.id}`).send({ name: 'Hacked' }).expect(200);
    expect(res.body.name).toBe('Priya Patel');
  });

  it('clears a field sent as an empty string', async () => {
    const created = await createContact(api, { phone: '1' });
    const res = await api.put(`/contacts/${created.id}`).send({ phone: '' }).expect(200);
    expect(res.body.phone).toBeNull();
  });

  it('logs a contact_updated event with a from/to diff', async () => {
    const created = await createContact(api, { phone: '1' });
    await api.put(`/contacts/${created.id}`).send({ phone: '2', email: 'new@x.com' }).expect(200);
    const [latest] = (await api.get(`/contacts/${created.id}/timeline`)).body;
    expect(latest).toMatchObject({
      type: 'contact_updated',
      entityType: 'contact',
      summary: 'Phone, email changed',
      changes: { phone: { from: '1', to: '2' }, email: { from: null, to: 'new@x.com' } },
    });
  });

  it('bumps updatedAt on a real change', async () => {
    const created = await createContact(api, { phone: '1' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const res = await api.put(`/contacts/${created.id}`).send({ phone: '2' }).expect(200);
    expect(res.body.updatedAt > created.updatedAt).toBe(true);
  });

  it('does nothing and logs nothing when values are unchanged', async () => {
    const created = await createContact(api, { phone: '1' });
    const res = await api.put(`/contacts/${created.id}`).send({ phone: '1' }).expect(200);
    expect(res.body.updatedAt).toBe(created.updatedAt);
    expect(await timelineTypes(api, created.id)).toEqual(['contact_created']);
  });

  it('400s when first name is blanked', async () => {
    const created = await createContact(api);
    const res = await api.put(`/contacts/${created.id}`).send({ firstName: '' }).expect(400);
    expect(res.body).toEqual({ error: 'firstName cannot be empty' });
  });

  it('accepts a request with no body', async () => {
    const created = await createContact(api);
    await api.put(`/contacts/${created.id}`).expect(200);
  });

  it('404s for an unknown id', async () => {
    await api.put('/contacts/nope').send({ phone: '1' }).expect(404);
  });
});

describe('DELETE /contacts/:id', () => {
  it('deletes the contact and everything attached to it', async () => {
    const created = await createContact(api, {
      socials: [{ platform: 'github', handle: 'priya' }],
      customFields: [{ section: 'address', label: 'Floor', value: '3' }],
    });
    const res = await api.delete(`/contacts/${created.id}`).expect(200);
    expect(res.body).toEqual({ deleted: 1 });

    await api.get(`/contacts/${created.id}`).expect(404);
    for (const table of ['social_links', 'custom_fields', 'timeline_events', 'media']) {
      const { n } = await db.get(`SELECT COUNT(*) AS n FROM ${table} WHERE contactId = ?`, [
        created.id,
      ]);
      expect(n, table).toBe(0);
    }
  });

  it('404s for an unknown id', async () => {
    const res = await api.delete('/contacts/nope').expect(404);
    expect(res.body).toEqual({ error: 'Contact not found' });
  });
});
