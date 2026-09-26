const now = () => new Date().toISOString();

const isBlank = (value) => typeof value !== 'string' || value.trim() === '';

// Stored as NULL so an empty form field and a missing value never register as a change.
const emptyToNull = (value) => (typeof value === 'string' && value.trim() === '' ? null : value);

const pickPresent = (body, fields) =>
  Object.fromEntries(
    fields.filter((field) => field in body).map((field) => [field, emptyToNull(body[field])]),
  );

module.exports = { now, isBlank, emptyToNull, pickPresent };
