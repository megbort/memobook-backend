import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createContact, makeTestApp, type Api, type Db } from './helpers.ts';
import { signParams } from '../src/uploads/uploads.service.ts';

const cloudinary = { cloudName: 'test-cloud', apiKey: 'test-key', apiSecret: 'test-secret' };

let db: Db;
let api: Api;

beforeEach(async () => {
  ({ db, api } = await makeTestApp({ cloudinary }));
});

afterEach(async () => {
  await db.close();
});

describe('signParams', () => {
  it('matches the example signature in the Cloudinary docs', () => {
    const params = {
      timestamp: 1315060510,
      public_id: 'sample_image',
      eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
    };
    expect(signParams(params, 'abcd')).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e');
  });
});

describe('POST /contacts/:id/uploads/signature', () => {
  it('signs an avatar upload into the contact folder', async () => {
    const contact = await createContact(api);
    const res = await api.post(`/contacts/${contact.id}/uploads/signature`).send({ kind: 'avatar' }).expect(200);

    expect(res.body.uploadUrl).toBe('https://api.cloudinary.com/v1_1/test-cloud/image/upload');
    expect(res.body.apiKey).toBe('test-key');
    expect(res.body.params).toMatchObject({
      folder: `memobook/contacts/${contact.id}`,
      public_id: 'avatar',
      overwrite: true,
      invalidate: true,
    });
    expect(typeof res.body.params.timestamp).toBe('number');
    expect(res.body.signature).toBe(signParams(res.body.params, 'test-secret'));
  });

  it('signs a media upload with a unique id in the media subfolder', async () => {
    const contact = await createContact(api);
    const sign = () => api.post(`/contacts/${contact.id}/uploads/signature`).send({ kind: 'media' }).expect(200);
    const [first, second] = await Promise.all([sign(), sign()]);

    expect(first.body.uploadUrl).toBe('https://api.cloudinary.com/v1_1/test-cloud/auto/upload');
    expect(first.body.params.folder).toBe(`memobook/contacts/${contact.id}/media`);
    expect(first.body.params.public_id).not.toBe(second.body.params.public_id);
  });

  it('never returns the api secret', async () => {
    const contact = await createContact(api);
    const res = await api.post(`/contacts/${contact.id}/uploads/signature`).send({ kind: 'avatar' }).expect(200);
    expect(JSON.stringify(res.body)).not.toContain('test-secret');
  });

  it('400s for an unknown kind', async () => {
    const contact = await createContact(api);
    const res = await api.post(`/contacts/${contact.id}/uploads/signature`).send({ kind: 'document' }).expect(400);
    expect(res.body.error).toBe('kind must be one of: avatar, media');
  });

  it('400s when the body is missing', async () => {
    const contact = await createContact(api);
    await api.post(`/contacts/${contact.id}/uploads/signature`).expect(400);
  });

  it('404s for an unknown contact', async () => {
    await api.post('/contacts/nope/uploads/signature').send({ kind: 'avatar' }).expect(404);
  });

  it('503s when Cloudinary credentials are missing', async () => {
    const unconfigured = await makeTestApp({ cloudinary: { cloudName: '', apiKey: '', apiSecret: '' } });
    const contact = await createContact(unconfigured.api);
    await unconfigured.api.post(`/contacts/${contact.id}/uploads/signature`).send({ kind: 'avatar' }).expect(503);
    await unconfigured.db.close();
  });
});
