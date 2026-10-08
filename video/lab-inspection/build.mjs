#!/usr/bin/env node
/**
 * Writes index.html — the LeHart 70-point inspection film — from the list of
 * checks below, with every timing and sound effect derived from it.
 *
 *   node build.mjs          # writes index.html and assets/sfx/bed.wav
 *   npm run render          # renders ../../public/videos/lab-inspection.mp4
 *
 * Every visible "pop" has a sound: each check plays a pop as it lands (three
 * pitches, rotated), each group opens with a whoosh and closes with a ding,
 * and the seal lands with a stamp and a chime. Keep the group sizes in step
 * with the product page (src/components/pdp/PdpQualityInspector.tsx).
 */
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));

const GROUPS = [
  {
    key: 'batt', title: 'Battery & power', screen: 's-batt',
    checks: [
      'Battery health measured (iPhone 85%+)', 'Charge cycle count read', 'Wired charging', 'Fast charging',
      'Wireless charging (where fitted)', 'Charging port contacts', 'Battery temperature under load',
      'Peak performance capability', 'Discharge rate under stress', 'No battery swelling',
      'Power button', 'Restart and shutdown',
    ],
  },
  {
    key: 'disp', title: 'Display & touch', screen: 's-touch',
    checks: [
      'Touch response, every zone', 'Multi-touch', 'No dead pixels', 'No stuck pixels', 'Brightness, full range',
      'Colour and True Tone', 'Auto-brightness', 'Refresh rate', 'No burn-in or ghosting', 'No glass cracks or chips',
      'Even backlight', 'Volume buttons', 'Haptics and vibration', 'Mute switch / Action button',
    ],
  },
  {
    key: 'cam', title: 'Cameras & sensors', screen: 's-cam',
    checks: [
      'Main camera focus', 'Ultra-wide camera', 'Telephoto camera (where fitted)', 'Front camera',
      'Image stabilisation', 'Flash and torch', '4K video recording', 'Face ID / fingerprint',
      'Proximity sensor', 'Ambient light sensor', 'Gyroscope and accelerometer', 'Compass',
      'Earpiece speaker', 'Loudspeaker', 'Top microphone', 'Bottom microphone',
    ],
  },
  {
    key: 'net', title: 'Connectivity & SIM', screen: 's-net',
    checks: [
      'SIM tray and reader', 'eSIM', '4G / 5G signal', 'Calls in and out', 'Wi-Fi', 'Bluetooth', 'GPS',
      'NFC and contactless pay', 'Network unlocked', 'IMEI clean (not lost or stolen)',
    ],
  },
  {
    key: 'data', title: 'Data & cleaning', screen: 's-wipe',
    checks: [
      'Previous owner\'s data erased', 'Find My / Google lock removed', 'All accounts signed out',
      'No business (MDM) lock', 'Latest software installed', 'Software integrity check', 'Factory settings restored',
      'Charging port cleaned', 'Speaker grilles cleaned', 'Screen cleaned', 'Body sanitised', 'Frame inspected',
      'Back glass inspected', 'Buttons feel and travel', 'Cosmetic grade assigned', 'Condition notes recorded',
      'Packed with protection', 'Final quality sign-off',
    ],
  },
];

const total = GROUPS.reduce((n, g) => n + g.checks.length, 0);
if (total !== 70) throw new Error(`The film must show exactly 70 checks; the list has ${total}.`);

// ── Timeline ────────────────────────────────────────────────────────────
const STEP = 0.34;       // seconds between checks
const INTRO = 2.8;
const LEAD = 0.65;       // group title on screen before its first check
const HOLD = 0.75;       // after the group's last check
const GAP = 0.35;        // fade between groups

let t = INTRO;
const plan = GROUPS.map(g => {
  const start = t;
  const rows = g.checks.map((text, i) => ({ text, at: +(start + LEAD + i * STEP).toFixed(2) }));
  const last = rows[rows.length - 1].at;
  const end = +(last + HOLD).toFixed(2);
  t = end + GAP;
  return { ...g, start: +start.toFixed(2), rows, done: +(last + 0.3).toFixed(2), end };
});
const FINALE = +(t + 0.1).toFixed(2);
const DURATION = +(FINALE + 4.2).toFixed(2);

