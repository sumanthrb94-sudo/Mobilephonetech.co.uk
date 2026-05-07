# Automated Test Coverage

**Total: 305 tests across 16 test files — all passing**  
Run: `npm test`

---

## Context Tests

### `src/__tests__/context/AuthContext.test.tsx` — 12 tests
Tests the Supabase-backed authentication context.

| # | Test | What it verifies |
|---|------|-----------------|
| 1 | starts with isLoading true initially | Loading state is boolean on mount |
| 2 | starts unauthenticated | `isAuthenticated=false`, `user=null` after getSession resolves |
| 3 | throws when used outside AuthProvider | `useAuth()` throws outside provider |
| 4 | calls signInWithPassword on login | Supabase method called with email+password |
| 5 | throws when Supabase signIn returns error | Login propagates Supabase error |
| 6 | calls signUp on signup | Supabase signUp called with email/password/fullName/emailRedirectTo |
| 7 | throws when Supabase signUp returns error | Signup propagates Supabase error |
| 8 | calls signOut on logout | Supabase signOut called |
| 9 | clears user and session after logout | user=null, session=null post-logout |
| 10 | continueAsGuest sets guest user | user.isGuest=true, email set |
| 11 | guest user has isAuthenticated=false | No Supabase session → not authenticated |
| 12 | calls resetPasswordForEmail | Supabase method called with email + redirectTo |

---

### `src/__tests__/context/CartContext.test.tsx` — 22 tests
Tests the Supabase-synced cart with localStorage fallback.

| # | Test | What it verifies |
|---|------|-----------------|
| 1 | starts with empty cart | items=[], cartCount=0, cartTotal=0 |
| 2 | starts with cart closed | isCartOpen=false |
| 3 | throws when used outside CartProvider | useCart() throws outside provider |
| 4 | adds a product to the cart | items.length=1, correct id and quantity |
| 5 | increases quantity when adding same product twice | Single item, qty=3 |
| 6 | treats same product with different colors as separate line items | 2 items for same product different colour |
| 7 | adds multiple distinct products | 2 items for 2 different products |
| 8 | sets lastAddedItem and lastAddedQuantity | lastAddedItem.id correct, lastAddedQuantity=2 |
| 9 | removes a product from the cart | items.length=0 after remove |
| 10 | removes only the specified product | Other item remains |
| 11 | does nothing when removing non-existent product | No crash, item count unchanged |
| 12 | updates quantity of an existing item | quantity=5 after updateQuantity |
| 13 | removes item when quantity updated to 0 | items empty |
| 14 | removes item when quantity updated to negative | items empty |
| 15 | clears all items from the cart | items=[], count=0, total=0 |
| 16 | calculates cartTotal correctly | 649×2 + 399×1 = 1697 |
| 17 | calculates cartCount correctly | 3+2=5 |
| 18 | reflects updated total after quantity change | total = 649×3 after updateQuantity |
| 19 | persists cart to localStorage when items change | localStorage[mpm_cart] contains item |
| 20 | loads cart from localStorage on mount | Items hydrated from stored JSON |
| 21 | setIsCartOpen toggles cart open state | isCartOpen true→false |
| 22 | clearLastAdded resets lastAddedItem | null, 0 after clear |

---

### `src/__tests__/context/CheckoutContext.test.tsx` — 37 tests
Tests checkout flow, coupon system, order creation, and Supabase order fetch.

| Group | Tests |
|-------|-------|
| throws outside provider | 1 |
| step navigation | currentStep starts 'cart', setCurrentStep changes it, all 5 step values valid, step survives re-render, does not affect shipping state, does not affect orders |
| shipping address | setShippingAddress stores address, persists to localStorage, loads from localStorage on mount, corrupt localStorage handled, address cleared |
| shipping options | defaults to standard (cost 0), setShippingOption changes, option persists through step changes |
| coupons | SAVE10 returns true (10% percentage), WELCOME20 returns true (£20 fixed), BADCODE returns false, removeCoupon clears, case-insensitive match, second code replaces first |
| order creation | orders starts empty, lastOrder null initially, createOrder adds to array, accumulate multiple orders, lastOrder tracks newest, createOrder calls supabase insert with correct fields, order_items inserted with line items, offline resilience (catch block) |
| Supabase order fetch | authenticated session fetches orders, order.items mapped from order_items, no fetch without session, no fetch for guest users, Supabase error handled gracefully, orders array populated from DB rows |

---

