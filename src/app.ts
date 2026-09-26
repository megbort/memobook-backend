import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import config from './config.ts';
import type { Db } from './db/connection.ts';
import { HttpError } from './lib/httpError.ts';
import { contactsRouter } from './contacts/contacts.routes.ts';
import { socialsRouter } from './socials/socials.routes.ts';
import { customFieldsRouter } from './customFields/customFields.routes.ts';
import { timelineRouter } from './timeline/timeline.routes.ts';
import { mediaRouter } from './media/media.routes.ts';

export type AppOptions = {
  allowedOrigins?: string[];
  logError?: (err: unknown) => void;
};

export const createApp = (
  db: Db,
  { allowedOrigins = config.allowedOrigins, logError = console.error }: AppOptions = {},
) => {
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

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Express only treats a middleware as an error handler when it declares all four arguments.
  const handleError: ErrorRequestHandler = (err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    logError(err);
    res.status(500).json({ error: err.message });
  };
  app.use(handleError);

  return app;
};
