# Email — transactional and campaigns

Two systems, deliberately separate, sharing one sending identity.

| | Transactional | Campaigns |
|---|---|---|
| What | Welcome, order confirmation, dispatched, out for delivery, returns | Newsletters, promotions, launches |
| Sent by | Vercel functions, via `api/_email.ts` | Listmonk, self-hosted |
| Delivery | Brevo REST API (`BREVO_API_KEY`) | Brevo SMTP relay |
| Triggered by | A customer action | A person clicking Send |
| Templates | `api/_templates.ts` | Listmonk's own editor |

The split matters. Transactional mail must go out the instant something
happens and must never be blocked by a marketing tool being down; campaign
mail needs list management, segmentation, open tracking and an unsubscribe
flow that transactional mail must not have. Both hand off to the same Brevo
account so the sending domain, DKIM signature and reputation stay unified —
splitting those is what gets order confirmations filed as spam because a
promotional blast annoyed people the week before.

## Why Listmonk

It is the open-source option that is actually maintained and actually
pleasant: AGPLv3, a single Go binary plus Postgres, a REST API for everything,
and no per-subscriber pricing. Mautic does more and costs far more to operate;
Keila is lighter but thinner on segmentation.

What Listmonk does *not* do is deliver mail — it hands every message to an
SMTP relay. That is the right shape. Running your own outbound mail server
means owning IP warm-up, blocklist monitoring and DMARC alignment, and a new
shop that gets that wrong lands in spam for months.

---

## Transactional

Already wired. Four customer templates live in `api/_templates.ts`, all built
from the storefront's design system — stone neutrals, gold accent, the LeHart
wordmark, 14px cards.

| Template | Fires from | Trigger |
|---|---|---|
| Welcome | `api/_routes/newsletter.ts` | Newsletter signup |
| Order confirmation | `api/_routes/orders.ts` | Order written successfully |
| Dispatched | `api/_routes/order-notify.ts` | Staff marks it dispatched |
| Out for delivery | `api/_routes/order-notify.ts` | Staff marks it out for delivery |

### Seeing them without sending

```bash
npm run email:preview      # writes docs/email-previews/
open docs/email-previews/index.html
```

Renders all four with sample data — a discount, a two-line address, an item
with no image, a name with an apostrophe. Both the HTML and the plain-text
part are written out. This tells you nothing about how Outlook will render it;
only a real send does that. It does catch a broken total or an empty block.

### Marking an order dispatched

`POST /api/order-notify`, staff only — the caller must hold the `admin` custom
claim. It sets the order status *and* emails the customer in one call, because
two endpoints is how orders end up dispatched with nobody told.

```bash
curl -X POST https://lehart.co.uk/api/order-notify \
  -H "authorization: Bearer $ADMIN_ID_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "orderId": "ORD-1756382400123",
    "kind": "dispatched",
    "courier": "Royal Mail",
    "trackingNumber": "AB123456789GB",
    "trackingUrl": "https://www.royalmail.com/track-your-item#/tracking-results/AB123456789GB",
    "estimatedDelivery": "Tomorrow, before 6pm"
  }'
```

`kind` is `confirmation`, `dispatched` or `out-for-delivery`. Everything except
`orderId` and `kind` is optional — with no tracking number the email leads with
the order number instead. The recipient always comes from the stored order,
never the request body; otherwise this would forward arbitrary mail to
arbitrary addresses on our warmed domain.

A `502` means the status was saved but the email failed. Retry the mail, not
the status.

---

## Campaigns — setting up Listmonk

### 1. Start it

Needs a host with Docker. A £5/month VPS is ample; Vercel cannot run it,
because it is a long-lived server with a database.

```bash
cd deploy/listmonk
cp .env.example .env       # fill in all five values
docker compose up -d
docker compose logs -f app # watch the first-run migration
```

The `.env` needs a Postgres password, a first-run admin login, and the **Brevo
SMTP** credentials. Those are *not* the `BREVO_API_KEY` the functions use —
Brevo → **SMTP & API → SMTP tab** gives you a login like
`8a1b2c001@smtp-brevo.com` and a separate SMTP key. Pasting the v3 API key
there fails authentication with a message that does not explain why.

Listmonk binds to `127.0.0.1:9000`. Put TLS in front of it rather than opening
the port — it is a login form with your entire subscriber list behind it. With
Caddy that is two lines:

```
mail.lehart.co.uk {
    reverse_proxy 127.0.0.1:9000
}
```

