import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createContact, makeTestApp, timelineTypes, type Api, type Db } from './helpers.ts';
import type { RequestBody } from '../src/lib/fields.ts';

let db: Db;
let api: Api;
let contact: { id: string };

beforeEach(async () => {
  ({ db, api } = await makeTestApp());
  contact = await createContact(api);
});

afterEach(async () => {
  await db.close();
});

const addSocial = (body: RequestBody) => api.post(`/contacts/${contact.id}/socials`).send(body);

describe('POST /contacts/:id/socials', () => {
  it('adds a social link with 201 and logs it', async () => {
    const res = await addSocial({ platform: 'instagram', handle: '@p', url: 'https://i.com/p' }).expect(201);
    expect(res.body).toMatchObject({
      contactId: contact.id,
      platform: 'instagram',
      label: null,
      handle: '@p',
      url: 'https://i.com/p',
      sortOrder: 0,
    });
    const [latest] = (await api.get(`/contacts/${contact.id}/timeline`)).body;
    expect(latest).toMatchObject({ type: 'social_added', summary: 'Added instagram', entityId: res.body.id });
  });

  it('auto-increments sortOrder', async () => {
    await addSocial({ platform: 'x', handle: '@a' }).expect(201);
    const res = await addSocial({ platform: 'github', handle: 'b' }).expect(201);
    expect(res.body.sortOrder).toBe(1);
  });

  it('keeps an explicit sortOrder', async () => {
    const res = await addSocial({ platform: 'x', handle: '@a', sortOrder: 7 }).expect(201);
    expect(res.body.sortOrder).toBe(7);
  });

  it('allows a custom "other" platform with a label', async () => {
    const res = await addSocial({ platform: 'other', label: 'Twitch', handle: 'p' }).expect(201);
    expect(res.body.label).toBe('Twitch');
    const [latest] = (await api.get(`/contacts/${contact.id}/timeline`)).body;
    expect(latest.summary).toBe('Added Twitch');
  });

  it('accepts a url without a handle', async () => {
    await addSocial({ platform: 'linkedin', url: 'https://linkedin.com/in/p' }).expect(201);
  });

  it.each([
    [{ platform: 'myspace', handle: 'p' }, /platform must be one of/],
    [{ handle: 'p' }, /platform must be one of/],
    [{ platform: 'other', handle: 'p' }, 'label is required when platform is "other"'],
    [{ platform: 'x' }, 'handle or url is required'],
    [{ platform: 'x', handle: ' ', url: '' }, 'handle or url is required'],
  ])('400s for %o', async (body, message) => {
    const res = await addSocial(body).expect(400);
    expect(res.body.error).toMatch(message);
  });

  it('400s with no body', async () => {
    await api.post(`/contacts/${contact.id}/socials`).expect(400);
  });

  it('404s for an unknown contact', async () => {
    const res = await api.post('/contacts/nope/socials').send({ platform: 'x', handle: 'p' }).expect(404);
    expect(res.body).toEqual({ error: 'Contact not found' });
  });
});

describe('PUT /contacts/:id/socials/:socialId', () => {
  it('updates only the fields sent and logs a diff', async () => {
    const social = (await addSocial({ platform: 'x', handle: '@old', url: 'https://x.com/old' })).body;
    const res = await api
      .put(`/contacts/${contact.id}/socials/${social.id}`)
      .send({ handle: '@new' })
      .expect(200);
    expect(res.body).toMatchObject({ handle: '@new', url: 'https://x.com/old', platform: 'x' });

    const [latest] = (await api.get(`/contacts/${contact.id}/timeline`)).body;
    expect(latest).toMatchObject({
      type: 'social_updated',
      summary: 'Updated x',
      changes: { handle: { from: '@old', to: '@new' } },
    });
  });

  it('logs nothing when values are unchanged', async () => {
    const social = (await addSocial({ platform: 'x', handle: '@same' })).body;
    await api.put(`/contacts/${contact.id}/socials/${social.id}`).send({ handle: '@same' }).expect(200);
    expect(await timelineTypes(api, contact.id)).toEqual(['social_added', 'contact_created']);
  });

  it('validates the merged result', async () => {
    const social = (await addSocial({ platform: 'x', handle: '@p' })).body;
    await api
      .put(`/contacts/${contact.id}/socials/${social.id}`)
      .send({ platform: 'other' })
      .expect(400);
  });

  it('accepts a request with no body', async () => {
    const social = (await addSocial({ platform: 'x', handle: '@p' })).body;
    await api.put(`/contacts/${contact.id}/socials/${social.id}`).expect(200);
  });

  it('404s for an unknown social', async () => {
    const res = await api.put(`/contacts/${contact.id}/socials/nope`).send({ handle: 'a' }).expect(404);
    expect(res.body).toEqual({ error: 'Social link not found' });
  });

  it("404s for another contact's social", async () => {
    const social = (await addSocial({ platform: 'x', handle: '@p' })).body;
    const other = await createContact(api, { firstName: 'Other' });
    await api.put(`/contacts/${other.id}/socials/${social.id}`).send({ handle: 'a' }).expect(404);
  });
});

describe('DELETE /contacts/:id/socials/:socialId', () => {
  it('removes the social and logs it', async () => {
    const social = (await addSocial({ platform: 'other', label: 'Etsy', handle: 'p' })).body;
    const res = await api.delete(`/contacts/${contact.id}/socials/${social.id}`).expect(200);
    expect(res.body).toEqual({ deleted: 1 });
    expect((await api.get(`/contacts/${contact.id}`)).body.socials).toEqual([]);
    const [latest] = (await api.get(`/contacts/${contact.id}/timeline`)).body;
    expect(latest).toMatchObject({ type: 'social_removed', summary: 'Removed Etsy' });
  });

  it('404s for an unknown social', async () => {
    await api.delete(`/contacts/${contact.id}/socials/nope`).expect(404);
  });
});
