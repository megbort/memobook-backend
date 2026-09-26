import request from 'supertest';
import { createDb, type Db } from '../src/db/connection.ts';
import { migrate } from '../src/db/migrations.ts';
import { createApp, type AppOptions } from '../src/app.ts';
import type { RequestBody } from '../src/lib/fields.ts';

export type Api = ReturnType<typeof request>;
export type { Db };

export const makeTestDb = async () => {
  const db = createDb(':memory:');
  await migrate(db, { log: () => {} });
  return db;
};

export const makeTestApp = async (options: AppOptions = {}) => {
  const db = await makeTestDb();
  const app = createApp(db, { logError: () => {}, ...options });
  return { db, app, api: request(app) };
};

export const contactBody = (overrides: RequestBody = {}) => ({
  firstName: 'Priya',
  lastName: 'Patel',
  relation: 'Friend',
  ...overrides,
});

export const createContact = async (api: Api, overrides: RequestBody = {}) => {
  const res = await api.post('/contacts').send(contactBody(overrides)).expect(201);
  return res.body;
};

export const timelineTypes = async (api: Api, contactId: string) => {
  const res = await api.get(`/contacts/${contactId}/timeline`).expect(200);
  return res.body.map((event: { type: string }) => event.type);
};
