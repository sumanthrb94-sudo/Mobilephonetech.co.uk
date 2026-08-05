#!/usr/bin/env node
/**
 * Provision the staff admin and a demo customer in Firebase Auth.
 *
 * The admin flag is a **custom claim** on the ID token, not a database field.
 * Only the Admin SDK can set one, so a user cannot grant it to themselves —
 * which is exactly why the security rules check the claim rather than a
 * document the user is able to edit.
 *
 *   export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
 *   export ADMIN_PASSWORD='...'          # required
 *   export CUSTOMER_PASSWORD='...'       # optional, defaults to ADMIN_PASSWORD
 *   node scripts/create-users.mjs
 *
 * Re-running is safe: an existing account has its password reset and its claim
 * re-applied rather than erroring on a duplicate.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lehart.co.uk';
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || 'customer@lehart.co.uk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || ADMIN_PASSWORD;

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!raw) fail('Set FIREBASE_SERVICE_ACCOUNT (service-account JSON, raw or base64).');
if (!ADMIN_PASSWORD) fail('Set ADMIN_PASSWORD. Passwords are read from the environment so they stay out of git.');
if (ADMIN_PASSWORD.length < 8) fail('ADMIN_PASSWORD must be at least 8 characters (Firebase requires 6+).');

let creds;
try {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  creds = JSON.parse(text);
  if (typeof creds.private_key === 'string') creds.private_key = creds.private_key.replace(/\\n/g, '\n');
} catch (err) {
  fail(`FIREBASE_SERVICE_ACCOUNT could not be parsed: ${err.message}`);
}

initializeApp({
  credential: cert({
    projectId: creds.project_id,
    clientEmail: creds.client_email,
    privateKey: creds.private_key,
  }),
  projectId: creds.project_id,
});
const auth = getAuth();
const db = getFirestore();

async function upsertUser({ email, password, fullName, admin }) {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, {
      password,
      displayName: fullName,
      // Provisioned accounts are confirmed up front; without this the first
      // sign-in works but the address shows as unverified everywhere.
      emailVerified: true,
    });
    console.log(`  · ${email} already existed — password reset`);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    user = await auth.createUser({ email, password, displayName: fullName, emailVerified: true });
    console.log(`  · ${email} created`);
  }

  // setCustomUserClaims replaces the whole claims object, so send the full set
  // every time rather than only the flag that changed.
  await auth.setCustomUserClaims(user.uid, admin ? { admin: true } : {});
  console.log(`    claims = ${admin ? '{ admin: true }' : '{}'}`);

  // Mirror into the profile document so the console can show who is staff.
  // Display only — the rules never read this, they read the claim.
  await db.collection('users').doc(user.uid).set({
    fullName,
    email,
    role: admin ? 'admin' : 'customer',
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return user.uid;
}

try {
  console.log(`\nProvisioning users on ${creds.project_id}\n`);

  const adminUid = await upsertUser({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD, fullName: 'Store Admin', admin: true,
  });
  await upsertUser({
    email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, fullName: 'Demo Customer', admin: false,
  });

  // Read the claim back rather than trusting the write — a silent failure
  // would otherwise be indistinguishable from success.
  const check = await auth.getUser(adminUid);
  if (check.customClaims?.admin !== true) {
    fail('The admin claim did not persist. Check the service account has the Firebase Authentication Admin role.');
  }

  console.log('\nVerified:');
  console.log(`  admin     ${ADMIN_EMAIL}      claim admin=true`);
  console.log(`  customer  ${CUSTOMER_EMAIL}   no claim`);
  console.log(`\n  ✓ Done. Sign in at /admin/inventory as "${ADMIN_EMAIL.split('@')[0]}".`);
  console.log('    A claim only reaches the browser on a fresh ID token, so if the');
  console.log('    admin is already signed in somewhere, sign out and back in.\n');
} catch (err) {
  fail(err?.message ?? String(err));
}
