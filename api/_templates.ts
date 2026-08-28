import { esc } from './_email.js';
import { COMPANY } from '../src/config/company.js';

/**
 * Customer email templates — welcome, order confirmation, dispatch, and out
 * for delivery.
 *
 * These mirror the storefront's design system rather than inventing a second
 * one: stone neutrals against the gold accent, the same 14px card radius, the
 * same LeHart wordmark with a gold second syllable. The tokens are copied as
 * literals rather than imported from index.css because email has no
 * stylesheet, no custom properties and no cascade worth relying on — every
 * rule has to be inlined on the element it styles. When the site's palette
 * moves, PALETTE below is the one place to follow it.
 *
 * Three constraints shape everything here:
 *
 * 1. Tables, not flexbox. Outlook renders through Word's HTML engine, which
 *    has no support for flex or grid, and a div-based layout collapses into a
 *    single column there.
 * 2. Every message ships a plain-text part. HTML-only mail scores worse with
 *    spam filters and is unreadable in text-only clients — sendEmail already
 *    insists on one, and these builders return both halves together so they
 *    cannot drift apart.
 * 3. Everything customer-supplied goes through esc(). An order can carry a
 *    name, an address and product titles that came from a form, and an
 *    unescaped apostrophe in a street name is the least of what that allows.
 */

const PALETTE = {
  pageBg: '#fafaf9',
  card: '#ffffff',
  border: '#ededeb',
  ink: '#0c0a09',
  inkSoft: '#44403c',
  muted: '#78716c',
  gold: '#a16207',
  goldDeep: '#854d0e',
  goldWash: '#fffbeb',
  green: '#059669',
  greenWash: '#f0fdf4',
  rail: '#d6d3d1',
} as const;

/**
 * Rubik and Nunito Sans are the site's faces. Most clients will ignore them —
 * webfonts are unreliable in email — so the fallback stack has to look right
 * on its own, which is why the system UI stack follows immediately.
 */
const FONT = "'Nunito Sans','Rubik',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

const SHOP_URL = (process.env.PUBLIC_SITE_URL || 'https://lehart.co.uk').replace(/\/+$/, '');

const money = (n: unknown): string => {
  const value = Number(n);
  return Number.isFinite(value) ? `£${value.toFixed(2)}` : '£0.00';
};

/** ── Shared pieces ───────────────────────────────────────────────── */

/**
 * The hidden line clients show beside the subject in the inbox list. Without
 * one they scrape the first visible text, which here would be the wordmark —
 * every message previewing as "LeHart". The trailing entities pad it so no
 * following body text leaks into the preview.
 */
function preheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0;">${esc(
    text,
  )}${'&#847;&zwnj;&nbsp;'.repeat(60)}</div>`;
}

function button(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px;">
    <tr><td style="border-radius:10px;background:${PALETTE.gold};">
      <a href="${esc(href)}" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(
        label,
      )}</a>
    </td></tr>
  </table>`;
}

/**
 * The four-stop delivery tracker, with everything up to `active` filled in
 * gold. It is the clearest way to answer the question these emails actually
 * get — "where is my phone" — without the customer opening anything.
 *
 * Drawn as one table row per stop rather than a flex row, and it degrades to
 * a readable stack of cells if a client ignores the widths.
 */
