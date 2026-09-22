# Back store (admin console)

Running LeHart: products and stock, orders, returns, customer support, and
what the shop front says.

**URL:** `/admin`

---

## Who can do what

There are two back-office roles. The split follows the way the
InventoryManager console is organised — its Stock Intake, Inventory and
Returns screens are the working floor, and its Admin tab is marked *managers
only* — so that anyone moving between the two tools finds the same division.

| | Staff | Manager |
| --- | :---: | :---: |
| Dashboard | ● | ● |
| Products and stock: create, edit, set stock | ● | ● |
| Orders: move through statuses | ● | ● |
| Returns: decide a return | ● | ● |
| Support: reply to a customer | ● | ● |
| Export the catalogue or order book | ● | ● |
| Archive a product (take it off sale) | | ● |
| Add a brand or model the catalogue has never carried | | ● |
| Banners, Home layout, Series — what the shop front says | | ● |
| Analytics: takings, margin, traffic | | ● |
| Buy prices (what stock cost us) | | ● |

The reasoning: everything in the top block is the daily work and is safely
reversible. Everything in the bottom block is either hard to undo, visible to
every visitor, or commercially sensitive. Before the split there was one
door — the smallest job, "mark this order dispatched", arrived bundled with
the authority to blank the home page.

Staff do not see the sections they cannot use. The nav is filtered by role,
and the manager-only sections sit behind a divider so the shape of what you
are allowed to do is legible rather than something you discover by being
refused. Someone who has the URL anyway — a bookmark from before their role
changed — gets a refusal naming the role that would have worked.

Your own role is shown next to the word "Admin" in the console's header.

The policy lives in one file, `src/lib/adminRoles.ts`, with the matching
server-side rules in `firestore.rules`. The two are meant to be read side by
side.

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

This creates (or resets) three confirmed accounts:

| Account  | Email                   | Claim          |
| -------- | ----------------------- | -------------- |
| Manager  | `admin@lehart.co.uk`    | `admin: true`  |
| Staff    | `staff@lehart.co.uk`    | `staff: true`  |
| Customer | `customer@lehart.co.uk` | none           |

Override the addresses with `ADMIN_EMAIL` / `STAFF_EMAIL` / `CUSTOMER_EMAIL`,
and the passwords with `ADMIN_PASSWORD` / `STAFF_PASSWORD` /
`CUSTOMER_PASSWORD`. A password left unset falls back to `ADMIN_PASSWORD`.

The two roles are separate claims and never both set on one account. A
manager is already staff everywhere it matters — the rules read "is this
person staff?" as an OR over the two — so carrying both would be a second
thing to keep in step for no gain. The script asserts that the staff account
did **not** come back carrying `admin: true`, because a staff account that is
silently a manager is the one mistake this split cannot afford to make
quietly.

### Adding someone later

`scripts/create-users.mjs` needs a service-account key and a terminal. When
that is not practical, `POST /api/bootstrap-admin` does the same job from the
deployment's own environment:

```
BOOTSTRAP_SECRET  a secret of at least 16 characters
ADMIN_EMAILS      comma-separated — granted the manager role
STAFF_EMAILS      comma-separated — granted the staff role
```

The addresses come from the environment, never from the request, so even if
the secret leaks nobody can promote an address of their choosing without also
having write access to the deployment's environment — at which point they own
the deployment anyway. An address in both lists is made a manager. **Delete
`BOOTSTRAP_SECRET` once you are done**; with it unset the route returns 404 to
everything, identically to a wrong secret, so probing cannot tell the two
apart.

The person must have signed in once before they can be promoted — Firebase
creates the account on first sign-in.

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
stock state (all / in / low / out); switch between live and archived products;
sort by newest, lowest stock, highest price or model; paginated at 25.

