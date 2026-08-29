#!/usr/bin/env node
/**
 * Create the composite indexes in firestore.indexes.json.
 *
 *   export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
 *   node scripts/deploy-indexes.mjs [--dry-run]
 *
 * Same reason as scripts/deploy-rules.mjs: the Firebase CLI's Service Usage
 * precheck 403s with these credentials before it attempts anything, so this
 * calls the Firestore Admin API directly.
 *
 * A missing composite index is not a slow query, it is a failed one. Firestore
 * refuses any query combining an equality filter with an orderBy on a
 * different field unless the index exists — so without these, order history
 * and product reviews return an error rather than an empty list, and the page
 * shows a failure state to a customer whose order is perfectly fine.
 *
 * Creation is asynchronous and takes minutes on a populated collection. The
 * operation name returned is the thing to watch; ALREADY_EXISTS is success.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JWT } from 'google-auth-library';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry-run');
const fail = (m) => { console.error(`\n  ✗ ${m}\n`); process.exit(1); };

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) fail('Set FIREBASE_SERVICE_ACCOUNT (service-account JSON, raw or base64).');

let creds;
try {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  creds = JSON.parse(text);
  if (typeof creds.private_key === 'string') creds.private_key = creds.private_key.replace(/\\n/g, '\n');
} catch (err) {
  fail(`FIREBASE_SERVICE_ACCOUNT could not be parsed: ${err.message}`);
}

const project = creds.project_id;
const client = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/datastore', 'https://www.googleapis.com/auth/cloud-platform'],
});

const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)`;
const { indexes = [] } = JSON.parse(readFileSync(join(root, 'firestore.indexes.json'), 'utf8'));

console.log(`\n  Project  ${project}\n`);

for (const index of indexes) {
  const label = `${index.collectionGroup}: ${index.fields.map((f) => `${f.fieldPath} ${f.order === 'DESCENDING' ? '↓' : '↑'}`).join(', ')}`;

  if (DRY) { console.log(`  would create  ${label}`); continue; }

  const { token } = await client.getAccessToken();
  const res = await fetch(`${base}/collectionGroups/${index.collectionGroup}/indexes`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      queryScope: index.queryScope ?? 'COLLECTION',
      // The API rejects the "//" comment keys the CLI's file format allows.
      fields: index.fields.map((f) => ({ fieldPath: f.fieldPath, order: f.order })),
    }),
  });

  const body = await res.json().catch(() => ({}));

  if (res.ok) {
    console.log(`  building      ${label}`);
  } else if (/already exists/i.test(JSON.stringify(body))) {
    // Idempotent by design: re-running this must be safe.
    console.log(`  exists        ${label}`);
  } else {
    console.log(`  FAILED        ${label}\n                ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
    process.exitCode = 1;
  }
}

console.log('\n  Index builds are asynchronous — minutes on a populated collection.\n  Firebase console → Firestore → Indexes shows progress.\n');