### 2. Create the list and an API user

In the UI: **Lists → New**, call it `Newsletter`, type **public**, opt-in
**single** (the site already records consent — see below). Note the numeric id
from the URL.

Then **Admin → Users → New**, role **API**, and copy the token once. It is not
shown again.

### 3. Point the site at it

Four Vercel environment variables, all server-side — never prefix them with
`VITE_`, which would inline the token into the browser bundle:

| Variable | Example |
|---|---|
| `LISTMONK_URL` | `https://mail.lehart.co.uk` |
| `LISTMONK_USERNAME` | `api-user` |
| `LISTMONK_TOKEN` | the token from step 2 |
| `LISTMONK_LIST_ID` | `1` |
| `LISTMONK_AUTH` | omit — only set to `basic` for Listmonk v3 and older |

With any of the first four unset, every sync becomes a logged no-op rather
than an error. That is deliberate: the signup is already in Firestore by then,
and a campaign tool being down must not cost you a subscriber.

### 4. Backfill and reconcile

```bash
npm run listmonk:sync            # dry run — reports, changes nothing
npm run listmonk:sync -- --apply # writes
```

Firestore is the source of truth in both directions. Active records are
created or updated; `isActive: false` records are **blocklisted**, because an
unsubscribe honoured only on the site is still a marketing email to someone
who asked you to stop.

Worth running on a cron. New signups sync themselves as a best-effort side
effect of `POST /api/newsletter`, so an address can be missing purely because
Listmonk was down for ten minutes — this closes that gap.

### 5. Test the whole path

```bash
# 1. Subscribe through the real endpoint.
curl -X POST https://lehart.co.uk/api/newsletter \
  -H 'content-type: application/json' \
  -d '{"email":"you+test@yourdomain.com","name":"Test","source":"api-test"}'
```

The response tells you what each half did:

```json
{ "success": true, "listmonk": "created", "welcomeEmail": "sent" }
```

`"listmonk": "LISTMONK_URL, USERNAME, TOKEN or LIST_ID is not set"` means the
env vars have not reached the deployment. `"welcomeEmail"` reports the same
for Brevo.

2. Check the address appears in Listmonk under the list, status **enabled**.
3. Check the welcome email arrived, and that its unsubscribe link works.
4. In Listmonk, **Campaigns → New**, send to that list, and use *Preview* then
   *Test* to mail yourself before scheduling.

### Consent

`POST /api/newsletter` writes a consent block to Firestore — timestamp, source,
policy version, method, and a truncated IP — and mirrors those onto the
Listmonk subscriber as `attribs`. That evidence is what makes the list lawfully
mailable under UK GDPR and PECR; an imported address with none of it attached
cannot be defended if challenged.

The signup is currently **single opt-in**, recorded honestly as such
(`doubleOptInConfirmed: false`). If you switch the Listmonk list to double
opt-in, its own confirmation email takes over and only confirmed addresses
receive campaigns.

### Backups

The subscriber list is the asset. Before any upgrade:

```bash
cd deploy/listmonk
docker compose exec -T db pg_dump -U listmonk listmonk | gzip > listmonk-$(date +%F).sql.gz
```

---

## Brevo beyond sending

Four further capabilities are wired up. All are off until their environment
variables are set, and all fail softly when they are not.

### Delivery-event webhook — `POST /api/brevo-webhook`

The most important of the four. Before this, nothing in the shop noticed a
bounce or a spam complaint. Mailing a hard-bounced address repeatedly tells
providers you do not maintain your list; complaints cost you the domain's
reputation for *everything*, order confirmations included.

Configure in Brevo → Transactional → Settings → Webhooks (and again under
Contacts → Settings for marketing events):

```
https://lehart.co.uk/api/brevo-webhook?secret=<BREVO_WEBHOOK_SECRET>
```

**Brevo does not sign its webhooks** — there is no HMAC — so that query-string
secret is the entire authentication. It is compared in constant time, and with
`BREVO_WEBHOOK_SECRET` unset the route 404s rather than defaulting open.
Anyone who learns it can suppress arbitrary addresses, so rotate it if the URL
leaks.

| Event | Effect |
|---|---|
| `hard_bounce`, `blocked`, `spam`, `complaint`, `unsubscribed`, `invalid_email` | Suppressed in Firestore, Brevo *and* Listmonk |
| `delivered`, `opened`, `click`, `soft_bounce`, `deferred` | Logged to `emailEvents` only |

