// Render docs/brevo-integration.html to a print-ready A4 PDF.
//
// Same shape as make-readiness-pdf.mjs: the document is already designed, so
// this prints it rather than re-typesetting it. The source is an artifact
// fragment with no <html>/<head>, so it needs a real document wrapper before
// a browser will render it standalone.
import { chromium } from 'playwright';
import { resolveChromium } from '/home/user/Mobilephonetech.co.uk/e2e/chromium-path.mjs';
import { readFileSync } from 'node:fs';

const SRC = '/home/user/Mobilephonetech.co.uk/docs/brevo-integration.html';
const OUT = process.argv[2] || '/home/user/Mobilephonetech.co.uk/docs/LeHart-Brevo-Integration.pdf';

const html = `<!doctype html><html lang="en-GB" data-theme="light"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
</head><body>${readFileSync(SRC, 'utf8')}</body></html>`;

const browser = await chromium.launch({ executablePath: resolveChromium() });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle' });

await page.pdf({
  path: OUT,
  format: 'A4',
  // The document carries its own body padding, so the page margin only needs
  // to cover the printer's unprintable edge.
  margin: { top: '11mm', bottom: '13mm', left: '10mm', right: '10mm' },
  // Chips, callouts and table headers carry meaning in their fill; without
  // this the print pipeline drops those backgrounds.
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-size:7.5pt;color:#a8a29e;font-family:sans-serif;padding:0 12mm;text-align:right;">' +
    'LeHart · Brevo integration · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
});

await browser.close();
console.log(`Wrote ${OUT}`);
