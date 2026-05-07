# SOP 05 — Wishlist & Account

---

## PART A — WISHLIST

### Scenario 1 — Add to Wishlist

**Steps:**
1. On any product detail page or product card, click the **heart icon**

**Expected result:**
- Heart fills with red/pink colour
- Wishlist count in navbar updates
- Toast notification: "Added to wishlist" (if toast shown)

**Pass criteria:** ✅ Heart fills, count updates

---

### Scenario 2 — Remove from Wishlist

**Steps:**
1. Click the heart icon on a wishlisted product

**Expected result:**
- Heart becomes unfilled (outline)
- Item removed from wishlist
- Count decrements

**Pass criteria:** ✅ Item removed, heart unfills

---

### Scenario 3 — View Wishlist Page

**Steps:**
1. Navigate to `/wishlist` or click Wishlist in bottom nav

**Expected result:**
- Grid of wishlisted products
- Each card shows product image, name, price
- Remove button on each card
- "Add to cart" button on each card
- Empty state if no items: "Your wishlist is empty"

**Pass criteria:** ✅ Wishlist page renders all saved items

---

### Scenario 4 — Wishlist Persists After Refresh

**Steps:**
1. Add 2 products to wishlist
2. Hard-refresh page

**Expected result:**
- Both products still in wishlist (loaded from `localStorage` key: `mpm_wishlist`)

**Pass criteria:** ✅ Wishlist survives refresh

---

### Scenario 5 — Wishlist Syncs to Supabase on Login

**Steps:**
1. While LOGGED OUT, add a product to wishlist
2. Log in

**Expected result:**
- Wishlist item is saved to Supabase `wishlist_items` table
- Product remains in wishlist

**Pass criteria:** ✅ Supabase `wishlist_items` updated

---

### Scenario 6 — Move Wishlist Item to Cart

**Steps:**
1. On `/wishlist`, click **Add to cart** on a product

**Expected result:**
- Product added to cart
- Cart count updates
- Product may be removed from wishlist OR remain (check actual behaviour)

**Pass criteria:** ✅ Product appears in cart

---

---

## PART B — ACCOUNT

### Scenario 7 — View Account Page

**Pre-condition:** Logged in.

**Steps:**
1. Navigate to `/account`

**Expected result:**
- Profile section: Full name, email (read-only), phone
- Order history tab/link
- Password change section
- Saved addresses section

**Pass criteria:** ✅ Account page loads without error

---

### Scenario 8 — Edit Profile

**Steps:**
1. On `/account`, click edit on Full Name
2. Change name to `Updated Name`
3. Save

**Expected result:**
- Name updates in the UI
- Saved to Supabase `profiles` table

**Pass criteria:** ✅ Profile saves and updates

---

### Scenario 9 — Change Password

**Steps:**
1. On `/account`, find the password change form
2. Enter:
   - Current password: (your real password)
   - New password: `NewSecurePass456!`
   - Confirm new password: `NewSecurePass456!`
3. Submit

**Expected result:**
- Success message shown
- Can log in with new password

4. Enter mismatching new/confirm passwords

**Expected result:**
- Validation error: "Passwords do not match"

**Pass criteria:** ✅ Password change works, mismatch blocked

---

### Scenario 10 — Account Page While Logged Out

**Steps:**
1. Log out
2. Navigate to `/account`

**Expected result:**
- Redirected to login OR auth modal opens OR empty account state with login prompt

**Pass criteria:** ✅ Not accessible without login, graceful redirect

---

## Edge Cases to Check

| Case | Expected |
|------|----------|
| Add 15 items to wishlist | All 15 stored (no cap currently) |
| Wishlist item product deleted from DB | Item still shows in wishlist (from localStorage), clicking it shows "no longer available" |
| Empty wishlist then add | Count goes from 0 to 1 |
| Profile name with emoji | Saved and displayed correctly |
| Phone number with spaces/dashes | Accepted or normalised |