// ── Sound: an ambient bed as long as the film ───────────────────────────
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i',
  `aevalsrc='0.10*sin(2*PI*55*t)+0.06*sin(2*PI*82.5*t)+0.03*sin(2*PI*110*t)*(0.5+0.5*sin(2*PI*0.25*t))':s=44100:d=${DURATION}`,
  '-af', `afade=t=in:d=0.8,afade=t=out:st=${(DURATION - 1.4).toFixed(2)}:d=1.4,lowpass=f=400`,
  join(HERE, 'assets/sfx/bed.wav')]);

const audio = [];
let n = 0;
const sfx = (src, at, dur, vol = 1) => {
  n += 1;
  audio.push(`      <audio id="a${n}" class="clip" data-start="${at.toFixed(2)}" data-duration="${dur}" data-volume="${vol}" src="assets/sfx/${src}.wav"></audio>`);
};
sfx('bed', 0, DURATION, 0.9);
sfx('whoosh', 0.05, 0.6, 0.8);
sfx('scan', 0.95, 0.9, 0.7);
plan.forEach(g => {
  sfx('whoosh', g.start, 0.6, 0.6);
  g.rows.forEach((r, i) => sfx(`pop${(i % 3) + 1}`, r.at, 0.14, 0.9));
  sfx('done', g.done, 0.6, 0.8);
});
sfx('whoosh', FINALE - 0.05, 0.6, 0.7);
sfx('stamp', FINALE + 0.3, 0.4, 1);
sfx('chime', FINALE + 0.35, 1.6, 0.8);

// ── Markup ──────────────────────────────────────────────────────────────
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const stages = plan.map((g, i) => `
          <div class="stage" id="st-${g.key}">
            <div class="k">${String(i + 1).padStart(2, '0')} · ${g.checks.length} checks</div>
            <h2>${esc(g.title)}</h2>
            <ol class="checks${g.checks.length > 14 ? ' checks--dense' : ''}">
${g.rows.map((r, j) => `              <li><span class="ok">✓</span><span class="n">${String(plan.slice(0, i).reduce((s, x) => s + x.checks.length, 0) + j + 1).padStart(2, '0')}</span>${esc(r.text)}</li>`).join('\n')}
            </ol>
          </div>`).join('');

const timeline = [];
plan.forEach((g, i) => {
  const len = g.end - g.start;
  timeline.push(`tl.fromTo('#${g.screen}', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.4 }, ${g.start});`);
  timeline.push(`tl.fromTo('#st-${g.key}', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.45 }, ${g.start});`);
  timeline.push(`tl.fromTo('#rail i:nth-child(${i + 1}) b', { scaleX: 0 }, { scaleX: 1, duration: ${len.toFixed(2)}, ease: 'none' }, ${g.start});`);
  g.rows.forEach((r, j) => {
    const sel = `#st-${g.key} li:nth-child(${j + 1})`;
    timeline.push(`tl.fromTo('${sel}', { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.22 }, ${r.at});`);
    timeline.push(`tl.fromTo('${sel} .ok', { scale: 0 }, { scale: 1, duration: 0.3, ease: 'back.out(3)' }, ${r.at});`);
    timeline.push(`tl.set('#count', { textContent: '${plan.slice(0, i).reduce((s, x) => s + x.checks.length, 0) + j + 1}' }, ${r.at});`);
    timeline.push(`tl.to('#counter .value', { scale: 1.12, duration: 0.08 }, ${r.at}).to('#counter .value', { scale: 1, duration: 0.17 }, ${(r.at + 0.08).toFixed(2)});`);
  });
  if (i < plan.length - 1) {
    timeline.push(`tl.to('#${g.screen}', { opacity: 0, scale: 1.04, duration: 0.3, ease: 'power2.in' }, ${(g.end - 0.05).toFixed(2)});`);
    timeline.push(`tl.to('#st-${g.key}', { opacity: 0, x: -30, duration: 0.3, ease: 'power2.in' }, ${(g.end - 0.05).toFixed(2)});`);
  }
});

