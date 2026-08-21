# LeHart — Upwork portfolio item

Copy-paste blocks for the Upwork portfolio form. Each heading below matches a
field on the "Add portfolio item" screen.

**Before you publish:** replace every `<LIVE_URL>` with your Vercel address.
There are two — in *Project URL* and at the end of *Project description*.

---

## Project title

> Refurbished Phone E-Commerce Platform — React, TypeScript, Firebase

*66 characters. Upwork truncates around 70.*

---

## Project description

> A UK direct-to-consumer storefront and staff back office for selling
> refurbished phones and tablets, built from scratch in React 19, TypeScript
> and Firebase.
>
> **Customer storefront**
> A 133-product catalogue with faceted search, filtering and sorting. Every
> listing carries condition grading, battery health and warranty terms — the
> details that decide a refurbished purchase. Wishlist, product comparison,
> basket, and a three-step checkout with both guest and account routes.
> Trade-in quotes and an AI buying advisor round out the customer side.
>
> **Staff back office**
> An Operations Hub dashboard — stock valuation and unit KPIs, a stock-by-brand
> breakdown, a restocking work queue and recent orders — over an inventory
> console built for the shop's own team: create and edit products,
> upload images to cloud storage, adjust stock inline without leaving the list,
> and filter by brand or stock state across a paginated catalogue. Access is
> enforced by Firebase custom claims plus hand-written Firestore and Storage
> security rules, so the database itself rejects unauthorised writes even if
> the interface is bypassed.
>
> **Platform migration**
> Migrated the entire data layer from Postgres to Firebase across 26 files —
> authentication, product data, orders, reviews and file storage — replacing
> row-level security with a claims-based authorisation model.
>
> **Testing and quality**
> • 420 unit tests
> • Six end-to-end suites driving real Chromium: 47 customer-journey checks,
>   17 interaction checks, 98 admin and security-rule checks, 85 focus and
>   text-input checks, 17 Content-Security-Policy conformance checks, and a
>   9-step checkout walk that proves no card data is ever collected on-site
> • The admin suite runs against the Firebase emulator suite, so the security
>   rules under test are the ones actually enforced — not stubs of them
> • Verified on desktop and mobile viewports, including WCAG 2.2 target-size
>   conformance and keyboard focus behaviour
>
> **Stack:** React 19, TypeScript, Vite, Tailwind CSS, Firebase (Auth,
> Firestore, Storage), Node serverless functions, Playwright, Vitest, Vercel.
>
> Live: <LIVE_URL>

---

## Your role

> Full-stack developer — architecture, UI, back office, security rules,
> test automation and deployment.

---

## Project URL

> <LIVE_URL>

---

## Skills / tags

Paste these one at a time; Upwork matches them against its own skill list.

```
React
TypeScript
JavaScript
Firebase
Google Cloud Firestore
Node.js
Vite
Tailwind CSS
Ecommerce Website Development
Web Application
UI/UX Design
Responsive Design
Test Automation
Playwright
Web Accessibility
```

---

## Image captions

Upload from `docs/screenshots/` in this order. Captions are optional on Upwork
but they carry the story when someone only skims the gallery.

| File | Caption |
| --- | --- |
| `01-home.png` | Storefront home — hero, category navigation and the trust cues that matter when buying second-hand. |
| `02-catalogue.png` | Faceted catalogue — filtering 133 products down to 53 by brand, with active filters shown as removable chips. |
| `03-product-detail.png` | Product page — condition grade, battery health, warranty, colour and storage variants, and instalment options. |
| `04-checkout.png` | Checkout — guest or account, address capture with postcode lookup, and a live order summary with VAT. |
| `05-admin-dashboard.png` | Operations Hub — stock KPIs, stock-by-brand breakdown, a restocking queue and recent orders. |
| `06-admin-inventory.png` | Staff inventory console — search, brand and stock filters, inline stock editing, and per-row edit and delete. |

---

## A note on accuracy

The copy above describes what is built and tested. It deliberately does not
claim the site processes live payments, because it does not yet — checkout
collects details and creates an order, but no payment provider is connected.

Worth keeping it that way. If a client hires you on the strength of "live
e-commerce store" and then finds the checkout is a demo, that is a much more
expensive conversation than the one where you say "storefront and back office
built; payment integration is the next phase." The work genuinely stands up on
its own — a 133-product catalogue, a real admin console, an emulator-backed
security test suite and 630+ automated checks is a strong portfolio piece
without needing the extra claim.

See `docs/launch-readiness.html` for the full gap analysis.
