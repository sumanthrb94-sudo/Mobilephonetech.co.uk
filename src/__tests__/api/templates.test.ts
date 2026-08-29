import { describe, it, expect } from 'vitest';
import {
  welcomeEmail,
  orderConfirmationEmail,
  orderDispatchedEmail,
  outForDeliveryEmail,
  type OrderLike,
} from '../../../api/_templates.js';

/**
 * These guard the things that are expensive to get wrong in email: money that
 * does not add up, an unescaped name, and a message that renders as HTML only.
 * Nothing here asserts on styling — that would break on every design tweak
 * without catching a single real defect.
 */

const ORDER: OrderLike = {
  id: 'ORD-123',
  contactEmail: 'jordan@example.com',
  shippingAddress: {
    fullName: "Jordan O'Neill",
    addressLine1: '1 Test Street',
    city: 'London',
    postalCode: 'SE1 3TX',
    country: 'United Kingdom',
  },
  items: [
    { brand: 'Apple', model: 'iPhone 15 Pro', quantity: 2, price: 749, selectedStorage: '256GB' },
    { brand: 'Samsung', model: 'Galaxy S24', quantity: 1, price: 419.5, imageUrl: null },
  ],
  subtotal: 1917.5,
  discount: 100,
  shippingCost: 9.99,
  shippingMethod: 'Express Delivery',
  tax: 365.5,
  total: 2192.99,
  couponCode: 'SAVE10',
};

const ALL = [
  ['welcome', welcomeEmail({ name: 'Jordan' })],
  ['confirmation', orderConfirmationEmail(ORDER)],
  ['dispatched', orderDispatchedEmail(ORDER, { courier: 'Royal Mail', trackingNumber: 'AB1GB' })],
  ['out for delivery', outForDeliveryEmail(ORDER, { courier: 'DPD' })],
] as const;

describe('every template', () => {
  it.each(ALL)('%s ships a subject, HTML and a plain-text part', (_name, built) => {
    expect(built.subject.length).toBeGreaterThan(8);
    expect(built.html).toContain('<!doctype html>');
    // A text part is not optional: HTML-only mail scores worse with spam
    // filters and is unreadable in text-only clients.
    expect(built.text.trim().length).toBeGreaterThan(40);
    expect(built.text).not.toContain('<');
  });

  it.each(ALL)('%s uses tables rather than flexbox', (_name, built) => {
    expect(built.html).toContain('<table');
    expect(built.html).not.toContain('display:flex');
    expect(built.html).not.toContain('display:grid');
  });

  it.each(ALL)('%s carries a preheader so the inbox preview is not the wordmark', (_name, built) => {
    expect(built.html).toMatch(/display:none;max-height:0/);
  });
});

describe('order confirmation', () => {
  const built = orderConfirmationEmail(ORDER);

  it('prices each line as unit price times quantity', () => {
    // 749 x 2, not 749.
    expect(built.html).toContain('£1498.00');
    expect(built.text).toContain('£1498.00');
    expect(built.html).toContain('£419.50');
  });

  it('shows the server-computed totals rather than recomputing them', () => {
    expect(built.html).toContain('£1917.50'); // subtotal
    expect(built.html).toContain('−£100.00'); // discount
    expect(built.html).toContain('£365.50'); // VAT
    expect(built.html).toContain('£2192.99'); // total
  });

  it('names the coupon that produced the discount', () => {
    expect(built.html).toContain('SAVE10');
  });

  it('escapes an apostrophe in the customer name', () => {
    expect(built.html).toContain('Jordan O&#39;Neill');
    expect(built.html).not.toContain("Jordan O'Neill");
  });

  it('renders a placeholder rather than a broken image when there is no photo', () => {
    // The Samsung line has imageUrl: null and must still occupy its 52px cell.
    expect(built.html).toContain('width:52px;height:52px');
  });

  it('puts the order id in the subject so a reply threads usefully', () => {
    expect(built.subject).toContain('ORD-123');
  });
});

