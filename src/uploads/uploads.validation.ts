import { HttpError } from '../lib/httpError.ts';
import { isOneOf } from '../lib/fields.ts';

export const UPLOAD_KINDS = ['avatar', 'media'] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export const validateUploadKind = (kind: unknown): UploadKind => {
  if (!isOneOf(UPLOAD_KINDS, kind)) {
    throw new HttpError(400, `kind must be one of: ${UPLOAD_KINDS.join(', ')}`);
  }
  return kind;
};
