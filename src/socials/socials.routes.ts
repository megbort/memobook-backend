import express, { type Request } from 'express';
import type { Db } from '../db/connection.ts';
import { findContact } from '../contacts/contacts.service.ts';
import * as socials from './socials.service.ts';
import { validateSocial } from './socials.validation.ts';

type ContactParams = { id: string };
type SocialParams = ContactParams & { socialId: string };

export const socialsRouter = (db: Db) => {
  const router = express.Router({ mergeParams: true });

  router.post('/', async (req: Request<ContactParams>, res) => {
    const social = req.body ?? {};
    validateSocial(social);
    const created = await db.withTransaction(async () => {
      await findContact(db, req.params.id);
      return socials.insertSocial(db, req.params.id, social);
    });
    res.status(201).json(created);
  });

  router.put('/:socialId', async (req: Request<SocialParams>, res) => {
    const updated = await db.withTransaction(() =>
      socials.updateSocial(db, req.params.id, req.params.socialId, req.body ?? {}),
    );
    res.json(updated);
  });

  router.delete('/:socialId', async (req: Request<SocialParams>, res) => {
    await db.withTransaction(() => socials.removeSocial(db, req.params.id, req.params.socialId));
    res.json({ deleted: 1 });
  });

  return router;
};
