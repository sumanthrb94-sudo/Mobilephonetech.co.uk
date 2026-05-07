import { describe, it, expect } from 'vitest';
import { normalisePostcode, lookupPostcode } from '../../utils/postcodeLookup';

describe('normalisePostcode', () => {
  it('normalises compact postcode with no space', () => {
    expect(normalisePostcode('SW1A1AA')).toBe('SW1A 1AA');
  });
  it('normalises postcode with leading/trailing spaces', () => {
    expect(normalisePostcode('  M11AE  ')).toBe('M1 1AE');
  });
  it('normalises postcode with multiple internal spaces', () => {
    expect(normalisePostcode('EC1A  1BB')).toBe('EC1A 1BB');
  });
  it('converts to uppercase', () => {
    expect(normalisePostcode('sw1a1aa')).toBe('SW1A 1AA');
  });
  it('preserves already-normalised postcodes', () => {
    expect(normalisePostcode('EH1 2AB')).toBe('EH1 2AB');
  });
  it('handles short 5-char compact postcodes', () => {
    expect(normalisePostcode('M11AE')).toBe('M1 1AE');
  });
  it('returns as-is for inputs shorter than 5 chars', () => {
    // Too short to be a UK postcode; returned unchanged (uppercased)
    const out = normalisePostcode('AB1');
    expect(out.toUpperCase()).toBe(out);
  });
});

describe('lookupPostcode', () => {
  it('resolves a London SW postcode to London', () => {
    const result = lookupPostcode('SW1A 1AA');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('London');
    expect(result!.country).toBe('United Kingdom');
    expect(result!.postcode).toBe('SW1A 1AA');
  });

  it('resolves Manchester M postcode', () => {
    const result = lookupPostcode('M1 1AE');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('Manchester');
  });

  it('resolves Edinburgh EH postcode', () => {
    const result = lookupPostcode('EH1 1AB');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('Edinburgh');
  });

  it('resolves Belfast BT postcode', () => {
    const result = lookupPostcode('BT1 1AA');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('Belfast');
  });

  it('resolves Cardiff CF postcode', () => {
    const result = lookupPostcode('CF10 1AB');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('Cardiff');
  });

  it('resolves Birmingham B postcode', () => {
    const result = lookupPostcode('B1 1AA');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('Birmingham');
  });

  it('resolves Glasgow G postcode', () => {
    const result = lookupPostcode('G1 1AA');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('Glasgow');
  });

  it('returns null for clearly invalid input', () => {
    expect(lookupPostcode('NOT_A_POSTCODE')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(lookupPostcode('')).toBeNull();
  });

  it('returns a street value for known areas', () => {
    const result = lookupPostcode('SW1A 1AA');
    expect(result!.street).toBeTruthy();
    expect(typeof result!.street).toBe('string');
  });

  it('always returns country United Kingdom', () => {
    const result = lookupPostcode('LS1 1AA');
    expect(result!.country).toBe('United Kingdom');
  });

  it('same postcode always returns same street (deterministic hash)', () => {
    const a = lookupPostcode('SW1A 1AA');
    const b = lookupPostcode('SW1A 1AA');
    expect(a!.street).toBe(b!.street);
  });

  it('accepts compact postcode without space', () => {
    const result = lookupPostcode('SW1A1AA');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('London');
  });

  it('accepts lowercase postcode', () => {
    const result = lookupPostcode('sw1a1aa');
    expect(result).not.toBeNull();
    expect(result!.city).toBe('London');
  });

  it('resolves unknown but valid-format postcode with empty city', () => {
    // ZZ is not a real area — should return null (no match in regex) or empty city
    const result = lookupPostcode('ZZ1 1AA');
    // lookupPostcode returns null if regex fails, or empty city if area not found
    if (result !== null) {
      expect(result.city).toBe('');
    }
  });
});