function progress(active: 'confirmed' | 'dispatched' | 'out' | 'delivered'): string {
  const stops: Array<{ key: string; label: string }> = [
    { key: 'confirmed', label: 'Confirmed' },
    { key: 'dispatched', label: 'Dispatched' },
    { key: 'out', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
  ];
  const activeIndex = stops.findIndex((s) => s.key === active);

  // Four equal 25% columns, each drawing its own half-rail either side of the
  // dot. Letting the rails be the flexible cells instead looks right in a
  // browser and collapses in a mail client: the columns then size to their
  // label text, so "Out for delivery" steals the width and the stops bunch up
  // at one end.
  const cells = stops
    .map((stop, i) => {
      const done = i <= activeIndex;
      const dot = done ? PALETTE.gold : PALETTE.rail;
      const label = done ? PALETTE.ink : PALETTE.muted;
      const weight = i === activeIndex ? '800' : '600';

      // A segment is gold once the stop on its right has been reached.
      const seg = (visible: boolean, filled: boolean) =>
        `<td width="50%" style="padding:0;"><div style="height:2px;background:${
          visible ? (filled ? PALETTE.gold : PALETTE.rail) : 'transparent'
        };line-height:2px;font-size:0;">&nbsp;</div></td>`;

      return `<td width="25%" align="center" style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr valign="middle">
          ${seg(i > 0, i <= activeIndex)}
          <td width="11" style="padding:0;"><div style="width:11px;height:11px;border-radius:50%;background:${dot};line-height:11px;font-size:0;">&nbsp;</div></td>
          ${seg(i < stops.length - 1, i < activeIndex)}
        </tr></table>
        <div style="font-family:${FONT};font-size:10.5px;font-weight:${weight};color:${label};letter-spacing:0.01em;margin-top:7px;">${esc(
          stop.label,
        )}</div>
      </td>`;
    })
    .join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 26px;">
    <tr valign="top">${cells}</tr>
  </table>`;
}

interface OrderItem {
  brand?: string;
  model?: string;
  quantity?: number;
  price?: number;
  imageUrl?: string | null;
  grade?: string | null;
  selectedColor?: string | null;
  selectedStorage?: string | null;
  selectedCondition?: string | null;
}

export interface OrderLike {
  id: string;
  contactEmail?: string;
  shippingAddress?: {
    fullName?: string;
    /** Optional at checkout; the SMS notification needs it when present. */
    phone?: string | null;
    addressLine1?: string;
    addressLine2?: string | null;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  items?: OrderItem[];
  subtotal?: number;
  discount?: number;
  shippingCost?: number;
  shippingMethod?: string;
  tax?: number;
  total?: number;
  couponCode?: string | null;
}

/** "128GB · Midnight · Excellent" — only the parts that exist. */
function variantLine(item: OrderItem): string {
  return [item.selectedStorage, item.selectedColor, item.selectedCondition ?? item.grade]
    .filter(Boolean)
    .join(' · ');
}

function itemRows(items: OrderItem[]): string {
  return items
    .map((item) => {
      const title = `${item.brand ?? ''} ${item.model ?? ''}`.trim() || 'Item';
      const variant = variantLine(item);
      const qty = Number(item.quantity ?? 1);
      const lineTotal = money(Number(item.price ?? 0) * qty);

      // Remote images are blocked by default in most clients, so the cell has
      // its own background and fixed size — a blocked image leaves a tidy
      // stone square rather than a broken-icon hole that shifts the layout.
      const thumb = item.imageUrl
        ? `<img src="${esc(item.imageUrl)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border-radius:8px;object-fit:cover;background:${PALETTE.pageBg};border:1px solid ${PALETTE.border};">`
        : `<div style="width:52px;height:52px;border-radius:8px;background:${PALETTE.pageBg};border:1px solid ${PALETTE.border};"></div>`;

      return `<tr>
        <td width="52" style="padding:13px 0;vertical-align:top;">${thumb}</td>
        <td style="padding:13px 0 13px 13px;vertical-align:top;font-family:${FONT};">
          <div style="font-size:14.5px;font-weight:700;color:${PALETTE.ink};line-height:1.35;">${esc(title)}</div>
          ${
            variant
              ? `<div style="font-size:12.5px;color:${PALETTE.muted};margin-top:3px;">${esc(variant)}</div>`
              : ''
          }
          <div style="font-size:12.5px;color:${PALETTE.muted};margin-top:3px;">Qty ${qty}</div>
        </td>
        <td align="right" style="padding:13px 0;vertical-align:top;font-family:${FONT};font-size:14.5px;font-weight:700;color:${PALETTE.ink};white-space:nowrap;">${lineTotal}</td>
      </tr>
      <tr><td colspan="3" style="border-bottom:1px solid ${PALETTE.border};line-height:1px;font-size:0;">&nbsp;</td></tr>`;
    })
    .join('');
}

function totalsBlock(order: OrderLike): string {
  const row = (label: string, value: string, opts: { strong?: boolean; gold?: boolean } = {}) =>
    `<tr>
      <td style="padding:${opts.strong ? '11px 0 0' : '5px 0'};font-family:${FONT};font-size:${
        opts.strong ? '15.5px' : '13.5px'
      };font-weight:${opts.strong ? '800' : '500'};color:${
        opts.gold ? PALETTE.green : opts.strong ? PALETTE.ink : PALETTE.inkSoft
      };">${esc(label)}</td>
      <td align="right" style="padding:${opts.strong ? '11px 0 0' : '5px 0'};font-family:${FONT};font-size:${
        opts.strong ? '17px' : '13.5px'
      };font-weight:${opts.strong ? '800' : '600'};color:${
        opts.gold ? PALETTE.green : opts.strong ? PALETTE.ink : PALETTE.inkSoft
      };white-space:nowrap;">${esc(value)}</td>
    </tr>`;

  const discount = Number(order.discount ?? 0);
  const shipping = Number(order.shippingCost ?? 0);

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
    ${row('Subtotal', money(order.subtotal))}
    ${
      discount > 0
        ? row(order.couponCode ? `Discount (${order.couponCode})` : 'Discount', `−${money(discount)}`, { gold: true })
        : ''
    }
    ${row(order.shippingMethod || 'Delivery', shipping > 0 ? money(shipping) : 'Free')}
    ${row('VAT (20%)', money(order.tax))}
    <tr><td colspan="2" style="padding-top:11px;border-top:1px solid ${PALETTE.border};line-height:1px;font-size:0;">&nbsp;</td></tr>
    ${row('Total', money(order.total), { strong: true })}
  </table>`;
}

