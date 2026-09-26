import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createContact, makeTestApp, timelineTypes } from './helpers.js';

let db;
let api;
let contact;

beforeEach(async () => {
  ({ db, api } = await makeTestApp());
  contact = await createContact(api);
});

afterEach(async () => {
  await db.close();
});

const addField = (body) => api.post(`/contacts/${contact.id}/fields`).send(body);

describe('POST /contacts/:id/fields', () => {
  it('adds a custom field with 201 and logs it', async () => {
    const res = await addField({ section: 'personal', label: 'Birthday', value: 'June 2' }).expect(201);
    expect(res.body).toMatchObject({
      contactId: contact.id,
      section: 'personal',
      label: 'Birthday',
      value: 'June 2',
      sortOrder: 0,
    });
    const [latest] = (await api.get(`/contacts/${contact.id}/timeline`)).body;
    expect(latest).toMatchObject({ type: 'field_added', summary: 'Added Birthday', entityType: 'custom_field' });
  });

  it('allows an empty value', async () => {
    const res = await addField({ section: 'address', label: 'Buzzer' }).expect(201);
    expect(res.body.value).toBeNull();
  });

  it('auto-increments sortOrder across sections', async () => {
    await addField({ section: 'personal', label: 'A' }).expect(201);
    const res = await addField({ section: 'address', label: 'B' }).expect(201);
    expect(res.body.sortOrder).toBe(1);
  });

  it('keeps an explicit sortOrder', async () => {
    const res = await addField({ section: 'personal', label: 'A', sortOrder: 5 }).expect(201);
    expect(res.body.sortOrder).toBe(5);
  });

  it('is returned on the contact, grouped by section', async () => {
    await addField({ section: 'personal', label: 'P' });
    await addField({ section: 'address', label: 'A' });
    const res = await api.get(`/contacts/${contact.id}`).expect(200);
    expect(res.body.customFields.map((f) => f.label)).toEqual(['A', 'P']);
  });

  it.each([
    [{ section: 'work', label: 'Team' }, 'section must be one of: personal, address'],
    [{ label: 'No section' }, 'section must be one of: personal, address'],
    [{ section: 'personal' }, 'label is required'],
    [{ section: 'personal', label: '  ' }, 'label is required'],
  ])('400s for %o', async (body, message) => {
    const res = await addField(body).expect(400);
    expect(res.body.error).toBe(message);
  });

  it('400s with no body', async () => {
    await api.post(`/contacts/${contact.id}/fields`).expect(400);
  });

  it('404s for an unknown contact', async () => {
    await api.post('/contacts/nope/fields').send({ section: 'personal', label: 'A' }).expect(404);
  });
});

describe('PUT /contacts/:id/fields/:fieldId', () => {
  it('updates only the fields sent and logs a diff', async () => {
    const field = (await addField({ section: 'personal', label: 'Tea', value: 'Chai' })).body;
    const res = await api
      .put(`/contacts/${contact.id}/fields/${field.id}`)
      .send({ value: 'Earl Grey' })
      .expect(200);
    expect(res.body).toMatchObject({ label: 'Tea', value: 'Earl Grey', section: 'personal' });

    const [latest] = (await api.get(`/contacts/${contact.id}/timeline`)).body;
    expect(latest).toMatchObject({
      type: 'field_updated',
      summary: 'Updated Tea',
      changes: { value: { from: 'Chai', to: 'Earl Grey' } },
    });
  });

  it('clears the value when sent as an empty string', async () => {
    const field = (await addField({ section: 'personal', label: 'Tea', value: 'Chai' })).body;
    const res = await api.put(`/contacts/${contact.id}/fields/${field.id}`).send({ value: '' }).expect(200);
    expect(res.body.value).toBeNull();
  });

  it('logs nothing when values are unchanged', async () => {
    const field = (await addField({ section: 'personal', label: 'Tea', value: 'Chai' })).body;
    await api.put(`/contacts/${contact.id}/fields/${field.id}`).send({ value: 'Chai' }).expect(200);
    expect(await timelineTypes(api, contact.id)).toEqual(['field_added', 'contact_created']);
  });

  it('validates the merged result', async () => {
    const field = (await addField({ section: 'personal', label: 'Tea' })).body;
    await api.put(`/contacts/${contact.id}/fields/${field.id}`).send({ label: '' }).expect(400);
    await api.put(`/contacts/${contact.id}/fields/${field.id}`).send({ section: 'work' }).expect(400);
  });

  it('accepts a request with no body', async () => {
    const field = (await addField({ section: 'personal', label: 'Tea' })).body;
    await api.put(`/contacts/${contact.id}/fields/${field.id}`).expect(200);
  });

  it('404s for an unknown field', async () => {
    const res = await api.put(`/contacts/${contact.id}/fields/nope`).send({ value: 'a' }).expect(404);
    expect(res.body).toEqual({ error: 'Custom field not found' });
  });

  it("404s for another contact's field", async () => {
    const field = (await addField({ section: 'personal', label: 'Tea' })).body;
    const other = await createContact(api, { firstName: 'Other' });
    await api.put(`/contacts/${other.id}/fields/${field.id}`).send({ value: 'a' }).expect(404);
  });
});

describe('DELETE /contacts/:id/fields/:fieldId', () => {
  it('removes the field and logs it', async () => {
    const field = (await addField({ section: 'address', label: 'Floor', value: '3' })).body;
    const res = await api.delete(`/contacts/${contact.id}/fields/${field.id}`).expect(200);
    expect(res.body).toEqual({ deleted: 1 });
    expect((await api.get(`/contacts/${contact.id}`)).body.customFields).toEqual([]);
    const [latest] = (await api.get(`/contacts/${contact.id}/timeline`)).body;
    expect(latest).toMatchObject({ type: 'field_removed', summary: 'Removed Floor' });
  });

  it('404s for an unknown field', async () => {
    await api.delete(`/contacts/${contact.id}/fields/nope`).expect(404);
  });
});
