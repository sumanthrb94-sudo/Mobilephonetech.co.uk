# SOP 06 — Error States & Edge Cases

---

## Scenario 1 — Deleted Product URL

**Steps:**
1. Navigate to a product URL that no longer exists:  
   `https://mobilephonetech-co-uk.vercel.app/product/this-id-does-not-exist`

**Expected result:**
- Brief loading skeleton shown
- Then: **"📦 This product is no longer available"** page
- Subtitle: "It may have been sold, removed, or the link might be incorrect."
- Two buttons: **Go back** and **Browse all devices**
- NOT the red "Something went wrong" ErrorBoundary

**Pass criteria:** ✅ Graceful not-found page, correct buttons work

---

## Scenario 2 — Unknown URL / 404

**Steps:**
1. Navigate to a completely wrong URL:  
   `https://mobilephonetech-co-uk.vercel.app/this/page/does/not/exist`

**Expected result:**
- Custom 404 page ("Page not found" or similar)
- Helpful links back to homepage or products
- NOT a blank white page or browser 404

**Pass criteria:** ✅ Custom 404 page rendered

---

## Scenario 3 — ErrorBoundary (Simulated Crash)

The ErrorBoundary only fires for genuine render crashes. With current fixes applied, the following pages should NOT trigger it:

| Page | Should show |
|------|-------------|
| `/product/{valid-id}` | Product detail page ✅ |
| `/product/{deleted-id}` | "No longer available" page ✅ |
| `/product/{random-string}` | "No longer available" page ✅ |
| `/orders` (logged out) | Empty orders state ✅ |

If you DO see "Something went wrong" on any of these — this is a regression. Note the URL and report it.

---

## Scenario 4 — Supabase Unreachable (Network Simulation)

**Steps:**
1. Open DevTools → Network tab → set throttling to **Offline**
2. Navigate to `/products`

**Expected result:**
- Products page still loads using MOCK_PHONES fallback
- `fromSupabase` flag would be false (products come from mock data)
- No crash, no ErrorBoundary

3. Navigate to a product detail page

**Expected result:**
- If product exists in MOCK_PHONES: page loads
- If not in MOCK_PHONES: "no longer available" page

4. Navigate to `/orders`

**Expected result:**
- Empty state ("No orders yet") — cannot fetch from Supabase offline

**Pass criteria:** ✅ App degrades gracefully, never crashes

---

## Scenario 5 — Form Validation Edge Cases

### Auth Modal
| Input | Expected |
|-------|----------|
| Empty email | "required" validation |
| `not-an-email` | "invalid email" validation |
| Password < 6 chars | Supabase error on submit |
| `<script>alert(1)</script>` as name | Tags stripped or escaped |

### Checkout Address Form
| Input | Expected |
|-------|----------|
| Empty required fields | Cannot proceed, fields highlighted |
| `<b>bold</b>` in name field | Tags stripped |
| Postcode `SW1A 1AA` | Valid, delivery options shown |
| Postcode `INVALID` | Error or no options |

### Coupon Field
| Input | Expected |
|-------|----------|
| Empty string | No coupon applied |
| `SAVE10` (lowercase `save10`) | Applied (case-insensitive) |
| `<img src=x onerror=alert(1)>` | Sanitised, no XSS |

---

## Scenario 6 — Mobile Responsive Check

**Steps:**
1. Open Chrome DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Select iPhone 14 Pro (393×852)
3. Check each page:

| Page | Things to verify |
|------|-----------------|
| Homepage | Hero fits, cards stack, bottom nav visible |
| `/products` | Filter accessible (button), grid is 1–2 cols |
| Product detail | Gallery fits, add-to-cart button full-width |
| Cart drawer | Full width, scrollable items |
| Checkout | Form fields full-width, keyboard doesn't cover them |
| `/orders` | Order cards stack, text readable |
| Auth modal | Centred, not clipped at edges |

**Pass criteria:** ✅ No horizontal scroll, all interactions reachable with thumb

---

## Scenario 7 — Toast Notifications

**Steps:**
1. Add a product to cart → expect "Added to cart" toast
2. Apply a coupon → expect success toast
3. Apply an invalid coupon → expect error toast

**Expected result:**
- Toast appears from bottom or top of screen
- Auto-dismisses after ~3 seconds
- Can be manually dismissed

**Pass criteria:** ✅ Toasts appear, auto-dismiss at 3s, no stacking of old toasts

---

## Scenario 8 — Loading States

**Steps:**
1. Open DevTools → Network → set throttling to **Slow 3G**
2. Navigate to `/product/{id}`

**Expected result:**
- Loading skeleton shown (grey animated boxes for image and text)
- After data loads: real product content replaces skeleton
- No flash of "Something went wrong"

**Pass criteria:** ✅ Skeleton shown, smooth transition to content

---

## Regression Checklist

Run this after every deploy to main:

- [ ] Homepage loads without errors
- [ ] At least one product card clickable → goes to detail page
- [ ] Product detail page loads (not "Something went wrong")
- [ ] Add to cart → badge updates
- [ ] Auth modal opens and closes
- [ ] Login with test credentials succeeds
- [ ] `/orders` loads without crash (logged in)
- [ ] `/product/does-not-exist` shows "no longer available" (not ErrorBoundary)
- [ ] `/unknown-url` shows 404 page (not blank)
- [ ] Mobile layout: no horizontal overflow on any page
- [ ] `npm test` → 305 tests pass
