// Focus / caret / keyboard-input suite.
//
// Hunts for the class of defect the user describes as "cursor misplacements":
// tapping a field that does not focus, typing that lands somewhere else, and
// controlled-input caret jumps. Runs desktop + mobile against a built preview.
//
//   npm run build && npx vite preview --port 4173 &
//   npm run e2e:focus
//
// Screenshots land in e2e/screenshots/focus. Exits non-zero on any FAIL.
//
// DIAGNOSTIC SUITE: the assertions here are deliberately strict. If something
// fails, fix the app — do not soften the check.
//
// Every input is probed on a freshly loaded page so that typing into one field
// cannot pollute the state another field is measured in.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolveChromium } from './chromium-path.mjs';

const BASE = process.env.E2E_BASE_URL || 'http://127.0.0.1:4173';
const EXE  = resolveChromium();
const OUT  = process.env.E2E_SHOTS || 'e2e/screenshots/focus';
mkdirSync(OUT, { recursive: true });

const TAG = 'data-e2e-focus';

// `email` and `number` inputs expose no selection API (setSelectionRange /
// selectionStart throw or return null per spec), so caret position is measured
// on them behaviourally with arrow keys instead.
const SELECTION_API = new Set(['text', 'search', 'password', 'tel', 'url']);

const ROUTES = [
  { path: '/',         label: '/' },
  { path: '/products', label: '/products' },
  { path: '/checkout', label: '/checkout (guest gate)' },
  { path: '/checkout', label: '/checkout (shipping form)', viaCart: true, advance: 'guest', tabOrder: true },
  { path: '/account',  label: '/account' },
];

const results = [];
const defects = [];
let shotN = 0;

function rec(view, step, status, detail = '') {
  results.push({ view, step, status, detail });
  console.log(`[${view.padEnd(7)}] ${status.padEnd(4)} ${step}${detail ? ' — ' + detail : ''}`);
}
function defect(view, where, el, kind, detail) {
  defects.push({ view, where, el, kind, detail });
}
async function shot(page, view, name) {
  shotN++;
  await page.screenshot({ path: `${OUT}/${String(shotN).padStart(2, '0')}-${view}-${name}.png` }).catch(() => {});
}

async function dismissCookies(page) {
  const b = page.getByRole('button', { name: /accept all cookies/i });
  if (await b.count()) { await b.first().click().catch(() => {}); await page.waitForTimeout(400); }
}

// Put one product in the cart so /checkout renders its real form.
async function seedCart(page) {
  try {
    await page.goto(`${BASE}/product/apple-iphone-17-unlocked`, { waitUntil: 'domcontentloaded' });
    const add = page.getByRole('button', { name: /add to cart/i }).first();
    await add.waitFor({ timeout: 25000 });
    await dismissCookies(page);
    await add.click();
    await page.waitForTimeout(1500);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  } catch { /* the checkout checks below report if the form never appears */ }
}