A soft bounce never suppresses — it is transient, and a full mailbox is not a
dead address. Every event is logged either way, keyed by
`email_event_messageId`, so Brevo's retries overwrite their own row instead of
inflating the counts.

### Contacts — `api/_brevoContacts.ts`

Newsletter signups now land in Brevo contacts as well as Listmonk. Both are
projections of Firestore; which one you send campaigns from stays a decision
you can change without touching the signup path. Set `BREVO_LIST_ID` to file
them on a list.

Suppression uses `emailBlacklisted`, not list removal — a contact merely
removed from a list can still be caught by an automation.

### Abandoned cart recovery

| Piece | What it does |
|---|---|
| `POST /api/cart-events` | Records a started checkout once an email is known |
| `GET /api/cron-abandoned-cart` | Daily sweep, sends one reminder per cart |

Declared as a Vercel cron in `vercel.json`. Because every route is dispatched
through the one catch-all function, this costs **no extra Serverless Function**
against the Hobby limit.

> **The schedule must be daily on Hobby.** That plan allows a cron to run only
> once a day, and an hourly expression like `0 * * * *` does not warn — Vercel
> refuses the entire deployment at creation, with no build, no logs, and only a
> failed commit status to go on. This cost seven hours of failed deploys once
> already. On Pro, switch it to `0 * * * *`: a reminder four hours after the
> basket is abandoned converts far better than one the next morning.

Three rules stop it becoming spam: one reminder per cart ever (`reminderSentAt`
is stamped *before* the send, so a crash cannot double-send); a delay
(`ABANDONED_CART_DELAY_HOURS`, default 4) so it does not interrupt someone
still shopping; and a cutoff (`ABANDONED_CART_CUTOFF_HOURS`, default 48) after
which it reads as surveillance. `ABANDONED_CART_MAX_PER_RUN` caps each run at
25 so a backlog cannot eat the daily quota order confirmations depend on.

The stored basket is **display-only**. Real prices are recomputed server-side
by `orders.ts` when the order is placed — quoting a browser-supplied total in
a recovery email would reintroduce the price-tampering hole `orders.ts` was
rewritten to close.

The email deliberately carries **no discount code**. Handing one to everyone
who hesitates teaches customers to abandon on purpose and costs margin on the
ones who were returning anyway; for refurbished phones the doubt is "is this
any good", so the reassurance block answers that instead.

### Transactional SMS

Wired into `POST /api/order-notify` for the out-for-delivery message only —
the one notification where nobody is checking email. Opt in per call with
`"sendSms": true`; the number comes from the stored order's shipping address.

**SMS is not free.** It bills prepaid Brevo credits, separate from the email
tier, so with `SMS_SENDER` unset every send is a logged no-op. Messages are
truncated to 160 characters (one GSM-7 segment) so a runaway template cannot
quietly cost several credits per send.

### The 300/day ceiling

The free tier's daily limit is shared. `ABANDONED_CART_MAX_PER_RUN` exists
precisely so a recovery backlog can never crowd out an order confirmation —
the worst possible failure for a shop. Before your first large campaign,
check the remaining allowance in the Brevo dashboard.

## If the account welcome does not arrive

The signup welcome is `POST /api/account-welcome`, called by the browser
straight after `createUserWithEmailAndPassword`. It answers **200 whatever
happens** — a mail failure must never look to a customer like a broken signup —
so a 200 in the Vercel logs is not evidence that anything was sent.

Check `GET /api/health` first:

```json
"emailConfigured": true, "emailFrom": "orders@lehart.co.uk"
```

`emailConfigured: false` means `BREVO_API_KEY` or `EMAIL_FROM` is missing from
that deployment's environment, and `sendEmail` turned every send into a no-op.
That is deliberate — a missing key must not fail a customer's order — but it
means the *only* symptom is mail that never arrives. This is what happened on
28 August: the route ran, returned 200, and never called Brevo.

If it is configured and mail still does not arrive, look for
`[api/account-welcome]` in the runtime logs. A `Brevo responded 401` is the
key; a `400` naming the sender is `EMAIL_FROM` not being a **verified sender**
in Brevo → Senders, Domains & Dedicated IPs.

**One account only ever gets one welcome.** `users/{uid}.welcomeEmailSentAt` is
stamped before the send so a retry cannot produce a second copy. The stamp is
released again when nothing reached Brevo at all, so accounts created while the
key was unset are not permanently excluded — but an account that was stamped by
a build *before* that fix still holds it. Clear that one field to let it send,
or test with a fresh address.