function addressBlock(order: OrderLike): string {
  const a = order.shippingAddress ?? {};
  const lines = [a.fullName, a.addressLine1, a.addressLine2, a.city, a.postalCode, a.country].filter(Boolean);
  if (!lines.length) return '';

  return `<div style="margin-top:26px;padding:15px 17px;background:${PALETTE.pageBg};border:1px solid ${PALETTE.border};border-radius:11px;">
    <div style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:${PALETTE.muted};margin-bottom:7px;">Delivering to</div>
    <div style="font-family:${FONT};font-size:13.5px;line-height:1.6;color:${PALETTE.inkSoft};">${lines
      .map((l) => esc(l))
      .join('<br>')}</div>
  </div>`;
}

/** A callout for the one fact the message exists to deliver. */
function highlight(label: string, value: string, tone: 'gold' | 'green' = 'gold'): string {
  const bg = tone === 'green' ? PALETTE.greenWash : PALETTE.goldWash;
  const fg = tone === 'green' ? PALETTE.green : PALETTE.goldDeep;
  return `<div style="margin:20px 0;padding:15px 17px;background:${bg};border-radius:11px;border:1px solid ${
    tone === 'green' ? '#bbf7d0' : '#fde68a'
  };">
    <div style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:${fg};margin-bottom:5px;">${esc(
      label,
    )}</div>
    <div style="font-family:${FONT};font-size:17px;font-weight:800;color:${PALETTE.ink};letter-spacing:-0.01em;">${esc(
      value,
    )}</div>
  </div>`;
}

/**
 * The shell every message shares. The footer carries the company identity
 * because UK consumer law expects a trading business to identify itself in
 * commercial correspondence — and COMPANY renders nothing at all when the
 * fields are still blank, rather than a placeholder that would be a false
 * statement on a legal document.
 */
