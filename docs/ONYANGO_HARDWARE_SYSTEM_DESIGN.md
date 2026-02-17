# Onyango Hardware — Shop & Workshop Management System  
## Software Architecture & Business Systems Analysis

**Document version:** 1.0  
**Classification:** Design / Blueprint  
**Prepared for:** Onyango Hardware (Retail + Workshop)  
**Status:** Production-ready design

---

## 1. Executive Summary

This document defines the architecture and business logic for a **centralized web-based Hardware Shop & Workshop Management System** for **Onyango Hardware**. The system digitizes retail POS, inventory, workshop repairs, suppliers, purchasing, staff accountability, and financial reporting while **clearly separating** Shop operations from Workshop operations and enforcing a **controlled internal transfer and settlement** mechanism between them.

**Core design principle:** The **Hardware Shop** owns all inventory and revenue from retail; the **Hardware Workshop** owns repair jobs and labor/parts revenue but receives materials from the shop on internal credit and must **settle** those transfers, ensuring no double-counting and accurate profit attribution.

---

## 2. Business Context & Problem Statement

### 2.1 Current Pain Points

| Area | Problem | Impact |
|------|---------|--------|
| **Inventory** | Manual stock, no single source of truth | Stock loss, over/under ordering |
| **Pricing** | Inconsistent or outdated prices | Margin erosion, customer disputes |
| **Repairs** | Paper/job cards, no visibility | Delayed jobs, lost follow-ups |
| **Finance** | Cash and mobile money not reconciled | Poor visibility, audit risk |
| **Shop vs Workshop** | Unclear who “owns” materials used in repairs | Wrong P&L, no accountability |

### 2.2 Goals of the System

1. **Digitize** sales, inventory, and repair workflows end-to-end.
2. **Prevent** stock loss and pricing errors via controlled movements and master data.
3. **Track** repairs from intake → completion → collection with clear status and assignment.
4. **Monitor** revenue, expenses, and profit in near real time (shop, workshop, combined).
5. **Improve** customer experience and repeat business (history, notifications).
6. **Give** owners full operational and financial visibility with role-based access.

---

## 3. Functional Modules (Detailed)

### 3.1 Dashboard (Business Overview)

**Purpose:** Single pane of glass for daily operations and exceptions.

| Element | Description | Data Source |
|--------|--------------|------------|
| **Daily summary** | Today’s shop sales, workshop revenue, total expenses, net cash position | Sales, payments, expenses |
| **Low-stock alerts** | Products below minimum level (shop inventory) | Inventory + threshold |
| **Pending repairs** | Count of jobs in “Received” / “In progress” | Workshop jobs |
| **Completed today** | Repairs completed and/or collected today | Workshop jobs |
| **Best-selling products** | Top N items by quantity or revenue (configurable period) | Sale line items |
| **Active workshop jobs** | List of in-progress jobs with technician and due date | Workshop jobs |
| **Pending transfers** | Unsettled shop → workshop material transfers | Transfer orders |
| **Quick actions** | Shortcuts to POS, new repair, new purchase order | Navigation |

**Access:** Role-based; owner/manager see full dashboard; cashier/technician see role-relevant widgets.

---

### 3.2 Point of Sale (POS) – Hardware Shop

**Purpose:** Fast, accurate retail billing with automatic stock and financial recording.

| Capability | Detail |
|------------|--------|
| **Product search** | By name, code, barcode; filters by category; shows current price and stock |
| **Cart** | Add/remove items, quantity, unit price, line total; optional line discount |
| **Pricing** | Selling price from product master; no manual override without permission (e.g. manager) |
| **Discounts** | Cart-level discount (amount or %) with reason/approval if above threshold |
| **Tax** | Optional tax configuration (e.g. VAT) at cart or line level; clearly shown on receipt |
| **Payments** | Cash, mobile money (M-Pesa, etc.), card; split payments supported |
| **Stock** | On sale completion: stock deducted immediately; movement logged (type: sold) |
| **Receipt / invoice** | Printable A4 or thermal; unique number; date, items, totals, payment method |
| **Customer** | Optional link to customer for history and statements |

**Rules:**

- Every sale creates a **Sale** (header) and **SaleItem** (lines); payment(s) linked to Sale.
- Stock deduction and movement are atomic with the sale transaction.
- Void/refund handled as separate workflow (refund transaction + stock return or adjustment).

---

### 3.3 Inventory & Stock Management

**Purpose:** Single source of truth for all stock owned by the **Shop**; full traceability of movements.

