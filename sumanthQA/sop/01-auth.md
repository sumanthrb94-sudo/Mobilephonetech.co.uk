# SOP 01 — Authentication

**URL:** https://mobilephonetech-co-uk.vercel.app  
**Pre-condition:** Clear browser localStorage before each scenario (`DevTools → Application → Storage → Clear site data`)

---

## Scenario 1 — New User Signup (Happy Path)

**Steps:**
1. Open the site homepage
2. Click the person icon (top right) or "Sign in" button in navbar
3. The auth modal opens — default mode is "Sign in"
4. Click **"Don't have an account? Sign up"** at the bottom
5. Fill in:
   - Full Name: `Test User`
   - Email: `testuser+01@yourdomain.com` (use a real inbox you can access)
   - Password: `TestPass123!`
6. Click **Create account**

**Expected result:**
- Modal flips to login view
- Green banner appears: *"We've sent a confirmation link to testuser+01@yourdomain.com. Please check your inbox, then sign in."*
- Check email inbox — receive "Confirm your signup" from Supabase Auth
- Email link goes to production URL (not localhost)
- Click link in email → lands on site homepage, session confirmed

**Pass criteria:** ✅ Green confirmation banner shown, email received, email link opens production site

---

## Scenario 2 — Login Before Email Confirmation

**Steps:**
1. Sign up as above (Scenario 1) but do NOT click the confirmation link
2. Try to sign in immediately with the same email/password

**Expected result:**
- Red error message: *"Please check your inbox and confirm your email address before signing in."*
- User is NOT logged in

**Pass criteria:** ✅ Correct error shown, not logged in

---

## Scenario 3 — Login After Email Confirmation (Happy Path)

**Steps:**
1. Complete signup and click the confirmation email link
2. Return to site — click Sign in
3. Enter email and password from Scenario 1
4. Click **Sign in**

**Expected result:**
- Modal closes
- Navbar shows user avatar or account icon (authenticated state)
- Cart icon may show synced items

**Pass criteria:** ✅ Logged in, modal closed, navbar reflects auth state

---

## Scenario 4 — Wrong Password

**Steps:**
1. Open auth modal → Sign in mode
2. Enter a valid email but wrong password: `WrongPassword999`
3. Click **Sign in**

**Expected result:**
- Red error: *"Invalid login credentials"* (actual Supabase message)
- NOT the generic "Invalid credentials" message

**Pass criteria:** ✅ Real Supabase error shown

---

## Scenario 5 — Password Reset

**Steps:**
1. Open auth modal → Sign in mode
2. Click **"Forgot your password?"** (if link exists) OR navigate to `/reset-password`
3. Enter your email address
4. Submit

**Expected result:**
- Confirmation message shown
- Email received from Supabase with reset link
- Reset link goes to `{production-url}/reset-password`

**Pass criteria:** ✅ Email received with correct redirect URL

---

## Scenario 6 — Guest / Continue Without Account

**Steps:**
1. Open auth modal
2. Click **"Continue as guest"** (if present) or proceed to checkout without logging in
3. Enter email when prompted in checkout

**Expected result:**
- User can browse, add to cart, and start checkout
- `isAuthenticated` is false (no Supabase session)
- Cart is local only (not synced to DB)

**Pass criteria:** ✅ Can reach checkout without creating account

---

## Scenario 7 — Logout

**Steps:**
1. Log in (Scenario 3)
2. Navigate to `/account` or click account avatar
3. Click **Logout** / **Sign out**

**Expected result:**
- User session cleared
- Redirected to homepage
- Navbar shows "Sign in" again
- `/orders` shows empty state

**Pass criteria:** ✅ Session gone, UI reflects logged-out state

---

## Scenario 8 — Session Persistence Across Refresh

**Steps:**
1. Log in
2. Hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R)

**Expected result:**
- User remains logged in
- Navbar still shows authenticated state

**Pass criteria:** ✅ Session survives refresh (Supabase `persistSession: true`)

---

## Edge Cases to Check

| Case | Expected |
|------|----------|
| Signup with existing email | Supabase error shown (e.g. "User already registered") |
| Very short password (<6 chars) | Supabase error about password requirements |
| Empty form submission | HTML5 `required` validation prevents submit |
| Email with spaces | Trimmed or rejected |
| SQL injection in email field | Sanitised, no crash |
