# Onyango Construction — System Functionality & Flows

This document describes **what the system can do right now**: main features, user flows, and how the pieces connect.

---

## 1. High-level architecture

- **Backend**: Django (API) — `main` app (shop, sales, orders, stock, expenses, loans, reports) + `onyango` app (workshop, repairs, transfers, suppliers, purchase orders).
- **Frontend**: Next.js (React) — admin dashboard, POS, cashier, reports, Onyango modules.
- **Auth**: JWT in HTTP-only cookies; role-based access (admin, owner, manager, staff, cashier, technician, storekeeper).
- **Units**: Shop (inventory owner) and Workshop (repairs); used for transfers and some filtering.

---

## 2. Core shop & sales flows

### 2.1 Order → Cashier → Sale (main flow)

1. **Create order (POS)**
   - **Retail**: `/order/retails` — staff adds products to cart, optional customer, discount, notes; submits order.
   - **Wholesale**: `/order/wholesales` — same idea with wholesale pricing and customer required.
   - API: `POST /api/orders/` with items, `order_type`, optional `customer`, `discount_amount`, `notes`.
   - Order is created with `status = 'pending'`, linked to staff user. Stock is **not** deducted yet.

2. **Cashier**
   - **Pending orders**: `/cashier` tab "Pending Orders" — lists orders with status `pending` or `updated` (by date).
   - **Payments history**: same page, tab "Payments History" — lists `completed` / `confirmed` orders.
   - **Detail**: `/cashier/[id]` — view order, enter **amount paid**, then:
     - **Confirm & generate sale**: `POST /api/orders/{id}/confirm/` with `payment_method`, `amount_paid`.
       - Creates a **Sale** (with `order`, customer, totals, discount).
       - Deducts **stock** per item.
       - If `amount_paid < final_amount` or `0` → sale is a **loan** (`is_loan = True`), `payment_status` = `not_paid` or `partial`.
       - If `amount_paid >= final_amount` → `payment_status` = `paid`, no loan.
       - If `amount_paid > 0`, a **Payment** record is created.
       - Order status → `confirmed`.
     - **Reject**: `POST /api/orders/{id}/reject/` — only for `pending`; order status → `rejected`. No sale, no stock change.
   - **Rejected orders**: `/staff/orders/rejected/` — list rejected orders; can **Resend** (status → `updated`, back to cashier) or **Delete** (admin only).

3. **Sales list**
   - `/sales` — list sales (by date; staff see only their own). Read-only; links to sale detail if implemented. Refund action on sale.

### 2.2 Loans (customer debt)

- **Loans** = sales where `is_loan = True` (amount paid &lt; total or zero).
- **List**: `/loans` — filter by date; shows unpaid / partial / paid counts and total outstanding.
- **Pay loan**: `POST /api/loans/{sale_id}/pay/` with `amount`. Updates `sale.paid_amount` and `payment_status` (partial/paid). No separate Payment row is created for loan payments in the current implementation.
- Staff see only their own loans; admin sees all.

### 2.3 Refunds

- **Refund**: `POST /api/sales/{id}/refund/` (from sales UI).
- **Rules**: Within 10 days of sale; sale must have `paid_amount > 0` and not already refunded.
- **Effect**: Creates **Refund** record; sets sale `status = 'refunded'`, `payment_status = 'refunded'`; creates a **negative Payment** for the refunded amount.

### 2.4 Payments (retail/shop)

- **Payment** records are created when:
  - Cashier **confirms** an order with `amount_paid > 0`.
  - A **refund** is processed (negative amount).
- Loan repayments update `sale.paid_amount` only (no extra Payment row).
- Payments are listed/filtered via sale or payment endpoints as used by the frontend.

---

## 3. Products & inventory

- **Products**: `/products` — CRUD; fields include name, code, category, buying/selling/wholesale price, `quantity_in_stock`, threshold. Can be linked to a **Unit** (shop/workshop).
- **Categories**: `/category` — manage product categories.
- **Stock**:
  - **Add stock**: `/stock/add` — increase quantity; creates **StockEntry** with type e.g. `in`, `added`, `quantity_updated`.
  - **Movement**: `/stock` — list **StockEntry** (by date range, product); types: added, sold, in, transferred_out, received, adjusted, returned, written_off, etc.
  - Stock is **deducted** automatically when an order is **confirmed** (sale created); no deduction on reject.
- **Stock report**: `/report/stock` — admin; date range; total stock value, low stock, movement summary.

---

## 4. Customers

- **List / add**: `/customers`, `/customers/add` — name, phone, email, address.
- Used in orders (retail optional, wholesale required) and in **repair jobs** (Onyango).

---

## 5. Expenses

- **Add**: `/expenses/add` — description, amount, category (rent, electricity, salary, inventory, misc), optional unit.
- **List**: `/expenses` — filter by date range; default today.
- Recorded with current user; timeline event created.

---

## 6. Reports (admin)

- **Dashboard**: `/` — metrics (total sales, revenue), monthly sales chart, recent orders, etc. Data from `dashboard/metrics`, `dashboard/monthly-sales`, `dashboard/recent-orders`, etc.
- **Sales report**: `/report/sales` — date range; sales summary, totals, charts.
- **Stock report**: `/report/stock` — date range; stock value, low stock, movements.
- **Short report**: `/report/short` — weekly (or custom range) short summary; role-based (e.g. cashier sees own sales).

---

## 7. Onyango Hardware (workshop & shop coordination)

### 7.1 Repair jobs

