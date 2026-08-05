# Back store (admin console)

Inventory management for LeHart: add, edit and delete products, adjust stock,
and manage product imagery.

**URL:** `/admin/inventory`

---

## How access works

Authorization is enforced by **Postgres**, not by the frontend.

The browser talks to Supabase with the signed-in user's JWT, and the RLS
policies decide what it may do. The React guard on `/admin` only *hides* the
console — someone who renders the components by hand still cannot write
anything, because every insert, update and delete is checked by `is_admin()`
inside the database. No service-role key is ever shipped to the browser.

An account is an admin when `profiles.role = 'admin'`. A database trigger
rejects any change to `role` that is not made over a service-role connection,
so a user cannot promote themselves through the profile-update endpoint they
already have access to.

---

## One-time setup

### 1. Apply the migration

Run `supabase/migrations/20260805000000_admin_inventory.sql` in the Supabase
SQL editor (Dashboard → SQL Editor → New query → paste → Run).

It is idempotent, so re-running is safe. It creates:

- `profiles.role` (`customer` | `admin`) and the `is_admin()` helper
- the trigger that blocks self-promotion
- admin write policies on `products` and `product_variants`
- the `product-images` storage bucket (public read, admin write, 5 MB,
  JPEG/PNG/WebP/AVIF only)

### 2. Create the accounts

Passwords are read from the environment so they never enter git:

```bash
export VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role key from Settings → API>"
export ADMIN_PASSWORD='<choose one>'
export CUSTOMER_PASSWORD='<choose one>'

node scripts/create-users.mjs
```

This creates (or resets) two confirmed accounts:

| Account  | Email                   | Role       |
| -------- | ----------------------- | ---------- |
| Admin    | `admin@lehart.co.uk`    | `admin`    |
| Customer | `customer@lehart.co.uk` | `customer` |

Override the addresses with `ADMIN_EMAIL` / `CUSTOMER_EMAIL` if you prefer.

The script reads the roles back from the database afterwards and fails loudly
if the admin role did not stick — a silent RLS or trigger failure would
otherwise look like success.

### 3. Sign in

Supabase Auth identifies users by email, so there is no separate username
field. The sign-in form treats a value with no `@` as a staff username and
appends the staff domain:

```
admin  ->  admin@lehart.co.uk
```

So you can type just `admin`. A full email address passes through unchanged.
This applies to sign-in only — sign-up still requires a real address, since
inventing one would send the confirmation mail to a domain the customer does
not own.

---

## What the console does

**Inventory list** — search by model, brand or slug; filter by brand and by
stock state (all / in / low / out); sort by newest, lowest stock, highest
price or model; paginated at 25.

**Inline stock editing** — the stock pill in each row is editable in place.
Adjusting stock is the most frequent job, so it does not require opening the
full editor. Enter saves, Escape cancels. Colour-coded: green in stock, amber
at 5 or fewer, red at zero.

**Add / edit** — full product form with validation mirroring the database
constraints, so you get a useful message rather than a raw Postgres error.
The slug auto-derives from brand + model while creating and is **locked
afterwards**: it is the primary key *and* the public URL, so changing it would
break every inbound link and orphan the uploaded images filed under it.

**Images** — multi-file upload, drag-free reordering, set primary, delete.
The first image is the primary one shown on cards and as the product hero, so
"make primary" is a move-to-front rather than a second field to keep in sync.
A partly failed batch keeps whatever uploaded and reports the rest.

Products seeded with bundled `/assets/…` artwork show a **Bundled** badge —
those files ship with the app rather than living in storage, so removing one
only unlinks it.

**Delete** — behind a confirmation dialog that points to setting stock to 0 as
the reversible alternative. Stored images are removed first, then the row;
variants cascade.

---

## Testing

```bash
npm run build
npx vite preview --port 4173 &
npm run e2e:admin
```

68 checks across desktop and mobile: dashboard load, stock editing, filtering,
search, create with validation, edit, image upload, delete with confirmation,
the signed-in-customer refusal path, overflow, tap-target size, `noindex`, and
uncaught errors.

The suite drives the real app in a real browser but answers Supabase's HTTP
calls from an in-memory fixture, so it can sign in as an admin without a live
project. **It verifies the frontend end to end; it does not prove the RLS
policies** — only the database can enforce those. Confirm them by signing in
as the customer account and checking that `/admin` refuses you.
