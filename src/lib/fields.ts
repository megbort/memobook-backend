export type RequestBody = Record<string, unknown>;

export const now = () => new Date().toISOString();

export const isBlank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

export const isOneOf = <T>(allowed: readonly T[], value: unknown): value is T =>
  (allowed as readonly unknown[]).includes(value);

// Stored as NULL so an empty form field and a missing value never register as a change.
export const emptyToNull = <T>(value: T) => (typeof value === 'string' && value.trim() === '' ? null : value);

export const pickPresent = <Field extends string>(body: RequestBody, fields: readonly Field[]) =>
  Object.fromEntries(
    fields.filter((field) => field in body).map((field) => [field, emptyToNull(body[field])]),
  ) as Partial<Record<Field, unknown>>;
