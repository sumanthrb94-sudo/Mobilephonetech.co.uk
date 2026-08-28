# Back store (admin console)

Inventory management for LeHart: add, edit and delete products, adjust stock,
and manage product imagery.

**URL:** `/admin/inventory`

---

## How access works

Authorization is enforced by the **Firebase security rules**, not by the
frontend.

The browser talks to Firestore and Storage with the signed-in user's ID token,
and `firestore.rules` / `storage.rules` decide what it may do. The React guard
on `/admin` only *hides* the console — someone who renders the components by
hand still cannot write anything, because every create, update and delete is
checked server-side. No service-account key is ever shipped to the browser.

An account is an admin when its ID token carries the `admin` **custom claim**.
A claim can only be set with the Admin SDK, so a user cannot grant it to
themselves — which is exactly why the rules check the claim rather than a
`role` field on their own user document, which they can edit. The `role` field
still exists, but it is display-only and the rules explicitly forbid changing
it from the client.

---

## One-time setup

### 1. Deploy the security rules

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,storage \
  --project lehart-1b9ef
```

`firestore.rules` and `storage.rules` are the authorization boundary — until
they are deployed, the project's defaults apply and the console will not work
as described here. `firestore.indexes.json` adds the two composite indexes
Firestore needs for order history and per-product reviews.

### 2. Create the accounts

Passwords are read from the environment so they never enter git:

```bash
export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
export ADMIN_PASSWORD='<choose one>'
export CUSTOMER_PASSWORD='<choose one>'

node scripts/create-users.mjs
```

The service-account key comes from Firebase console → Project settings →
Service accounts → Generate new private key.

This creates (or resets) two confirmed accounts:

| Account  | Email                   | Claim          |
| -------- | ----------------------- | -------------- |
| Admin    | `admin@lehart.co.uk`    | `admin: true`  |
| Customer | `customer@lehart.co.uk` | none           |

Override the addresses with `ADMIN_EMAIL` / `CUSTOMER_EMAIL` if you prefer.

The script reads the claim back afterwards and exits non-zero if it did not
stick — a silent permissions failure would otherwise look like success.

**A claim only reaches the browser on a fresh ID token.** If the admin is
already signed in somewhere, they must sign out and back in before the console
will let them through.

### 3. Seed the catalogue

```bash
export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
node scripts/seed-firestore.mjs
```

Idempotent — documents are keyed by product id, so re-running updates in place.
Existing stock levels are preserved unless you pass `--reset-stock`: re-seeding
to pick up a copy change must not quietly restock sold-out items.

### 4. Sign in

Firebase Auth identifies users by email, so there is no separate username
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

**Add / edit** — full product form with validation, so you get a useful
message rather than a raw Firestore error. Firestore is schemaless, so unlike
the Postgres version these checks are the *only* thing keeping documents
consistent — every write goes through `validateDraft` and `draftToRow`.
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
the reversible alternative. Stored images are removed first, then the document:
losing an image is recoverable, but a deleted document leaves no record of
which files belonged to it.

---

## Testing

```bash
npm run emulators &          # auth, firestore, storage on 9099/8080/9199
npx vite build --mode e2e    # builds with VITE_FIREBASE_EMULATOR=true
npx vite preview --port 4173 &
npm run e2e:admin
```

74 checks across desktop and mobile: sign-in with the bare `admin` username,
dashboard load, stock editing, filtering, search, create with validation, edit,
image upload, delete with confirmation, the signed-in-customer refusal,
overflow, tap-target size, `noindex`, and uncaught errors.

It runs against the **Firebase emulator suite**, so `firestore.rules` and
`storage.rules` are the ones actually enforced — and sign-in goes through the
real auth form with a real password rather than an injected session. Two checks
assert the rules directly, in both directions:

- a customer's write to `products` is rejected (403, value unchanged)
- an admin's identical write succeeds

Both matter. A deny-only check would still pass if the rules denied everybody,
including the admin — a broken shop that looked secure.

Requires Java (the Firestore emulator runs on the JVM).
