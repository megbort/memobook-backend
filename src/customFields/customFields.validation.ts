import { HttpError } from '../lib/httpError.ts';
import { isBlank, isOneOf, type RequestBody } from '../lib/fields.ts';

export const CUSTOM_FIELD_FIELDS = ['section', 'label', 'value', 'sortOrder'] as const;
export const FIELD_SECTIONS = ['personal', 'address'] as const;

export type CustomField = {
  id: string;
  contactId: string;
  section: (typeof FIELD_SECTIONS)[number];
  label: string;
  value: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const validateCustomField = (field: RequestBody) => {
  if (!isOneOf(FIELD_SECTIONS, field.section)) {
    throw new HttpError(400, `section must be one of: ${FIELD_SECTIONS.join(', ')}`);
  }
  if (isBlank(field.label)) throw new HttpError(400, 'label is required');
};
