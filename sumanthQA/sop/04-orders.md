# SOP 04 — Order History & Returns

---

## Scenario 1 — View Order History (After Placing Order)

**Pre-condition:** Logged in as an authenticated user, at least one order placed in same session.

**Steps:**
1. Navigate to `/orders` (Account → Order History, or bottom nav → Account → Orders)

**Expected result:**
- Order(s) listed with:
  - Order number (e.g. `ORD-abc123`)
  - Order date
  - Total amount
  - Status chip: **Pending** (yellow), **Confirmed** (cyan), **Shipped** (cyan), **Delivered** (green)
  - Items with model name, quantity, line price
  - Shipping address

**Pass criteria:** ✅ Orders shown with correct details

---

## Scenario 2 — Order History Persists After Refresh

**Pre-condition:** Logged in, at least one order placed.

**Steps:**
1. View `/orders` — note the order number
2. Hard-refresh the page (Ctrl+Shift+R)
3. Check `/orders` again

**Expected result:**
- Same order still appears
- Data fetched fresh from Supabase on mount

**Pass criteria:** ✅ Orders survive page refresh

---

## Scenario 3 — Order History Persists After Logout/Login

**Steps:**
1. Place an order while logged in
2. Logout
3. Log back in with the same account
4. Navigate to `/orders`

**Expected result:**
- Order placed before logout is still visible
- Fetched from Supabase `orders` table joined with `order_items`

**Pass criteria:** ✅ Orders persist across logout/login cycle

---

## Scenario 4 — No Orders State

**Pre-condition:** New account with no orders, or clear Supabase orders for test user.

**Steps:**
1. Log in with a fresh account
2. Navigate to `/orders`

**Expected result:**
- Empty state shown: "No orders yet"
- "Browse products" button visible

**Pass criteria:** ✅ Empty state shown, no crash

---

## Scenario 5 — Order Status Display

**Steps:**
1. View `/orders` with at least one order

**Expected result:**
- Status `pending` → yellow chip with clock icon
- Status `confirmed` → cyan chip with checkmark icon
- Status `shipped` → cyan chip with truck icon
- Status `delivered` → green chip with checkmark icon

**Pass criteria:** ✅ Correct colour and icon per status

---

## Scenario 6 — Start a Return

**Steps:**
1. On `/orders`, find a delivered order
2. Click **Start a return** button

**Expected result:**
- Return flow modal opens
- Shows the order ID
- Provides return reason selection
- Submit button

3. Select a reason and submit

**Expected result:**
- Confirmation message in modal
- Modal closes (or shows next step)

**Pass criteria:** ✅ Return modal opens with correct order ID

---

## Scenario 7 — Guest User Cannot See Orders

**Pre-condition:** Continue as guest (no login).

**Steps:**
1. Navigate to `/orders`

**Expected result:**
- Empty state: "No orders yet" (guest has no Supabase session — no DB fetch)
- OR redirected to login

**Pass criteria:** ✅ Guest sees empty orders or login prompt

---

## Edge Cases to Check

| Case | Expected |
|------|----------|
| Order placed, then immediately refresh | Order visible (Supabase fetch re-runs) |
| Multiple orders | All listed, newest first |
| Order with multiple line items | All items shown in expanded view |
| Very long delivery address | Wraps correctly, no overflow |
| Order date formatting | Shown as human-readable date (e.g. "7 May 2026") |
