# sumanthQA — Quality Assurance Master Index

**Project:** Mobilephonetech.co.uk — UK refurbished mobile marketplace  
**Stack:** React 19 · TypeScript · Vite · Supabase · Vercel  
**Test runner:** Vitest 4 · @testing-library/react 16 · jsdom  
**Last updated:** 2026-05-07

---

## Files in this folder

| File | Contents |
|------|----------|
| `README.md` | This index |
| `01-implementation-summary.md` | Every feature built, tech decisions, what is and isn't live |
| `02-test-coverage.md` | All 305 automated tests mapped to source files |
| `03-production-readiness.md` | % scorecard vs Amazon/Back Market — gaps and priorities |
| `sop/01-auth.md` | Manual SOP: signup · login · guest · reset password |
| `sop/02-products.md` | Manual SOP: browse · search · filter · product detail |
| `sop/03-cart-checkout.md` | Manual SOP: cart · checkout · coupons · order placement |
| `sop/04-orders.md` | Manual SOP: order history · returns |
| `sop/05-wishlist-account.md` | Manual SOP: wishlist · account profile · password change |
| `sop/06-error-states.md` | Manual SOP: deleted products · bad URLs · network errors |

---

## Quick stats

- **305 automated tests** across 16 test files — run with `npm test`
- **Production URL:** https://mobilephonetech-co-uk.vercel.app
- **Supabase project:** configured via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
- **Overall production readiness:** ~65% (auth ✅, cart ✅, checkout ⚠️ demo payment, real payment ❌)

---

## How to run automated tests

```bash
# Run all 305 tests once
npm test

# Watch mode (re-runs on file change)
npm run test:watch

# Coverage report (opens HTML in /coverage)
npm run test:coverage

# Run a single test file
npx vitest run src/__tests__/context/CartContext.test.tsx
```

Any failing test means a regression was introduced. Fix before pushing to main.
