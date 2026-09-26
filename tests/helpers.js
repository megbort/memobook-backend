import request from 'supertest';
import { createDb } from '../src/db/connection.js';
import { migrate } from '../src/db/migrations.js';
import { createApp } from '../src/app.js';

export const makeTestDb = async () => {
  const db = createDb(':memory:');
  await migrate(db, { log: () => {} });
  return db;
};

export const makeTestApp = async (options = {}) => {
  const db = await makeTestDb();
  const app = createApp(db, { logError: () => {}, ...options });
  return { db, app, api: request(app) };
};

export const contactBody = (overrides = {}) => ({
  firstName: 'Priya',
  lastName: 'Patel',
  relation: 'Friend',
  ...overrides,
});

export const createContact = async (api, overrides = {}) => {
  const res = await api.post('/contacts').send(contactBody(overrides)).expect(201);
  return res.body;
};

export const timelineTypes = async (api, contactId) => {
  const res = await api.get(`/contacts/${contactId}/timeline`).expect(200);
  return res.body.map((event) => event.type);
};