- **List**: `/onyango/repair-jobs` — filter by status.
- **Create**: `/onyango/repair-jobs/new` — customer, item description, issue, priority, due date, notes.
- **Detail**: `/onyango/repair-jobs/[id]` — view/edit job; status flow: received → in_progress → on_hold → completed → collected / cancelled.
- **Repair invoice**: parts + labour; **RepairPayment** records; payment status (unpaid / partial / paid).
- **Parts used**: can link to **TransferOrderLine** (material from shop) or product; **RepairJobPart** stores quantity and cost.

### 7.2 Material requests (workshop → shop)

- **List**: `/onyango/material-requests` — draft / submitted / approved / rejected.
- **Create**: `/onyango/material-requests/new` — request products and quantities (optional link to repair job).
- **Flow**: Draft → Submit → Approve (creates or links **TransferOrder**) or Reject (with reason).

### 7.3 Transfer orders (shop → workshop)

- **List**: `/onyango/transfers` — transfer orders with status: draft, confirmed, partially_settled, closed.
- **Flow**: Transfer is created from an approved **MaterialRequest** (or manually). On **confirm**:
  - Stock moves from shop to workshop (StockEntry types: transferred_out / received).
  - **TransferOrderLine** has quantity and `transfer_price` (cost to workshop).
- **Settlement**: Workshop “pays” shop via **TransferSettlement** (amount, date, payment method). When `settled_amount >= total_amount`, transfer status → closed.

### 7.4 Suppliers & purchase orders

- **Suppliers**: `/onyango/suppliers` — CRUD (name, contact, phone, email, address, payment terms).
- **Purchase orders**: `/onyango/purchase-orders`, `/onyango/purchase-orders/new` — PO to supplier with lines (product, quantity, unit price). Status: draft → sent → partially_received / received → closed.
- **Goods receipt**: Record receipt against PO; updates received quantities and can update shop stock (via GoodsReceiptLine and integration with main stock if implemented).

### 7.5 Onyango dashboard

- `/onyango/dashboard` — summary for repairs, transfers, material requests, etc., as implemented in the API and frontend.

---

## 8. Timeline & activity

- **Timeline events** (`main.TimelineEvent`): order created/confirmed/rejected, sale created, payment/loan payment, refund, expense, stock, transfer, repair, material request, PO, goods receipt.
- **Activity log** (`onyango.ActivityLog`): user actions on entities (e.g. transfer, repair).
- Timeline is exposed via API (e.g. `GET /api/timeline/`) for audit and activity feeds.

---

## 9. Users & roles

- **Users**: `/users` — admin only; create/edit users; assign **role** and optional **unit**.
- **Roles**: admin, owner, manager, cashier, technician, storekeeper, staff.
- **Permissions**:
  - **Orders**: staff/admin create; staff/admin/cashier for cashier actions (confirm/reject).
  - **Sales**: staff see own; admin sees all; refund by staff/admin.
  - **Loans**: staff see own; admin sees all; pay by staff/admin.
  - **Stock**: stock movement/add and stock report typically admin (or as configured).
  - **Reports**: sales/stock/short — admin (or as configured).
  - **Onyango**: roles see dashboard, repair jobs, material requests, transfers, suppliers, POs per sidebar/permissions.
- **Profile**: `/profile` — current user profile (view/edit as implemented).

---

## 10. What the system can do — summary

| Area | Capabilities |
|------|---------------|
| **Orders** | Create retail/wholesale orders (POS); list by date; filter pending vs history; confirm (create sale + deduct stock + optional payment/loan) or reject; resend/delete rejected. |
| **Sales** | List sales by date; refund within 10 days (with balance); track payment status. |
| **Loans** | Treat underpaid sales as loans; list by date; record loan payments (updates paid amount and status). |
| **Products & stock** | CRUD products and categories; add stock; view stock movement; stock deducted on order confirm; low-stock and value reports. |
| **Customers** | CRUD customers; link to orders and repair jobs. |
| **Expenses** | Record expenses by category and optional unit; list by date range. |
| **Reports** | Dashboard metrics; sales report (date range); stock report; short report (e.g. weekly). |
| **Repairs** | Create and manage repair jobs; track status; invoice (parts + labour); record repair payments. |
| **Transfers** | Material request (workshop) → approve → transfer order (shop → workshop); confirm transfer (stock move); settle transfer (workshop pays shop). |
| **Purchasing** | Suppliers; purchase orders with lines; goods receipt (receive against PO). |
| **Auth & users** | Login/logout (JWT cookies); role-based access; user management (admin). |

---

## 11. Important technical notes

- **Order status**: Stored values include `pending`, `rejected`, `updated` (resent), `confirmed`. Only `pending` can be rejected; only `rejected` can be resent or deleted.
- **Confirm order**: Accepts both `pending` and `updated` orders; uses **wholesale_price** or **selling_price** per `order_type`; creates Sale + SaleItems, deducts stock, optionally creates Payment, sets order to `confirmed`.
- **Loan payment**: Updates `sale.paid_amount` and `payment_status` only; no separate Payment record for each loan instalment.
- **Refund**: One full refund of `paid_amount`; sale marked refunded; negative Payment created.
- **Units**: Shop and Workshop are used for transfers, repair jobs, and optionally expenses/products; filtering may be role/unit-based where implemented.

This reflects the behaviour of the codebase as of the last review. For exact API contracts and request/response shapes, refer to the Django REST views and serializers in `api/main/` and `api/onyango/`.
