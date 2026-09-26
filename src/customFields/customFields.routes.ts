import express, { type Request } from 'express';
import type { Db } from '../db/connection.ts';
import { findContact } from '../contacts/contacts.service.ts';
import * as customFields from './customFields.service.ts';
import { validateCustomField } from './customFields.validation.ts';

type ContactParams = { id: string };
type FieldParams = ContactParams & { fieldId: string };

export const customFieldsRouter = (db: Db) => {
  const router = express.Router({ mergeParams: true });

  router.post('/', async (req: Request<ContactParams>, res) => {
    const field = req.body ?? {};
    validateCustomField(field);
    const created = await db.withTransaction(async () => {
      await findContact(db, req.params.id);
      return customFields.insertCustomField(db, req.params.id, field);
    });
    res.status(201).json(created);
  });

  router.put('/:fieldId', async (req: Request<FieldParams>, res) => {
    const updated = await db.withTransaction(() =>
      customFields.updateCustomField(db, req.params.id, req.params.fieldId, req.body ?? {}),
    );
    res.json(updated);
  });

  router.delete('/:fieldId', async (req: Request<FieldParams>, res) => {
    await db.withTransaction(() =>
      customFields.removeCustomField(db, req.params.id, req.params.fieldId),
    );
    res.json({ deleted: 1 });
  });

  return router;
};