function shell(opts: {
  preview: string;
  headline: string;
  body: string;
  unsubscribeUrl?: string;
}): string {
  const identity = [
    COMPANY.legalName,
    COMPANY.companyNumber ? `Company no. ${COMPANY.companyNumber}` : '',
    COMPANY.registeredOffice,
    COMPANY.vatNumber ? `VAT ${COMPANY.vatNumber}` : '',
  ]
    .filter(Boolean)
    .map((l) => esc(l))
    .join(' · ');

  return `<!doctype html>
<html lang="en-GB"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(opts.headline)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.pageBg};">
${preheader(opts.preview)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PALETTE.pageBg};padding:26px 14px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:576px;background:${PALETTE.card};border:1px solid ${PALETTE.border};border-radius:14px;overflow:hidden;">

    <tr><td style="padding:22px 28px;border-bottom:1px solid ${PALETTE.border};">
      <a href="${SHOP_URL}" style="text-decoration:none;">
        <span style="font-family:${FONT};font-size:21px;font-weight:800;letter-spacing:-0.025em;color:${PALETTE.ink};">Le<span style="color:${PALETTE.gold};">Hart</span></span>
      </a>
    </td></tr>

    <tr><td style="padding:28px 28px 30px;">
      <h1 style="margin:0 0 16px;font-family:${FONT};font-size:22px;line-height:1.28;font-weight:800;letter-spacing:-0.02em;color:${PALETTE.ink};">${esc(
        opts.headline,
      )}</h1>
      ${opts.body}
    </td></tr>

    <tr><td style="padding:19px 28px;border-top:1px solid ${PALETTE.border};background:${PALETTE.pageBg};font-family:${FONT};font-size:12px;color:${PALETTE.muted};line-height:1.65;">
      Questions? Reply to this email and a person will answer — or write to
      <a href="mailto:${esc(COMPANY.supportEmail)}" style="color:${PALETTE.goldDeep};text-decoration:none;">${esc(
        COMPANY.supportEmail,
      )}</a>.<br>
      <a href="${SHOP_URL}" style="color:${PALETTE.goldDeep};text-decoration:none;">${esc(
        SHOP_URL.replace(/^https?:\/\//, ''),
      )}</a>
      ${identity ? `<br><span style="color:#a8a29e;">${identity}</span>` : ''}
      ${
        opts.unsubscribeUrl
          ? `<br><a href="${esc(
              opts.unsubscribeUrl,
            )}" style="color:#a8a29e;text-decoration:underline;">Unsubscribe</a>`
          : ''
      }
    </td></tr>

  </table>
</td></tr>
</table>
</body></html>`;
}

const p = (text: string): string =>
  `<p style="margin:0 0 13px;font-family:${FONT};font-size:14.5px;line-height:1.65;color:${PALETTE.inkSoft};">${text}</p>`;

export interface Built {
  subject: string;
  html: string;
  text: string;
}

/** ── 1. Welcome ──────────────────────────────────────────────────── */

export function welcomeEmail(opts: { name?: string | null; unsubscribeUrl?: string }): Built {
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const greeting = first ? `Welcome, ${first}.` : 'Welcome to LeHart.';

  const body = [
    p('Thanks for joining. You will hear from us when something is genuinely worth knowing — new stock, price drops on the models you care about, and the occasional subscriber-only code. Not more than that.'),
    highlight('Your welcome code', 'WELCOME20 — £20 off orders over £50'),
    p('Every phone we sell is professionally refurbished, checked against a 60-point inspection, and covered for 12 months. If it is not right, you have 30 days to send it back.'),
    button('Start browsing', `${SHOP_URL}/products`),
  ].join('');

  const text = [
    greeting,
    '',
    'Thanks for joining. You will hear from us when something is genuinely worth knowing — new stock, price drops, and the occasional subscriber-only code.',
    '',
    'YOUR WELCOME CODE: WELCOME20 — £20 off orders over £50',
    '',
    'Every phone is professionally refurbished, checked against a 60-point inspection, and covered for 12 months. 30 days to send it back if it is not right.',
    '',
    `Start browsing: ${SHOP_URL}/products`,
    '',
    opts.unsubscribeUrl ? `Unsubscribe: ${opts.unsubscribeUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: 'Welcome to LeHart — here is £20 off your first order',
    html: shell({
      preview: 'Your WELCOME20 code is inside, plus what to expect from us.',
      headline: greeting,
      body,
      unsubscribeUrl: opts.unsubscribeUrl,
    }),
    text,
  };
}

