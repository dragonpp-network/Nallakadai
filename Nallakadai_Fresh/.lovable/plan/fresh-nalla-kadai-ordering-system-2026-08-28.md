# Fresh Nalla Kadai — Ordering System

A standalone, mobile-first ordering app for pre-approved customers, plus a full admin back office. No payments, no messaging, no ERP/Shopify integration (per section 4.2 of the spec).

## Look and feel

Carried from your site and the mock: maroon `#7B1E1E`, olive `#7C9A46`, cream `#FBF7EC`, gold `#C9A227`, ink `#2B1B12`. Display type Rozha One, body Poppins, Tamil in Noto Sans Tamil. Soft 14px radii, warm paper backgrounds, per-category tint bands. Logo used in the header on maroon.

## Backend (Lovable Cloud)

- `branches` — name, address, WhatsApp enquiry no., support no., pickup address, collection timing, show-prices flag
- `cycles` — branch, cycle no., open/close datetime, delivery date, status (Draft/Open/Closed/Delivered); auto-closes at the close datetime
- `categories` — editable, not hard-coded (Vegetables, Greens, Fruits, Dairy, Vegan) with tint colour
- `items` — English + Tamil name, category, unit (Kg/Gram/Nos/Litre/Ml), preset quantities, min/max, optional image, active flag
- `cycle_items` — price per cycle, optional quantity cap, min/max overrides
- `customers` — mobile (unique identity), name, branch, default delivery mode, address, area, alt mobile, active flag, non-collection count
- `orders` / `order_items` — order no., delivery mode + address snapshot, note, admin-entered flag, status, price snapshot per line
- `non_collections`, `audit_log`, `user_roles` (branch_admin / super_admin, separate table with `has_role()`)

## Access

- **Customers**: mobile number only, no OTP or password. Remembered on the device for 30 days. Unknown number → friendly screen with a WhatsApp button to the branch enquiry number.
- **Admins**: email + password to start. Once signed in, an admin can set a 4-digit PIN on that device; afterwards they sign in with mobile number + PIN, which unlocks the session stored securely on that device. PIN is hashed, rate-limited, and falls back to email + password after failed attempts or on a new device.

## Customer flow

Phone entry → greeting with branch and expected delivery date → single scrolling page of all available items grouped by category with distinct tints → one-tap quantity presets plus a validated free-entry field showing the unit next to it. The min/max guard is enforced hard ("Tomato is sold in kg. Please enter between 0.25 and 10 kg") to prevent the 500-instead-of-0.5 error. Then "Same as last order" (with a visible list of anything dropped as unavailable), delivery mode with saved address or pickup details, optional note, cart review with the tentative-amount notice, and a confirmation screen with order number. Orders remain editable until the window closes, after which the branch support number is shown.

## Admin back office

Live cycle dashboard (customers ordered, orders, quantity, tentative value, not-yet-ordered count) · Not Yet Ordered call list with tap-to-call and Excel export · order list with search/filter · order editing with the same validation, override option and full audit trail · cancel with reason · running item-wise totals during the open window · cycle management with copy-previous-availability and a non-collection alert when opening a new cycle · master items · branches · customers with CSV bulk import · non-collection marking.

## Procurement and printing

Aggregated farm order per cycle grouped by category, exportable to PDF and Excel. Per-customer Order Sheets, printable individually or as a cycle batch, laid out for clean A4/A5. Tamil renders correctly in screen, print, PDF and Excel throughout (Tamil-capable embedded font in the PDF pipeline).

## Reports

Customer value, item movement, customer–item, cycle summary, branch comparison (super admin), lapsed customers, non-collection. All with date-range, branch, customer, cycle and item (English or Tamil) filters, and Excel + PDF export.

## Build order

1. Cloud schema, roles, RLS and grants, minimal seed (one branch, a handful of items with real Tamil names, one open cycle)
2. Admin auth (email/password, then device PIN) and admin shell
3. Master items, branches, cycles, availability, customers
4. Customer ordering flow end to end
5. Admin dashboard, order editing, audit
6. Farm order, order sheets, non-collection
7. Reports and exports

## Technical notes

TanStack Start with server functions for all data access; roles in a separate `user_roles` table with a security-definer `has_role()` and RLS scoped per branch. Cycle auto-close evaluated server-side from the close datetime, so it holds without a scheduler. Exports generated server-side with a Tamil-capable font embedded. Data model leaves room for messaging and payments to be added later without redesign, as NFR-14 requires.
