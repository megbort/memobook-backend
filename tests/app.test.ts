import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.ts';
import { makeTestApp, type Db } from './helpers.ts';

let db: Db | undefined;

afterEach(async () => {
  await db?.close();
  db = undefined;
});

describe('CORS', () => {
  it('allows a configured origin and caches the preflight', async () => {
    let api;
    ({ db, api } = await makeTestApp({ allowedOrigins: ['http://localhost:5173'] }));
    const res = await api
      .options('/contacts/01')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'PUT')
      .set('Access-Control-Request-Headers', 'content-type')
      .expect(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-max-age']).toBe('7200');
    expect(res.headers['access-control-allow-methods']).toContain('PUT');
  });

  it('does not allow other origins', async () => {
    let api;
    ({ db, api } = await makeTestApp({ allowedOrigins: ['http://localhost:5173'] }));
    const res = await api.get('/contacts').set('Origin', 'https://evil.example').expect(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('uses the default local origins from config', async () => {
    let api;
    ({ db, api } = await makeTestApp());
    const res = await api.get('/contacts').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});

describe('errors', () => {
  it('400s on malformed JSON', async () => {
    let api;
    ({ db, api } = await makeTestApp());
    const res = await api
      .post('/contacts')
      .set('Content-Type', 'application/json')
      .send('{"firstName": ')
      .expect(400);
    expect(res.body).toEqual({ error: 'Invalid JSON body' });
  });

  it('404s for unknown routes', async () => {
    let api;
    ({ db, api } = await makeTestApp());
    const res = await api.get('/nothing-here').expect(404);
    expect(res.body).toEqual({ error: 'Not found' });
  });

  it('returns 500 with the message and logs unexpected errors', async () => {
    const failingDb = { all: () => Promise.reject(new Error('disk on fire')) } as unknown as Db;
    const logError = vi.fn();
    const res = await request(createApp(failingDb, { logError }))
      .get('/contacts')
      .expect(500);
    expect(res.body).toEqual({ error: 'disk on fire' });
    expect(logError).toHaveBeenCalledWith(expect.objectContaining({ message: 'disk on fire' }));
  });

  it('logs to console.error by default', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failingDb = { all: () => Promise.reject(new Error('boom')) } as unknown as Db;
    await request(createApp(failingDb)).get('/contacts').expect(500);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does not advertise Express', async () => {
    let api;
    ({ db, api } = await makeTestApp());
    const res = await api.get('/contacts');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