One read carries a thousand products. Past that, the search box and the stock
filters would be narrowing an arbitrary subset while presenting themselves as
narrowing the catalogue — a product that exists could not be found, and
nothing would say why. So the read deliberately fetches one document over the
cap in order to notice, and the list says when the figures describe a subset
rather than showing a count that is quietly wrong.

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

**Archive** (managers only) — takes a product off sale and sets its stock to
zero. It disappears from the shop front, from search, from the catalogue feed
and from the storefront's direct-link route, and it can no longer be ordered —
the order route re-checks it inside the stock transaction, so a product
archived mid-checkout cannot slip through.

Nothing deletes a product, and that is enforced in the rules
(`allow delete: if false`), not merely in the button. A product is referenced
by every order that ever contained it, so deleting one rewrites history: an
old invoice loses the thing it was for, and a return raised against it has
nothing to check. This is InventoryManager's rule — *a sale is never deleted,
only voided* — applied to the catalogue.

Archived products are found under the **Archived** tab on the inventory list,
and restoring one is a click. Stock deliberately stays at zero on restore:
bringing back a count from before the product was withdrawn would be inventing
stock, so whoever restores it enters the real figure.

**The catalogue gate** — Brand and Model are backed by the spellings the
catalogue already uses. What you type is corrected to the existing spelling
when you leave the field, so `iphone  8` becomes `iPhone 8`; model suggestions
are filtered to the brand you picked. A value the catalogue has never carried
is a new catalogue entry: a manager may create one and is told they are doing
so, and staff are refused with a message naming what they typed.

This matters more than it looks. `iPhone 8` and `iphone  8` are two different
products to every piece of code that groups by model — which is why the
product page has to normalise spacing and case before it can offer a shopper
the other storage sizes of the phone they are looking at. Fixing it at the
keyboard is one rule instead of one per feature. It is the same rule
InventoryManager applies when it snaps model names to the admin catalogue's
spelling on write.

**Provenance** — every write from the console stamps who made it and when, and
the editor shows the last one. It records who the console believed was signed
in; it is not proof, because the same browser writes both the change and the
name on it. It answers "who do we think did this" for a team that trusts each
other, not "who can we prove did this" in a dispute.

**Export** — the inventory list and the order book download as CSV. The export
carries the whole matching set, not the page you are looking at, and includes
archived products so it is the whole record.

Two rules borrowed from InventoryManager's reporting, both load-bearing:
**new columns go on the end, always** — downstream spreadsheet formulas use
hard column letters, so inserting or moving one silently breaks every formula
pointing at it — and **an export is always a valid import**. There is a test
pinning the exact header order; that test existing is the contract.

A field that would be read as a formula (`=`, `+`, `-`, `@`, tab, CR) is
prefixed with an apostrophe, which spreadsheets consume on display. Without
it, a description someone typed as `=HYPERLINK(...)` arrives in the client's
spreadsheet as a live link they did not write.

---

## Testing

```bash
npm run emulators &          # auth, firestore, storage on 9099/8080/9199
npx vite build --mode e2e    # builds with VITE_FIREBASE_EMULATOR=true
npx vite preview --port 4173 &
npm run e2e:admin
```

180 checks across desktop and mobile: sign-in with the bare `admin` username,
dashboard load, stock editing, filtering, search, create with validation, edit,
image upload, archiving with confirmation, the signed-in-customer refusal,
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

### At the size the shop will actually reach

```bash
node e2e/volume.mjs        # 1,200 products, 40 orders, returns at every stage
node e2e/admin-roles.mjs   # opens every screen as each role, in a real browser
```

The console had only ever been opened against a two-product fixture.
`volume.mjs` seeds a catalogue with a deliberate shape — a long tail of models
stocked once or twice, so the sold-out and low-stock panels have real content —
and checks its own counts against arithmetic done outside the application.
Importing the console's own counters to check the console's own counters would
only prove it agrees with itself.

It asserts the shape *first*: a run where nothing ran out would pass every
later check while proving nothing, which is exactly the defect
InventoryManager's month-long simulation found in its own first attempt.

