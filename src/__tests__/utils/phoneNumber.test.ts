import { describe, it, expect } from 'vitest';
import {
  normalisePhone, toE164, formatPhoneForDisplay, maskPhone, isValidPhone,
} from '../../utils/phoneNumber';

/**
 * These matter more than the size of the module suggests. The output is used
 * as an *identity* — Firebase keys a phone account on the exact string it is
 * handed — so two spellings of one number normalising differently would give
 * one person two accounts, which is the whole problem docs/AUTH.md exists to
 * prevent.
 */

describe('normalisePhone', () => {
  it.each([
    ['07700 900123', '447700900123'],
    ['+44 7700 900123', '447700900123'],
    ['(07700) 900-123', '447700900123'],
    ['447700900123', '447700900123'],
    ['+447700900123', '447700900123'],
    ['7700900123', '447700900123'],
    ['  07700900123  ', '447700900123'],
  ])('normalises %s to %s', (input, expected) => {
    expect(normalisePhone(input)).toBe(expected);
  });

  it('collapses every spelling of one number to a single identity', () => {
    const spellings = ['07700 900123', '+44 7700 900123', '(07700) 900-123', '447700900123', '+447700900123'];
    expect(new Set(spellings.map((s) => normalisePhone(s))).size).toBe(1);
  });

  it.each([[''], [null], [undefined], ['abc'], ['123'], ['1234567890123456789'], ['+'], ['   ']])(
    'rejects %s',
    (input) => {
      expect(normalisePhone(input)).toBeNull();
    },
  );

  it('leaves a number that already carries its country code alone', () => {
    // A dialling code that is not the UK default must survive untouched.
    expect(normalisePhone('+33612345678')).toBe('33612345678');
  });
});

describe('toE164', () => {
  it('adds the leading plus Firebase requires', () => {
    // signInWithPhoneNumber rejects anything that is not E.164.
    expect(toE164('07700 900123')).toBe('+447700900123');
  });

  it('returns null rather than a bare plus for junk', () => {
    expect(toE164('nonsense')).toBeNull();
  });
});

describe('formatPhoneForDisplay', () => {
  it('shows a UK mobile the way its owner would read it', () => {
    expect(formatPhoneForDisplay('+447700900123')).toBe('07700 900123');
  });

  it('falls back to E.164 for a number outside the UK mobile shape', () => {
    expect(formatPhoneForDisplay('+33612345678')).toBe('+33612345678');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(formatPhoneForDisplay('not a number')).toBe('not a number');
  });
});

describe('maskPhone', () => {
  it('keeps only enough to recognise', () => {
    expect(maskPhone('+447700900123')).toBe('•••• ••• 123');
  });

  it('reveals nothing for an unparseable value', () => {
    expect(maskPhone('junk')).toBe('••••');
  });
});

describe('isValidPhone', () => {
  it('accepts a real mobile and refuses junk', () => {
    expect(isValidPhone('07700 900123')).toBe(true);
    expect(isValidPhone('12')).toBe(false);
  });
});
