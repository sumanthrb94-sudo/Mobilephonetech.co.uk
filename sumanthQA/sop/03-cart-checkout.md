# SOP 03 — Cart & Checkout

---

## Scenario 1 — Add to Cart (Happy Path)

**Steps:**
1. Navigate to any product detail page
2. (Optional) Select a colour/storage variant
3. Set quantity to 2 using the +/− controls
4. Click **Add to cart**

**Expected result:**
- Cart icon in navbar shows badge count (2)
- "Added to cart" toast/modal appears with product name and quantity
- Cart drawer slides open OR toast confirms addition

**Pass criteria:** ✅ Badge count updates, toast shown

---

## Scenario 2 — Cart Drawer

**Steps:**
1. After adding items, click the cart icon

**Expected result:**
- Cart drawer slides in from the right
- Shows each item: image, name, grade, price, quantity controls
- Shows subtotal
- "Proceed to checkout" button
- "Continue shopping" / close button

2. Use quantity +/− inside drawer
3. Click the bin/remove icon on an item

**Expected result:**
- Quantity updates, total recalculates
- Remove deletes the item, drawer updates

**Pass criteria:** ✅ Drawer shows items, quantity updates, remove works

---

## Scenario 3 — Cart Persistence (Same Device)

**Steps:**
1. Add 2 products to cart
2. Close the browser tab and reopen the site

**Expected result:**
- Cart still contains both items (loaded from `localStorage`)
- Cart count badge shows correct number

**Pass criteria:** ✅ Cart survives tab close (localStorage key: `mpm_cart`)

---

## Scenario 4 — Cart Merges on Login

**Steps:**
1. While logged OUT, add 1 product to cart
2. Log in with a real account

**Expected result:**
- Cart items from before login are merged into Supabase
- Any cart items from the logged-in account's last session also appear
- No duplicates for the same product

**Pass criteria:** ✅ Cart merges, Supabase `cart_items` updated

---

## Scenario 5 — Checkout: Shipping Step

**Steps:**
1. Add an item to cart and click **Proceed to checkout**
2. You land on the Shipping step

**Expected result:**
- Form fields: Full name, email, phone, address line 1, address line 2 (optional), city, postcode, country
- Previously saved address is pre-filled (if exists in localStorage)
- 3 shipping options: Standard (free), Express (£9.99), Next Day (£19.99)
- Each option shows estimated delivery date

3. Fill in a valid UK address (e.g. `1 Test Street, London, SW1A 1AA`)
4. Select **Standard Delivery**
5. Click **Continue to payment**

**Pass criteria:** ✅ Form validates, address saved, continues to payment

---

## Scenario 6 — Checkout: Coupon Code

**Steps:**
1. On the checkout review step (or shipping/payment), find the coupon field
2. Enter `SAVE10` → click Apply

**Expected result:**
- Green tick / success message
- 10% discount applied to subtotal
- Order total recalculates

3. Enter `WELCOME20`

**Expected result:**
- £20 fixed discount

4. Enter `FREESHIP`

**Expected result:**
- Shipping cost reduced to £0

5. Enter `BADCODE`

**Expected result:**
- Error: "Invalid coupon code"

**Pass criteria:** ✅ Valid codes apply, invalid codes rejected, totals recalculate

**Valid test coupon codes:**
| Code | Type | Value |
|------|------|-------|
| SAVE10 | Percentage | 10% off subtotal |
| WELCOME20 | Fixed | £20 off |
| FREESHIP | Fixed | Free shipping |

---

## Scenario 7 — Checkout: Payment Step (Demo Mode)

**Steps:**
1. Proceed to payment step
2. Enter any card details (demo mode — no real payment processed):
   - Card number: `4242 4242 4242 4242`
   - Expiry: any future date (e.g. `12/28`)
   - CVV: any 3 digits (e.g. `123`)
   - Name on card: any name
3. Click **Pay now** / **Place order**

**Expected result:**
- Order confirmed screen appears
- Order ID displayed (e.g. `ORD-abc123`)
- Cart is cleared

⚠️ **Note:** This is DEMO MODE only. No real money is charged. Real Stripe integration is not yet implemented.

**Pass criteria:** ✅ Confirmation screen appears, cart emptied, order ID shown

---

## Scenario 8 — Order Confirmation

**Steps:**
1. Complete checkout (Scenario 7)

**Expected result:**
- Confirmation page shows:
  - Order number
  - Items ordered
  - Delivery address
  - Total paid
  - Estimated delivery date
- "Continue shopping" button returns to homepage/products

**Pass criteria:** ✅ All order details displayed

---

## Scenario 9 — Checkout Form Validation

**Steps:**
1. On shipping step, click Continue without filling any fields

**Expected result:**
- HTML5 `required` validation fires
- Required fields highlighted
- Cannot proceed to payment

2. Enter an invalid postcode format (e.g. `AAAA 999`)

**Expected result:**
- Postcode validation error OR delivery options fail to load

**Pass criteria:** ✅ Empty required fields blocked, invalid postcode handled

---

## Scenario 10 — Cart Page (`/cart`)

**Steps:**
1. Navigate to `/cart` directly

**Expected result:**
- Full cart page shown (not just drawer)
- Same items as drawer
- Quantity controls work
- Remove works
- "Proceed to checkout" navigates to `/checkout`
- Empty cart shows "Your cart is empty" with shop button

**Pass criteria:** ✅ Cart page mirrors drawer state

---

## Edge Cases to Check

| Case | Expected |
|------|----------|
| Add same product twice | Quantity increases on existing line item |
| Add same product with different colour | Two separate line items |
| Set quantity to 0 in drawer | Item removed |
| Remove all items, proceed to checkout | Checkout redirects back to cart or shows empty state |
| Apply coupon then remove it | Total reverts to original |
| Very large quantity (e.g. 999) | Allowed or stock limit enforced |