// Load a route in the exact state we want to probe.
async function openRoute(page, spec, isMobile) {
  if (spec.viaCart) {
    // The shipping form only renders when CheckoutContext.currentStep is
    // 'shipping', which only the cart's CTA sets — so enter the way a user does.
    await page.goto(`${BASE}/cart`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
    await dismissCookies(page);
    const cta = page.getByRole('button', { name: /proceed to checkout/i }).first();
    if (await cta.count()) { await cta.click().catch(() => {}); await page.waitForTimeout(2600); }
    else await page.goto(`${BASE}${spec.path}`, { waitUntil: 'domcontentloaded' });
  } else {
    await page.goto(`${BASE}${spec.path}`, { waitUntil: 'domcontentloaded' });
  }
  await page.waitForTimeout(2800);
  await dismissCookies(page);
  // Mobile hides the facet panel behind a bottom-sheet toggle.
  if (spec.path === '/products' && isMobile) {
    const t = page.locator('#products-filter-toggle').first();
    if (await t.count()) { await t.click().catch(() => {}); await page.waitForTimeout(1200); }
  }
  // Checkout gates the shipping form behind sign-in / guest email.
  if (spec.advance === 'guest') {
    const ge = page.locator('input[name="guestEmail"]');
    if (await ge.count()) {
      await ge.first().fill('e2e-focus@example.com').catch(() => {});
      const go = page.getByRole('button', { name: /continue as guest/i }).first();
      if (await go.count()) { await go.click().catch(() => {}); await page.waitForTimeout(2200); }
    }
  }
  await page.waitForTimeout(400);
}

// ── Tag every visible, editable text-ish input and describe it ───────────────
async function collectInputs(page, limit = 14) {
  return page.evaluate(({ TAG, limit }) => {
    const WANTED = new Set(['text', 'email', 'password', 'number', 'search', 'tel', '']);
    const out = [];
    let n = 0;
    for (const el of document.querySelectorAll(`[${TAG}]`)) el.removeAttribute(TAG);
    for (const el of document.querySelectorAll('input')) {
      if (out.length >= limit) break;
      const type = (el.getAttribute('type') || '').toLowerCase();
      if (!WANTED.has(type)) continue;
      if (el.disabled || el.readOnly) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      const id = String(++n);
      el.setAttribute(TAG, id);
      let label = '';
      try { label = (el.labels && el.labels[0] ? el.labels[0].innerText : '') || ''; } catch {}
      if (!label) label = (el.closest('label')?.innerText || '');
      out.push({
        id,
        type: type || 'text',
        name: el.name || '',
        domId: el.id || '',
        placeholder: el.getAttribute('placeholder') || '',
        aria: el.getAttribute('aria-label') || '',
        label: label.replace(/\s+/g, ' ').trim().slice(0, 40),
        fontSize: Math.round(parseFloat(cs.fontSize) * 10) / 10,
      });
    }
    return out;
  }, { TAG, limit });
}

const keyOf = i => [i.type, i.name, i.domId, i.placeholder, i.aria, i.label].join('|');
const describe = i =>
  `input[type=${i.type}]` +
  (i.name ? `[name="${i.name}"]` : '') +
  (i.domId ? `#${i.domId}` : '') +
  (i.placeholder ? ` placeholder="${i.placeholder}"` : '') +
  (i.aria ? ` aria-label="${i.aria}"` : '') +
  (i.label ? ` label="${i.label}"` : '');

// Describe whatever currently holds focus.
const activeDesc = page => page.evaluate(() => {
  const a = document.activeElement;
  if (!a) return '(null)';
  if (a === document.body) return 'BODY';
  const cls = typeof a.className === 'string' ? a.className.trim().slice(0, 30) : '';
  return `${a.tagName}${a.id ? '#' + a.id : ''}${cls ? '.' + cls.replace(/\s+/g, '.') : ''}` +
         (a.getAttribute?.('name') ? `[name=${a.getAttribute('name')}]` : '') +
         (a.getAttribute?.('placeholder') ? ` ph="${a.getAttribute('placeholder')}"` : '') +
         (a.getAttribute?.('aria-label') ? ` aria="${a.getAttribute('aria-label')}"` : '');
});

// React controlled inputs ignore a plain `el.value = x`; use the native setter
// and dispatch input so component state actually follows.
const setValueNatively = (page, sel, value) => page.evaluate(({ sel, value }) => {
  const el = document.querySelector(sel);
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}, { sel, value });

const readField = (page, sel) => page.evaluate(({ sel }) => {
  const el = document.querySelector(sel);
  if (!el) return null;
  let selStart = null;
  try { selStart = el.selectionStart; } catch { selStart = null; }
  const a = document.activeElement;
  return {
    value: el.value,
    selStart,
    focused: a === el,
    active: a === document.body ? 'BODY'
      : `${a.tagName}${a.id ? '#' + a.id : ''}${a.getAttribute?.('name') ? '[name=' + a.getAttribute('name') + ']' : ''}${a.getAttribute?.('placeholder') ? ' ph="' + a.getAttribute('placeholder') + '"' : ''}`,
  };
}, { sel });

// ── Probe one input on a freshly loaded page ────────────────────────────────
async function probeInput(page, view, spec, isMobile, info, bad) {
  const sel = `[${TAG}="${info.id}"]`;
  const loc = page.locator(sel);
  const d = describe(info);
  const where = spec.label;
  const hasSelApi = SELECTION_API.has(info.type);
  const isNumber = info.type === 'number';

  // 6. Mobile font-size: < 16px makes iOS Safari zoom the page on focus.
  if (isMobile && info.fontSize < 16) {
    bad.font.push(`${d} (${info.fontSize}px)`);
    defect(view, where, d, 'mobile-font-size', `computed font-size ${info.fontSize}px < 16px — iOS Safari zooms the page on focus`);
  }

  // 5. Nothing covering the field: elementFromPoint at its centre is the input.
  // Measured at two scroll positions, because they fail for different reasons:
  //   centred  — a true overlay sits on top of the field wherever it is
  //   top-edge — where the browser parks a field it auto-scrolls to (anchor
  //              jump, focus-on-error, Tab into an off-screen field); a sticky
  //              header that overlaps here swallows the tap.
  const coverAt = async (block) => {
    const r = await page.evaluate(({ sel, block }) => {
      const el = document.querySelector(sel);
      if (!el) return { ok: false, why: 'element no longer in the DOM', overlap: 0 };
      el.scrollIntoView({ block, inline: 'nearest' });
      const b = el.getBoundingClientRect();
      const x = Math.round(b.left + b.width / 2);
      const y = Math.round(b.top + b.height / 2);
      if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return { ok: true, why: '', overlap: 0 };
      const top = document.elementFromPoint(x, y);
      if (!top) return { ok: false, why: 'elementFromPoint returned null', overlap: 0 };
      if (top === el || el.contains(top)) return { ok: true, why: '', overlap: 0 };
      const cls = typeof top.className === 'string' ? top.className.trim().slice(0, 40) : '';
      const blocker = top.closest('header, nav, [class*="sticky"], [class*="navbar"]') || top;
      const br = blocker.getBoundingClientRect();
      const cs = getComputedStyle(blocker);
      return {
        ok: false,
        overlap: Math.max(0, Math.round(br.bottom - b.top)),
        why: `${top.tagName}${top.id ? '#' + top.id : ''}${cls ? '.' + cls.replace(/\s+/g, '.') : ''}` +
             ` text="${(top.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)}"` +
             ` inside ${blocker.tagName}${blocker.id ? '#' + blocker.id : ''} (position:${cs.position}, z-index:${cs.zIndex})`,
      };
    }, { sel, block });
    await page.waitForTimeout(120);
    return r;
  };

  const centred = await coverAt('center').catch(e => ({ ok: false, why: e.message.slice(0, 60), overlap: 0 }));
  if (!centred.ok) {
    bad.covered.push(`${d} <- ${centred.why}`);
    defect(view, where, d, 'covered-by-overlay',
      `with the field centred in the viewport, elementFromPoint at its centre hits ${centred.why} — taps land on that instead`);
  }
  const topEdge = await coverAt('start').catch(e => ({ ok: false, why: e.message.slice(0, 60), overlap: 0 }));
  if (!topEdge.ok && centred.ok) {
    bad.sticky.push(`${d} <- ${topEdge.why} (covers ${topEdge.overlap}px of it)`);
    defect(view, where, d, 'covered-by-sticky-header-when-scrolled-to-top',
      `when the field is scrolled to the top of the viewport (anchor jump / focus-on-error / Tab into an ` +
      `off-screen field), its centre is covered by ${topEdge.why}, overlapping ${topEdge.overlap}px. ` +
      `A tap there hits the header. Fix with scroll-margin-top on the field or scroll-padding-top on the scroller.`);
  }

  await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(150);

  // 1. Click / tap focuses it.
  let focused = false;
  try {
    if (isMobile) await loc.tap({ timeout: 5000 });
    else await loc.click({ timeout: 5000 });
    await page.waitForTimeout(300);
    focused = await page.evaluate(({ sel }) => document.activeElement === document.querySelector(sel), { sel });
    if (!focused) {
      const who = await activeDesc(page);
      bad.focus.push(`${d} -> focus went to ${who}`);
      defect(view, where, d, 'not-focused-on-tap', `after ${isMobile ? 'tap' : 'click'} document.activeElement is ${who}`);
    }
  } catch (e) {
    const msg = e.message.split('\n')[0].slice(0, 100);
    bad.focus.push(`${d} -> ${isMobile ? 'tap' : 'click'} failed: ${msg}`);
    defect(view, where, d, 'not-focused-on-tap', `${isMobile ? 'tap' : 'click'} threw: ${msg}`);
  }
  if (!focused) return; // the remaining checks need focus to mean anything

  // 2. Typing lands in THIS field. Clear it first so the comparison is exact.
  const text = isNumber ? '4217' : 'Test123';
  await setValueNatively(page, sel, '');
  await page.waitForTimeout(300);
  const kept = await page.evaluate(({ sel }) => document.activeElement === document.querySelector(sel), { sel });
  if (!kept) {
    const who = await activeDesc(page);
    bad.typed.push(`${d} -> lost focus on re-render, focus now ${who}`);
    defect(view, where, d, 'focus-stolen-by-rerender', `an input-event re-render moved focus to ${who}`);
    return;
  }
  await page.keyboard.type(text, { delay: 40 });
  await page.waitForTimeout(400);
  const after = await readField(page, sel);
  if (!after) {
    bad.typed.push(`${d} -> element vanished mid-typing`);
    defect(view, where, d, 'element-vanished-while-typing', 'input was removed from the DOM while typing into it');
    return;
  }
  if (after.value !== text) {
    bad.typed.push(`${d} -> expected "${text}" got "${after.value}" (focus ${after.active})`);
    defect(view, where, d, 'typed-text-mismatch',
      `typed "${text}" one key at a time; field holds "${after.value}"; focus ended on ${after.active}`);
  }
  if (!after.focused) {
    bad.typed.push(`${d} -> focus ended on ${after.active}`);
    defect(view, where, d, 'focus-lost-during-typing', `focus ended on ${after.active} instead of the field`);
  }

  // 3. Caret sits at the end of what was typed, not back at 0.
  if (!hasSelApi) {
    bad.caretSkipped.push(info.type);
  } else if (after.selStart !== after.value.length) {
    bad.caret.push(`${d} -> selectionStart ${after.selStart} of ${after.value.length}`);
    defect(view, where, d, 'caret-not-at-end',
      `after typing "${text}" selectionStart=${after.selStart}, expected ${after.value.length} (caret jumped)`);
  }

  // 4. Mid-string insertion: the caret must stay put, not jump to the end.
  const base = isNumber ? '123456' : 'abcdef';
  const ins  = isNumber ? '9' : 'X';
  const want = base.slice(0, 3) + ins + base.slice(3);
  await setValueNatively(page, sel, base);
  await page.waitForTimeout(400);
  const seeded = await readField(page, sel);
  if (!seeded) {
    bad.mid.push(`${d} -> element vanished before mid-string edit`);
  } else if (seeded.value !== base) {
    bad.mid.push(`${d} -> could not seed "${base}", field holds "${seeded.value}"`);
    defect(view, where, d, 'controlled-value-rejected',
      `set to "${base}" via the native setter + input event, field holds "${seeded.value}"`);
  } else {
    // Put the caret between the 3rd and 4th character. Types without the
    // selection API get there with End + ArrowLeft, which is what a user does.
    let placed = true;
    if (hasSelApi) {
      placed = await page.evaluate(({ sel }) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        el.focus();
        try { el.setSelectionRange(3, 3); } catch { return false; }
        return el.selectionStart === 3;
      }, { sel });
    } else {
      await loc.focus().catch(() => {});
      await page.keyboard.press('End');
      for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(150);
    }
    if (!placed) {
      bad.mid.push(`${d} -> setSelectionRange(3,3) did not stick`);
      defect(view, where, d, 'selection-range-rejected', 'setSelectionRange(3,3) did not move the caret');
    } else {
      await page.keyboard.type(ins, { delay: 40 });
      await page.waitForTimeout(400);
      const mid = await readField(page, sel);
      const valueOk = mid && mid.value === want;
      const caretOk = !hasSelApi || (mid && mid.selStart === 4);
      if (!valueOk || !caretOk) {
        bad.mid.push(`${d} -> expected "${want}"${hasSelApi ? '/caret 4' : ''}, got "${mid?.value}"${hasSelApi ? '/caret ' + mid?.selStart : ''}`);
        defect(view, where, d, 'caret-jump-on-mid-string-edit',
          `seeded "${base}", caret placed after char 3, typed "${ins}" -> value "${mid?.value}"` +
          (hasSelApi ? ` caret ${mid?.selStart}` : '') +
          ` (expected "${want}"${hasSelApi ? ' caret 4' : ''})` +
          (mid && mid.value === base + ins ? ' — the caret jumped to the end' : ''));
      }
    }
  }
}

