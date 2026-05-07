# SOP 02 — Product Browsing & Detail Page

---

## Scenario 1 — Browse All Products

**Steps:**
1. Navigate to `/products` (click "Shop" in navbar or bottom nav)

**Expected result:**
- Grid of product cards loads
- Each card shows: image, brand, model, grade badge, price, original price, savings %
- Filter sidebar visible (desktop) or filter button (mobile)
- Product count shown (e.g. "42 phones")

**Pass criteria:** ✅ Cards render, prices correct, grade badges coloured

---

## Scenario 2 — Filter by Brand

**Steps:**
1. On `/products`, tick **Apple** in brand filter
2. Check results

**Expected result:**
- Only Apple products shown
- Count updates
- URL updates to `/products?brand=Apple` (or similar)

3. Also tick **Samsung** — both brands now selected

**Expected result:**
- Both Apple and Samsung products shown
- No other brands

**Pass criteria:** ✅ Filter works, results accurate, multi-select works

---

## Scenario 3 — Filter by Grade

**Steps:**
1. On `/products`, tick **Excellent** in grade filter

**Expected result:**
- Only Excellent grade products shown
- Grade badge on each card shows "Excellent"

**Pass criteria:** ✅ Grade filter works

---

## Scenario 4 — Filter by Price Range

**Steps:**
1. Set price range slider to £100 – £300
2. Check results

**Expected result:**
- All displayed products have price between £100 and £300
- No product below £100 or above £300

**Pass criteria:** ✅ Price range enforced

---

## Scenario 5 — Search

**Steps:**
1. Click search icon in navbar
2. Type **"iPhone 15"**
3. Check autocomplete suggestions appear
4. Click a suggestion OR press Enter

**Expected result:**
- Autocomplete dropdown shows matching products
- Clicking suggestion navigates to that product's detail page
- Pressing Enter navigates to `/products?q=iPhone+15`

**Pass criteria:** ✅ Autocomplete appears, navigation works

---

## Scenario 6 — Sort Products

**Steps:**
1. On `/products`, open sort dropdown
2. Select **Price: Low to High**

**Expected result:**
- Products re-order with cheapest first
- No page reload (client-side sort)

3. Select **Price: High to Low**

**Expected result:**
- Products re-order with most expensive first

**Pass criteria:** ✅ Sort works in both directions

---

## Scenario 7 — Product Detail Page (Happy Path)

**Steps:**
1. From `/products`, click any product card

**Expected result:**
- Navigates to `/product/{id}`
- Page loads (not "Something went wrong")
- Shows: product name, brand, grade badge, price, original price, savings %
- Gallery with 6 thumbnail images
- Battery health %, warranty months, return days
- "Add to cart" button
- Wishlist (heart) button
- Variant selector (if product has colours/storage options)
- Finance breakdown (monthly payment)
- Delivery promise
- Tabs: Overview / Specifications / Reviews

**Pass criteria:** ✅ Full page renders without ErrorBoundary

---

## Scenario 8 — Product Gallery Navigation

**Steps:**
1. On a product detail page, click the arrow buttons to cycle through gallery images
2. Click a thumbnail to jump to that image
3. Click the expand icon (top-left of image)

**Expected result:**
- Arrow buttons cycle through 6 images
- Thumbnails highlight the active image with cyan border
- Expand opens fullscreen lightbox with dark background
- Clicking outside or X closes lightbox

On mobile:
- Swipe left/right on image to navigate gallery

**Pass criteria:** ✅ Gallery cycles, lightbox opens/closes, swipe works on mobile

---

## Scenario 9 — Product Tabs

**Steps:**
1. On product detail, click **Specifications** tab

**Expected result:**
- Technical specs table appears (display size, chip, RAM, camera, battery etc.)
- Organised in groups

2. Click **Reviews** tab

**Expected result:**
- Average star rating shown
- Rating distribution bars (5★ to 1★)
- Individual review cards (if any exist)
- "Write a review" form

3. Click **Overview** tab

**Expected result:**
- Product description paragraph
- "What's included" checklist (warranty, returns, unlocked etc.)
- Eco impact section

**Pass criteria:** ✅ All three tabs render correct content

---

## Scenario 10 — Deleted / Unknown Product URL

**Steps:**
1. Navigate to `/product/this-product-does-not-exist`

**Expected result:**
- Loading skeleton shown briefly
- Then: "📦 This product is no longer available" page
- Two buttons: "Go back" and "Browse all devices"
- NOT "Something went wrong" ErrorBoundary

**Pass criteria:** ✅ Graceful not-found page shown

---

## Scenario 11 — Recently Viewed

**Steps:**
1. View 3–4 different product detail pages
2. Navigate back to homepage or any product page

**Expected result:**
- "Recently viewed" horizontal strip appears at bottom of page
- Shows last viewed products (max 12)
- Persists after page refresh

**Pass criteria:** ✅ Recently viewed tracks and persists

---

## Scenario 12 — Grade Explainer

**Steps:**
1. On product detail page, click **"How does grading work?"** link

**Expected result:**
- Modal opens explaining Pristine / Excellent / Good / Fair grades
- Close button dismisses modal

**Pass criteria:** ✅ Modal opens and closes

---

## Edge Cases to Check

| Case | Expected |
|------|----------|
| Filter combination (Apple + Good + under £300) | Only products matching ALL filters |
| Zero filter results | "No products found" empty state |
| Product with no gallery images | Placeholder image shown, no crash |
| Product with no variants | No variant selector shown |
| Very long product name | Truncated or wraps correctly |
