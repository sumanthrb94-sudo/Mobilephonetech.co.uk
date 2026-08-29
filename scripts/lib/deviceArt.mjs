/**
 * A product image for a device we have no photograph of.
 *
 * The inventory export carries no images and there is no lawful, reliable way
 * to bulk-fetch manufacturer press shots for 70 listings — those are the
 * manufacturer's copyright, and scraped retailer photos are worse. Shipping a
 * broken-image icon on every product is not an option either: a refurbished
 * shop lives on looking trustworthy.
 *
 * So each listing gets a drawn one: the device silhouette in its actual
 * colour, the model name, the capacity. It is honestly a placeholder rather
 * than a photograph pretending to be of that unit, it renders instantly, it
 * weighs about a kilobyte, and it is generated deterministically so the same
 * product always looks the same.
 *
 * **Replace these with real photographs of the actual handset as you list it.**
 * That is what a refurbished buyer wants to see — the real scratches on the
 * real unit — and it is the one thing that separates a credible listing from a
 * catalogue page. The admin console's image upload writes over these.
 */

/** Screen-safe swatches for the colour names this stock actually uses. */
const SWATCH = {
  Black: '#1C1C1E', Grey: '#8E8E93', 'Space Grey': '#54565A', White: '#F2F2F0',
  Silver: '#D9DBDD', Blue: '#2E5C9A', Green: '#3C7A5B', Purple: '#7A6BB0',
  Gold: '#C9A961', Starlight: '#EDE6DC', Red: '#A02B2B', Pink: '#D18FA6',
  Yellow: '#D9B23C', Orange: '#C97B32', Cream: '#E8DFCD', Graphite: '#3A3A3C',
  Lavender: '#B4A7D6', Mint: '#A8D5BA', Navy: '#28324E', Bronze: '#96654A',
};

const BRAND_INK = { Apple: '#1D1D1F', Samsung: '#1428A0', Google: '#1A73E8', Other: '#2B2B2B' };

export function swatchFor(colour) {
  return SWATCH[colour] ?? '#5A5F63';
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

/**
 * A 1200×1200 SVG. Square because every grid tile and every email thumbnail
 * assumes it, and a mismatched aspect ratio is what makes a catalogue look
 * assembled rather than designed.
 */
export function deviceSvg({ brand, model, storage, colour, category }) {
  const body = swatchFor(colour);
  const ink = BRAND_INK[brand] ?? BRAND_INK.Other;
  const isTablet = category === 'Ipads & Tabs';
  const isWatch = category === 'Smartwatches';

  // Proportions per family, so a tablet does not render as a tall phone.
  const w = isTablet ? 460 : isWatch ? 300 : 340;
  const h = isTablet ? 620 : isWatch ? 350 : 660;
  const x = (1200 - w) / 2;
  const y = 250;
  const radius = isWatch ? 70 : isTablet ? 26 : 40;

  // A light body needs a drawn edge or it disappears into the background.
  const light = ['#F2F2F0', '#EDE6DC', '#E8DFCD', '#D9DBDD'].includes(body);
  const edge = light ? '#C9CBC6' : 'rgba(255,255,255,0.16)';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200" role="img" aria-label="${escapeXml(`${brand} ${model}`)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBFBF9"/><stop offset="1" stop-color="#EFF0EC"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${body}"/>
      <stop offset="1" stop-color="${body}" stop-opacity="0.82"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <ellipse cx="600" cy="${y + h + 26}" rx="${w * 0.42}" ry="16" fill="#000" opacity="0.07"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="url(#body)" stroke="${edge}" stroke-width="3"/>
  <rect x="${x + 16}" y="${y + 16}" width="${w - 32}" height="${h - 32}" rx="${radius - 12}" fill="#0A0A0A" opacity="0.30"/>
  ${isWatch ? '' : `<rect x="${600 - 38}" y="${y + 30}" width="76" height="12" rx="6" fill="#0A0A0A" opacity="0.45"/>`}
  <text x="600" y="150" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="46" font-weight="600" fill="${ink}">${escapeXml(brand)}</text>
  <text x="600" y="205" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="34" fill="#5A6169">${escapeXml(model)}</text>
  <text x="600" y="${y + h + 84}" text-anchor="middle" font-family="ui-monospace, Menlo, Consolas, monospace" font-size="26" letter-spacing="3" fill="#79817F">${escapeXml([storage, colour].filter(Boolean).join('  ·  ').toUpperCase())}</text>
</svg>
`;
}
