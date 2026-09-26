import express, { type Request } from 'express';
import type { Db } from '../db/connection.ts';
import { findContact } from '../contacts/contacts.service.ts';

// Placeholder until media uploads are built; always empty for now.
export const mediaRouter = (db: Db) => {
  const router = express.Router({ mergeParams: true });

  router.get('/', async (req: Request<{ id: string }>, res) => {
    await findContact(db, req.params.id);
    res.json(
      await db.all('SELECT * FROM media WHERE contactId = ? ORDER BY createdAt DESC', [
        req.params.id,
      ]),
    );
  });

  return router;
};
