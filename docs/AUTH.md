# Accounts and identity

## What identifies a customer

**An email address or a verified mobile number.** Every account is one Firebase
Auth user keyed by `uid`, and the profile document lives at `users/{uid}`.

Two kinds of phone number exist and they must not be confused:

| | Where | Verified | Identity |
|---|---|---|---|
| `shippingAddress.phone` | On an order | No | **No** — a delivery contact. Two accounts may carry the same one. |
| `user.phoneNumber` | On the auth record | Yes, by SMS | **Yes** — you can sign in with it |

Only the second one signs anybody in.

## How duplicate accounts are prevented

One mechanism does the real work: Firebase Auth's **"One account per email
address"** setting, on by default under *Authentication → Settings*. With it
on, a second identity for an address that already has one is refused —
`auth/account-exists-with-different-credential`.

> **This setting is load-bearing.** Profiles are keyed by `uid`, not email, so
> turning it off produces two `users/{uid}` documents for one person: two order
> histories, two wishlists, two of everything, silently. Nothing in the
> application would detect it. Do not turn it off.

Refusing the second account is necessary but not sufficient — on its own it
leaves a customer who genuinely owns both a password and a Google login at a
dead end. So the refusal is now recoverable:

1. Google sign-in hits an address that already has a password.
2. The refused Google credential is **held in memory** (never persisted).
3. The customer enters their existing password once.
4. `linkWithCredential` attaches Google to the existing account.
5. Either method signs them in from then on.

**The password step is the security boundary.** Without it, anyone who knew an
address could attach their own Google account to it and take it over. The
credential is held in a ref, cleared on success or cancel, and never written
anywhere.

## Why duplicates matter commercially

Not tidiness. A split account means:

- The customer cannot see their own order, so they contact support.
- **Returns and the 12-month warranty are tied to an order under the other
  account** — a legitimate claim looks fraudulent.
- Marketing double-counts and double-sends.
- A GDPR erasure or subject-access request against one account silently misses
  the other.

## Telling people which method they used

A failed sign-in is very often the right person using the wrong method, so the
error names the provider the address actually has rather than "invalid
credentials". That difference is what stops someone giving up and registering
a second address.

It degrades honestly. `fetchSignInMethodsForEmail` returns `[]` when
**Email Enumeration Protection** is enabled — the default for projects created
since late 2023 — precisely so a stranger cannot probe which addresses have
accounts here. An empty list means *"cannot tell"*, never *"no account
exists"*, and the wording falls back to something generic. Never write code
that treats `[]` as "this address is free".

The password reset confirmation is worded the same way: *"If an account exists
for …"*. Confirming that it does would turn the form into a way of testing
which addresses from a leaked list shop here.

## Mobile sign-in

Enter a UK mobile, receive a six-digit code, and you are in. No password.

### The duplicate trap, and the one line that avoids it

**Firebase treats a phone number as an identity in its own right, not as an
attribute of an email account.** So a customer who already has an email login
and then "signs in with their mobile" gets a *second* `uid`, a second profile
and a second order history — and the one-account-per-email setting does nothing
about it, because no email is involved.

`startPhoneSignIn` therefore branches on whether anyone is currently signed in:

```
current user ?  linkWithPhoneNumber(current, …)   // add the number to their account
             :  signInWithPhoneNumber(auth, …)    // nobody here yet, start fresh
```

That branch is the whole defence. It is tested directly in
`src/__tests__/context/phoneAuth.test.tsx`.

A number that already belongs to a *different* account raises
`auth/credential-already-in-use`, and the message says so rather than silently
switching the customer to that other account — which would look to them like
their data had vanished.

### Normalisation is an identity decision

`src/utils/phoneNumber.ts` is shared by the browser and the serverless
functions on purpose. Firebase keys a phone account on the exact string it is
handed, so `07700 900123` and `+44 7700 900123` normalising differently would
hand one person two accounts. One normaliser, used everywhere, tested for
exactly that collapse.

**The country is picked, never inferred.** The field has a country selector
beside it and its value is passed through to `toE164`. This was not the
original design, and the original design failed in the worst way available: it
assumed every bare number was British, so an Indian mobile typed as
`9700144003` was rewritten to `+449700144003` — a number that exists nowhere —
and Firebase's only reply was `auth/internal-error`. Nothing named the country,
and nothing revealed that the app had changed what was typed.

A leading `+` always wins over the picker. Someone who states their own country
code means it, and overriding that would be the same silent rewrite again.

Ordering inside `normalisePhone` matters: a bare number whose length matches
the chosen country's national format is treated as national **before** the
starts-with-the-dial-code test. Otherwise a real Indian subscriber number
beginning `91…` would have its first two digits read as a country code and the
code would go to a different handset.

`describePhoneProblem` returns the reason rather than a boolean, because
"that does not look like a valid mobile number" tells someone whose only
mistake was leaving the country on United Kingdom nothing they can act on. It
checks length and the mobile prefix per country, and passes anything from a
country it does not model straight through — the network is the right place to
refuse those.

It is deliberately not libphonenumber — that is ~150 kB for validation this
does not need — so it still accepts some numbers that are not dialable.
Firebase and Brevo reject those at send time, which is the right place for it:
the cost of being wrong is a failed send, not a wrong account.

### Operational notes

- **reCAPTCHA is mandatory.** An invisible verifier mounts into
  `#auth-recaptcha-container`; without that element in the DOM,
  `signInWithPhoneNumber` throws before any SMS is sent. It cannot be reused
  once solved, so every attempt builds a fresh one and failures tear it down.
