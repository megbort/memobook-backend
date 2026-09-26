const express = require('express');
const { findContact } = require('../contacts/contacts.service');

// Placeholder until media uploads are built; always empty for now.
const mediaRouter = (db) => {
  const router = express.Router({ mergeParams: true });

  router.get('/', async (req, res) => {
    await findContact(db, req.params.id);
    res.json(
      await db.all('SELECT * FROM media WHERE contactId = ? ORDER BY createdAt DESC', [
        req.params.id,
      ]),
    );
  });

  return router;
};

module.exports = { mediaRouter };