| Concept | Description |
|--------|-------------|
| **Product master** | Code, name, category, unit, buying price, selling price, min/max stock, reorder point |
| **Categories** | e.g. Tools, Plumbing, Electrical, Paint, Hardware, Safety, etc. |
| **Stock levels** | Real-time quantity; reserved quantity (e.g. for repair jobs) if needed in phase 2 |
| **Alerts** | Low stock (below minimum), out of stock, negative stock (prevented by business rules) |
| **Buying vs selling** | Buying price for COGS and transfer pricing; selling for retail POS |
| **Movement types** | Received (purchase), Sold (POS), Transferred out (to workshop), Adjusted (count/correction), Returned (from workshop or supplier), Written off |

**Movement history:** Each change in quantity is logged (product, type, quantity, reference document, user, date). Supports stock takes and audits.

**Ownership:** All inventory is **Shop** inventory. Workshop does not hold its “own” stock; it consumes via **transfer** from shop.

---

### 3.4 Workshop / Repair Job Management

**Purpose:** Manage repair lifecycle from intake to collection with clear status, assignment, and billing.

| Concept | Description |
|--------|-------------|
| **Job intake** | Customer (existing or new), item description, reported issue, condition, due date, priority |
| **Status workflow** | Received → In progress → Completed → Collected (with optional “On hold” or “Cancelled”) |
| **Technician assignment** | One (or more) technicians per job; used for workload and performance reporting |
| **Parts usage** | Link parts to job; parts come from **transfer** from shop (see Internal Transfer); unit and cost tracked |
| **Labor** | Labor charges (fixed or time-based) per job; configurable labour rate / service types |
| **Repair invoice** | Totals: parts + labour; tax if applicable; payment status (unpaid / partial / paid) |
| **Receipt** | Issued on payment; links to repair job and customer |

**Rules:**

- Workshop does **not** own inventory; parts are requested from shop via **Material Request → Transfer**.
- Revenue from repairs = labour + parts (at transfer/sale price); cost to workshop = transfer cost of parts (settled to shop).
- Job cannot be “Completed” or “Collected” until at least labour (and optionally parts) is invoiced; business rule can require payment before collection.

---

### 3.5 Customer Management

**Purpose:** One customer master for both shop and workshop; full history and communication.

| Element | Description |
|--------|-------------|
| **Profile** | Name, phone, email, address, ID type/number, notes |
| **Purchase history** | All retail sales (POS) linked to customer |
| **Repair history** | All repair jobs (status, dates, amounts) |
| **Notifications** | Optional: SMS/email when repair is completed or ready for collection |
| **Statements** | Outstanding balances (shop sales or workshop repairs) per customer |

Customer is optional at POS; mandatory for repair intake (even if “walk-in” is a minimal record).

---

### 3.6 Supplier & Purchasing Management

**Purpose:** Manage who the **Shop** buys from and what is owed.

| Element | Description |
|--------|-------------|
| **Supplier master** | Name, contact, phone, email, address, payment terms, default currency |
| **Purchase orders (PO)** | Header (supplier, date, expected delivery) + lines (product, qty, unit price, amount) |
| **PO status** | Draft → Sent → Partially received → Received → Closed |
| **Goods receipt** | Against PO; received quantity and quality; updates shop stock (movement: Received) |
| **Supplier balance** | Sum of unpaid invoices (or unpaid POs if invoicing is separate); aged payables report |

Purchasing is **Shop** function; workshop does not create POs. Workshop “purchases” from shop via internal transfer.

---

### 3.7 Staff & Role Management

**Purpose:** Secure access and accountability.

| Role | Typical permissions |
|------|----------------------|
| **Owner** | Full access; combined and unit-level reports; settings; user management |
| **Manager** | Shop + workshop oversight; approvals (e.g. transfers, discounts); reports; no system settings |
| **Cashier (Shop)** | POS, daily cash/mobile money; view stock and prices; no inventory adjustments |
| **Technician** | Workshop jobs (intake, update status, log parts/labour); view material requests and transfers |
| **Storekeeper / Shop assistant** | Inventory (receipts, adjustments, transfers out); view POS and POs |

| Capability | Description |
|------------|-------------|
| **Activity logs** | Who did what and when (e.g. sale, transfer, job status change, adjustment) |
| **Attendance (optional)** | Check-in/out or shift assignment for payroll or capacity planning |

Authentication: secure login (e.g. username/password or SSO later); session and password policy as per security section.

---

### 3.8 Financial Reports & Analytics

