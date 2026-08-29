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

## The catalogue comes from the stock list

`data/inventory.csv` is the export from the inventory system, and
`scripts/import-inventory.mjs` is the only thing that writes the catalogue.

```
export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
node scripts/import-inventory.mjs --dry-run    # report, write nothing
node scripts/import-inventory.mjs --reset      # replace the catalogue
```

`--reset` deletes `products` and `stockUnits` and nothing else. Orders, users,
returns and support threads are never touched — a catalogue import that could
destroy order history is a footgun with no safety on it.

### Two collections, and why

| | |
|---|---|
| `products/{id}` | what a customer chooses between: model + capacity, with a variant per condition and colour carrying its own price and stock count |
| `stockUnits/{imei}` | one document per physical handset — cost, supplier, arrival date, grade, and which listing it belongs to |

The second is the thing the shop could not do before. Until stock is per-unit
you cannot run the VAT margin scheme, cannot answer "which handset did we send
them" against a warranty claim, and cannot price by real condition.

### What the importer decides, and what it refuses to

**It merges spellings.** "Galaxy A32 5G", "SAMSUNG GALAXY A32 5G" and
"GALAXY A32 5G" are one product typed by three people. Left alone they are
three listings splitting one pool of stock. It does **not** merge "A32" with
"A32 5G" — those are different phones and merging them sells the wrong one.

**It will not list stock that is not in the building.** SHS rows are awaiting
delivery and carry no IMEI; returned units have not been re-graded. Both are
excluded.

**It does not call an opened unit new.** Supplier grade ONU becomes *Pristine*,
never *New* — "new" is a claim about a sealed device.

**Prices are derived, and that is a decision you should change.** The export
has a buy price and no sell price. `MARKUP` in `scripts/lib/catalogue.mjs` is a
grade-keyed multiplier landing around 38% gross margin before VAT. It is a
starting point, not a pricing strategy. Add an `SP` or `Price` column to the
export and the importer uses it instead and ignores the table entirely.

**Images are drawn, not photographed.** There is no lawful way to bulk-fetch
manufacturer press shots for seventy listings, and a broken image on every
product is worse than an honest placeholder. Each listing gets an SVG in its
real colour with the model and capacity. **Replace them with photographs of the
actual handset** — the real scratches on the real unit are what a refurbished
buyer wants to see, and the admin image upload writes over these.

## Analytics

`/admin/analytics`. Traffic, revenue, stock value and — the reason the page
exists — **attention without sales**: listings people look at and do not buy.
A revenue table cannot show you those, because they earn nothing and so appear
nowhere, yet they are the most fixable rows in the console.

Counting is cookieless and identifier-free: no cookie, no device id, no IP, no
fingerprint. `api/_routes/track.ts` increments counters in one document per
day. Nothing can be tied back to a person, which is what puts it outside the
consent requirement rather than merely arguing it should be — so the numbers
describe every visitor, not only those who accept a banner.

The cost is real: no sessions, no per-user funnels, no returning-visitor rate.
What it does answer is what a shop this size acts on — which products draw
attention, which draw attention and no orders, and whether yesterday was busier
than the day before.

Admin traffic is excluded. Counting staff looking at their own shop makes every
quiet day look busier than it was.

### Two analytics systems, on purpose

| | Covers | Gives you |
|---|---|---|
| `src/lib/analytics.ts` | **everyone** — no cookie, no identifier, no consent needed | totals: views, baskets, searches, per-product attention |
| `src/lib/firebaseAnalytics.ts` | only visitors who accept cookies | GA4 sessions, funnels, retention, audiences |

Read conversion rates off the cookieless counters, because they cover the whole
population. Read behaviour off GA4, because that is what it is for. Do not
compare their totals — GA4's are a biased subset by construction, and the bias
runs towards people who accept banners.

`getAnalytics(app)` is not passive: it writes `_ga` cookies and a persistent
app-instance id. Calling it at module scope — the shape the Firebase console
hands you — starts that before the banner renders, which makes "Reject
non-essential" a lie. So **`src/lib/firebaseAnalytics.ts` is the only file that
can start GA**, it exports a function rather than an instance, and the only
caller is the consent gate in `CookieBanner`. Nothing imports
`firebase/analytics` until consent exists, so a visitor who declines never
fetches the bundle at all.

Three things must stay in step, and a change to any one is wrong on its own:

1. `vercel.json` CSP — `www.googletagmanager.com` in `script-src`,
   `*.google-analytics.com` and `*.analytics.google.com` in `connect-src`.
   Without these GA is blocked with no visible error.
2. `VITE_FIREBASE_MEASUREMENT_ID` — absent means GA never starts, which is a
   valid configuration rather than a fault.
3. `CookiePolicy.tsx` — it names the cookies GA sets. If GA goes, that text goes
   with it the same day.
