import { describePhoneProblem, countryForIso } from '../../utils/phoneNumber';
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

describe('the country is an input, not a guess', () => {
  // The regression this whole country picker exists for. Typed from India on
  // 28 August: the number was rewritten to a +44 number that exists nowhere,
  // and the only symptom was Firebase's auth/internal-error.
  it('does not send an Indian mobile to +44', () => {
    expect(toE164('9700144003', '91')).toBe('+919700144003');
    expect(toE164('9700144003', '44')).not.toBe('+919700144003');
  });

  it('reads a national-length number as national, even when it starts with the country code', () => {
    // 9198765432 is a real 10-digit Indian subscriber number. Treating its
    // leading "91" as the country code would text a different handset.
    expect(toE164('9198765432', '91')).toBe('+919198765432');
  });

  it('leaves a number that states its own country alone', () => {
    // The picker must never override an explicit +, in either direction.
    expect(toE164('+919700144003', '44')).toBe('+919700144003');
    expect(toE164('+447700900123', '91')).toBe('+447700900123');
  });

  it('strips the trunk 0 against the chosen country', () => {
    expect(toE164('0412 345 678', '61')).toBe('+61412345678');
  });
});

describe('describePhoneProblem', () => {
  it('says nothing about a number that is fine', () => {
    expect(describePhoneProblem('07700 900123', '44')).toBeNull();
    expect(describePhoneProblem('9700144003', '91')).toBeNull();
  });

  it('catches the digit that was dropped', () => {
    // 779934943 — nine digits, typed on the verify screen. The old length-only
    // check accepted it and Firebase refused the send.
    expect(describePhoneProblem('779934943', '44')).toMatch(/10 digits.*Yours has 9/i);
  });

  it('names the country mismatch rather than blaming the number', () => {
    expect(describePhoneProblem('9700144003', '44')).toMatch(/not a United Kingdom mobile/i);
  });

  it('accepts a country it does not model rather than refusing it', () => {
    // +49 is not in the picker; the network is the right place to decide.
    expect(describePhoneProblem('+4915112345678', '44')).toBeNull();
  });
});

describe('countryForIso', () => {
  it('falls back to the UK for anything unrecognised', () => {
    expect(countryForIso('IN').dial).toBe('91');
    expect(countryForIso('zz').iso).toBe('GB');
    expect(countryForIso(undefined).iso).toBe('GB');
  });
});
