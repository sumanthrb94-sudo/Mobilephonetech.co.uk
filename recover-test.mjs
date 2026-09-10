import { chromium } from 'playwright';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true })).newPage();

const notable = [];
page.on('pageerror', e => notable.push('[pageerror] ' + e.message));
page.on('console', m => { if (m.type() === 'error') notable.push('[console] ' + m.text()); });
page.on('framenavigated', f => { if (f === page.mainFrame()) notable.push('[navigated] ' + f.url()); });

await page.goto('http://127.0.0.1:5312/', { waitUntil: 'load' });

const t0 = Date.now();
console.log('t=0.0s  root children =', await page.evaluate(() => document.getElementById('root')?.childElementCount ?? -1), '  <- the white page');

await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, null, { timeout: 20000 })
  .then(() => console.log(`t=${((Date.now()-t0)/1000).toFixed(1)}s  RECOVERED`))
  .catch(() => console.log(`t=${((Date.now()-t0)/1000).toFixed(1)}s  STILL BLANK — recovery failed`));

console.log('body text:', (await page.evaluate(() => document.body.innerText)).slice(0, 120).replace(/\n/g, ' | '));
console.log('--- events ---');
for (const n of notable) console.log(' ', n.slice(0, 150));
await page.screenshot({ path: 'recovered.png' });

// A second visit must not loop: the marker is cleared on a good boot.
const p2 = await (await browser.newContext()).newPage();
await p2.goto('http://127.0.0.1:5312/', { waitUntil: 'load' });
await p2.waitForTimeout(5000);
console.log('second visit (fresh shell) root children =', await p2.evaluate(() => document.getElementById('root')?.childElementCount ?? -1));
await browser.close();
