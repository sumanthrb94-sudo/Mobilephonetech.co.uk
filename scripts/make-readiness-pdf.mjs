// Render docs/launch-readiness.html to a print-ready A4 PDF.
//
// The document is already designed, so this prints it rather than
// re-typesetting it. Three things have to change for paper:
//
//  1. The file is an artifact fragment (no <html>/<head>), so it needs a real
//     document wrapper before a browser will render it standalone.
//  2. It must be pinned to the light theme. The stylesheet guards its dark
//     blocks with :root:not([data-theme="light"]), so stamping data-theme
//     ="light" wins over the container's prefers-color-scheme.
//  3. The requirements table is built to scroll sideways on screen, which on
//     paper would simply clip. Print styles let it reflow instead.
import { chromium } from 'playwright';
import { resolveChromium } from '/home/user/Mobilephonetech.co.uk/e2e/chromium-path.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = '/home/user/Mobilephonetech.co.uk/docs/launch-readiness.html';
const OUT = process.argv[2];

const fragment = readFileSync(SRC, 'utf8');

// The named faces in the stylesheet (Iowan, Palatino, Georgia) are not on this
// machine, so they would silently fall back to a heavy default serif. Charter
// is installed and is the right register for the document.
const printCss = `
  :root {
    --display: "Bitstream Charter", Charter, Georgia, serif;
    --body: "Liberation Sans", "DejaVu Sans", sans-serif;
    --mono: "Liberation Mono", "DejaVu Sans Mono", monospace;
  }

  @page {
    size: A4;
    margin: 16mm 15mm 18mm;
  }

  html, body { background: #fff; }

  body {
    padding: 0;
    font-size: 10.5pt;
    line-height: 1.55;
    /* Chips, table headers and callouts carry meaning in their fill; without
       this the print pipeline drops those backgrounds. */
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .wrap { max-width: none; }
  .col, p, ul, .audit, .phases, .verdict, .caveat { max-width: none; }

  .masthead { padding: 0 0 1.4rem; }
  h1 { font-size: 30pt; }
  .standfirst { font-size: 12.5pt; max-width: 42em; }

  section { padding: 1.9rem 0 0; gap: 0.85rem; }
  h2 { font-size: 16pt; padding-top: 0.85rem; }
  h3 { font-size: 10.5pt; }

  /* Keep a heading with what it introduces, and never split a self-contained
     block across a page boundary. */
  h2, h3 { break-after: avoid; page-break-after: avoid; }
  .verdict, .option, .audit-item, .phase, .caveat, tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  section { break-before: auto; }

  /* On screen this scrolls sideways in its own container. On paper there is
     nowhere to scroll to, so let the columns reflow to the page width. */
  .scroller { overflow: visible; }
  table { min-width: 0; font-size: 8.6pt; }
  thead { display: table-header-group; }
  thead th { padding: 0.5rem 0.6rem; }
  tbody td { padding: 0.5rem 0.6rem; }
  td.area { white-space: normal; }
  .sub { font-size: 7.8pt; }

  /* Two narrow columns of body copy read badly at this measure. */
  .options { grid-template-columns: 1fr; gap: 0.7rem; }
  .option { padding: 0.9rem 1rem; }
  .option p { font-size: 9.6pt; }

  .verdict { padding: 1.1rem 1.25rem; }
  .verdict p:first-of-type { font-size: 13pt; }

  .audit-item { padding: 0.7rem 0; }
  .phase { padding: 0.8rem 0; }
  .caveat { margin-top: 2rem; padding: 1rem 1.15rem; }

  /* A URL is more use than a colour on paper. */
  a { color: var(--ink); text-decoration: underline; }
`;

const html = `<!doctype html>
<html lang="en-GB" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
${fragment}
<style>${printCss}</style>
</body>
</html>`;

const tmp = '/tmp/claude-0/-home-user-Mobilephonetech-co-uk/e268293a-726b-5a9a-8ff3-bdb3c959200d/scratchpad/print.html';
writeFileSync(tmp, html);

const exe = resolveChromium();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.goto(`file://${tmp}`, { waitUntil: 'load' });
await page.emulateMedia({ media: 'print', colorScheme: 'light' });
await page.waitForTimeout(400);

await page.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  margin: { top: '16mm', right: '15mm', bottom: '18mm', left: '15mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate: `
    <div style="width:100%;padding:0 15mm;font-family:sans-serif;font-size:7pt;
                color:#79817F;display:flex;justify-content:space-between;">
      <span>LeHart — Launch Readiness</span>
      <span class="pageNumber"></span>
    </div>`,
});

await browser.close();
console.log('written', OUT);
