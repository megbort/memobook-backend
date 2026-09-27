import crypto from 'node:crypto';
import type { UploadKind } from './uploads.validation.ts';

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type UploadParams = Record<string, string | number | boolean>;

export const CONTACTS_FOLDER = 'memobook/contacts';
const AVATAR_FORMATS = 'jpg,jpeg,png,webp,gif,heic,avif';

export const isCloudinaryConfigured = ({ cloudName, apiKey, apiSecret }: CloudinaryConfig) =>
  Boolean(cloudName && apiKey && apiSecret);

export const signParams = (params: UploadParams, apiSecret: string) => {
  const serialized = Object.keys(params)
    .sort()
    .map((name) => `${name}=${params[name]}`)
    .join('&');
  return crypto.createHash('sha1').update(serialized + apiSecret).digest('hex');
};

// `folder` places the asset and prefixes its public_id in both fixed and dynamic folder modes.
const buildUploadParams = (
  contactId: string,
  kind: UploadKind,
): { resourceType: 'image' | 'auto'; params: UploadParams } => {
  const contactFolder = `${CONTACTS_FOLDER}/${contactId}`;
  if (kind === 'avatar') {
    return {
      resourceType: 'image',
      params: {
        folder: contactFolder,
        public_id: 'avatar',
        overwrite: true,
        invalidate: true,
        allowed_formats: AVATAR_FORMATS,
      },
    };
  }
  return {
    resourceType: 'auto',
    params: { folder: `${contactFolder}/media`, public_id: crypto.randomUUID() },
  };
};

export const createUploadSignature = (
  cloudinary: CloudinaryConfig,
  contactId: string,
  kind: UploadKind,
  timestamp = Math.round(Date.now() / 1000),
) => {
  const { resourceType, params } = buildUploadParams(contactId, kind);
  const signedParams = { ...params, timestamp };
  return {
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudinary.cloudName}/${resourceType}/upload`,
    apiKey: cloudinary.apiKey,
    signature: signParams(signedParams, cloudinary.apiSecret),
    params: signedParams,
  };
};
