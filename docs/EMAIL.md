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
