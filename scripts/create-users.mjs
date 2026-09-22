#!/usr/bin/env node
/**
 * Provision a manager, a staff account and a demo customer in Firebase Auth.
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
const STAFF_EMAIL = process.env.STAFF_EMAIL || 'staff@lehart.co.uk';
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || 'customer@lehart.co.uk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || ADMIN_PASSWORD;
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

/**
 * Create or reset an account and set exactly one back-office role on it.
 *
 * `role` is 'admin', 'staff' or 'customer' — see src/lib/adminRoles.ts for
 * what each may do. setCustomUserClaims replaces the whole claims object, so
 * promoting someone is the same call as demoting them: send the set you want
 * them to end up with, never a patch.
 */
async function upsertUser({ email, password, fullName, role }) {
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

  // The two roles are separate claims and never both set: a manager is
  // already staff everywhere it matters (firestore.rules writes isStaff() as
  // an OR over the two), so carrying both would be a second thing to keep in
  // step for no gain.
  const claims = role === 'admin' ? { admin: true }
    : role === 'staff' ? { staff: true }
    : {};
  await auth.setCustomUserClaims(user.uid, claims);
  console.log(`    claims = ${JSON.stringify(claims)}`);

  // Mirror into the profile document so the console can show who is staff.
  // Display only — the rules never read this, they read the claim.
  await db.collection('users').doc(user.uid).set({
    fullName,
    email,
    role,
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  return user.uid;
}

try {
  console.log(`\nProvisioning users on ${creds.project_id}\n`);

  const adminUid = await upsertUser({
    email: ADMIN_EMAIL, password: ADMIN_PASSWORD, fullName: 'Store Admin', role: 'admin',
  });
  const staffUid = await upsertUser({
    email: STAFF_EMAIL, password: STAFF_PASSWORD, fullName: 'Shop Floor', role: 'staff',
  });
  await upsertUser({
    email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, fullName: 'Demo Customer', role: 'customer',
  });

  // Read the claim back rather than trusting the write — a silent failure
  // would otherwise be indistinguishable from success.
  const check = await auth.getUser(adminUid);
  if (check.customClaims?.admin !== true) {
    fail('The admin claim did not persist. Check the service account has the Firebase Authentication Admin role.');
  }
  const staffCheck = await auth.getUser(staffUid);
  if (staffCheck.customClaims?.staff !== true) {
    fail('The staff claim did not persist. Check the service account has the Firebase Authentication Admin role.');
  }
  // A staff account that also carried the admin claim would silently be a
  // manager, which is the one mistake this split cannot afford to make
  // quietly — so assert the absence, not only the presence.
  if (staffCheck.customClaims?.admin === true) {
    fail('The staff account carries admin=true. It would have manager access.');
  }

  console.log('\nVerified:');
  console.log(`  manager   ${ADMIN_EMAIL}      claim admin=true`);
  console.log(`  staff     ${STAFF_EMAIL}      claim staff=true`);
  console.log(`  customer  ${CUSTOMER_EMAIL}   no claim`);
  console.log(`\n  ✓ Done. Sign in at /admin/inventory as "${ADMIN_EMAIL.split('@')[0]}".`);
  console.log('    A claim only reaches the browser on a fresh ID token, so if the');
  console.log('    admin is already signed in somewhere, sign out and back in.\n');
} catch (err) {
  fail(err?.message ?? String(err));
}