/** ── 2. Order confirmation ───────────────────────────────────────── */

export function orderConfirmationEmail(order: OrderLike): Built {
  const first = (order.shippingAddress?.fullName ?? '').trim().split(/\s+/)[0];
  const items = order.items ?? [];

  const body = [
    p(
      `${
        first ? `Thanks, ${esc(first)} — your` : 'Your'
      } order is confirmed and we are getting it ready. We will email you again the moment it leaves us.`,
    ),
    progress('confirmed'),
    highlight('Order number', order.id),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border-top:1px solid ${PALETTE.border};">${itemRows(
      items,
    )}</table>`,
    totalsBlock(order),
    addressBlock(order),
    button('View your order', `${SHOP_URL}/orders`),
  ].join('');

  const text = [
    first ? `Thanks, ${first} — your order is confirmed.` : 'Your order is confirmed.',
    '',
    `Order number: ${order.id}`,
    '',
    ...items.map((i) => {
      const variant = variantLine(i);
      return `- ${`${i.brand ?? ''} ${i.model ?? ''}`.trim()}${variant ? ` (${variant})` : ''} x${
        i.quantity ?? 1
      }  ${money(Number(i.price ?? 0) * Number(i.quantity ?? 1))}`;
    }),
    '',
    `Subtotal: ${money(order.subtotal)}`,
    Number(order.discount ?? 0) > 0 ? `Discount: -${money(order.discount)}` : '',
    `${order.shippingMethod || 'Delivery'}: ${Number(order.shippingCost ?? 0) > 0 ? money(order.shippingCost) : 'Free'}`,
    `VAT (20%): ${money(order.tax)}`,
    `Total: ${money(order.total)}`,
    '',
    `View your order: ${SHOP_URL}/orders`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `Order confirmed — ${order.id}`,
    html: shell({
      preview: `We have your order ${order.id} and we are packing it now.`,
      headline: 'Your order is confirmed',
      body,
    }),
    text,
  };
}

/** ── 3. Dispatched ───────────────────────────────────────────────── */

export interface DispatchInfo {
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  /** Free text such as "Tomorrow, before 6pm". */
  estimatedDelivery?: string;
}

export function orderDispatchedEmail(order: OrderLike, info: DispatchInfo = {}): Built {
  const items = order.items ?? [];
  const courier = info.courier?.trim();

  const body = [
    p(
      `Your order has left our warehouse${
        courier ? ` with ${esc(courier)}` : ''
      }. Here is everything you need to follow it.`,
    ),
    progress('dispatched'),
    info.trackingNumber
      ? highlight(courier ? `${courier} tracking number` : 'Tracking number', info.trackingNumber)
      : highlight('Order number', order.id),
    info.estimatedDelivery ? p(`<strong style="color:${PALETTE.ink};">Estimated delivery:</strong> ${esc(info.estimatedDelivery)}`) : '',
    info.trackingUrl ? button('Track your parcel', info.trackingUrl) : button('View your order', `${SHOP_URL}/orders`),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-top:1px solid ${PALETTE.border};">${itemRows(
      items,
    )}</table>`,
    addressBlock(order),
  ].join('');

  const text = [
    `Your order ${order.id} has been dispatched${courier ? ` with ${courier}` : ''}.`,
    '',
    info.trackingNumber ? `Tracking number: ${info.trackingNumber}` : '',
    info.trackingUrl ? `Track it: ${info.trackingUrl}` : '',
    info.estimatedDelivery ? `Estimated delivery: ${info.estimatedDelivery}` : '',
    '',
    ...items.map((i) => `- ${`${i.brand ?? ''} ${i.model ?? ''}`.trim()} x${i.quantity ?? 1}`),
    '',
    `View your order: ${SHOP_URL}/orders`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `Dispatched — your order ${order.id} is on its way`,
    html: shell({
      preview: info.trackingNumber
        ? `Track it with ${courier || 'the courier'}: ${info.trackingNumber}`
        : 'Your order has left our warehouse.',
      headline: 'Your order is on its way',
      body,
    }),
    text,
  };
}

