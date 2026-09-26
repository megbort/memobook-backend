const express = require('express');
const { findContact } = require('../contacts/contacts.service');
const socials = require('./socials.service');
const { validateSocial } = require('./socials.validation');

const socialsRouter = (db) => {
  const router = express.Router({ mergeParams: true });

  router.post('/', async (req, res) => {
    const social = req.body ?? {};
    validateSocial(social);
    const created = await db.withTransaction(async () => {
      await findContact(db, req.params.id);
      return socials.insertSocial(db, req.params.id, social);
    });
    res.status(201).json(created);
  });

  router.put('/:socialId', async (req, res) => {
    const updated = await db.withTransaction(() =>
      socials.updateSocial(db, req.params.id, req.params.socialId, req.body ?? {}),
    );
    res.json(updated);
  });

  router.delete('/:socialId', async (req, res) => {
    await db.withTransaction(() => socials.removeSocial(db, req.params.id, req.params.socialId));
    res.json({ deleted: 1 });
  });

  return router;
};

module.exports = { socialsRouter };
