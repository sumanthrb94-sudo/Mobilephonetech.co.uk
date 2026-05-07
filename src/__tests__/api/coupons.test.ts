import { describe, it, expect } from 'vitest';
import handler from '../../../api/coupons/validate';

function req(method: string, body: unknown = {}) {
  return { method, body };
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

describe('POST /api/coupons/validate', () => {
  it('returns 405 for GET requests', () => {
    const r = res();
    handler(req('GET'), r);
    expect(r.statusCode).toBe(405);
  });

  it('returns 400 when code is missing', () => {
    const r = res();
    handler(req('POST', { cartTotal: 100 }), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).error).toContain('code');
  });

  it('returns 400 when cartTotal is missing', () => {
    const r = res();
    handler(req('POST', { code: 'SAVE10' }), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).error).toContain('cartTotal');
  });

  it('returns 400 when cartTotal is negative', () => {
    const r = res();
    handler(req('POST', { code: 'SAVE10', cartTotal: -1 }), r);
    expect(r.statusCode).toBe(400);
  });

  it('returns 404 for unknown coupon code', () => {
    const r = res();
    handler(req('POST', { code: 'BADCODE99', cartTotal: 100 }), r);
    expect(r.statusCode).toBe(404);
    expect((r.body as any).valid).toBe(false);
  });

  it('validates SAVE10 as 10% discount', () => {
    const r = res();
    handler(req('POST', { code: 'SAVE10', cartTotal: 200 }), r);
    expect(r.statusCode).toBe(200);
    const body = r.body as any;
    expect(body.valid).toBe(true);
    expect(body.discountType).toBe('percentage');
    expect(body.value).toBe(10);
    expect(body.discountAmount).toBe(20); // 10% of 200
    expect(body.newTotal).toBe(180);
  });

  it('validates WELCOME20 as £20 fixed discount', () => {
    const r = res();
    handler(req('POST', { code: 'WELCOME20', cartTotal: 100 }), r);
    expect(r.statusCode).toBe(200);
    const body = r.body as any;
    expect(body.discountType).toBe('fixed');
    expect(body.discountAmount).toBe(20);
    expect(body.newTotal).toBe(80);
  });

  it('WELCOME20 rejected when cart is below minimum order', () => {
    const r = res();
    handler(req('POST', { code: 'WELCOME20', cartTotal: 30 }), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).valid).toBe(false);
    expect((r.body as any).minOrderValue).toBe(50);
  });

  it('accepts code case-insensitively', () => {
    const r = res();
    handler(req('POST', { code: 'save10', cartTotal: 100 }), r);
    expect(r.statusCode).toBe(200);
    expect((r.body as any).valid).toBe(true);
  });

  it('FREESHIP gives exactly £9.99 off', () => {
    const r = res();
    handler(req('POST', { code: 'FREESHIP', cartTotal: 150 }), r);
    expect(r.statusCode).toBe(200);
    const body = r.body as any;
    expect(body.discountAmount).toBe(9.99);
    expect(body.newTotal).toBeCloseTo(140.01);
  });

  it('discount never makes total negative (capped at cartTotal)', () => {
    // FREESHIP is £9.99 off; with a £5 cart it should cap
    const r = res();
    handler(req('POST', { code: 'FREESHIP', cartTotal: 5 }), r);
    expect(r.statusCode).toBe(200);
    expect((r.body as any).newTotal).toBeGreaterThanOrEqual(0);
  });

  it('response includes coupon description', () => {
    const r = res();
    handler(req('POST', { code: 'SAVE10', cartTotal: 100 }), r);
    expect((r.body as any).description).toBeTruthy();
  });

  it('REFURB15 gives 15% off orders over £200', () => {
    const r = res();
    handler(req('POST', { code: 'REFURB15', cartTotal: 300 }), r);
    expect(r.statusCode).toBe(200);
    const body = r.body as any;
    expect(body.discountAmount).toBe(45); // 15% of 300
  });

  it('REFURB15 rejected on cart under £200', () => {
    const r = res();
    handler(req('POST', { code: 'REFURB15', cartTotal: 199 }), r);
    expect(r.statusCode).toBe(400);
    expect((r.body as any).valid).toBe(false);
  });
});