**Purpose:** Accurate, auditable view of performance by unit and combined.

| Report | Scope | Content |
|--------|--------|---------|
| **Daily / weekly / monthly sales** | Shop | Sales by day, by category, by payment method; returns/refunds |
| **Shop P&L** | Shop | Revenue (sales), COGS (from sale lines), gross profit; expenses; net |
| **Workshop P&L** | Workshop | Repair revenue (labour + parts), material cost (transfers settled), labour profit, net |
| **Combined P&L** | Owner | Shop + Workshop; eliminate internal transfer effect (no double revenue/expense) |
| **Inventory valuation** | Shop | Stock value (quantity × buying or last cost); optional by category |
| **Repair revenue report** | Workshop | By period, by technician, by job status; labour vs parts breakdown |
| **Transfer report** | Internal | Requested vs approved vs transferred vs settled; ageing of unsettled |
| **Cash flow summary** | Combined | Cash in (sales, repair payments) vs cash out (expenses, supplier payments, withdrawals) |

All reports support date range and export (e.g. PDF/Excel). Owner can see unit-level and combined; manager/cashier/technician see only what their role allows.

---

## 4. System Architecture & Operational Logic

### 4.1 Two Independent Operational Units

The system is built around two **logical business units** with separate ledgers and clear rules:

- **Hardware Shop**
  - Owns all inventory.
  - Handles retail sales (POS).
  - Manages buying price, selling price, and supplier purchases.
  - Supplies materials to the workshop **only** via **internal transfer** (no free issue).

- **Hardware Workshop**
  - Does **not** own inventory.
  - Manages repair jobs and labour/parts billing.
  - **Requests** materials from the shop; receives them on **internal credit**.
  - **Settles** transfer cost to the shop (full or partial) after collecting payment from customers.

This keeps:

- **Stock accountability:** Every item leaving the shop is either sold or transferred; no unrecorded usage.
- **Financial accuracy:** Shop records revenue from retail + transfer settlements; workshop records repair revenue and material cost (settlement).
- **Scalability:** Same pattern can extend to multiple branches (e.g. Shop A, Workshop A, Shop B) with inter-branch transfers later.

### 4.2 Internal Transfer & Settlement System (Core Design)

This is the **critical** link between Shop and Workshop. It prevents double-counting and ensures correct profit calculation.

#### Step 1: Material Request (Workshop → Shop)

| Actor | Action |
|-------|--------|
| Workshop (technician/manager) | Creates **Material Request**: job reference, list of items (product, quantity), optional notes. |
| Shop (storekeeper/manager) | Sees pending requests; checks stock; **approves** or **rejects** (with reason). |

- Request has status: Draft → Submitted → Approved / Rejected.
- Approved request does **not** yet move stock; it authorises the next step.

#### Step 2: Transfer Order (Shop)

| Actor | Action |
|-------|--------|
| System / Shop | On approval, a **Transfer Order** is created (or one transfer per request, as per policy). |
| Transfer Order | Lines: product, quantity, **transfer price** (e.g. shop cost or agreed internal price), due date for settlement. |
| Shop | **Confirms** transfer → stock is **deducted** from shop (movement: Transferred out); workshop is **debited** (internal liability). |
| Result | Shop: stock down, **pending transfer receivable**. Workshop: **transfer payable** (no revenue yet). |

- Transfer Order status: Draft → Confirmed → (partially) Settled → Closed.
- No revenue for shop at this point; only asset movement and internal receivable.

#### Step 3: Workshop Usage & Sale

| Actor | Action |
|-------|--------|
| Workshop | Uses materials in repair job; links **parts** to job (from transfer line items). |
| Workshop | Invoices customer for **labour + parts** (parts at selling/transfer price to customer). |
| Workshop | Collects payment → repair revenue and cash in. |

- Workshop records: repair income (labour + parts), and **cost of parts** = transfer cost (to be settled to shop).
- Profit for workshop = labour margin + (parts selling price − transfer cost) if parts are marked up.

#### Step 4: Settlement (Workshop → Shop)

| Actor | Action |
|-------|--------|
| Workshop / Manager | Creates **Settlement** against one or more Transfer Orders: amount to pay to shop (full or partial). |
| System | Reduces workshop **transfer payable**; increases shop **transfer receivable cleared**. |
| Shop | Records **income** (transfer settlement); cash/bank or internal account. |
| Workshop | Records **material expense** (cost of goods used in repairs). |

