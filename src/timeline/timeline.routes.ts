import express, { type Request } from 'express';
import type { Db } from '../db/connection.ts';
import { findContact } from '../contacts/contacts.service.ts';
import { listEvents } from './timeline.service.ts';

export const timelineRouter = (db: Db) => {
  const router = express.Router({ mergeParams: true });

  router.get('/', async (req: Request<{ id: string }>, res) => {
    await findContact(db, req.params.id);
    res.json(await listEvents(db, req.params.id));
  });

  return router;
};