## "Brevo says it sent, nothing arrives"

This is the failure mode with no error anywhere, and it is a configuration
fault rather than a bug. On 28 August the runtime logs showed
`POST /api/account-welcome 200` with no error line and no skip line, meaning
`sendEmail` returned `sent: true` — **Brevo accepted the message**. The
end-to-end journey test proves the same thing offline: welcome, confirmation,
dispatch and doorstep all build correctly and all address the right customer.

The cause was the sender. `EMAIL_FROM` was `sumanthrb94@gmail.com`. A `From:`
address at gmail.com relayed through Brevo's servers cannot be SPF- or
DKIM-aligned with gmail.com's DMARC record, so the receiving side — Gmail above
all — reads it as spoofing and junks or drops it. Nothing in the chain reports
a failure, because nothing in the chain failed.

`EMAIL_FROM` must be an address at a domain you control and have authenticated
in Brevo → Senders, Domains & Dedicated IPs: add the domain, publish the DKIM
and SPF records it gives you, wait for it to show Verified, then use
`orders@yourdomain`. `/api/health` now returns a `warnings` array naming this
if the sender is at a free-mail domain.

To trace an individual send, look for `[email] <tag> accepted by Brevo as
<messageId>` in the Vercel runtime logs and search that id in Brevo →
Transactional → Logs, which carries the real verdict: delivered, soft bounce,
blocked, or spam complaint.

## The end-to-end journey test

`src/__tests__/e2e/customerJourney.test.ts` walks signup → welcome → order →
confirmation → dispatch → out-for-delivery through the real handlers, with an
in-memory Firestore and a fake Brevo that records the exact payload.

It exists because every individual piece was already covered and the journey
still did not work. Unit tests mock `sendEmail` and assert it was called; they
cannot see a recipient read from the wrong field, a browser that never calls
the route, or a sender the provider will accept and the world will refuse. It
also pins the two properties that are easy to break and invisible when broken:
every message carries a plain-text part, and the confirmation quotes the same
arrival date checkout showed.

## Going live on lehart.co.uk

The domain is registered and its mail is hosted at IONOS, with mailboxes
including `info@`, `accounts@` and named staff addresses. That is the missing
piece the sender warning has been pointing at — Brevo can now send as a domain
you control instead of as a gmail.com address it can never authenticate.

Four steps, in this order. Each one is inert until the one before it is done.

### 1. Authenticate the domain in Brevo

Brevo → Senders, Domains & Dedicated IPs → **Add a domain** → `lehart.co.uk`.
Brevo issues a DKIM record, an SPF entry and a DMARC suggestion.

Publish them at **IONOS → Domains → lehart.co.uk → DNS**. They are TXT records;
IONOS appends the domain to the host name itself, so enter `mail._domainkey`
rather than `mail._domainkey.lehart.co.uk` or the record ends up doubled.

**Do not remove IONOS's existing MX records.** DKIM and SPF govern sending;
MX governs receiving. Deleting the MX entries stops every mailbox in the
screenshots from receiving anything.

Wait for Brevo to show the domain **Verified**. Propagation is usually minutes
and occasionally hours; nothing below works until it does.

### 2. Point the site at the domain

Vercel → Settings → Domains → add `lehart.co.uk` and `www.lehart.co.uk`, then
add the A / CNAME records Vercel gives you at IONOS. This is separate from mail
and neither breaks the other.

### 3. Set the environment variables

```
EMAIL_FROM        info@lehart.co.uk
EMAIL_FROM_NAME   LeHart
EMAIL_REPLY_TO    info@lehart.co.uk
PUBLIC_SITE_URL   https://lehart.co.uk     # only once step 2 resolves
```

Eight mailboxes exist on `lehart.co.uk`, and only one of them is wired to the
site:

| Mailbox | Used by the site |
|---|---|
| `info@` | **Yes** — sender, reply-to, and the support address published on the legal pages, the returns flow and the footer |
| `accounts@` | No — finance |
| `sales@`, `sourcing@` | No — internal functions |
| `aimen@`, `asim@`, `haroon@`, `mir@` | No — people. Candidates for `ADMIN_EMAILS`, which is who can sign in to `/admin` |

There is no `orders@`. Create one if the plan has a spare slot: a dedicated
transactional sender keeps receipts out of a shared inbox and makes a
deliverability problem easy to isolate when one appears. Until then `info@`
does both jobs perfectly well at 300 emails a day.

