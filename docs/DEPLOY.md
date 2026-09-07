# Deploy Trigger

This file is added to trigger a fresh deployment on the next push to main. No runtime impact.

## Preview mode

`VITE_PREVIEW_MODE=on` puts a standing notice across every page and makes
`api/_routes/orders.ts` refuse with a 503. Unset it — or set it to `off` — to
start trading.

**The banner is not the mechanism.** A notice asking people not to order, over
a checkout that works, produces exactly one outcome: a real order from someone
who did not read it, and a refund, and an apology. The refusal is server-side,
where a hidden button and a determined browser cannot route around it. The
banner exists so nobody wastes their time getting that far.

One variable, both sides. Vite inlines it into the bundle and Vercel hands the
same value to the functions, so the banner and the order route cannot disagree.
Two variables would eventually be set to two different things.

Unset is off, so a missing variable never freezes production. Anything set that
is not clearly negative is on — a typo fails towards refusing orders rather
than taking them.

The banner is on every page rather than only the home page: someone arriving on
a product listing from a search result never sees the home page, and they are
exactly the person most likely to try to buy something.

**It needs a redeploy to change**, because Vite inlines it at build time.
Setting the variable in Vercel is not enough on its own.

Everything else stays live: browsing, search, accounts, sign-in, and every
transactional email. Those are what need testing with real people before
launch, and none of them takes money. `/api/health` reports `previewMode` so
the deployment's actual state can be checked rather than assumed.
