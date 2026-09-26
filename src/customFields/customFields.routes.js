const express = require('express');
const { findContact } = require('../contacts/contacts.service');
const customFields = require('./customFields.service');
const { validateCustomField } = require('./customFields.validation');

const customFieldsRouter = (db) => {
  const router = express.Router({ mergeParams: true });

  router.post('/', async (req, res) => {
    const field = req.body ?? {};
    validateCustomField(field);
    const created = await db.withTransaction(async () => {
      await findContact(db, req.params.id);
      return customFields.insertCustomField(db, req.params.id, field);
    });
    res.status(201).json(created);
  });

  router.put('/:fieldId', async (req, res) => {
    const updated = await db.withTransaction(() =>
      customFields.updateCustomField(db, req.params.id, req.params.fieldId, req.body ?? {}),
    );
    res.json(updated);
  });

  router.delete('/:fieldId', async (req, res) => {
    await db.withTransaction(() =>
      customFields.removeCustomField(db, req.params.id, req.params.fieldId),
    );
    res.json({ deleted: 1 });
  });

  return router;
};

module.exports = { customFieldsRouter };
