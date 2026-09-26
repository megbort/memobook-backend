import { describe, expect, it } from 'vitest';
import { describeChanges, diff } from '../../src/timeline/timeline.service.ts';
import { fullName } from '../../src/contacts/contacts.validation.ts';
import { socialName } from '../../src/socials/socials.validation.ts';

describe('diff', () => {
  it('returns only the fields that changed', () => {
    const before = { phone: '1', email: 'a@x.com', city: 'Paris' };
    const after = { phone: '2', email: 'a@x.com', city: 'Paris' };
    expect(diff(before, after, ['phone', 'email', 'city'])).toEqual({
      phone: { from: '1', to: '2' },
    });
  });

  it('treats null and undefined as the same value', () => {
    expect(diff({ phone: null }, {}, ['phone'])).toBeNull();
  });

  it('returns null when nothing changed', () => {
    expect(diff({ phone: '1' }, { phone: '1' }, ['phone'])).toBeNull();
  });

  it('only compares the fields it is given', () => {
    expect(diff({ a: 1, b: 1 }, { a: 1, b: 2 }, ['a'])).toBeNull();
  });
});

describe('describeChanges', () => {
  it('capitalises and lists the changed fields', () => {
    expect(describeChanges({ phone: {}, email: {} })).toBe('Phone, email changed');
  });
});

describe('fullName', () => {
  it('joins first and last name', () => {
    expect(fullName({ firstName: 'Ann', lastName: 'Lee' })).toBe('Ann Lee');
  });

  it('skips a missing last name', () => {
    expect(fullName({ firstName: 'Ann', lastName: null })).toBe('Ann');
  });
});

describe('socialName', () => {
  it('uses the platform for built-in platforms', () => {
    expect(socialName({ platform: 'github', label: 'ignored' })).toBe('github');
  });

  it('uses the label for "other"', () => {
    expect(socialName({ platform: 'other', label: 'Twitch' })).toBe('Twitch');
  });
});
