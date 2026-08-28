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

It is UK-first: a bare number with no country code is assumed to be UK. A
number that already carries a country code is left alone. It is deliberately
not libphonenumber — that is ~150 kB for validation this does not need — so it
accepts some numbers that are not dialable. Firebase and Brevo both reject
those at send time, which is the right place for it: the cost of being wrong is
a failed send, not a wrong account.

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

## What is deliberately not built

**Email verification on signup.** `createUserWithEmailAndPassword` signs the
user in immediately and sends nothing. The modal previously claimed a
confirmation link had been sent and told an already-signed-in customer to sign
in — both untrue, a leftover from Supabase, and enough to make a *successful*
registration look broken. That copy is gone.

The gap it leaves is real and worth closing later: a typo'd address takes the
order confirmation with it. `sendEmailVerification` plus a banner on the
account page is the natural next step.

**Gmail alias folding.** `j.smith@gmail.com` and `jsmith@gmail.com` reach the
same inbox but are different identities to Firebase, as are `+tag` addresses.
Most shops accept this. It is a gap only if someone is farming welcome codes.

## Staff usernames

`resolveLoginIdentifier` maps a value with no `@` to the staff domain, so
`admin` signs in as `admin@lehart.co.uk`. Applied on **sign-in and password
reset only** — signup still requires a real address, because inventing one
would send a customer's mail into a domain they do not own. It cannot create a
duplicate: it resolves to the same address either way.

## If sign-in is failing entirely

Check these before reading any code:

1. **The six `VITE_FIREBASE_*` variables are set in the deployment.**
   `src/lib/firebase.ts` deliberately boots with placeholder values when they
   are missing — that stops a blank page, but it means every auth call fails
   while the app looks fine. "Signup is broken" and "env vars are missing" are
   indistinguishable from the outside.
2. **The domain is listed under Firebase Auth → Settings → Authorized
   domains.** Otherwise Google sign-in returns `auth/unauthorized-domain`.
3. **Email/Password, Google and Phone are all enabled** under Sign-in method.
   Otherwise `auth/operation-not-allowed`.
