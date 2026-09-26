import express from 'express';
import type { Db } from '../db/connection.ts';
import * as contacts from './contacts.service.ts';

export const contactsRouter = (db: Db) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    res.json(await contacts.listContacts(db));
  });

  router.get('/:id', async (req, res) => {
    res.json(await contacts.getContactDetail(db, req.params.id));
  });

  router.post('/', async (req, res) => {
    const id = await contacts.createContact(db, req.body ?? {});
    res.status(201).json(await contacts.getContactDetail(db, id));
  });

  router.put('/:id', async (req, res) => {
    await contacts.updateContact(db, req.params.id, req.body ?? {});
    res.json(await contacts.getContactDetail(db, req.params.id));
  });

  router.delete('/:id', async (req, res) => {
    res.json({ deleted: await contacts.removeContact(db, req.params.id) });
  });

  return router;
};
