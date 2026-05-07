# Production Readiness Scorecard

**Overall: ~65% — Well-architected foundation, payment and real data gaps block launch**

Benchmark: Back Market, Swappa, Amazon refurbished marketplace

---

## Scorecard

| Area | Score | Status | Notes |
|------|-------|--------|-------|
| Product catalogue | 70% | ⚠️ Partial | 70+ mock SKUs; real DB schema ready but not seeded |
| Product detail page | 90% | ✅ Done | Gallery, specs, variants, SEO, reviews, fallback |
| Cart | 95% | ✅ Done | Supabase sync, guest cart, localStorage, variants |
| Checkout flow | 55% | ⚠️ Partial | All steps exist; payment is demo-only |
| Payment | 5% | ❌ Critical | No real Stripe/Klarna — demo card 4242 only |
| Authentication | 80% | ⚠️ Partial | Email/password works; no Google/Apple login |
| Order history | 85% | ✅ Done | Supabase fetch on login, survives refresh |
| Wishlist | 90% | ✅ Done | Supabase sync, localStorage, persist |
| Account page | 60% | ⚠️ Partial | Profile + orders; no delivery tracking |
| Search | 65% | ⚠️ Partial | Autocomplete works; no search results page |
| Reviews | 75% | ✅ Done | Submit, display, star rating; no moderation |
| API routes | 70% | ⚠️ Partial | 7 endpoints; no payment webhooks |
| Database schema | 90% | ✅ Done | 13 tables, RLS, indexes, good structure |
| SEO | 85% | ✅ Done | sitemap, robots, JSON-LD, og: tags |
| Performance | 60% | ⚠️ Partial | Code splitting; no WebP/CDN/srcset |
| Automated tests | 75% | ⚠️ Partial | 305 tests for logic; no E2E |
| Error handling | 80% | ✅ Done | ErrorBoundary, 404, product not-found, toasts |
| Mobile / responsive | 90% | ✅ Done | Mobile-first, bottom nav, touch swipe |

---

## Top 5 Gaps — Must Fix Before Launch

### 1. Real Payment Integration (CRITICAL — blocks all revenue)
- **Current state:** Demo mode, accepts any card number, no Stripe tokenisation
- **What's needed:** Stripe Elements or Stripe Payment Intents API, Klarna/Clearpay for BNPL, webhook handler for payment confirmation
- **Effort:** 5–8 days
- **Files to change:** `src/components/CheckoutFlow.tsx` (payment step), new `api/payments/create-intent.ts`, new `api/webhooks/stripe.ts`

### 2. Order Confirmation Emails (CRITICAL — legal requirement)
- **Current state:** Orders saved to Supabase but no email sent
- **What's needed:** Postmark or SendGrid integration, templates for: order confirmation, shipping notification, delivery confirmation
- **Effort:** 2–3 days
- **Files to change:** `api/orders/confirm.ts` (new), Supabase edge function or server action

### 3. Real Product Data (HIGH — foundational)
- **Current state:** Products served from `MOCK_PHONES` array in `src/data.ts`
- **What's needed:** Seed Supabase `products` table from a data source, admin CSV upload, or Shopify/spreadsheet import
- **Effort:** 1–2 days for seeding; ongoing for inventory management
- **Files:** `scripts/seed-supabase.ts` exists but needs real product data

### 4. Image CDN + WebP (HIGH — UX and SEO)
- **Current state:** Large PNG images served raw
- **What's needed:** Cloudflare Images or AWS S3 + CloudFront, WebP/AVIF conversion, `srcset` for responsive images
- **Effort:** 2–3 days
- **Impact:** Core Web Vitals, mobile load time, Google ranking

### 5. E2E Tests (HIGH — confidence to deploy)
- **Current state:** 305 unit tests; no browser-level tests
- **What's needed:** Playwright or Cypress — checkout flow, auth flow, cart operations
- **Effort:** 3–4 days
- **Files:** New `e2e/` folder with `auth.spec.ts`, `checkout.spec.ts`, `products.spec.ts`

---

## Secondary Gaps (post-launch polish)

| Gap | Effort | Impact |
|-----|--------|--------|
| Google/Apple social login | 1 day | Reduces signup friction |
| Search results page | 1 day | Better search UX |
| Review moderation queue | 1 day | Content safety |
| Helpful votes backend | 0.5 day | Trust signals |
| Admin dashboard | 5 days | Operations |
| Inventory stock sync | 2 days | Prevent overselling |
| Sentry error monitoring | 0.5 day | Production visibility |
| PWA manifest + service worker | 1 day | Installable, offline |

---

## Comparison vs Back Market (refurb competitor)

| Feature | Us | Back Market |
|---------|-----|------------|
| Product listing + filters | ✅ | ✅ |
| Product detail page | ✅ | ✅ |
| Grade explanation | ✅ | ✅ |
| Battery health display | ✅ | ✅ |
| Cart + checkout | ⚠️ demo payment | ✅ real |
| Klarna/Clearpay | ❌ | ✅ |
| Auth (email) | ✅ | ✅ |
| Auth (social) | ❌ | ✅ |
| Order tracking | ❌ | ✅ |
| Seller ratings | ❌ | ✅ |
| Price match guarantee | ⚠️ badge only | ✅ |
| Trade-in | ⚠️ quote form | ✅ full flow |
| Mobile app | ❌ | ✅ |
| Reviews | ✅ | ✅ |
| SEO | ✅ | ✅ |
