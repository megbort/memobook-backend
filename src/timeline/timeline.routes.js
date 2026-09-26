const express = require('express');
const { findContact } = require('../contacts/contacts.service');
const { listEvents } = require('./timeline.service');

const timelineRouter = (db) => {
  const router = express.Router({ mergeParams: true });

  router.get('/', async (req, res) => {
    await findContact(db, req.params.id);
    res.json(await listEvents(db, req.params.id));
  });

  return router;
};

module.exports = { timelineRouter };
