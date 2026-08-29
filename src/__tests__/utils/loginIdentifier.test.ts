import { describe, it, expect } from 'vitest';
import { resolveLoginIdentifier, isValidLoginIdentifier, STAFF_EMAIL_DOMAIN } from '../../utils/loginIdentifier';

describe('resolveLoginIdentifier', () => {
  it('expands a bare staff username to the staff domain', () => {
    expect(resolveLoginIdentifier('admin')).toBe(`admin@${STAFF_EMAIL_DOMAIN}`);
  });

  it('passes a full address through unchanged', () => {
    expect(resolveLoginIdentifier('someone@gmail.com')).toBe('someone@gmail.com');
  });

  it('lowercases and trims, so " Admin " and "admin" are the same account', () => {
    expect(resolveLoginIdentifier('  Admin  ')).toBe(`admin@${STAFF_EMAIL_DOMAIN}`);
    expect(resolveLoginIdentifier('ADMIN@LEHART.CO.UK')).toBe(`admin@${STAFF_EMAIL_DOMAIN}`);
  });

  it('returns an empty string for empty input rather than an "@domain" address', () => {
    expect(resolveLoginIdentifier('')).toBe('');
    expect(resolveLoginIdentifier('   ')).toBe('');
  });
});

describe('isValidLoginIdentifier', () => {
  it.each(['admin', 'store.admin', 'admin-2', 'a_b', 'someone@gmail.com', 'a.b@c.co.uk'])(
    'accepts %s', (value) => expect(isValidLoginIdentifier(value)).toBe(true),
  );

  it.each(['', '   ', 'has space', 'admin@', '@lehart.co.uk', 'admin@nodot', 'two@@at.com'])(
    'rejects %s', (value) => expect(isValidLoginIdentifier(value)).toBe(false),
  );
});
