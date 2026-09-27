import express, { type Request } from 'express';
import type { Db } from '../db/connection.ts';
import { HttpError } from '../lib/httpError.ts';
import { findContact } from '../contacts/contacts.service.ts';
import { createUploadSignature, isCloudinaryConfigured, type CloudinaryConfig } from './uploads.service.ts';
import { validateUploadKind } from './uploads.validation.ts';

export const uploadsRouter = (db: Db, cloudinary: CloudinaryConfig) => {
  const router = express.Router({ mergeParams: true });

  router.post('/signature', async (req: Request<{ id: string }>, res) => {
    if (!isCloudinaryConfigured(cloudinary)) throw new HttpError(503, 'Uploads are not configured');
    const kind = validateUploadKind(req.body?.kind);
    await findContact(db, req.params.id);
    res.json(createUploadSignature(cloudinary, req.params.id, kind));
  });

  return router;
};
