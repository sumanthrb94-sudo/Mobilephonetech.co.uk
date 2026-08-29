#!/usr/bin/env node
/**
 * Deploy Firestore and Storage security rules through the Rules REST API.
 *
 *   export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
 *   node scripts/deploy-rules.mjs [--dry-run]
 *
 * This exists because `firebase deploy --only firestore:rules` cannot run with
 * the credentials this project has. The CLI's first move is a Service Usage
 * check — "ensuring required API firestore.googleapis.com is enabled" — which
 * needs serviceusage.services.get, a permission the Firebase Admin SDK service
 * account does not carry and does not need for the actual deployment. The
 * check fails with a 403 and the CLI stops before it has attempted anything.
 *
 * The precheck is a convenience, not a requirement: the API is plainly already
 * enabled, since the same credentials read and write Firestore all day. So this
 * talks to firebaserules.googleapis.com directly, which is what the CLI would
 * have done next.
 *
 * Two steps per ruleset, in this order and no other:
 *
 *   1. Create a ruleset  — compiles the source. A syntax error fails here,
 *                          with nothing deployed and nothing changed.
 *   2. Move the release  — points cloud.firestore at that ruleset id, which is
 *                          the atomic switch that makes it live.
 *
 * Rules are the only thing standing between a stranger and every document in
 * the database, so a half-applied deployment is not an acceptable state. This
 * ordering means the only failure mode is "nothing happened".
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
  scopes: ['https://www.googleapis.com/auth/firebase', 'https://www.googleapis.com/auth/cloud-platform'],
});

const API = 'https://firebaserules.googleapis.com/v1';

async function call(path, init = {}) {
  const { token } = await client.getAccessToken();
  const res = await fetch(`${API}/projects/${project}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...init.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 400)}`);
  return body;
}

/** The release name is what decides which service the rules govern. */
const TARGETS = [
  { label: 'Firestore', file: 'firestore.rules', release: 'cloud.firestore' },
  { label: 'Storage', file: 'storage.rules', release: `firebase.storage/${project}.firebasestorage.app` },
];

console.log(`\n  Project  ${project}\n`);

for (const target of TARGETS) {
  let source;
  try {
    source = readFileSync(join(root, target.file), 'utf8');
  } catch {
    console.log(`  ${target.label.padEnd(10)} skipped — ${target.file} not found`);
    continue;
  }

  if (DRY) {
    console.log(`  ${target.label.padEnd(10)} ${source.split('\n').length} lines, would deploy to ${target.release}`);
    continue;
  }

  try {
    // Step 1 — compile. A syntax error stops here, having changed nothing.
    const ruleset = await call('/rulesets', {
      method: 'POST',
      body: JSON.stringify({ source: { files: [{ name: target.file, content: source }] } }),
    });

    // Step 2 — the atomic switch.
    const release = {
      name: `projects/${project}/releases/${target.release}`,
      rulesetName: ruleset.name,
    };

    try {
      // UpdateRelease wraps the resource; CreateRelease takes it bare. Sending
      // the bare object to PATCH fails with "Unknown name rulesetName", which
      // reads like a wrong field rather than a wrong envelope.
      await call(`/releases/${target.release}`, {
        method: 'PATCH',
        body: JSON.stringify({ release }),
      });
    } catch (err) {
      // No release exists yet on a project whose rules have never been
      // deployed. PATCH cannot create one; POST can.
      if (!/404/.test(err.message)) throw err;
      await call('/releases', { method: 'POST', body: JSON.stringify(release) });
    }

    console.log(`  ${target.label.padEnd(10)} live — ${ruleset.name.split('/').pop()}`);
  } catch (err) {
    console.log(`  ${target.label.padEnd(10)} FAILED — ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('');