// ── All inputs on one route ────────────────────────────────────────────────
async function checkRoute(page, view, spec, isMobile) {
  const where = spec.label;
  await openRoute(page, spec, isMobile);
  const inputs = await collectInputs(page);
  await shot(page, view, `route${where.replace(/[^\w]+/g, '-')}`);
  if (!inputs.length) {
    rec(view, `Inputs found on ${where}`, 'WARN', 'no visible editable text inputs on this route');
    return;
  }
  rec(view, `Inputs found on ${where}`, 'PASS', `${inputs.length}: ${inputs.map(i => i.name || i.domId || i.placeholder || i.type).join(', ')}`);

  const bad = { focus: [], typed: [], caret: [], mid: [], covered: [], sticky: [], font: [], caretSkipped: [] };

  for (let i = 0; i < inputs.length; i++) {
    if (i > 0) {
      // Fresh page per input: typing in one field must not colour the next.
      await openRoute(page, spec, isMobile);
      const again = await collectInputs(page);
      const match = again.find(x => keyOf(x) === keyOf(inputs[i]));
      if (!match) {
        bad.focus.push(`${describe(inputs[i])} -> not present on a fresh load of ${where}`);
        continue;
      }
      inputs[i].id = match.id;
      inputs[i].fontSize = match.fontSize;
    }
    try {
      await probeInput(page, view, spec, isMobile, inputs[i], bad);
    } catch (e) {
      bad.focus.push(`${describe(inputs[i])} -> probe error: ${e.message.split('\n')[0].slice(0, 90)}`);
    }
  }

  const say = (step, list, extra = '') =>
    rec(view, `${step} — ${where}`, list.length ? 'FAIL' : 'PASS',
        list.length ? `${list.length}/${inputs.length} bad: ${list.join(' | ').slice(0, 460)}` : `${inputs.length} inputs${extra}`);

  say('Click/tap focuses the input', bad.focus);
  say('Typed text lands in the focused input', bad.typed);
  say('Caret ends at end of typed text', bad.caret,
      bad.caretSkipped.length ? ` (${bad.caretSkipped.length} ${[...new Set(bad.caretSkipped)].join('/')} inputs expose no selection API — covered by the mid-string check)` : '');
  say('Mid-string typing does not jump the caret', bad.mid);
  say('Input is not covered by an overlay (centred)', bad.covered);
  say('Input is not covered by the sticky header (scrolled to top)', bad.sticky);
  if (isMobile) say('Input font-size >= 16px (no iOS zoom)', bad.font);
}

