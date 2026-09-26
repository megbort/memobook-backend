const CONTACT_FIELDS = [
  'name', 'description', 'avatar', 'firstName', 'lastName', 'otherNames',
  'relation', 'phone', 'email', 'website', 'notes',
  'address', 'city', 'country', 'postalCode',
];

// Clients never write name; it is always rebuilt from firstName + lastName.
const WRITABLE_CONTACT_FIELDS = CONTACT_FIELDS.filter((field) => field !== 'name');

const fullName = ({ firstName, lastName }) => [firstName, lastName].filter(Boolean).join(' ');

module.exports = { CONTACT_FIELDS, WRITABLE_CONTACT_FIELDS, fullName };