- **Enable Phone under Firebase Auth → Sign-in method**, and add your domain to
  Authorized domains, or you get `auth/operation-not-allowed`.
- **This costs money.** Firebase gives a small free daily SMS allowance and
  bills beyond it. `auth/quota-exceeded` is surfaced with its own message.
- The code field uses `autocomplete="one-time-code"`, so iOS and Android offer
  the code straight from the notification. That is most of the ergonomic win.
- **Every send failure is reported by its Firebase code**, through the shared
  `describeAuthError`. The "add your mobile" step used to catch its own errors
  and collapse all of them into *"Could not send the code. Check the number and
  try again"* — which told a customer to re-check a number that was fine while
  hiding an unenabled provider, a blocked country, an exhausted daily SMS
  allowance and a failed reCAPTCHA behind one sentence. Being told the wrong
  cause is worse than being shown a raw error code.
- **A country must be allowed in the Firebase SMS region policy before it will
  send.** Authentication → Settings → SMS region policy. `auth/internal-error`
  is what a blocked country looks like from the browser, which is why the
  message for it names both possibilities.

## Each route asks for the other method

Signing up with an email offers a mobile straight after; signing up with a
mobile asks for an email. Both steps are skippable.

This is the duplicate defence doing its real work rather than only reacting.
A number attached at signup means a later phone sign-in **links** to that
account instead of minting a second one — the `startPhoneSignIn` branch has an
existing session to attach to, so the trap never opens. Waiting until the
customer tries phone sign-in months later means racing that branch against
their memory of which method they used.

The reverse matters for a different reason: **a phone-only account has nowhere
to receive an order confirmation, a receipt, or a return update.** It is not a
tidiness problem, it is a customer who cannot be told their order shipped. So
the email is asked for while they are still in the modal, not at checkout.

Both are optional on purpose. Making either mandatory would cost more signups
than the duplicates and unreachable accounts it prevents, and both can be added
later from the account page.

## Email verification

Signup sends a confirmation link, and the modal then shows a screen naming the
address it really went to. That address is the thing worth catching: a typo
takes the order confirmation with it, and the customer never finds out.

**It is not a gate.** The customer is signed in the moment the account exists,
and the screen's button just closes the modal. Blocking checkout on an
unconfirmed address would cost far more in abandoned orders than the typos it
catches, so `user.emailVerified` is informational only — nothing in the app
reads it as permission.

Two things to know:

- **The link comes from Firebase, not Brevo.** It uses Firebase's own template
  and sender, so it does not carry the LeHart styling the order emails do.
  Firebase Console → Authentication → Templates is where that wording and the
  sender address live.
- **The return URL is `window.location.origin`**, not a fixed env var, so a
  preview deployment sends people back to that preview rather than production.
  It must be an authorised domain, which it is by definition if the customer is
  looking at it.

A failure to send never fails the signup — the account exists and works, and
`resendVerification()` retries from the modal or anywhere else. Firebase
rate-limits resends per address, which is normal to hit rather than a fault.

## What is deliberately not built

**Gmail alias folding.** `j.smith@gmail.com` and `jsmith@gmail.com` reach the
same inbox but are different identities to Firebase, as are `+tag` addresses.
Most shops accept this. It is a gap only if someone is farming welcome codes.

## Staff usernames

`resolveLoginIdentifier` maps a value with no `@` to the staff domain, so
`admin` signs in as `admin@lehart.co.uk`. Applied on **sign-in and password
reset only** — signup still requires a real address, because inventing one
would send a customer's mail into a domain they do not own. It cannot create a
duplicate: it resolves to the same address either way.

## The project

`lehart-1b9ef`. Pinned in three places, all of which must agree:

| Where | Value |
|---|---|
| `.firebaserc` | `lehart-1b9ef` — so `npx firebase deploy` needs no `--project` flag |
| `vercel.json` CSP `frame-src` | `https://lehart-1b9ef.firebaseapp.com` — the Google sign-in popup is framed from this domain, and a stale entry here blocks it **silently** |
| Vercel `VITE_FIREBASE_*` | from Project settings → General → Your apps |

An earlier project id (`mobilephonemarket-2764d`) was carried in the first two
for a while. If sign-in ever fails in a way that looks like nothing at all
happening, check these three still name the same project before anything else.

### New-project limits worth knowing

- **SMS is capped at 10/day** until a billing account is attached. That is
  enough to test mobile sign-in and nowhere near enough to launch on it.
  Firebase Console → Authentication → Sign-in method shows the current cap.
- The project is on **Spark (no-cost)**. Firestore and Auth are fine there;
  raising the SMS cap requires Blaze.

## If sign-in is failing entirely

Check these before reading any code:

1. **The six `VITE_FIREBASE_*` variables are set in the deployment, and name
   `lehart-1b9ef`.**
   `src/lib/firebase.ts` deliberately boots with placeholder values when they
   are missing — that stops a blank page, but it means every auth call fails
   while the app looks fine. "Signup is broken" and "env vars are missing" are
   indistinguishable from the outside.
2. **The domain is listed under Firebase Auth → Settings → Authorized
   domains.** Otherwise Google sign-in returns `auth/unauthorized-domain`.
3. **Email/Password, Google and Phone are all enabled** under Sign-in method.
   Otherwise `auth/operation-not-allowed`.
