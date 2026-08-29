import { describe, it, expect, vi } from 'vitest';

// The module imports the Firebase client at load time; stub it so these stay
// pure unit tests of the returns logic rather than a Firestore integration.
vi.mock('../../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
  COL: { returns: 'returns' },
}));

const {
  generateRmaId, legalBasisFor, daysSince, withinCoolingOff, isReturnable,
  buildReturn, NEXT_STATUSES, isOpenStatus, RETURN_REASONS, RETURN_OUTCOMES,
  COOLING_OFF_DAYS, SHORT_TERM_REJECT_DAYS,
} = await import('../../lib/returns');

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

describe('generateRmaId', () => {
  it('is prefixed and fixed length', () => {
    expect(generateRmaId()).toMatch(/^RMA-[A-Z2-9]{6}$/);
  });

  it('never emits characters that are misread aloud', () => {
    // I/O/0/1 are the pairs customers confuse when reading a code over the
    // phone or writing it on a parcel.
    for (let i = 0; i < 200; i++) {
      expect(generateRmaId()).not.toMatch(/[IO01]/);
    }
  });

  it('is driven by the injected randomness', () => {
    expect(generateRmaId(() => 0)).toBe('RMA-AAAAAA');
  });
});

describe('legalBasisFor', () => {
  it('treats a change of mind as a distance-selling cancellation', () => {
    expect(legalBasisFor('changed_mind', daysAgo(2))).toBe('cooling_off');
  });

  it('treats a recent fault as the short-term right to reject', () => {
    expect(legalBasisFor('faulty', daysAgo(5))).toBe('faulty_goods');
  });

  it('moves a fault to warranty once the reject window has passed', () => {
    expect(legalBasisFor('faulty', daysAgo(SHORT_TERM_REJECT_DAYS + 1))).toBe('warranty');
  });

  it('keeps a change of mind as cooling-off regardless of age', () => {
    // The window may have expired, but the basis of the claim has not changed —
    // conflating the two is how staff end up applying the wrong rules.
    expect(legalBasisFor('changed_mind', daysAgo(200))).toBe('cooling_off');
  });

  it('classifies every listed reason', () => {
    for (const r of RETURN_REASONS) {
      expect(['cooling_off', 'faulty_goods', 'warranty']).toContain(legalBasisFor(r.value, daysAgo(3)));
    }
  });
});

describe('date windows', () => {
  it('counts whole days since an order', () => {
    expect(daysSince(daysAgo(7))).toBe(7);
  });

  it('treats an unparseable date as infinitely old rather than brand new', () => {
    // Defaulting the other way would silently grant return rights to junk data.
    expect(daysSince('not-a-date')).toBe(Number.POSITIVE_INFINITY);
    expect(withinCoolingOff('not-a-date')).toBe(false);
  });

  it('includes the final day of the cooling-off window', () => {
    expect(withinCoolingOff(daysAgo(COOLING_OFF_DAYS))).toBe(true);
    expect(withinCoolingOff(daysAgo(COOLING_OFF_DAYS + 1))).toBe(false);
  });

  it('keeps an order returnable through the warranty period', () => {
    expect(isReturnable(daysAgo(200))).toBe(true);
    expect(isReturnable(daysAgo(400))).toBe(false);
  });
});

describe('buildReturn', () => {
  const input = {
    orderId: 'ORD-1',
    orderDate: daysAgo(3),
    userId: 'user-1',
    customerName: 'Alex Morgan',
    customerEmail: 'alex@example.com',
    items: [
      { productId: 'p1', model: 'iPhone 17', brand: 'Apple', quantity: 1, price: 699 },
      { productId: 'p2', model: 'Case', brand: 'Apple', quantity: 2, price: 20 },
    ],
    reason: 'faulty' as const,
    outcome: 'replacement' as const,
  };

  it('opens in the requested state with one history entry', () => {
    const r = buildReturn(input);
    expect(r.status).toBe('requested');
    expect(r.history).toHaveLength(1);
    expect(r.history[0]).toMatchObject({ status: 'requested', by: 'customer' });
  });

  it('totals the refund across quantities', () => {
    expect(buildReturn(input).refundAmount).toBe(699 + 20 * 2);
  });

  it('preserves the requested outcome rather than assuming a refund', () => {
    // The whole point of the outcome step: a replacement is a different job.
    expect(buildReturn(input).outcome).toBe('replacement');
  });

  it('stamps the legal basis at creation', () => {
    expect(buildReturn(input).legalBasis).toBe('faulty_goods');
  });

  it('normalises a missing note and photo list', () => {
    const r = buildReturn(input);
    expect(r.note).toBe('');
    expect(r.photoUrls).toEqual([]);
    // Firestore rejects undefined at any depth, so these must be concrete.
    expect(r.replacementOrderId).toBeNull();
    expect(r.staffNote).toBeNull();
  });

  it('gives each request a distinct reference', () => {
    const ids = new Set(Array.from({ length: 50 }, () => buildReturn(input).id));
    expect(ids.size).toBeGreaterThan(45);
  });
});

describe('status machine', () => {
  it('lets a new request be approved or declined', () => {
    expect(NEXT_STATUSES.requested).toEqual(['approved', 'rejected']);
  });

  it('never moves out of a terminal state', () => {
    expect(NEXT_STATUSES.resolved).toEqual([]);
    expect(NEXT_STATUSES.rejected).toEqual([]);
    expect(NEXT_STATUSES.cancelled).toEqual([]);
  });

  it('cannot skip inspection on the way to resolved', () => {
    // A refund issued before the device is in hand is money gone.
    expect(NEXT_STATUSES.approved).not.toContain('resolved');
    expect(NEXT_STATUSES.received).toContain('resolved');
  });

  it('counts only in-flight states as open work', () => {
    expect(isOpenStatus('requested')).toBe(true);
    expect(isOpenStatus('approved')).toBe(true);
    expect(isOpenStatus('received')).toBe(true);
    expect(isOpenStatus('resolved')).toBe(false);
    expect(isOpenStatus('cancelled')).toBe(false);
  });
});

describe('offered outcomes', () => {
  it('offers refund, replacement and repair', () => {
    expect(RETURN_OUTCOMES.map(o => o.value)).toEqual(['refund', 'replacement', 'repair']);
  });
});