Nothing should send as a person's mailbox. A receipt from `asim@lehart.co.uk`
invites replies into an individual's inbox, breaks when that person leaves, and
mixes personal correspondence with automated mail in a way that makes the
address's sending reputation impossible to reason about.

`EMAIL_REPLY_TO` is applied to every send inside `sendEmail`, so no template
can forget it. It matters more than it looks: customers reply to receipts to
ask where a parcel is or to report a fault, and a send-only From address means
they believe they contacted you while nobody ever sees it.

`PUBLIC_SITE_URL` must not be changed before the domain resolves — it is the
base for every link inside every email, so pointing it at a domain that is not
yet serving breaks order tracking, basket recovery and unsubscribe in one move.

### 4. Firebase's own emails

Verification and password-reset messages come from Firebase, not Brevo, and
still say `noreply@lehart-1b9ef.firebaseapp.com`. Firebase Console →
Authentication → Templates → **Customise domain** routes them through
`lehart.co.uk` with its own DNS records. Also add `lehart.co.uk` under
Authentication → Settings → **Authorized domains**, or Google sign-in returns
`auth/unauthorized-domain` on the new domain.

### Verifying

`/api/health` reports the state without guessing:

```json
"emailFrom": "orders@lehart.co.uk", "emailReplyTo": "info@lehart.co.uk", "warnings": []
```

An empty `warnings` array is the signal — the sender-domain warning disappears
on its own once `EMAIL_FROM` is no longer at a free-mail domain. Then sign up
with a real address and confirm both messages arrive: Firebase's verification
link and the LeHart welcome. Check the spam folder too; the first sends from a
newly authenticated domain sometimes land there before reputation builds.

## Brevo or Resend

Both are supported. `EMAIL_PROVIDER` chooses, and it is optional — the provider
is inferred from whichever key is set, so adding `RESEND_API_KEY` is enough to
switch. When both keys exist Resend wins, on the reasoning that deliberately
adding the newer key says more than never having removed the old one.

```
EMAIL_PROVIDER=resend      # optional
RESEND_API_KEY=re_...      # Resend → API Keys
```

Every caller passes the same object; only the request differs, and it differs
in almost every field name:

| | Brevo | Resend |
|---|---|---|
| Auth | `api-key:` header | `Authorization: Bearer` |
| Sender | `sender: {email, name}` | `from: "Name <addr>"` |
| Body | `htmlContent` / `textContent` | `html` / `text` |
| Reply-to | `replyTo: {email}` | `reply_to` |
| Tags | `["order-confirmation"]` | `[{name, value}]` |
| Id returned | `messageId` | `id` |

The id is read from the field the provider in use actually sets, not by falling
back between them — a fallback silently picks whichever is present, so the day
a response carries both, the id in the log is not necessarily the one in their
console.

### Switching does not skip the DNS work

**This is the part worth being clear about.** DKIM and SPF are published per
sending domain *per provider*. Moving to Resend means publishing Resend's
records at IONOS; it does not inherit Brevo's, and it does not avoid the step.

Nothing that has gone wrong with email on this project was the provider's
doing. The messages that never arrived were sent from a gmail.com address no
relay can authenticate. The ones before that were never sent at all, because a
key was missing. Swapping provider would have fixed neither, and the sender
warning in `/api/health` fires the same either way.

Choose on price, on which dashboard you prefer reading, or on where the
business already has an account. Not on deliverability — that is your domain's
reputation, not theirs.

### What stays on Brevo

**SMS.** Resend does not send SMS, so `api/_sms.ts` still uses `BREVO_API_KEY`
and `SMS_SENDER`. Running Resend for email and Brevo for the doorstep text is a
supported combination: keep both keys and set `EMAIL_PROVIDER=resend`.

**The bounce webhook.** `api/_routes/brevo-webhook.ts` parses Brevo's payload
shape. On Resend the equivalent webhook is not yet written, so hard bounces and
complaints would stop feeding the suppression list — worth building before any
volume, and harmless at the current scale where the list is short enough to
read by eye.

**Contact sync.** `api/_brevoContacts.ts` writes to Brevo's contact lists for
campaigns. That is marketing rather than transactional and is independent of
which provider sends receipts.

## Brevo or Resend

Both are supported. `EMAIL_PROVIDER` chooses, and it is optional — the provider
is inferred from whichever key is set, so adding `RESEND_API_KEY` is enough to
switch. When both exist Resend wins, on the reasoning that deliberately adding
the newer key says more than never having removed the old one.