`admin-roles.mjs` signs in as a real manager and a real staff account, in
separate browser contexts so a stale token cannot leak between them, and opens
every screen. It proves what a mocked unit test cannot: that the capability a
real signed-in account carries is the one the components branch on, surviving
Firebase Auth, the ID token, the AuthContext refresh and the router guard. It
also types the manager-only URLs in as staff, because a bookmark from before a
role changed must be refused rather than merely unlinked.

It also drives the catalogue gate through the real form: a staff member typing
a brand the shop has never carried is refused with a message saying what to do
about it, and an existing brand typed in the wrong case is corrected. Worth
doing here rather than only in a unit test, because the gate depends on a real
read of the real catalogue — a failed or empty vocabulary must block nothing,
and a mock cannot tell you the read succeeded.

Every "this role cannot" check is paired with a control proving the thing
exists for the role that can. The first version of the archive-button check
searched the page text, and the button is icon-only — its label is an
`aria-label` that never appears in `textContent`, so the assertion could not
have failed whether the button was rendered or not.

Currently 26 of 26.

### The adversarial audit

```bash
npm run emulators &
node e2e/api-server.mjs &    # with FIRESTORE_EMULATOR_HOST set
npm run audit:security
```

Not a checklist. Every entry is an attack executed against the real rules with
a real ID token, sending requests the console would never construct. Each is
labelled either EXPLOIT (must be denied) or CONTROL (must be allowed) — the
controls are what stop a suite where every request happens to be malformed
from reporting a clean bill of health while testing nothing.

The role split is covered here, signing in as a real staff account carrying a
real staff claim and attempting every manager-only write: rewriting the home
page running order, writing a banner or a series panel, archiving a product,
smuggling `archivedAt` in on a create, reading buy prices, reading traffic.
Alongside them, controls proving staff can still do their own job, and that a
manager can do the things staff cannot — a split nobody attacks from the
outside is a claim rather than a boundary.

Currently 44 of 44.

**Known gap:** the order-pricing attacks aim at `/api/orders`, which was
retired when PayPal became the only payment method and now refuses every
request. The suite detects the retirement and says so rather than scoring it —
a suite that cries wolf gets ignored. The PayPal capture route is where money
is decided now, and it has no equivalent suite yet.

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

**Prices are used exactly as listed.** `PRICE_SOURCE` in
`scripts/lib/catalogue.mjs` is `'as-listed'`: the `BP` column is the selling
price, taken to the penny. Nothing rounds it, nudges it to end in a 9, or
adjusts it to fix a capacity ladder — a script that quietly edits prices
somebody set deliberately is worse than one that prices badly, because the
second is visible. `originalPrice` equals `price`, so no listing claims a
saving against a figure never charged.

Set `PRICE_SOURCE` to `'derive-from-cost'` if the column ever becomes a true
cost, and the dormant `MARKUP` table turns it into retail with the capacity
ladder enforced. Both paths are tested.

Inversions — a larger capacity at or below the price of a smaller one — are
**reported by the importer, never corrected.** Two batches bought weeks apart
produce them honestly, and a customer seeing 256 GB at the 128 GB price reads
it as a mistake or a trick.

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

## Deploying rules and indexes

> **The rules in this repository are ahead of the ones in production.**
>
> Until `scripts/deploy-rules.mjs` is run, none of the following is in force
> and some of it will fail visibly:
>
> - the staff / manager split — a staff account will be refused everything,
>   because production still only knows the `admin` claim
> - `siteLayout` and `seriesPanels` — saving on **Home layout** or **Series**
>   fails with a permission error
> - `allow delete: if false` on products — a delete is still possible
>   server-side
> - staff access to orders, returns and support
>
> Deploy before creating any staff account. A role you cannot exercise reads
> as a broken console.

The Firebase CLI cannot do either with this project's credentials:

```
Error: Request to https://serviceusage.googleapis.com/... HTTP Error: 403,
Permission denied to get service [firestore.googleapis.com]
```

