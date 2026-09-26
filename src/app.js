const express = require('express');
const cors = require('cors');
const config = require('./config');
const { HttpError } = require('./lib/httpError');
const { contactsRouter } = require('./contacts/contacts.routes');
const { socialsRouter } = require('./socials/socials.routes');
const { customFieldsRouter } = require('./customFields/customFields.routes');
const { timelineRouter } = require('./timeline/timeline.routes');
const { mediaRouter } = require('./media/media.routes');

const createApp = (db, { allowedOrigins = config.allowedOrigins, logError = console.error } = {}) => {
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      // Browsers cache the preflight instead of sending OPTIONS before every PUT/POST.
      maxAge: 7200,
    }),
  );
  app.use(express.json());

  app.use('/contacts/:id/socials', socialsRouter(db));
  app.use('/contacts/:id/fields', customFieldsRouter(db));
  app.use('/contacts/:id/timeline', timelineRouter(db));
  app.use('/contacts/:id/media', mediaRouter(db));
  app.use('/contacts', contactsRouter(db));

  // Express only treats a middleware as an error handler when it declares all four arguments.
  app.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    logError(err);
    res.status(500).json({ error: err.message });
  });

  return app;
};

module.exports = { createApp };
