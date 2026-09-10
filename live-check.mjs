import { chromium } from 'playwright';

const url = process.argv[2] || 'https://lehart.co.uk/';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true });
const page = await ctx.newPage();

const errs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', r => errs.push(`[reqfail] ${r.url().slice(0,110)} :: ${r.failure()?.errorText}`));

try {
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  console.log('HTTP', resp?.status());
} catch (e) {
  console.log('NAV FAILED:', e.message.split('\n')[0]);
}
await page.waitForTimeout(6000);

const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML.length ?? -1);
console.log('root innerHTML length =', rootHtml);
console.log('body text (first 200):', (await page.evaluate(() => document.body.innerText)).slice(0, 200).replace(/\n/g, ' | '));
console.log('--- console/network ---');
for (const e of [...new Set(errs)].slice(0, 30)) console.log(e.slice(0, 220));
await page.screenshot({ path: 'live-home.png', fullPage: false });
await browser.close();