/** ── 4. Out for delivery ─────────────────────────────────────────── */

export function outForDeliveryEmail(order: OrderLike, info: DispatchInfo = {}): Built {
  const courier = info.courier?.trim();

  const body = [
    p(
      `Good news — your order is on the van and due today${
        courier ? `, with ${esc(courier)}` : ''
      }. Someone should be there to take it in if you can manage it.`,
    ),
    progress('out'),
    highlight('Arriving today', info.estimatedDelivery?.trim() || 'Before end of day', 'green'),
    info.trackingNumber
      ? p(`<strong style="color:${PALETTE.ink};">Tracking number:</strong> ${esc(info.trackingNumber)}`)
      : '',
    info.trackingUrl ? button('Follow it live', info.trackingUrl) : button('View your order', `${SHOP_URL}/orders`),
    addressBlock(order),
    p(
      `<span style="font-size:13px;color:${PALETTE.muted};">Not going to be in? Most couriers let you redirect or reschedule from the tracking page above.</span>`,
    ),
  ].join('');

  const text = [
    `Your order ${order.id} is out for delivery${courier ? ` with ${courier}` : ''}.`,
    '',
    `Arriving: ${info.estimatedDelivery?.trim() || 'Before end of day'}`,
    info.trackingNumber ? `Tracking number: ${info.trackingNumber}` : '',
    info.trackingUrl ? `Follow it live: ${info.trackingUrl}` : '',
    '',
    'Not going to be in? Most couriers let you redirect or reschedule from the tracking page.',
    '',
    `View your order: ${SHOP_URL}/orders`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: `Out for delivery — your order ${order.id} arrives today`,
    html: shell({
      preview: `On the van${courier ? ` with ${courier}` : ''} and due today.`,
      headline: 'Arriving today',
      body,
    }),
    text,
  };
}

/** ── 5. Abandoned cart ───────────────────────────────────────────── */

/**
 * The recovery email, sent once, some hours after a checkout was started and
 * not finished.
 *
 * Deliberately not a discount. Handing a code to everyone who hesitates
 * teaches customers to abandon on purpose, and it costs margin on the ones
 * who were coming back anyway. The reassurance — warranty, returns window,
 * stock — is what actually closes a refurbished-phone sale, because the doubt
 * being answered is "is this thing any good", not "is this £20 cheaper".
 */
