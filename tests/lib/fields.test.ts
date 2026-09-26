import { describe, expect, it } from 'vitest';
import { emptyToNull, isBlank, now, pickPresent } from '../../src/lib/fields.ts';
import { HttpError } from '../../src/lib/httpError.ts';

describe('emptyToNull', () => {
  it('turns empty and whitespace-only strings into null', () => {
    expect(emptyToNull('')).toBeNull();
    expect(emptyToNull('   ')).toBeNull();
  });

  it('leaves other values untouched', () => {
    expect(emptyToNull(' Bob ')).toBe(' Bob ');
    expect(emptyToNull(0)).toBe(0);
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull(undefined)).toBeUndefined();
  });
});

describe('isBlank', () => {
  it('is true for empty strings and non-strings', () => {
    expect(isBlank('')).toBe(true);
    expect(isBlank('  ')).toBe(true);
    expect(isBlank(null)).toBe(true);
    expect(isBlank(undefined)).toBe(true);
    expect(isBlank(42)).toBe(true);
  });

  it('is false for strings with content', () => {
    expect(isBlank('a')).toBe(false);
  });
});

describe('pickPresent', () => {
  it('keeps only whitelisted keys that are present, cleaning values', () => {
    const body = { phone: '555', email: '', extra: 'nope' };
    expect(pickPresent(body, ['phone', 'email', 'city'])).toEqual({ phone: '555', email: null });
  });

  it('returns an empty object when nothing matches', () => {
    expect(pickPresent({}, ['phone'])).toEqual({});
  });
});

describe('now', () => {
  it('returns an ISO-8601 timestamp', () => {
    expect(now()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });
});

describe('HttpError', () => {
  it('carries a status and message', () => {
    const err = new HttpError(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.message).toBe('Not found');
  });
});