// ── 7. Tab order on the checkout form ───────────────────────────────────────
async function checkTabOrder(page, view, spec, isMobile) {
  try {
    await openRoute(page, spec, isMobile);
    // Walk the biggest form on the page — the checkout form proper, not the
    // header search or the one-field coupon box.
    const start = await page.evaluate(() => {
      const forms = [...document.querySelectorAll('form')];
      if (!forms.length) return null;
      const best = forms
        .map(f => ({ f, n: f.querySelectorAll('input, select, textarea, button').length }))
        .sort((a, b) => b.n - a.n)[0];
      if (!best || best.n < 2) return null;
      best.f.setAttribute('data-e2e-tabform', '1');
      const first = best.f.querySelector('input, select, textarea, button');
      if (!first) return null;
      first.scrollIntoView({ block: 'center' });
      first.focus();
      return { fields: best.n, first: first.getAttribute('name') || first.tagName };
    });
    if (!start) { rec(view, 'Checkout tab order never jumps backwards', 'WARN', 'no multi-field form on the page to tab through'); return; }
    await page.waitForTimeout(250);

    const seq = [];
    for (let i = 0; i < 18; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(160);
      const cur = await page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return null;
        const r = a.getBoundingClientRect();
        const cls = typeof a.className === 'string' ? a.className.trim().slice(0, 24) : '';
        return {
          inForm: !!a.closest('[data-e2e-tabform]'),
          top: Math.round(r.top + scrollY),
          left: Math.round(r.left),
          desc: `${a.tagName}${a.id ? '#' + a.id : ''}` +
                (a.getAttribute?.('name') ? `[name=${a.getAttribute('name')}]` : '') +
                (a.getAttribute?.('placeholder') ? ` ph="${a.getAttribute('placeholder')}"` : '') +
                (!a.id && !a.getAttribute?.('name') && cls ? `.${cls.replace(/\s+/g, '.')}` : ''),
        };
      });
      if (!cur || !cur.inForm) break;
      seq.push(cur);
    }

    const jumps = [];
    for (let i = 1; i < seq.length; i++) {
      const p = seq[i - 1], c = seq[i];
      const up = c.top < p.top - 8;
      const leftOnSameRow = Math.abs(c.top - p.top) <= 8 && c.left < p.left - 8;
      if (up || leftOnSameRow) jumps.push(`${p.desc} (y${p.top} x${p.left}) -> ${c.desc} (y${c.top} x${c.left})`);
    }
    await shot(page, view, 'checkout-tab-order');
    rec(view, 'Checkout tab order never jumps backwards', jumps.length ? 'FAIL' : 'PASS',
        jumps.length ? jumps.join(' | ').slice(0, 460) : `${seq.length} stops walked in order (form has ${start.fields} fields)`);
    jumps.forEach(j => defect(view, spec.label, j.split(' -> ')[0], 'tab-order-jumps-backwards', `Tab moved up/left the page: ${j}`));
    if (seq.length < 3) rec(view, 'Checkout tab reaches the form fields', 'WARN', `only ${seq.length} focusable stops inside the form`);
  } catch (e) {
    rec(view, 'Checkout tab order never jumps backwards', 'FAIL', e.message.split('\n')[0].slice(0, 120));
  }
}