// Screen details, spread across each group's own time.
const at = key => plan.find(g => g.key === key);
const B = at('batt'), D = at('disp'), C = at('cam'), N = at('net'), W = at('data');
const span = g => g.end - g.start;
timeline.push(`tl.fromTo('#battFill', { height: 0 }, { height: 180, duration: ${(span(B) * 0.6).toFixed(2)}, ease: 'power2.out' }, ${B.start + 0.4});`);
timeline.push(`tl.to('#pct', { textContent: 90, snap: { textContent: 1 }, duration: ${(span(B) * 0.6).toFixed(2)}, ease: 'power2.out' }, ${B.start + 0.4});`);
timeline.push(`tl.fromTo('#touch i', { backgroundColor: 'rgba(255,255,255,0.06)' }, { backgroundColor: '#eab308', duration: 0.2, stagger: { each: ${(span(D) * 0.55 / 60).toFixed(3)}, grid: [10, 6], from: 'start' }, ease: 'none' }, ${D.start + 0.4});`);
timeline.push(`tl.to('#touch i', { backgroundColor: 'rgba(34,197,94,0.55)', duration: 0.3, ease: 'none' }, ${(D.end - 0.9).toFixed(2)});`);
['ring1', 'ring2', 'ring3'].forEach((r, i) =>
  timeline.push(`tl.fromTo('#${r}', { opacity: 0, scale: 1.5 }, { opacity: 1, scale: 1, duration: 0.35 }, ${(C.start + 0.6 + i * span(C) * 0.25).toFixed(2)});`));
timeline.push(`tl.fromTo('#bars b', { scaleY: 0 }, { scaleY: 1, duration: 0.25, stagger: ${(span(N) * 0.15).toFixed(2)} }, ${N.start + 0.5});`);
timeline.push(`tl.fromTo('#s-net .chip', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 }, ${(N.end - 1.2).toFixed(2)});`);
timeline.push(`tl.fromTo('#wipeFill', { scaleX: 0 }, { scaleX: 1, duration: ${(span(W) * 0.45).toFixed(2)}, ease: 'power1.inOut' }, ${W.start + 0.5});`);

// Finale
timeline.push(`tl.to('#phone, #step, #rail, #railLabels', { opacity: 0, duration: 0.3, ease: 'power2.in' }, ${(FINALE - 0.15).toFixed(2)});`);
timeline.push(`tl.to('#finale', { opacity: 1, duration: 0.35, ease: 'power2.out' }, ${FINALE});`);
timeline.push(`tl.fromTo('#seal', { scale: 1.8, opacity: 0, rotation: -12 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.35, ease: 'back.out(2)' }, ${(FINALE + 0.25).toFixed(2)});`);
timeline.push(`tl.from('#finale h3, #finale p, #finale .pass', { y: 24, opacity: 0, duration: 0.45, stagger: 0.15 }, ${(FINALE + 0.6).toFixed(2)});`);

