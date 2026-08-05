#!/usr/bin/env node
/**
 * Provision the staff admin and a demo customer.
 *
 * Supabase's Admin API needs the service-role key, which must never reach the
 * browser — so this runs on your machine, not in the app. Credentials are read
 * from the environment so that no password is ever written into the repository.
 *
 *   export VITE_SUPABASE_URL="https://<ref>.supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="<service role key>"
 *   export ADMIN_PASSWORD='...'          # required
 *   export CUSTOMER_PASSWORD='...'       # optional, defaults to ADMIN_PASSWORD
 *   node scripts/create-users.mjs
 *
 * Re-running is safe: existing users have their password reset and their role
 * re-applied rather than erroring on a duplicate.
 *
 * Requires the admin_inventory migration to have been applied first — it is
 * what creates `profiles.role`.
 */
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@lehart.co.uk';
const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL || 'customer@lehart.co.uk';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || ADMIN_PASSWORD;

function fail(msg) {
  console.error(`\n  ✗ ${msg}\n`);
  process.exit(1);
}

if (!URL) fail('Set VITE_SUPABASE_URL to your project URL.');
if (!SERVICE_KEY) fail('Set SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role).');
if (!ADMIN_PASSWORD) fail('Set ADMIN_PASSWORD. Passwords are read from the environment so they stay out of git.');
if (ADMIN_PASSWORD.length < 8) fail('ADMIN_PASSWORD must be at least 8 characters.');

const admin = createClient(URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Find an existing user by email, paging until found or exhausted. */
async function findByEmail(email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find(u => (u.email ?? '').toLowerCase() === target);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function upsertUser({ email, password, fullName, role }) {
  const existing = await findByEmail(email);
  let userId;

  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    userId = existing.id;
    console.log(`  · ${email} already existed — password reset`);
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      // Confirmed up front: these are provisioned accounts, and without this
      // the first sign-in fails with "Email not confirmed".
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw error;
    userId = data.user.id;
    console.log(`  · ${email} created`);
  }

  // The handle_new_user trigger creates the profile row, but it runs on insert
  // only — upsert so an account made before the migration still gets one.
  const { error: profileErr } = await admin
    .from('profiles')
    .upsert({ id: userId, full_name: fullName, role }, { onConflict: 'id' });
  if (profileErr) {
    if (/column .*role.* does not exist/i.test(profileErr.message)) {
      fail('profiles.role is missing — apply supabase/migrations/20260805000000_admin_inventory.sql first.');
    }
    throw profileErr;
  }
  console.log(`    role = ${role}`);

  return userId;
}

try {
  console.log(`\nProvisioning users on ${URL}\n`);
  await upsertUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, fullName: 'Store Admin', role: 'admin' });
  await upsertUser({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD, fullName: 'Demo Customer', role: 'customer' });

  // Read the roles back rather than trusting the writes — a silent RLS or
  // trigger failure would otherwise look like success.
  const { data: check, error } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .in('id', [
      (await findByEmail(ADMIN_EMAIL))?.id,
      (await findByEmail(CUSTOMER_EMAIL))?.id,
    ].filter(Boolean));
  if (error) throw error;

  console.log('\nVerified in the database:');
  for (const row of check ?? []) console.log(`  ${row.role.padEnd(8)} ${row.full_name}`);

  const adminOk = (check ?? []).some(r => r.role === 'admin');
  if (!adminOk) fail('No admin role was persisted — check the migration ran.');

  console.log(`\n  ✓ Done. Sign in at /admin/inventory as "${ADMIN_EMAIL.split('@')[0]}".\n`);
} catch (err) {
  fail(err?.message ?? String(err));
}