export function abandonedCartEmail(cart: {
  items?: OrderItem[];
  total?: number;
  recoveryUrl?: string;
  name?: string | null;
  unsubscribeUrl?: string;
}): Built {
  const first = (cart.name ?? '').trim().split(/\s+/)[0];
  const items = cart.items ?? [];
  const url = cart.recoveryUrl || `${SHOP_URL}/cart`;
  const lead = items.length === 1 ? 'It is still in your basket' : 'They are still in your basket';

  const body = [
    p(`${first ? `${esc(first)}, you` : 'You'} left something behind. ${lead}, and we have held it for you.`),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border-top:1px solid ${PALETTE.border};">${itemRows(
      items,
    )}</table>`,
    Number(cart.total ?? 0) > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;">
          <tr>
            <td style="font-family:${FONT};font-size:15.5px;font-weight:800;color:${PALETTE.ink};">Basket total</td>
            <td align="right" style="font-family:${FONT};font-size:17px;font-weight:800;color:${PALETTE.ink};">${money(
              cart.total,
            )}</td>
          </tr>
        </table>`
      : '',
    button('Finish your order', url),
    `<div style="margin-top:24px;padding:15px 17px;background:${PALETTE.pageBg};border:1px solid ${PALETTE.border};border-radius:11px;font-family:${FONT};font-size:13px;line-height:1.7;color:${PALETTE.inkSoft};">
      <strong style="color:${PALETTE.ink};">Every LeHart phone comes with</strong><br>
      A 60-point inspection · 12-month warranty · 30-day returns · Free UK delivery
    </div>`,
    p(
      `<span style="font-size:13px;color:${PALETTE.muted};">Stock moves quickly on popular models, so we cannot hold a basket forever.</span>`,
    ),
  ].join('');

  const text = [
    first ? `${first}, you left something behind.` : 'You left something behind.',
    '',
    ...items.map((i) => {
      const variant = variantLine(i);
      return `- ${`${i.brand ?? ''} ${i.model ?? ''}`.trim()}${variant ? ` (${variant})` : ''} x${i.quantity ?? 1}`;
    }),
    Number(cart.total ?? 0) > 0 ? `\nBasket total: ${money(cart.total)}` : '',
    '',
    `Finish your order: ${url}`,
    '',
    'Every LeHart phone: 60-point inspection, 12-month warranty, 30-day returns, free UK delivery.',
    '',
    cart.unsubscribeUrl ? `Unsubscribe: ${cart.unsubscribeUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return {
    subject: items.length === 1 ? 'You left something in your basket' : 'Your basket is waiting',
    html: shell({
      preview: 'We have held it for you — 12-month warranty and 30-day returns as standard.',
      headline: 'Still thinking it over?',
      body,
      unsubscribeUrl: cart.unsubscribeUrl,
    }),
    text,
  };
}

/** ── 6. Account welcome ──────────────────────────────────────────── */

/**
 * Sent when someone creates an account, which is a different event from
 * subscribing to the newsletter and deserves different words.
 *
 * Deliberately NOT the newsletter welcome. That one promises price drops and
 * subscriber codes, which are marketing; this one is transactional — it
 * confirms an account exists and says what it is for. Sending marketing copy
 * to someone who only registered to check out would be assuming a consent they
 * never gave, and under PECR that assumption is the whole offence.
 *
 * So the newsletter gets an invitation here rather than an enrolment: the
 * signup box on the site is where consent is actually recorded, with the
 * evidence api/_routes/newsletter.ts writes.
 */
export function accountWelcomeEmail(opts: { name?: string | null; email?: string }): Built {
  const first = (opts.name ?? '').trim().split(/\s+/)[0];
  const greeting = first ? `Welcome, ${first}.` : 'Your account is ready.';

  const body = [
    p('Your LeHart account is set up. It keeps your order history, delivery addresses and wishlist in one place, so checking out next time takes a few seconds.'),
    `<div style="margin:20px 0;padding:16px 18px;background:${PALETTE.pageBg};border:1px solid ${PALETTE.border};border-radius:11px;">
      <div style="font-family:${FONT};font-size:11px;font-weight:800;letter-spacing:0.07em;text-transform:uppercase;color:${PALETTE.muted};margin-bottom:9px;">What your account gives you</div>
      <div style="font-family:${FONT};font-size:13.5px;line-height:1.8;color:${PALETTE.inkSoft};">
        Track every order from dispatch to doorstep<br>
        Start a return in a couple of taps, within 30 days<br>
        Keep a wishlist and get told when the price drops<br>
        Your 12-month warranty tied to the order, not a receipt you have to find
      </div>
    </div>`,
    button('Start browsing', `${SHOP_URL}/products`),
    p(
      `<span style="font-size:13px;color:${PALETTE.muted};">Want stock alerts and the occasional subscriber-only code? Add your address to the newsletter at the bottom of any page — we will not add you without being asked.</span>`,
    ),
  ].join('');

  const text = [
    greeting,
    '',
    'Your LeHart account is set up. It keeps your order history, delivery addresses and wishlist in one place.',
    '',
    'WHAT YOUR ACCOUNT GIVES YOU',
    '- Track every order from dispatch to doorstep',
    '- Start a return in a couple of taps, within 30 days',
    '- Keep a wishlist and get told when the price drops',
    '- Your 12-month warranty tied to the order',
    '',
    `Start browsing: ${SHOP_URL}/products`,
    '',
    'Want stock alerts and subscriber-only codes? Add your address to the newsletter at the bottom of any page — we will not add you without being asked.',
  ].join('\n');

  return {
    subject: 'Your LeHart account is ready',
    html: shell({
      preview: 'Order tracking, returns and your wishlist, all in one place.',
      headline: greeting,
      body,
    }),
    text,
  };
}
