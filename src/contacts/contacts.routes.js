const express = require('express');
const contacts = require('./contacts.service');

const contactsRouter = (db) => {
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

module.exports = { contactsRouter };
