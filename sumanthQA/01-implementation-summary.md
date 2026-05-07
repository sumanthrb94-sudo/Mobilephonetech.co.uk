# Implementation Summary

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS 4, CSS custom properties (design tokens) |
| Routing | React Router v7 |
| Animation | Motion (Framer Motion v12) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Hosting | Vercel (auto-deploy from main branch) |
| AI Assistant | Google Gemini via `@google/genai` |
| Testing | Vitest 4, @testing-library/react 16, jsdom |

---

## Features Implemented

### Authentication (`src/context/AuthContext.tsx`)
- Email + password signup with Supabase Auth
- Email confirmation flow — link redirects to production domain (not localhost)
- Login with real Supabase session (`isAuthenticated = !!session`)
- Logout — clears session and user state
- Password reset via `supabase.auth.resetPasswordForEmail` with redirect
- Guest mode — creates ephemeral user with `isGuest: true`, no Supabase session
- Auth modal (`src/components/AuthModal.tsx`) — shows real error messages, email confirmation notice after signup
- Session persisted across page refresh via Supabase `persistSession: true`

### Product Catalogue
- 70+ mock SKUs in `src/data.ts` (Apple, Samsung, Google, iPads, Tablets)
- `useProducts` hook (`src/hooks/useProducts.ts`) — Supabase first, falls back to mock data
- Filters: brand, grade (Pristine/Excellent/Good/Fair/New), category, storage, price range
- Sort: price ascending, price descending, newest
- Pagination: configurable page size (default 24)
- `ProductsPage` with sidebar filters and live result count
- Search autocomplete (`SearchContext`, `SearchAutocomplete` component)
- API endpoint: `api/search.ts` — ILIKE brand/model matching

### Product Detail Page (`src/components/ProductDetail.tsx`)
- Loads from Supabase first, falls back to mock data
- Loading skeleton while fetch is in-flight
- "Product no longer available" page for deleted/unknown products (not ErrorBoundary crash)
- 6-image gallery with swipe, keyboard nav, lightbox fullscreen
- Variant selector (colour/storage/condition)
- Price display with savings badge
- Battery health, warranty, return days badges
- Finance breakdown (monthly instalments)
- Delivery promise (postcode-aware)
- Tabbed detail: Overview · Specifications · Reviews
- Technical specs (enriched with device database)
- Related products section
- Recently viewed (localStorage, persisted)
- Wishlist toggle
- Share button
- SEO: JSON-LD product schema, breadcrumb schema, Open Graph tags
- Grade explainer modal

### Cart (`src/context/CartContext.tsx`)
- Add to cart with quantity and variants (colour/storage/condition)
- Same product + different colour = separate line items
- Remove item, update quantity (quantity ≤ 0 removes item)
- Cart total and item count computed
- Persisted to `localStorage` under key `mpm_cart`
- On login: local cart merged into Supabase `cart_items` table via upsert
- Supabase sync: upsert on add/update, delete on remove, full clear on clearCart
- Cart drawer (slide-in panel)
- "Added to cart" toast modal
- Cart page (`/cart`) with full item list

### Checkout (`src/components/CheckoutFlow.tsx`, `src/context/CheckoutContext.tsx`)
- 5-step flow: Cart → Shipping → Payment → Review → Confirmation
- Shipping address form with localStorage persistence (`mt_shipping_address`)
- 3 shipping options: Standard (free) · Express (£9.99) · Next Day (£19.99)
- Coupon codes: `SAVE10` (10% off), `WELCOME20` (£20 off), `FREESHIP` (free shipping)
- Payment form — **demo mode only** (accepts any input, no real Stripe tokenisation)
- Order creation: writes to Supabase `orders` + `order_items` tables
- Order confirmation screen with order ID
- Cart cleared after successful order

### Order History (`src/components/OrderHistoryPage.tsx`)
- Fetches orders from Supabase on login (`orders` + `order_items` JOIN)
- Survives page refresh and re-login
- Order status chips: Pending / Confirmed / Shipped / Delivered
- Line items with price and quantity
- Shipping address display
- Returns flow modal (`ReturnFlowModal`)

### Wishlist (`src/context/WishlistContext.tsx`)
- Add/remove products
- Duplicate prevention
- Persisted to `localStorage` under key `mpm_wishlist`
- Synced to Supabase `wishlist_items` table for logged-in users
- `WishlistPage` at `/wishlist`
- Heart icon toggle on product cards and product detail

### Account Page (`src/components/AccountPage.tsx`)
- Profile: full name, phone number edit
- Password change (current + new + confirm)
- Saved addresses view
- Order history tab (links to `/orders`)

### Search
- `SearchContext` + `SearchAutocomplete` component
- Autocomplete suggestions from `api/search.ts`
- Full-text filter in `ProductsPage` via `useProducts({ search })`
- URL-driven: `/products?q=iphone`

### Reviews (`ReviewsSection` component)
- Star rating (1–5)
- Average rating + distribution chart
- Submit review form (writes to Supabase `reviews` table)
- Verified purchase badge (schema ready, always false currently)
- Paginated display

### API Routes (`api/` folder)
| Endpoint | Purpose |
|----------|---------|
| `api/products.ts` | List products with filters, sort, pagination |
| `api/search.ts` | Autocomplete — brand/model ILIKE |
| `api/reviews.ts` | GET paginated reviews, POST new review |
| `api/delivery.ts` | Postcode → delivery options + estimated date |
| `api/trade-in.ts` | Trade-in quote form |
| `api/newsletter.ts` | Newsletter signup |
| `api/coupons/validate.ts` | Coupon code validation |

### SEO
- `robots.txt` — disallows checkout/cart/orders, allows AI crawlers
- `sitemap.xml` — 50+ static URLs
- Per-page SEO via `useSeo` hook: title, description, canonical, noindex
- JSON-LD: Organization, WebSite, SearchAction (homepage), Product + BreadcrumbList (PDP)
- Open Graph and Twitter card meta tags on all pages

### Performance
- Lazy-loaded routes via `React.lazy` + `Suspense`
- Vite code splitting (react, router, lucide chunks)
- `ProductImage` with 4-tier fallback — zero network call for placeholder images
- Image lazy loading + async decoding

### Error Handling
- `ErrorBoundary` — wraps all routes, shows "Something went wrong" with Try Again + Go Home
- 404 page (`NotFound`) for unmatched routes
- "Product no longer available" page for deleted products
- Toast notification system via `UIContext`
- API error responses with HTTP status codes

### Mobile / Responsive
- Mobile-first layout with Tailwind responsive utilities
- `MobileBottomNav` — Home / Shop / Wishlist / Cart / Account tabs
- Touch swipe on product gallery
- Minimum 44px touch targets
- Responsive typography with `clamp()`

---

## What Is NOT Implemented (gaps to production)

| Gap | Impact |
|-----|--------|
| Real payment (Stripe/Klarna) | Blocks all revenue — demo only |
| Order confirmation emails | Customers don't hear anything after purchase |
| Real product data in DB | Products served from mock array, not seeded Supabase |
| Image CDN / WebP | Large PNG images hurt mobile performance |
| Social login (Google/Apple) | Higher signup friction |
| E2E tests (Cypress/Playwright) | Can't auto-verify full checkout flow |
| Admin dashboard | No way to manage products/orders without Supabase UI |
| Inventory management | Stock numbers are static mock values |
| Review moderation | No way to approve/reject reviews |
| Helpful votes backend | UI button exists, no backend wiring |