describe('dispatch and delivery', () => {
  it('shows the tracking number and names the courier', () => {
    const built = orderDispatchedEmail(ORDER, { courier: 'Royal Mail', trackingNumber: 'AB123456789GB' });
    expect(built.html).toContain('AB123456789GB');
    expect(built.html).toContain('Royal Mail');
    expect(built.text).toContain('AB123456789GB');
  });

  it('leads with the arrival date, not the order number', () => {
    const built = orderDispatchedEmail(ORDER, { estimatedDelivery: 'Thursday 4 Sep' });
    // The date is what the email is opened for; the id only matters to support.
    expect(built.subject.indexOf('Arriving')).toBeLessThan(built.subject.indexOf('ORD-123'));
    expect(built.html).toContain('Arriving Thursday 4 Sep');
  });

  it('falls back to the order number when the courier gave us nothing', () => {
    const built = orderDispatchedEmail(ORDER, {});
    expect(built.html).toContain('ORD-123');
    expect(built.html).not.toContain('tracking number');
  });

  it('offers a tracking button only when a URL was supplied', () => {
    const withUrl = orderDispatchedEmail(ORDER, { trackingUrl: 'https://example.com/t' });
    expect(withUrl.html).toContain('Track your parcel');
    expect(orderDispatchedEmail(ORDER, {}).html).toContain('View your order');
  });

  it('states the day plainly, and a window only when the courier gave one', () => {
    const bare = outForDeliveryEmail(ORDER, {});
    expect(bare.html).toContain('Arriving today');
    // No invented window. Quoting one the courier never gave is a promise the
    // shop cannot keep and did not make.
    expect(bare.html).not.toMatch(/Expected:/);

    const windowed = outForDeliveryEmail(ORDER, { estimatedDelivery: 'Today, 2-4pm' });
    expect(windowed.html).toContain('Today, 2-4pm');
    expect(windowed.html).toContain('Expected:');
  });

  it('ends every order email with the utility links', () => {
    for (const built of [
      orderConfirmationEmail(ORDER),
      orderDispatchedEmail(ORDER, {}),
      outForDeliveryEmail(ORDER, {}),
    ]) {
      // Where is it, how do I return it, who do I ask — the three reasons
      // these get opened, and the three things support gets asked.
      expect(built.html).toContain('Your orders');
      expect(built.html).toContain('Returns');
      expect(built.html).toContain('Help');
    }
  });

  it('advances the progress tracker one stop between the two', () => {
    // Three filled dots at "out for delivery" against two at "dispatched".
    const gold = (html: string) => (html.match(/border-radius:50%;background:#a16207/g) ?? []).length;
    expect(gold(orderDispatchedEmail(ORDER).html)).toBe(2);
    expect(gold(outForDeliveryEmail(ORDER).html)).toBe(3);
  });
});

describe('welcome', () => {
  it('greets by first name only', () => {
    expect(welcomeEmail({ name: 'Jordan Smith' }).html).toContain('Welcome, Jordan.');
  });

  it('stays graceful with no name at all', () => {
    const built = welcomeEmail({});
    expect(built.html).toContain('Welcome to LeHart.');
    expect(built.html).not.toContain('undefined');
    expect(built.html).not.toContain('null');
  });

  it('includes an unsubscribe link when one is given', () => {
    const built = welcomeEmail({ unsubscribeUrl: 'https://lehart.co.uk/u/abc' });
    expect(built.html).toContain('https://lehart.co.uk/u/abc');
    expect(built.text).toContain('https://lehart.co.uk/u/abc');
  });
});

describe('missing data', () => {
  it('does not print NaN when an order has no numbers on it', () => {
    const built = orderConfirmationEmail({ id: 'ORD-EMPTY' });
    expect(built.html).not.toContain('NaN');
    expect(built.text).not.toContain('NaN');
    expect(built.html).toContain('£0.00');
  });

  it('omits the address block entirely rather than printing an empty card', () => {
    const built = orderConfirmationEmail({ id: 'ORD-EMPTY' });
    expect(built.html).not.toContain('Delivering to');
  });
});

describe('the sender that fails silently', () => {
  it('warns when EMAIL_FROM is at a domain that cannot be authenticated', async () => {
    const { senderDomainWarning } = await import('../../../api/_email.js');
    const before = process.env.EMAIL_FROM;

    // The exact configuration that produced "Brevo says sent, nothing arrives":
    // a gmail.com From: address relayed by Brevo cannot align with gmail.com's
    // DMARC record, so Gmail treats it as spoofing.
    process.env.EMAIL_FROM = 'sumanthrb94@gmail.com';
    expect(senderDomainWarning()).toMatch(/gmail\.com/);

    process.env.EMAIL_FROM = 'orders@lehart.co.uk';
    expect(senderDomainWarning()).toBeNull();

    process.env.EMAIL_FROM = before;
  });
});