const html = `<!doctype html>
<html lang="en" data-resolution="square">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1080" />
    <!--
      GENERATED by build.mjs — edit the checks there, then run: node build.mjs
      LeHart 70-point inspection — HyperFrames composition (1080x1080, ${DURATION}s).
    -->
    <script src="assets/js/gsap.min.js"></script>
    <style>
      @font-face { font-family: Rubik; font-weight: 700; src: url(assets/fonts/rubik-latin-700-normal.woff2) format('woff2'); }
      @font-face { font-family: Rubik; font-weight: 800; src: url(assets/fonts/rubik-latin-800-normal.woff2) format('woff2'); }
      @font-face { font-family: Rubik; font-weight: 900; src: url(assets/fonts/rubik-latin-900-normal.woff2) format('woff2'); }
      @font-face { font-family: 'Nunito Sans'; font-weight: 400; src: url(assets/fonts/nunito-sans-latin-400-normal.woff2) format('woff2'); }
      @font-face { font-family: 'Nunito Sans'; font-weight: 600; src: url(assets/fonts/nunito-sans-latin-600-normal.woff2) format('woff2'); }
      @font-face { font-family: 'Nunito Sans'; font-weight: 700; src: url(assets/fonts/nunito-sans-latin-700-normal.woff2) format('woff2'); }
      :root { --ink: #0c0a09; --gold: #eab308; --gold-deep: #a16207; --green: #22c55e; --text: #fafaf9; --muted: #a8a29e; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: 1080px; height: 1080px; overflow: hidden; background: var(--ink); }
      #root { position: relative; width: 1080px; height: 1080px; overflow: hidden; font-family: 'Nunito Sans', sans-serif; color: var(--text);
        background: radial-gradient(circle at 28% 45%, rgba(234,179,8,0.10), transparent 55%), linear-gradient(160deg, #171412 0%, #0c0a09 70%); }
      .clip { position: absolute; inset: 0; }
      .abs { position: absolute; }
      .grid-bg { position: absolute; inset: 0; opacity: 0.35;
        background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
        background-size: 54px 54px; }
      #brand { left: 56px; top: 50px; display: flex; align-items: center; gap: 14px; }
      #brand .mark { width: 46px; height: 46px; border-radius: 12px; background: var(--gold-deep); display: grid; place-items: center; }
      #brand .name { font-family: Rubik; font-weight: 900; font-size: 30px; letter-spacing: -0.5px; }
      #brand .name b { color: var(--gold); }
      #brand .where { font-size: 18px; color: var(--muted); font-weight: 600; margin-left: 6px; }
      #counter { right: 56px; top: 42px; text-align: right; }
      #counter .label { font-size: 15px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); font-weight: 700; }
      #counter .value { font-family: Rubik; font-weight: 900; font-size: 56px; line-height: 1.05; transform-origin: right center; }
      #counter .value .of { color: var(--muted); font-size: 34px; }
      #count { display: inline-block; min-width: 66px; text-align: right; }

      #phone { left: 56px; top: 200px; width: 320px; height: 650px; border-radius: 52px; background: linear-gradient(180deg, #46484e, #2c2e33); padding: 13px;
        box-shadow: 0 40px 90px rgba(0,0,0,0.55), inset 0 0 0 2px rgba(255,255,255,0.06); }
      #phone .btn { position: absolute; width: 6px; border-radius: 3px; background: var(--gold); }
      #screen { position: relative; width: 100%; height: 100%; border-radius: 41px; overflow: hidden; background: linear-gradient(180deg, #14161a, #07080a); }
      #island { left: 50%; top: 17px; width: 98px; height: 28px; margin-left: -49px; border-radius: 14px; background: #000; z-index: 5; }
      #beam { left: -10%; width: 120%; height: 90px; top: -90px; z-index: 4;
        background: linear-gradient(180deg, transparent, rgba(234,179,8,0.55) 70%, rgba(250,250,249,0.95) 72%, transparent 74%); }
      .scr { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; opacity: 0; }
      .scr .cap { font-size: 16px; color: var(--muted); font-weight: 700; letter-spacing: 1px; text-align: center; }
      #batt { width: 112px; height: 206px; border: 6px solid #e7e5e4; border-radius: 22px; position: relative; padding: 8px; }
      #batt::before { content: ''; position: absolute; top: -20px; left: 32px; width: 36px; height: 12px; border-radius: 4px 4px 0 0; background: #e7e5e4; }
      #battFill { position: absolute; left: 8px; right: 8px; bottom: 8px; height: 0; max-height: calc(100% - 16px); border-radius: 12px; background: linear-gradient(0deg, var(--green), #86efac); }
      #battPct { font-family: Rubik; font-weight: 900; font-size: 60px; margin-top: 30px; }
      #touch { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; width: 246px; }
      #touch i { display: block; height: 42px; border-radius: 8px; background: rgba(255,255,255,0.06); }
      #lenses { position: relative; width: 200px; height: 200px; border-radius: 46px; background: #26282d; box-shadow: inset 0 0 0 2px rgba(255,255,255,0.06); }
      .lens { position: absolute; width: 80px; height: 80px; border-radius: 50%; background: radial-gradient(circle, #1e3a5f 0 18%, #0b0d10 20% 60%, #33363c 62%); }
      .ring { position: absolute; width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--gold); opacity: 0; }
      #bars { display: flex; align-items: flex-end; gap: 14px; height: 160px; }
      #bars i { display: block; width: 32px; border-radius: 8px; background: rgba(255,255,255,0.10); }
      #bars i b { display: block; width: 100%; height: 100%; border-radius: 8px; background: var(--gold); transform-origin: bottom; transform: scaleY(0); }
      .chip { margin-top: 28px; padding: 10px 20px; border-radius: 999px; background: rgba(34,197,94,0.15); color: #86efac; font-weight: 700; font-size: 19px; opacity: 0; }
      #wipeBar { width: 236px; height: 18px; border-radius: 9px; background: rgba(255,255,255,0.08); overflow: hidden; margin-top: 26px; }
      #wipeFill { width: 100%; height: 100%; background: linear-gradient(90deg, var(--gold-deep), var(--gold)); transform-origin: left; transform: scaleX(0); }
      #lock { width: 104px; height: 104px; border-radius: 26px; background: rgba(234,179,8,0.14); display: grid; place-items: center; }

      #step { left: 418px; top: 168px; width: 606px; height: 720px; }
      .stage { position: absolute; left: 0; top: 0; width: 606px; opacity: 0; }
      .stage .k { font-size: 16px; letter-spacing: 4px; text-transform: uppercase; color: var(--gold); font-weight: 700; }
      .stage h2 { font-family: Rubik; font-weight: 900; font-size: 46px; line-height: 1.02; letter-spacing: -1.2px; margin: 8px 0 16px; }
      .checks { list-style: none; columns: 1; }
      .checks li { display: flex; align-items: center; gap: 12px; font-size: 23px; font-weight: 600; color: #e7e5e4; height: 37px; opacity: 0; white-space: nowrap; }
      .checks--dense li { font-size: 21px; height: 31.5px; gap: 10px; }
      .checks li .ok { flex: none; width: 26px; height: 26px; border-radius: 50%; background: var(--green); color: #052e16; display: grid; place-items: center; font-size: 16px; font-weight: 900; }
      .checks li .n { flex: none; width: 30px; font-family: Rubik; font-weight: 700; font-size: 15px; color: var(--muted); }
      .checks--dense li .ok { width: 23px; height: 23px; font-size: 14px; }

      #rail { left: 56px; top: 960px; width: 968px; display: flex; gap: 10px; }
      #rail i { flex: 1; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.10); overflow: hidden; }
      #rail i b { display: block; width: 100%; height: 100%; background: var(--gold); transform-origin: left; transform: scaleX(0); }
      #railLabels { left: 56px; top: 982px; width: 968px; display: flex; gap: 10px; font-size: 15px; color: var(--muted); font-weight: 700; }
      #railLabels span { flex: 1; }

      #intro { left: 418px; top: 330px; width: 600px; }
      #intro .k { font-size: 18px; letter-spacing: 4px; color: var(--gold); font-weight: 700; text-transform: uppercase; }
      #intro h1 { font-family: Rubik; font-weight: 900; font-size: 92px; line-height: 0.95; letter-spacing: -3px; margin-top: 16px; }
      #intro p { font-size: 26px; color: var(--muted); margin-top: 22px; font-weight: 600; }
      #finale { inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; opacity: 0;
        background: radial-gradient(circle at 50% 42%, rgba(234,179,8,0.18), transparent 60%), #0c0a09; }
      #seal { width: 300px; height: 300px; border-radius: 50%; border: 8px solid var(--gold); display: grid; place-items: center; position: relative; }
      #seal::after { content: ''; position: absolute; inset: 14px; border-radius: 50%; border: 2px dashed rgba(234,179,8,0.6); }
      #seal .n { font-family: Rubik; font-weight: 900; font-size: 104px; line-height: 0.9; }
      #seal .t { font-size: 20px; letter-spacing: 4px; color: var(--gold); font-weight: 700; text-transform: uppercase; margin-top: 6px; }
      #finale h3 { font-family: Rubik; font-weight: 900; font-size: 62px; letter-spacing: -1.5px; margin-top: 48px; }
      #finale h3 b { color: var(--gold); }
      #finale p { font-size: 26px; color: var(--muted); font-weight: 600; margin-top: 14px; }
      #finale .pass { margin-top: 30px; padding: 12px 26px; border-radius: 999px; background: rgba(34,197,94,0.16); color: #86efac; font-size: 24px; font-weight: 700; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${DURATION}" data-width="1080" data-height="1080">
      <div id="scene" class="clip" data-start="0" data-duration="${DURATION}" data-track-index="0">
        <div class="grid-bg"></div>
        <div id="brand" class="abs">
          <div class="mark"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg></div>
          <div class="name">Le<b>Hart</b></div>
          <div class="where">Lab · Ilford, Essex</div>
        </div>
        <div id="counter" class="abs">
          <div class="label">Checks passed</div>
          <div class="value"><span id="count">0</span><span class="of"> / 70</span></div>
        </div>

        <div id="phone" class="abs">
          <i class="btn" style="left:-6px;top:140px;height:42px"></i>
          <i class="btn" style="left:-6px;top:196px;height:66px"></i>
          <i class="btn" style="right:-6px;top:178px;height:86px"></i>
          <div id="screen">
            <div id="island" class="abs"></div>
            <div id="beam" class="abs" data-layout-allow-overflow></div>
            <div id="s-batt" class="scr"><div id="batt"><div id="battFill"></div></div><div id="battPct"><span id="pct">0</span>%</div><div class="cap">BATTERY HEALTH</div></div>
            <div id="s-touch" class="scr"><div id="touch">${'<i></i>'.repeat(60)}</div><div class="cap" style="margin-top:20px">TOUCH · EVERY ZONE</div></div>
            <div id="s-cam" class="scr">
              <div id="lenses">
                <div class="lens" style="left:16px;top:16px"></div><div class="lens" style="left:16px;top:104px"></div><div class="lens" style="left:104px;top:60px"></div>
                <div class="ring" id="ring1" style="left:6px;top:6px"></div><div class="ring" id="ring2" style="left:6px;top:94px"></div><div class="ring" id="ring3" style="left:94px;top:50px"></div>
              </div>
              <div class="cap" style="margin-top:28px">FOCUS · OIS · FACE ID</div>
            </div>
            <div id="s-net" class="scr"><div id="bars"><i style="height:30%"><b></b></i><i style="height:55%"><b></b></i><i style="height:78%"><b></b></i><i style="height:100%"><b></b></i></div><div class="chip">Network unlocked</div></div>
            <div id="s-wipe" class="scr">
              <div id="lock"><svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg></div>
              <div id="wipeBar"><div id="wipeFill"></div></div>
              <div class="cap" style="margin-top:16px">ERASED · CLEANED · GRADED</div>
            </div>
          </div>
        </div>

        <div id="intro" class="abs">
          <div class="k">Inside our lab</div>
          <h1>70-point<br />inspection</h1>
          <p>Every device. Every check.<br />Before it ships.</p>
        </div>

        <div id="step" class="abs">${stages}
        </div>

        <div id="rail" class="abs">${'<i><b></b></i>'.repeat(5)}</div>
        <div id="railLabels" class="abs"><span>Battery</span><span>Display</span><span>Cameras</span><span>Network</span><span>Data</span></div>

        <div id="finale" class="abs">
          <div id="seal"><div><div class="n">70</div><div class="t">of 70 passed</div></div></div>
          <h3>Le<b>Hart</b> Certified</h3>
          <p>12-month warranty · 30-day free returns</p>
          <div class="pass">✓ Ready to ship</div>
        </div>
      </div>

      <!-- Sound: ${audio.length} cues, one for every pop on screen -->
${audio.join('\n')}
    </div>

    <script>
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      tl.from('#phone', { y: 140, opacity: 0, duration: 0.8 }, 0.05)
        .from('#brand, #counter', { y: -30, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.1)
        .from('#intro > *', { x: 50, opacity: 0, duration: 0.6, stagger: 0.1 }, 0.2)
        .fromTo('#beam', { y: 0 }, { y: 760, duration: 0.85, ease: 'power1.inOut' }, 0.95)
        .to('#intro', { opacity: 0, x: -40, duration: 0.35, ease: 'power2.in' }, ${(INTRO - 0.4).toFixed(2)});
      ${timeline.join('\n      ')}
      window.__timelines = window.__timelines || {};
      window.__timelines['main'] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;

writeFileSync(join(HERE, 'index.html'), html);
console.log(`index.html: ${total} checks, ${audio.length} sound cues, ${DURATION}s`);