// ── Side-finding: is there a form to focus at all on a direct /checkout hit? ──
// Reported as a WARN + defect rather than a FAIL: it is not itself a focus bug,
// but it blocks every focus check on the biggest form in the app.
async function checkDirectCheckoutLoad(page, view) {
  try {
    await page.goto(`${BASE}/checkout`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    await dismissCookies(page);
    const form = await page.locator('input[name="fullName"], input[name="addressLine1"]').count();
    const gate = await page.getByRole('button', { name: /continue as guest|sign in/i }).count();
    await shot(page, view, 'checkout-direct-load');
    const ok = form > 0 || gate > 0;
    rec(view, 'Direct /checkout load renders a step panel', ok ? 'PASS' : 'WARN',
        ok ? `${form} shipping fields, ${gate} gate buttons` : 'main column is empty — no shipping form, no gate');
    if (!ok) defect(view, '/checkout', 'CheckoutFlow main column', 'checkout-blank-on-direct-load',
      "loading /checkout directly while already a guest/signed-in renders nothing: CheckoutContext.currentStep " +
      "initialises to 'cart' and only the cart CTAs set it to 'shipping', while checkoutMode initialises to " +
      "'shipping' for a guest — so neither the selection panel nor the shipping form matches (src/context/" +
      "CheckoutContext.tsx:110 vs src/components/CheckoutFlow.tsx:73,447)");
  } catch (e) {
    rec(view, 'Direct /checkout load renders a step panel', 'WARN', e.message.split('\n')[0].slice(0, 120));
  }
}

// ── 8. The search field takes "iphone" verbatim ──────────────────────────────
async function checkSearch(page, view, isMobile) {
  try {
    await page.goto(`${BASE}/products`, { waitUntil: 'domcontentloaded' });
    await page.getByText(/items? available/i).first().waitFor({ timeout: 25000 }).catch(() => {});
    await dismissCookies(page);
    await page.waitForTimeout(800);

    if (isMobile) {
      const toggle = page.locator('button[aria-label="Search products"]').first();
      if (await toggle.count()) { await toggle.click(); await page.waitForTimeout(900); }
    }
    const input = page.locator('input[placeholder*="Search" i]:visible').first();
    if (!(await input.count())) { rec(view, 'Search field accepts "iphone" verbatim', 'FAIL', 'no visible search input'); return; }

    if (isMobile) await input.tap(); else await input.click();
    await page.waitForTimeout(300);
    const gotFocus = await input.evaluate(el => document.activeElement === el);
    rec(view, 'Search field focuses on click/tap', gotFocus ? 'PASS' : 'FAIL');
    if (!gotFocus) defect(view, '/products', 'header search input[placeholder*="Search"]', 'not-focused-on-tap', 'search field did not take focus');

    await page.keyboard.type('iphone', { delay: 70 });
    await page.waitForTimeout(900);
    const state = await input.evaluate(el => {
      let s = null; try { s = el.selectionStart; } catch {}
      return { value: el.value, selStart: s, focused: document.activeElement === el };
    });
    await shot(page, view, 'search-typed');
    const ok = state.value === 'iphone';
    rec(view, 'Search field accepts "iphone" verbatim', ok ? 'PASS' : 'FAIL', `value="${state.value}"`);
    if (!ok) defect(view, '/products', 'header search input[placeholder*="Search"]', 'search-value-mangled',
      `typed "iphone" one key at a time, field holds "${state.value}"`);
    const caretOk = state.selStart === null || state.selStart === state.value.length;
    rec(view, 'Search caret stays at the end', caretOk ? 'PASS' : 'FAIL', `selectionStart=${state.selStart} length=${state.value.length}`);
    if (!caretOk) defect(view, '/products', 'header search input[placeholder*="Search"]', 'search-caret-jump',
      `after typing "iphone" selectionStart=${state.selStart}, expected ${state.value.length}`);
    rec(view, 'Search keeps focus while typing', state.focused ? 'PASS' : 'FAIL');
    if (!state.focused) defect(view, '/products', 'header search input[placeholder*="Search"]', 'search-focus-lost',
      'the search input lost focus while typing (debounced re-render steals focus)');
  } catch (e) {
    rec(view, 'Search field accepts "iphone" verbatim', 'FAIL', e.message.split('\n')[0].slice(0, 120));
  }
}

// ── 9. Escape closes a modal and hands focus back somewhere sensible ─────────
async function checkEscape(page, view, isMobile) {
  try {
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await dismissCookies(page);
    const more = page.locator('[aria-label="More options"], [aria-label="Open menu"]').first();
    if (await more.count()) { await more.click(); await page.waitForTimeout(900); }
    const signIn = page.getByRole('button', { name: /sign in|log in|account/i }).first();
    if (!(await signIn.count())) { rec(view, 'Escape closes the auth modal', 'WARN', 'no sign-in control to open a modal'); return; }
    const trigger = ((await signIn.getAttribute('aria-label')) || (await signIn.innerText())).trim().replace(/\s+/g, ' ').slice(0, 40);
    await signIn.click();
    await page.waitForTimeout(1600);
    const before = await page.getByRole('button', { name: /continue with google/i }).count();
    if (!before) { rec(view, 'Escape closes the auth modal', 'WARN', 'auth modal did not open'); return; }
    await shot(page, view, 'modal-open');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    const afterCount = await page.getByRole('button', { name: /continue with google/i }).count();
    const closed = afterCount === 0;
    rec(view, 'Escape closes the auth modal', closed ? 'PASS' : 'FAIL',
        closed ? `opened by "${trigger}"` : `${before} modal(s) open before Escape, ${afterCount} still open`);
    if (!closed) defect(view, '/', `auth modal opened by "${trigger}"`, 'escape-does-not-close-modal',
      `Escape left the auth modal open (${before} instance(s) before, ${afterCount} after)`);

    const who = await activeDesc(page);
    const sensible = who !== 'BODY' && who !== '(null)' && !/^HTML/.test(who);
    rec(view, 'Escape returns focus to something focusable', sensible ? 'PASS' : 'FAIL', `activeElement=${who}`);
    if (!sensible) defect(view, '/', `auth modal opened by "${trigger}"`, 'focus-not-restored-on-escape',
      `after Escape document.activeElement is ${who} — focus should return to the trigger, not the document body`);
    await shot(page, view, 'modal-escaped');
  } catch (e) {
    rec(view, 'Escape closes the auth modal', 'FAIL', e.message.split('\n')[0].slice(0, 120));
  }
}

async function run(view, contextOpts) {
  const browser = await chromium.launch({ ...(EXE ? { executablePath: EXE } : {}), args: ['--no-sandbox'] });
  const ctx = await browser.newContext(contextOpts);
  const page = await ctx.newPage();
  const isMobile = view === 'mobile';

  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 160)));

  await seedCart(page);

  for (const spec of ROUTES) {
    try {
      await checkRoute(page, view, spec, isMobile);
      if (spec.tabOrder) await checkTabOrder(page, view, spec, isMobile);
    } catch (e) {
      rec(view, `Focus checks on ${spec.label}`, 'FAIL', e.message.split('\n')[0].slice(0, 120));
    }
  }

  await checkDirectCheckoutLoad(page, view);
  await checkSearch(page, view, isMobile);
  await checkEscape(page, view, isMobile);

  rec(view, 'No uncaught JS errors during focus checks', errors.length === 0 ? 'PASS' : 'FAIL',
      errors.slice(0, 2).join(' | '));

  await browser.close();
}

await run('desktop', { viewport: { width: 1440, height: 900 } });
await run('mobile', { ...devices['iPhone 12'] });

console.log('\n================ FOCUS SUMMARY ================');
const f = results.filter(r => r.status === 'FAIL');
const w = results.filter(r => r.status === 'WARN');
console.log(`PASS ${results.filter(r => r.status === 'PASS').length}  WARN ${w.length}  FAIL ${f.length}`);
if (f.length) { console.log('\n--- FAILURES ---'); f.forEach(x => console.log(`  [${x.view}] ${x.step} — ${x.detail}`)); }
if (w.length) { console.log('\n--- WARNINGS ---'); w.forEach(x => console.log(`  [${x.view}] ${x.step} — ${x.detail}`)); }
if (defects.length) {
  console.log(`\n--- DEFECTS (${defects.length}) ---`);
  defects.forEach((d, i) => console.log(`  ${String(i + 1).padStart(2)}. [${d.view}] ${d.where}  ${d.kind}\n      ${d.el}\n      ${d.detail}`));
}

process.exit(f.length ? 1 : 0);
