import { HttpError } from '../lib/httpError.ts';
import { isBlank, isOneOf, type RequestBody } from '../lib/fields.ts';
import { validateSortOrder } from '../lib/sortOrder.ts';

export const SOCIAL_FIELDS = ['platform', 'label', 'handle', 'url', 'sortOrder'] as const;
export const SOCIAL_PLATFORMS = ['instagram', 'x', 'linkedin', 'facebook', 'tiktok', 'github', 'other'] as const;

export type Social = {
  id: string;
  contactId: string;
  platform: (typeof SOCIAL_PLATFORMS)[number];
  label: string | null;
  handle: string | null;
  url: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const validateSocial = (social: RequestBody) => {
  if (!isOneOf(SOCIAL_PLATFORMS, social.platform)) {
    throw new HttpError(400, `platform must be one of: ${SOCIAL_PLATFORMS.join(', ')}`);
  }
  if (social.platform === 'other' && isBlank(social.label)) {
    throw new HttpError(400, 'label is required when platform is "other"');
  }
  if (isBlank(social.handle) && isBlank(social.url)) {
    throw new HttpError(400, 'handle or url is required');
  }
  validateSortOrder(social.sortOrder);
};

export const socialName = (social: { platform?: unknown; label?: unknown }) =>
  social.platform === 'other' ? social.label : social.platform;