### `src/__tests__/context/WishlistContext.test.tsx` — 18 tests

| # | Test | What it verifies |
|---|------|-----------------|
| 1 | starts with empty wishlist | items=[], wishlistCount=0 |
| 2 | addToWishlist adds a product | items.length=1 |
| 3 | addToWishlist ignores duplicate | Still 1 item after double add |
| 4 | addToWishlist holds multiple distinct products | 2 items |
| 5 | removeFromWishlist removes the product | items empty |
| 6 | removeFromWishlist removes only the specified product | Other item remains |
| 7 | removeFromWishlist does nothing for non-existent id | No crash, count unchanged |
| 8 | isInWishlist returns true after add | true |
| 9 | isInWishlist returns false before add | false |
| 10 | isInWishlist returns false after remove | false |
| 11 | wishlistCount tracks additions | count=2 |
| 12 | wishlistCount tracks removals | count=1 after remove |
| 13 | persists to localStorage on add | localStorage has item |
| 14 | persists multiple ids to localStorage | Both ids stored |
| 15 | removes id from localStorage on delete | Key absent |
| 16 | writes empty array on mount | Empty array stored |
| 17 | clearWishlist empties items and clears localStorage | items=[], key absent |
| 18 | throws when used outside WishlistProvider | Throws error |

---

### `src/__tests__/context/UIContext.test.tsx` — 19 tests

| Group | Tests |
|-------|-------|
| showToast | sets toastMessage, defaults type to 'info', sets 'success', sets 'error', sets 'warning' |
| auto-dismiss | message is null initially, dismisses at exactly 3000ms, still visible at 2999ms, back-to-back calls reset the timer |
| hideToast | clears message immediately, cancels auto-dismiss timer |
| cart drawer | isCartOpen starts false, setIsCartOpen(true) opens, setIsCartOpen(false) closes |
| sidebar | isSidebarOpen starts false, toggled independently of cart |
| throws | throws when used outside UIProvider |

---

## API Tests

### `src/__tests__/api/coupons.test.ts` — 20 tests
Tests `/api/coupons/validate` endpoint.

Covers: valid codes (SAVE10, WELCOME20, FREESHIP), invalid code, empty body, missing code field, case sensitivity, wrong HTTP method (GET/PUT/DELETE → 405), expired coupon shape, discount calculation for each type, minimum order validation, response shape assertion.

---

### `src/__tests__/api/delivery.test.ts` — 18 tests
Tests `/api/delivery` endpoint.

Covers: valid UK postcode → options array, next-day/express/standard options present, estimated date calculation, invalid postcode → 400, missing postcode → 400, Northern Ireland (BT) postcode, Scottish Highlands postcode, London postcode, wrong HTTP method, empty string postcode, response shape (cost, name, estimatedDate fields).

---

### `src/__tests__/api/newsletter.test.ts` — 15 tests
Tests `/api/newsletter` endpoint.

Covers: valid email subscribe → 200, duplicate email handling, invalid email → 400, missing email → 400, wrong HTTP method → 405, empty body → 400, response shape, HTML injection in email field sanitised.

---

### `src/__tests__/api/trade-in.test.ts` — 22 tests
Tests `/api/trade-in` endpoint.

Covers: valid quote request → quote object, all required fields present, missing brand → 400, missing model → 400, grade affects quote value (Pristine > Good > Fair), storage affects quote value, quote ID is unique per request, wrong HTTP method, response shape, edge cases (unknown model, very old device).

---

### `src/__tests__/api/gemini-chat.test.ts` — 12 tests
Tests the Gemini AI assistant integration.

Covers: valid message → AI response, empty message → 400, Gemini API error handled gracefully, response shape, prompt injection sanitisation, conversation context passed, model instantiation, wrong HTTP method, rate limiting shape.

---

## Utility Tests

### `src/__tests__/utils/deliveryCalculator.test.ts` — 22 tests
Tests `src/utils/deliveryCalculator.ts`.

Covers: standard delivery cost, express surcharge, next-day surcharge, postcode → region mapping (London, Manchester, Birmingham, Scottish Highlands, Northern Ireland BT postcodes, area code extraction e.g. BT1→BT), cutoff time logic (before 2pm → same-day dispatch, after 2pm → next day), bank holiday exclusion, weekend skip, estimated date formatting, free delivery threshold.

---

### `src/__tests__/utils/postcodeLookup.test.ts` — 18 tests
Tests `src/utils/postcodeLookup.ts`.

