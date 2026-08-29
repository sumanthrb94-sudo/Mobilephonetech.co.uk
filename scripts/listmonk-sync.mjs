/**
 * Reconcile Firestore's newsletterSubscribers into the Listmonk list.
 *
 *   node scripts/listmonk-sync.mjs           # dry run — reports, changes nothing
 *   node scripts/listmonk-sync.mjs --apply   # actually writes to Listmonk
 *
 * Two jobs. First, the backfill: everyone who subscribed before Listmonk
 * existed is only in Firestore, and this walks them over. Second, the repair:
 * api/_routes/newsletter.ts syncs each signup as a best-effort side effect, so
 * an address can be missing because Listmonk was down for ten minutes. Running
 * this on a schedule closes that gap without anyone noticing it opened.
 *
 * Firestore is the source of truth in both directions — including opt-outs. An
 * isActive:false record is blocklisted in Listmonk rather than skipped, because
 * an unsubscribe honoured only on the site is still a marketing email to
 * someone who asked you to stop.
 *
 * Needs the same environment as the deployed functions: FIREBASE_SERVICE_ACCOUNT
 * plus the four LISTMONK_* variables. Reads .env if present.
 */
import { readFileSync, existsSync } from 'node:fs';
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Minimal .env loader — enough for a local run, no dependency.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const APPLY = process.argv.includes('--apply');

const required = ['FIREBASE_SERVICE_ACCOUNT', 'LISTMONK_URL', 'LISTMONK_USERNAME', 'LISTMONK_TOKEN', 'LISTMONK_LIST_ID'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing environment: ${missing.join(', ')}`);
  process.exit(1);
}

const BASE = process.env.LISTMONK_URL.replace(/\/+$/, '');
const LIST_ID = Number(process.env.LISTMONK_LIST_ID);
const AUTH =
  (process.env.LISTMONK_AUTH ?? 'token').toLowerCase() === 'basic'
    ? `Basic ${Buffer.from(`${process.env.LISTMONK_USERNAME}:${process.env.LISTMONK_TOKEN}`).toString('base64')}`
    : `token ${process.env.LISTMONK_USERNAME}:${process.env.LISTMONK_TOKEN}`;

async function api(path, method = 'GET', body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { authorization: AUTH, 'content-type': 'application/json', accept: 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}

// ── Firebase ──
const raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
const credentials = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
if (typeof credentials.private_key === 'string') {
  credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
}
if (!getApps().length) initializeApp({ credential: cert(credentials) });
const db = getFirestore();

// Fail loudly if the list id is wrong — otherwise every subscriber is created
// with no list membership and receives nothing, which looks like success.
const list = await api(`/api/lists/${LIST_ID}`);
if (!list.ok) {
  console.error(`Listmonk list ${LIST_ID} is not reachable (HTTP ${list.status}). Check LISTMONK_LIST_ID and the token.`);
  process.exit(1);
}
console.log(`Target list: ${list.body?.data?.name ?? LIST_ID}\n`);

const snap = await db.collection('newsletterSubscribers').get();
console.log(`${snap.size} subscriber record(s) in Firestore.${APPLY ? '' : '  (dry run — pass --apply to write)'}\n`);

const tally = { created: 0, updated: 0, blocklisted: 0, failed: 0, skipped: 0 };

for (const doc of snap.docs) {
  const rec = doc.data();
  const email = String(rec.email ?? doc.id).trim().toLowerCase();
  if (!email.includes('@')) {
    tally.skipped++;
    continue;
  }

  const active = rec.isActive !== false;

  if (!APPLY) {
    console.log(`  ${active ? 'subscribe ' : 'blocklist'}  ${email}`);
    tally[active ? 'created' : 'blocklisted']++;
    continue;
  }

  const query = encodeURIComponent(`subscribers.email = '${email.replace(/'/g, "''")}'`);
  const found = await api(`/api/subscribers?page=1&per_page=1&query=${query}`);
  const existing = found.body?.data?.results?.[0];

  if (!active) {
    if (!existing) {
      tally.skipped++;
      continue;
    }
    const res = await api('/api/subscribers/query/blocklist', 'PUT', { ids: [existing.id] });
    if (res.ok) tally.blocklisted++;
    else {
      tally.failed++;
      console.error(`  ! ${email}: blocklist failed (HTTP ${res.status})`);
    }
    continue;
  }

  const payload = {
    email,
    name: (rec.name ?? '').trim() || email.split('@')[0],
    status: 'enabled',
    lists: [LIST_ID],
    attribs: {
      source: rec.consent?.source ?? 'backfill',
      policy_version: rec.consent?.policyVersion ?? null,
      consent_method: rec.consent?.method ?? 'unknown',
      subscribed_at: rec.subscribedAt ?? null,
    },
    preconfirm_subscriptions: true,
  };

  const res = existing
    ? await api(`/api/subscribers/${existing.id}`, 'PUT', payload)
    : await api('/api/subscribers', 'POST', payload);

  if (res.ok) tally[existing ? 'updated' : 'created']++;
  else {
    tally.failed++;
    console.error(`  ! ${email}: HTTP ${res.status} ${res.body?.message ?? ''}`);
  }
}

console.log(
  `\ncreated ${tally.created}  updated ${tally.updated}  blocklisted ${tally.blocklisted}  skipped ${tally.skipped}  failed ${tally.failed}`,
);
process.exit(tally.failed ? 1 : 0);