- When a transfer is fully settled, its status → Closed; no further obligation.
- Partial settlements allowed; transfer remains open until fully settled.

#### Summary Table (Internal Accounting)

| Event | Shop Ledger | Workshop Ledger |
|-------|-------------|-----------------|
| Transfer confirmed | Stock ↓, Pending transfer receivable ↑ | Transfer payable ↑ |
| Workshop sells repair | — | Revenue ↑, (Cost of parts = payable, not yet expense) |
| Settlement paid | Cash ↑, Pending transfer receivable ↓, Income ↑ | Cash ↓, Transfer payable ↓, Material expense ↑ |

Result:

- **Shop:** Revenue from retail + transfer settlements; no double-count of same stock.
- **Workshop:** Repair revenue; material expense = settlements to shop; labour and parts margin visible.
- **Owner:** Combined view eliminates internal receivable/payable; sees true group P&L.

### 4.3 Financial Separation & Reporting

- **Shop Ledger:** Stock value (inventory asset), sales receivable, **pending transfer receivables** (from workshop), **cleared transfer income**, expenses, supplier payables.
- **Workshop Ledger:** Repair receivables, **transfer payables** (to shop), labour and parts revenue, **material expense** (settlements), other expenses.
- **Combined (Owner):** Merge P&L; internal transfer receivable/payable and settlement income/expense net to zero; only external revenue and expense remain.

Reports (daily sales, P&L, inventory valuation, repair revenue, transfer ageing) are defined in section 3.8 and filtered by unit and role.

---

## 5. Technical Architecture (Production-Ready)

### 5.1 High-Level Stack

| Layer | Technology / Approach |
|-------|------------------------|
| **Frontend** | Responsive web app (e.g. React/Next.js or Vue); mobile-friendly layout; optional PWA for offline-capable POS later |
| **Backend** | REST API (e.g. Django REST Framework or Node/Express); stateless; session or JWT with refresh |
| **Database** | Relational (PostgreSQL recommended for production); central DB with **unit_id** (and branch_id if multi-branch) on key tables |
| **Auth** | Secure authentication; password policy; role-based access control (RBAC); audit log for sensitive actions |
| **Deployment** | HTTPS only; env-based config; scalable (e.g. containerised); backups and recovery procedure |

### 5.2 Data Model (Conceptual)

- **Unit separation:** Key tables (e.g. Sale, TransferOrder, RepairJob, Expense) carry `unit_id` (Shop / Workshop) and optionally `branch_id`.
- **Inventory:** One inventory model (Shop); movements reference document type (Sale, Transfer, Receipt, Adjustment).
- **Transfers:** MaterialRequest, TransferOrder, TransferOrderLine, Settlement, with clear status and link to job/workshop.
- **Repairs:** RepairJob, RepairJobItem (parts from transfer), LabourCharge, RepairPayment.
- **Finance:** Ledger entries or equivalent (e.g. Sale → revenue; Settlement → shop income / workshop expense) for reporting and audit.

### 5.3 Security & RBAC

- Authentication: strong passwords; lockout after N failures; optional 2FA for owner/manager.
- Authorization: every API endpoint and UI action checked against user role and unit.
- Audit: log create/update/delete of sales, transfers, settlements, and key config changes (who, when, what).
- Data: sensitive data (e.g. PII, financials) only to roles that need it; reports export controlled.

### 5.4 Scalability (Future Branches)

- **branch_id** on organisation, inventory (per branch or shared), sales, transfers, repairs.
- Inter-branch transfer can mirror shop–workshop transfer (request → transfer → settlement) with same accounting logic.
- Reporting by branch and consolidated; roles can be branch-scoped (e.g. manager – branch A).

---

## 6. Implementation Roadmap (Suggested)

| Phase | Scope | Outcome |
|-------|--------|---------|
| **1** | Core data model; auth; Shop POS; inventory (receipt, sale, basic movement) | Retail and stock live |
| **2** | Material request; transfer order; workshop job CRUD; basic settlement | Shop–workshop flow end-to-end |
| **3** | Customers, suppliers, POs; repair invoicing and payments; dashboard | Full ops and visibility |
| **4** | Reports (P&L, inventory, repair, transfer); activity logs; refinements | Production-ready and auditable |
| **5** | Notifications; optional attendance; multi-branch prep | Scale and polish |

---

## 7. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | (Current) | Architecture | Initial design |

---

*This document is the single source of truth for the Onyango Hardware Shop & Workshop Management System design. Implementation should follow this architecture and business logic; any deviation should be documented and approved.*
