/**
 * Render every customer email to docs/email-previews/ with sample data.
 *
 *   npx tsx scripts/preview-emails.ts
 *
 * Email is the one surface with no dev server and no hot reload — the usual
 * way to see a change is to send yourself a real message, which burns quota
 * and takes a round trip per tweak. This writes the same HTML sendEmail would
 * post to Brevo straight to disk, so the layout can be checked in a browser
 * first. It proves nothing about how Outlook will render it; that still needs
 * a real send. It does catch the things that actually go wrong day to day: a
 * broken total, an unescaped name, an empty block where data was missing.
 *
 * The sample order deliberately exercises the awkward cases — a discount, a
 * multi-line address, an item with no image, a quantity above one, and a name
 * containing an apostrophe.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  welcomeEmail,
  orderConfirmationEmail,
  orderDispatchedEmail,
  outForDeliveryEmail,
  abandonedCartEmail,
  type OrderLike,
} from '../api/_templates.js';

const OUT = join(process.cwd(), 'docs', 'email-previews');

const SAMPLE_ORDER: OrderLike = {
  id: 'ORD-1756382400123',
  contactEmail: 'jordan@example.com',
  shippingAddress: {
    fullName: "Jordan O'Neill",
    addressLine1: 'Flat 4, 118 Bermondsey Street',
    addressLine2: 'London Bridge',
    city: 'London',
    postalCode: 'SE1 3TX',
    country: 'United Kingdom',
  },
  items: [
    {
      brand: 'Apple',
      model: 'iPhone 15 Pro',
      quantity: 1,
      price: 749.0,
      selectedStorage: '256GB',
      selectedColor: 'Blue Titanium',
      selectedCondition: 'Excellent',
      imageUrl: 'https://lehart.co.uk/assets/iphone-17-pro-max-navy.jpg',
    },
    {
      brand: 'Samsung',
      model: 'Galaxy S24 Ultra',
      quantity: 2,
      price: 619.5,
      selectedStorage: '512GB',
      selectedColor: 'Titanium Grey',
      grade: 'Good',
      imageUrl: null,
    },
  ],
  subtotal: 1988.0,
  discount: 198.8,
  shippingCost: 0,
  shippingMethod: 'Standard Delivery',
  tax: 357.84,
  total: 2147.04,
  couponCode: 'REFURB15',
};

const DISPATCH = {
  courier: 'Royal Mail',
  trackingNumber: 'AB123456789GB',
  trackingUrl: 'https://www.royalmail.com/track-your-item#/tracking-results/AB123456789GB',
  estimatedDelivery: 'Tomorrow, before 6pm',
};

const PAGES = [
  { file: 'welcome', label: 'Welcome', built: welcomeEmail({ name: 'Jordan', unsubscribeUrl: 'https://lehart.co.uk/unsubscribe?t=demo' }) },
  { file: 'order-confirmation', label: 'Order confirmation', built: orderConfirmationEmail(SAMPLE_ORDER) },
  { file: 'dispatched', label: 'Dispatched', built: orderDispatchedEmail(SAMPLE_ORDER, DISPATCH) },
  { file: 'out-for-delivery', label: 'Out for delivery', built: outForDeliveryEmail(SAMPLE_ORDER, DISPATCH) },
  {
    file: 'abandoned-cart',
    label: 'Abandoned cart',
    built: abandonedCartEmail({
      items: SAMPLE_ORDER.items,
      total: SAMPLE_ORDER.total,
      name: 'Jordan',
      unsubscribeUrl: 'https://lehart.co.uk/unsubscribe?t=demo',
    }),
  },
];

mkdirSync(OUT, { recursive: true });

for (const page of PAGES) {
  writeFileSync(join(OUT, `${page.file}.html`), page.built.html, 'utf8');
  writeFileSync(join(OUT, `${page.file}.txt`), `Subject: ${page.built.subject}\n\n${page.built.text}\n`, 'utf8');
}

// One page showing them all side by side, which is how you spot that the
// headline sizes or the card widths have drifted apart.
const index = `<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LeHart email templates</title>
<style>
  :root { color-scheme: light only; }
  body { margin:0; background:#e7e5e4; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,sans-serif; color:#0c0a09; }
  header { padding:26px 22px 6px; }
  h1 { margin:0 0 4px; font-size:20px; font-weight:800; letter-spacing:-0.02em; }
  header p { margin:0; font-size:13px; color:#57534e; }
  .grid { display:flex; flex-wrap:wrap; gap:22px; padding:22px; align-items:flex-start; }
  .pane { flex:1 1 560px; min-width:0; background:#fff; border:1px solid #d6d3d1; border-radius:14px; overflow:hidden; }
  .bar { padding:11px 15px; border-bottom:1px solid #ededeb; background:#fafaf9; display:flex; justify-content:space-between; gap:12px; align-items:baseline; }
  .bar b { font-size:13px; font-weight:800; }
  .bar span { font-size:11.5px; color:#78716c; text-align:right; }
  iframe { display:block; width:100%; height:940px; border:0; background:#fafaf9; }
</style></head>
<body>
<header>
  <h1>LeHart customer emails</h1>
  <p>Rendered with sample data by <code>scripts/preview-emails.ts</code>. Plain-text parts sit beside each file as <code>.txt</code>.</p>
</header>
<div class="grid">
${PAGES.map(
  (p) => `  <div class="pane">
    <div class="bar"><b>${p.label}</b><span>${p.built.subject.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></div>
    <iframe src="./${p.file}.html" title="${p.label}" loading="lazy"></iframe>
  </div>`,
).join('\n')}
</div>
</body></html>`;

writeFileSync(join(OUT, 'index.html'), index, 'utf8');

console.log(`Wrote ${PAGES.length} templates (+ index.html) to docs/email-previews/`);
for (const p of PAGES) console.log(`  ${p.file.padEnd(20)} ${p.built.subject}`);