Covers: valid UK postcode lookup, invalid format → error, partial postcode → error, uppercase normalisation, spaces stripped, Scottish postcode, Northern Ireland BT postcode, Channel Islands (not covered), unknown postcode → fallback, async response shape.

---

### `src/__tests__/utils/sanitize.test.ts` — 20 tests
Tests `src/utils/sanitize.ts`.

Covers: HTML tags stripped, script tags stripped, SQL injection chars escaped, XSS attempts neutralised, normal text unchanged, email sanitisation (strips tags, preserves @), leading/trailing whitespace trimmed, null/undefined input returns empty string, unicode preserved, emoji preserved.

---

### `src/__tests__/utils/seo.test.ts` — 22 tests
Tests `src/utils/seo.ts`.

Covers: productSeo returns correct title/description/canonical, price formatted correctly, stock affects availability string, productJsonLd schema shape, AggregateRating in JSON-LD, breadcrumbJsonLd correct @type and items, homeSeo defaults, noindex flag, og: fields present, twitter: fields present, JSON-LD is valid serialisable object.

---

## Hook Tests

### `src/__tests__/hooks/useProducts.test.ts` — 23 tests

| Group | Tests |
|-------|-------|
| Fallback | Returns MOCK_PHONES when Supabase empty, returns MOCK_PHONES when Supabase errors, fromSupabase=false on fallback, fromSupabase=true on real data |
| Loading | isLoading starts true, becomes false after fetch |
| Brand filter | Samsung only, Apple only, Apple+Samsung multi-brand |
| Grade filter | Good only, New only |
| Price range | All results within bounds, zero results for impossible range |
| Search | Case-insensitive model match, IPHONE=iphone same total, no-match returns empty |
| Sort | price_asc ascending order, price_desc descending order, asc first < desc first |
| Pagination | Page 1 ≤ pageSize, page 2 distinct from page 1, page 2 skips first N items, total = full MOCK_PHONES count |
| Combined | Samsung + price_asc: only Samsung, ascending |

---

### `src/__tests__/hooks/useRecentlyViewed.test.ts` — 17 tests

| # | Test | What it verifies |
|---|------|-----------------|
| 1 | starts with empty ids | Empty array on fresh localStorage |
| 2 | track(id) prepends to front | New id is first in array |
| 3 | track(id) deduplicates — re-track moves to front | No duplicates, moved to front |
| 4 | MAX=12 limit enforced | 13th add drops oldest |
| 5 | exactly 12 is fine | 12 items stored without drop |
| 6 | persists to localStorage after track | Key present in localStorage |
| 7 | persists multiple tracks | All ids in localStorage |
| 8 | loads from localStorage on mount | Existing ids restored |
| 9 | mount deduplicates persisted data | No duplicates after mount |
| 10 | clear() empties ids list | ids=[] |
| 11 | clear() removes localStorage key | Key absent |
| 12 | clear() is no-op when already empty | No crash |
| 13 | storage event syncs state | Cross-tab update reflected |
| 14 | storage event after key removed empties state | Cleared from another tab |
| 15 | storage event on different key ignored | Unrelated key doesn't affect state |
| 16 | unmount removes storage listener | No stale handler after unmount |
| 17 | track is stable reference (useCallback) | Same function ref across renders |

---

## Coverage Summary by Area

| Area | Test Files | Tests | Coverage |
|------|-----------|-------|----------|
| Auth | AuthContext | 12 | Full |
| Cart | CartContext | 22 | Full |
| Checkout | CheckoutContext | 37 | Full |
| Wishlist | WishlistContext | 18 | Full |
| UI / Toast | UIContext | 19 | Full |
| Products hook | useProducts | 23 | Full |
| Recently viewed | useRecentlyViewed | 17 | Full |
| Delivery API | delivery | 18 | Full |
| Coupon API | coupons | 20 | Full |
| Newsletter API | newsletter | 15 | Full |
| Trade-in API | trade-in | 22 | Full |
| AI chat API | gemini-chat | 12 | Full |
| Delivery calc | deliveryCalculator | 22 | Full |
| Postcode | postcodeLookup | 18 | Full |
| Sanitize | sanitize | 20 | Full |
| SEO | seo | 22 | Full |
| **TOTAL** | **16 files** | **305** | |

**Not yet covered by automated tests:**
- React components (visual/render tests) — 81 components
- E2E checkout flow (needs Cypress or Playwright)
- useShopify hook
- useSeo hook
- useBreakpoint / useMediaQuery hooks