Every caller passes the same object; only the request differs, and it differs
in almost every field name:

| | Brevo | Resend |
|---|---|---|
| Auth | `api-key:` header | `Authorization: Bearer` |
| Sender | `sender: {email, name}` | `from: "Name <addr>"` |
| Body | `htmlContent` / `textContent` | `html` / `text` |
| Reply-to | `replyTo: {email}` | `reply_to` |
| Tags | `["order-confirmation"]` | `[{name, value}]` |
| Id returned | `messageId` | `id` |

The id is read from the field the provider in use actually sets, not by falling
back between them — a fallback silently picks whichever is present, so the day
a response carries both, the id logged is not necessarily the one in their
console.

### The account address is not the sending address

A Resend account registered under a gmail.com address sends perfectly well from
`info@lehart.co.uk`. The login is billing and access; deliverability depends
only on which **domain** is verified inside that account. They are unrelated,
and conflating them is the reason people conclude a provider "doesn't work".

### Switching does not skip the DNS work

DKIM and SPF are published per sending domain *per provider*. Moving to Resend
means publishing Resend's records at IONOS; it does not inherit Brevo's.

Nothing that has gone wrong with email here was the provider's doing. The
messages that never arrived were sent from a gmail.com address no relay can
authenticate. The ones before that were never sent at all, because a key was
missing. Swapping provider fixes neither, and the sender warning in
`/api/health` fires the same either way.

### Running both at once: one SPF record, not two

DKIM is safe to duplicate — each provider uses its own selector, so
`resend._domainkey` and Brevo's record coexist with no conflict.

**SPF is not.** A domain may publish exactly one SPF TXT record. Adding a
second does not combine them; it makes the SPF result *permerror*, which is
worse than having none, and it takes both providers down at once. Merge the
includes into a single record instead:

```
v=spf1 include:_spf.brevo.com include:amazonses.com ~all
```

Take the exact `include:` value each provider tells you to use rather than the
line above — Resend's has changed as their infrastructure has, and a stale
include silently fails SPF. SPF also permits at most ten DNS lookups; two
includes is fine, but it is a budget worth knowing exists.

### What stays on Brevo

**SMS.** Resend does not send SMS, so `api/_sms.ts` still uses `BREVO_API_KEY`
and `SMS_SENDER`. Resend for email and Brevo for the doorstep text is a
supported combination: keep both keys and set `EMAIL_PROVIDER=resend`.

**The bounce webhook.** `api/_routes/brevo-webhook.ts` parses Brevo's payload
shape. The Resend equivalent is not written, so on Resend hard bounces and
complaints stop feeding the suppression list. Worth building before any volume;
harmless at the current scale, where the list is short enough to read by eye.

**Contact sync.** `api/_brevoContacts.ts` writes to Brevo's contact lists for
campaigns — marketing rather than transactional, and independent of which
provider sends receipts.

## Product images in email

Two things stop a catalogue image rendering in a mailbox, and both fail as a
broken square in the customer's receipt rather than as an error anyone sees.

**A stored path is relative.** Products carry `/assets/catalogue/photos/x.webp`,
which resolves against the site in a browser and against nothing at all in
Gmail. `emailImageUrl()` in `api/_templates.ts` prefixes `PUBLIC_SITE_URL`
centrally, so no template can forget — and it is another reason
`PUBLIC_SITE_URL` must be right before any send.

**The format is one email cannot render.** SVG is stripped outright by Gmail,
Outlook and Yahoo. WebP is unsupported by Outlook on Windows, which uses Word's
rendering engine and is a large share of UK inboxes. Both are correct choices
for the website and wrong for a receipt.

So `scripts/import-images.mjs` writes every photograph twice — `.webp` for the
site, `.jpg` beside it for email — and `emailImageUrl()` swaps the extension.
The pair is written in one loop, so neither exists without the other.

The drawn SVG placeholders resolve to null, and the item row falls back to a
tidy empty square. That is deliberate: **a blocked or broken image should look
like a design choice, not a fault.** The cell has a fixed size and its own
background, so the layout does not shift either way — which matters because
most clients block remote images until the reader asks for them, so the
no-image state is what a good proportion of customers see first regardless.

The practical consequence: **order emails show real photographs only for
listings that have one.** Until the photography lands, receipts show the empty
square, which is honest and tidy. Nothing needs changing when the pictures
arrive — the same import that puts them on the site puts them in the emails.
