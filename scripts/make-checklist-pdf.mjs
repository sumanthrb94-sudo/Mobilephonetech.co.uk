#!/usr/bin/env node
// Render docs/go-live-checklist.html to a print-ready A4 PDF.
//
//   node scripts/make-checklist-pdf.mjs docs/LeHart-Go-Live-Checklist.pdf
//
// Prints the live document rather than re-typesetting it, so paper and web
// cannot drift. The page builds its list with JavaScript, so the script waits
// for the rendered groups before printing — a screenshot of the empty shell
// would otherwise look like success. Ticks come from the document's own
// defaults (items verified done start ticked); a fresh browser context means
// no local ticks leak into the shared PDF.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveChromium } from '../e2e/chromium-path.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, '..', 'docs', 'go-live-checklist.html');
const OUT = process.argv[2] || join(here, '..', 'docs', 'LeHart-Go-Live-Checklist.pdf');

const fragment = readFileSync(SRC, 'utf8');

const printCss = `
  :root {
    --display: "Bitstream Charter", Charter, Georgia, serif;
    --body: "Liberation Sans", "DejaVu Sans", sans-serif;
    --mono: "Liberation Mono", "DejaVu Sans Mono", monospace;
  }

  @page { size: A4; margin: 15mm 14mm 17mm; }

  html, body { background: #fff; }

  body {
    padding: 0;
    font-size: 9.8pt;
    line-height: 1.5;
    /* Status chips carry their meaning in their fill. */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .wrap { max-width: none; }

  header.masthead { padding: 0 0 1rem; }
  h1 { font-size: 26pt; }
  .standfirst { font-size: 11pt; max-width: 44em; }

  /* Interactive controls are meaningless on paper. */
  .controls { display: none; }
  .overall { padding: 0.7rem 0.9rem; }
  .overall-count { font-size: 13pt; }

  section.group { margin-top: 1.6rem; }
  .group-head h2 { font-size: 13.5pt; }
  .group-note { font-size: 9pt; }

  li.item { padding: 0.5rem 0; }
  .item-title { font-size: 9.8pt; }
  .item-detail { font-size: 8.6pt; }
  li.item input[type="checkbox"] { width: 11pt; height: 11pt; }

  /* Keep each item whole, and a section heading with its first rows. */
  li.item { break-inside: avoid; page-break-inside: avoid; }
  .group-head, .group-note { break-after: avoid; page-break-after: avoid; }

  .caveat { margin-top: 1.6rem; padding: 0.8rem 1rem; font-size: 8.6pt; }

  a { color: var(--ink); text-decoration: underline; }
`;

const html = `<!doctype html>
<html lang="en-GB" data-theme="light">
<head><meta charset="utf-8"></head>
<body>
${fragment}
<style>${printCss}</style>
</body>
</html>`;

const tmp = join(here, '..', 'docs', '.checklist-print.html');
writeFileSync(tmp, html);

const exe = resolveChromium();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`file://${tmp}`, { waitUntil: 'load' });
await page.emulateMedia({ media: 'print', colorScheme: 'light' });

// The list is script-rendered: wait for real rows, then read the live totals
// so the PDF and its filename claim can be sanity-checked in the console.
await page.waitForSelector('li.item', { timeout: 15000 });
const stats = await page.evaluate(() => ({
  done: document.getElementById('done-n')?.textContent,
  total: document.getElementById('total-n')?.textContent,
  items: document.querySelectorAll('li.item').length,
}));
console.log(`rendered: ${stats.items} items, ${stats.done}/${stats.total} done`);

await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  margin: { top: '15mm', right: '14mm', bottom: '17mm', left: '14mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;padding:0 14mm;font-family:sans-serif;font-size:7pt;
                color:#79817F;display:flex;justify-content:space-between;">
      <span>LeHart — Go-Live Checklist (${stats.done}/${stats.total} done)</span>
      <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`,
});

await browser.close();
const { unlinkSync } = await import('node:fs');
unlinkSync(tmp);
console.log('written', OUT);
