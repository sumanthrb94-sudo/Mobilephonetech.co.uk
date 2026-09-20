import { describe, it, expect, vi, afterEach } from 'vitest';
import { normalisePostcode, lookupPostcode, hasCoordinates } from '../../utils/postcodeLookup';

/**
 * The lookup talks to postcodes.io, so every test here stubs fetch. That is
 * the point rather than a shortcut: what needs proving is how this behaves
 * when the service answers oddly or not at all, and those are exactly the
 * responses a live call will not give you on demand.
 */
const NW1_6XE = {
  status: 200,
  result: {
    postcode: 'NW1 6XE',
    latitude: 51.5237,
    longitude: -0.1585,
    post_town: null,
    admin_district: 'Westminster',
    admin_county: null,
    region: 'London',
    country: 'England',
    parish: 'Westminster, unparished area',
    admin_ward: 'Regent’s Park',
  },
};

function stubFetch(impl: () => Promise<unknown> | never) {
  vi.stubGlobal('fetch', vi.fn(impl));
}
function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('normalisePostcode', () => {
  it('normalises a compact postcode with no space', () => {
    expect(normalisePostcode('SW1A1AA')).toBe('SW1A 1AA');
  });
  it('trims surrounding whitespace', () => {
    expect(normalisePostcode('  M11AE  ')).toBe('M1 1AE');
  });
  it('collapses internal whitespace', () => {
    expect(normalisePostcode('EC1A  1BB')).toBe('EC1A 1BB');
  });
  it('upper-cases', () => {
    expect(normalisePostcode('sw1a1aa')).toBe('SW1A 1AA');
  });
  it('leaves an already-normalised postcode alone', () => {
    expect(normalisePostcode('EH1 2AB')).toBe('EH1 2AB');
  });
  /** The inward code is always 3 chars, so the split counts from the end. */
  it('splits from the end, whatever the outward length', () => {
    expect(normalisePostcode('M11AE')).toBe('M1 1AE');
    expect(normalisePostcode('EC1A1BB')).toBe('EC1A 1BB');
  });
});

describe('lookupPostcode', () => {
  it('returns the place for a postcode the service knows', async () => {
    stubFetch(() => jsonResponse(NW1_6XE));
    const res = await lookupPostcode('NW1 6XE');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.place.postcode).toBe('NW1 6XE');
    expect(res.place.latitude).toBeCloseTo(51.5237);
  });

  /**
   * ONS leaves the fields that do not apply null — this postcode has no
   * post_town and no admin_county. Falling through to the next populated
   * name is what keeps "null" off a customer's screen.
   */
  it('falls through nulls to the next name that exists', async () => {
    stubFetch(() => jsonResponse(NW1_6XE));
    const res = await lookupPostcode('NW1 6XE');
    if (!res.ok) throw new Error('expected a hit');
    expect(res.place.town).toBe('Westminster');   // post_town was null
    expect(res.place.county).toBe('London');      // admin_county was null
  });

  it('rejects something that is not a postcode without calling out', async () => {
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const res = await lookupPostcode('banana');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('malformed');
    expect(spy).not.toHaveBeenCalled();
  });

  it('asks for a postcode when given nothing', async () => {
    const res = await lookupPostcode('   ');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('malformed');
  });

  it('reports a well-formed postcode the service does not hold', async () => {
    stubFetch(() => jsonResponse({ status: 404, error: 'Postcode not found' }, 404));
    const res = await lookupPostcode('ZZ1 1ZZ');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('not-found');
    expect(res.message).toContain('ZZ1 1ZZ');
  });

  /* The three ways the service can let a checkout down. None may throw, and
     each has to leave the shopper able to type the address instead. */
  it('survives the service being down', async () => {
    stubFetch(() => jsonResponse({}, 500));
    const res = await lookupPostcode('NW1 6XE');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('unavailable');
    expect(res.message).toMatch(/enter your address/i);
  });

  it('survives the network being gone', async () => {
    stubFetch(() => Promise.reject(new Error('Failed to fetch')));
    const res = await lookupPostcode('NW1 6XE');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('unavailable');
  });

  it('survives a response that is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true, status: 200, json: () => Promise.reject(new SyntaxError('bad json')),
    } as unknown as Response)));
    const res = await lookupPostcode('NW1 6XE');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('unavailable');
  });

  it('treats a 200 with no result as not found', async () => {
    stubFetch(() => jsonResponse({ status: 200 }));
    const res = await lookupPostcode('NW1 6XE');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.reason).toBe('not-found');
  });

  /** A hit with no centroid is still a hit; it just gets no map. */
  it('accepts a place with no coordinates, and marks it unmappable', async () => {
    stubFetch(() => jsonResponse({
      status: 200,
      result: { ...NW1_6XE.result, latitude: null, longitude: null },
    }));
    const res = await lookupPostcode('NW1 6XE');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(hasCoordinates(res.place)).toBe(false);
  });

  it('marks a place with coordinates as mappable', async () => {
    stubFetch(() => jsonResponse(NW1_6XE));
    const res = await lookupPostcode('NW1 6XE');
    if (!res.ok) throw new Error('expected a hit');
    expect(hasCoordinates(res.place)).toBe(true);
  });
});
