import { describe, it, expect } from 'vitest';
import handler from '../../../api/_routes/delivery';

function req(method: string, query: Record<string, string> = {}) {
  return { method, query };
}
function res() {
  let _code = 200;
  let _body: unknown = null;
  return {
    get statusCode() { return _code; },
    get body() { return _body; },
    status(code: number) { _code = code; return this; },
    json(data: unknown) { _body = data; return this; },
  };
}

describe('GET /api/delivery', () => {
  it('returns 405 for non-GET methods', () => {
    const r = res();
    handler(req('POST'), r);
    expect(r.statusCode).toBe(405);
  });

  it('returns 400 when postcode is missing', () => {
    const r = res();
    handler(req('GET', {}), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).error).toContain('postcode');
  });

  it('returns 400 for invalid postcode format', () => {
    const r = res();
    handler(req('GET', { postcode: 'NOT_A_POSTCODE_AT_ALL' }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 200 with delivery options for London SW postcode', () => {
    const r = res();
    handler(req('GET', { postcode: 'SW1A 1AA' }), r);
    expect(r.statusCode).toBe(200);
    const body = r.body as any;
    expect(body.options).toBeDefined();
    expect(body.options.length).toBeGreaterThan(0);
  });

  it('returns 200 for Belfast BT postcode', () => {
    const r = res();
    handler(req('GET', { postcode: 'BT1 1AA' }), r);
    expect(r.statusCode).toBe(200);
  });

  it('offers one service, free next-day, matching the checkout', () => {
    const r = res();
    handler(req('GET', { postcode: 'M1 1AE' }), r);
    const body = r.body as any;
    expect(body.options.map((o: any) => [o.id, o.price])).toEqual([['next_day', 0]]);
  });

  it('returns a region field in response', () => {
    const r = res();
    handler(req('GET', { postcode: 'SW1A 1AA' }), r);
    const body = r.body as any;
    expect(body.region).toBeTruthy();
  });

  it('all delivery options have valid ISO date strings', () => {
    const r = res();
    handler(req('GET', { postcode: 'SW1A 1AA' }), r);
    const body = r.body as any;
    for (const opt of body.options) {
      expect(opt.estimatedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('handles compact postcode without space', () => {
    const r = res();
    handler(req('GET', { postcode: 'SW1A1AA' }), r);
    expect(r.statusCode).toBe(200);
  });

  it('handles lowercase postcode', () => {
    const r = res();
    handler(req('GET', { postcode: 'sw1a 1aa' }), r);
    expect(r.statusCode).toBe(200);
  });

  it('quotes the islands later than London', () => {
    const date = (postcode: string) => {
      const r = res();
      handler(req('GET', { postcode }), r);
      return (r.body as any).options[0].estimatedDate;
    };
    expect(date('ZE1 0NU') > date('SW1A 1AA')).toBe(true);
  });
});