That is the CLI's own precheck — "ensuring required API firestore.googleapis.com
is enabled" — which needs `serviceusage.services.get`. The Firebase Admin SDK
service account does not carry it and does not need it for the deployment
itself; the API is plainly already enabled, since the same credentials read and
write Firestore continuously. The check fails and the CLI stops before
attempting anything.

So two scripts call the underlying APIs directly:

```
export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
node scripts/deploy-rules.mjs     # Firestore + Storage security rules
node scripts/deploy-indexes.mjs   # composite indexes
```

`deploy-rules.mjs` compiles a ruleset first and moves the release second, so a
syntax error fails having changed nothing. Rules are all that stand between a
stranger and every document, so the only acceptable failure mode is "nothing
happened".

### What still needs a permission grant

| | |
|---|---|
| Firestore rules | ✅ deploying |
| Storage rules | ❌ 403 — needs `firebaserules.releases.update` on the storage resource |
| Composite indexes | ❌ 403 — needs `datastore.indexes.create` |

Both are IAM, not billing: they failed identically before and after the move to
Blaze. Either grant the service account **Firebase Rules Admin** and **Cloud
Datastore Index Admin** in Google Cloud Console → IAM, or do those two jobs in
the Firebase console, where an owner's own credentials are used and neither
permission is in question.

## Product photography

Two scripts, and a decision to make before either.

```
node scripts/image-manifest.mjs                      # what to collect
node scripts/import-images.mjs ./inbox --dry-run     # what would land
export FIREBASE_SERVICE_ACCOUNT="$(base64 -w0 serviceAccountKey.json)"
node scripts/import-images.mjs ./inbox               # do it
```

`image-manifest.mjs` writes `data/image-manifest.csv`: 146 images, each with
the exact filename to save it as, ordered by units in stock. That ordering is
the point — **the first ten listings cover 62% of the shelf**. Photograph those
and most of the catalogue looks real, days before the long tail is finished.

`import-images.mjs` matches files by name, re-encodes each to 1200×1200 WebP
through Chromium (Playwright is already a dependency, so this needs no image
library), and points Firestore at the result. Three properties worth knowing:

- **Letterboxed onto white, never cropped.** Sources arrive at different aspect
  ratios and a crop-to-fill silently removes the top of a handset.
- **Re-encoded, always.** Press photos are 3000 px and two megabytes. Seventy of
  those is a 140 MB repository and a product grid that takes ten seconds on a
  phone, which costs more sales than a missing photograph does.
- **Partial is safe.** A listing with no photograph keeps its drawing, and a
  listing photographed in one colour keeps drawings for the others. A
  half-photographed catalogue must not become a half-broken one.

Set `CHROMIUM_PATH` if Playwright's bundled browser version does not match the
one installed.

### Where the images may come from

A product photograph is someone's copyright, and this matters more for a shop
than for a blog. Manufacturer press images are generally licensed for
*editorial* use, which is not selling against them. A retailer's product shot
belongs to that retailer. Neither becomes usable because it was easy to
download.

The sources that are actually clear:

| | |
|---|---|
| **Your own photographs** | No licensing question at all, and they show the real unit |
| **Icecat / Open Icecat** | Free syndication of manufacturer assets, authorised for resellers — the industry's answer to exactly this problem |
| **Wikimedia Commons** | Many device photos under CC BY-SA; usable with attribution |
| **A supplier or brand portal** | If a supply agreement grants asset rights, check what it actually covers |

There is also a consumer-law point independent of copyright. A press render
shows a flawless device; you sell graded second-hand stock. A Fair-grade
handset arriving with exactly the scratches its grade promised, against a
listing photo showing none, is a complaint that is expensive to answer and hard
to defend. If stock photography is used at all, the grade wording has to carry
the weight the picture does not — which is why `conditionDescription` is
generated per grade and shown on the listing.
