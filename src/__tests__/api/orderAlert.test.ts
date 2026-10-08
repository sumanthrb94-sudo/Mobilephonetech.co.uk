import { describe, it, expect } from 'vitest';
import { newOrderAlertEmail } from '../../../api/_templates.js';
import { orderAlertRecipients } from '../../../api/_orderCore.js';

const ORDER = {
  id: 'ORD-9',
  contactEmail: 'buyer@example.com',
  contactPhone: '07700 900123',
  shippingMethod: 'Standard Delivery',
  shippingAddress: { fullName: 'Sam <b>Lee</b>', addressLine1: '1 High Road', city: 'Ilford', postalCode: 'IG1 1YS' },
  items: [{ brand: 'Apple', model: 'iPhone 15', storage: '128GB', color: 'Black', quantity: 2, price: 400 }],
  subtotal: 800, shippingCost: 0, tax: 133.33, total: 800,
};

describe('staff new-order alert', () => {
  it('says what to pack, for how much, and how it ships', () => {
    const mail = newOrderAlertEmail(ORDER);
    expect(mail.subject).toContain('ORD-9');
    expect(mail.subject).toContain('2 items');
    expect(mail.subject).toContain('Standard Delivery');
    expect(mail.text).toContain('Apple iPhone 15');
    expect(mail.text).toContain('IG1 1YS');
    expect(mail.text).toContain('07700 900123');
    expect(mail.html).toContain('/admin/orders');
  });

  it('escapes customer-supplied text', () => {
    expect(newOrderAlertEmail(ORDER).html).not.toContain('<b>Lee</b>');
  });

  it('goes to ORDER_ALERT_EMAIL, else the reply-to inbox, else the support address', () => {
    expect(orderAlertRecipients({ ORDER_ALERT_EMAIL: 'a@lehart.co.uk, B@lehart.co.uk', EMAIL_REPLY_TO: 'x@lehart.co.uk' }))
      .toEqual(['a@lehart.co.uk', 'b@lehart.co.uk']);
    expect(orderAlertRecipients({ EMAIL_REPLY_TO: 'info@lehart.co.uk' })).toEqual(['info@lehart.co.uk']);
    expect(orderAlertRecipients({})).toEqual(['info@lehart.co.uk']);
    expect(orderAlertRecipients({ ORDER_ALERT_EMAIL: 'not-an-email' })).toEqual([]);
  });
});
