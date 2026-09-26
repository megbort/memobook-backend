export const CONTACT_FIELDS = [
  'name', 'description', 'avatar', 'firstName', 'lastName', 'otherNames',
  'relation', 'phone', 'email', 'website', 'notes',
  'address', 'city', 'country', 'postalCode',
] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];
export type WritableContactField = Exclude<ContactField, 'name'>;

export type Contact = Record<ContactField, string | null> & {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

// Clients never write name; it is always rebuilt from firstName + lastName.
export const WRITABLE_CONTACT_FIELDS = CONTACT_FIELDS.filter(
  (field): field is WritableContactField => field !== 'name',
);

export const fullName = ({ firstName, lastName }: { firstName?: unknown; lastName?: unknown }) =>
  [firstName, lastName].filter(Boolean).join(' ');
