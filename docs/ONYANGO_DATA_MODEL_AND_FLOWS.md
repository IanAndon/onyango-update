# Onyango Hardware — Data Model & Key Flows (Reference)

This document complements **ONYANGO_HARDWARE_SYSTEM_DESIGN.md** with entity-level and flow details for implementation.

---

## 1. Entity Overview (Logical)

### 1.1 Organisation & Units

| Entity | Purpose |
|--------|---------|
| **Organisation** | Single tenant (Onyango Hardware); future: multi-tenant or multi-branch |
| **Unit** | Shop | Workshop; every transactional entity is tied to a unit where applicable |
| **Branch** (future) | Physical location; optional in v1 |

### 1.2 Shop Domain

| Entity | Key Fields | Notes |
|--------|------------|--------|
| **Category** | name, code | Product categories (Tools, Plumbing, etc.) |
| **Product** | code, name, category_id, unit, buying_price, selling_price, min_stock, max_stock, unit_id=Shop | All inventory belongs to Shop |
| **StockMovement** | product_id, type (received\|sold\|transferred_out\|adjusted\|returned\|written_off), quantity, ref_type, ref_id, user_id, date | Immutable log |
| **Sale** | unit_id=Shop, customer_id?, date, total, discount, tax, status, payment_status | POS header |
| **SaleItem** | sale_id, product_id, quantity, unit_price, total | POS lines; drives stock out (sold) |
| **Payment** | sale_id, amount, method (cash\|mobile_money\|card), date | Can be multiple per sale |
| **PurchaseOrder** | supplier_id, date, status (draft\|sent\|received\|closed) | Shop only |
| **PurchaseOrderLine** | po_id, product_id, quantity, unit_price | |
| **GoodsReceipt** | po_id, date; receipt lines: product_id, quantity | Updates stock (received) |
| **Supplier** | name, contact, phone, terms | Shop’s suppliers |

### 1.3 Workshop Domain

| Entity | Key Fields | Notes |
|--------|------------|--------|
| **RepairJob** | unit_id=Workshop, customer_id, intake_date, due_date, status (received\|in_progress\|completed\|collected\|on_hold\|cancelled), assigned_technician_id, item_description, issue_description | |
| **RepairJobPart** | repair_job_id, transfer_line_id (or product_id + qty + unit_cost), quantity_used, unit_price_to_customer | Parts from transfer; cost = transfer price |
| **LabourCharge** | repair_job_id, description, amount, labour_type? | |
| **RepairInvoice** | repair_job_id, total_parts, total_labour, tax, total, payment_status | Derived or stored |
| **RepairPayment** | repair_invoice_id (or repair_job_id), amount, method, date | |

### 1.4 Internal Transfer (Shop ↔ Workshop)

| Entity | Key Fields | Notes |
|--------|------------|--------|
| **MaterialRequest** | unit_id=Workshop, repair_job_id?, status (draft\|submitted\|approved\|rejected), requested_by_id, reviewed_by_id | Workshop creates; Shop approves |
| **MaterialRequestLine** | request_id, product_id, quantity_requested | |
| **TransferOrder** | unit_id=Shop, material_request_id?, status (draft\|confirmed\|partially_settled\|closed), workshop_unit_id, due_date | Created on approval; confirmed = stock out |
| **TransferOrderLine** | transfer_order_id, product_id, quantity, transfer_price | Transfer price = cost or agreed internal price |
| **TransferSettlement** | transfer_order_id (or multiple), amount, settlement_date, payment_method? | Workshop pays shop; reduces payable; shop records income |
| **WorkshopTransferPayable** (or ledger entry) | transfer_order_id, amount_due, amount_settled | View or table for outstanding balance |
| **ShopTransferReceivable** (or ledger entry) | transfer_order_id, amount_due, amount_settled | |

### 1.5 Shared

| Entity | Key Fields | Notes |
|--------|------------|--------|
| **Customer** | name, phone, email, address, id_type, id_number | Used by Shop (POS) and Workshop (repairs) |
| **User** | username, role (owner\|manager\|cashier\|technician\|storekeeper), unit_id? (optional), branch_id? | |
| **Expense** | unit_id (Shop or Workshop), category, amount, date, description, recorded_by_id | |
| **ActivityLog** | user_id, action, entity_type, entity_id, timestamp, details (JSON) | Audit trail |

---

## 2. Critical Business Rules (Enforcement)

- **Stock:** No sale or transfer confirmation if available quantity < required; movements are atomic with the transaction.
- **Transfer:** Only **Approved** material requests can create/confirm a transfer; confirmation deducts shop stock and creates workshop payable.
- **Settlement:** Settlement amount cannot exceed outstanding transfer payable for that order; one transfer can be settled in multiple payments.
- **Repair parts:** Parts consumed on a job must be linked to a transfer line (or reserved from a transfer); cost = transfer price.
- **Roles:** Cashier can only create/edit sales and view shop data; technician can only manage workshop jobs and view own transfers; manager can approve requests and view both units; owner sees all and settings.

---

## 3. Key Flows (Step-by-Step)

### 3.1 POS Sale (Shop)

1. Create `Sale` (status=open).
2. Add `SaleItem` lines (product, qty, unit_price from product master).
3. Optionally apply discount/tax; recalc total.
4. Create `Payment`(s); when total covered, set sale status = completed, payment_status = paid (or partial).
5. For each SaleItem: deduct `Product.quantity`, insert `StockMovement`(type=sold, ref_type=Sale, ref_id=sale_id).
6. Print receipt/invoice.

### 3.2 Material Request → Transfer → Settlement

1. **Request:** Workshop creates `MaterialRequest` + lines; submit → status = submitted.
2. **Approve:** Shop user approves → status = approved; system creates `TransferOrder` + lines (from request lines), status = draft.
3. **Confirm transfer:** Shop confirms TransferOrder → for each line: deduct Product stock, insert StockMovement(type=transferred_out, ref=TransferOrder); TransferOrder status = confirmed; create/update WorkshopTransferPayable and ShopTransferReceivable.
4. **Use in repair:** Technician links TransferOrderLine (or reserved qty) to RepairJobPart; job invoiced with labour + parts.
5. **Settlement:** Workshop creates `TransferSettlement` (amount, transfer_order_id). System: reduce WorkshopTransferPayable, reduce ShopTransferReceivable; record shop income and workshop material expense; if transfer fully settled, TransferOrder status = closed.

### 3.3 Repair Job Lifecycle

1. Create **RepairJob** (customer, item, issue, due date); status = received.
2. Assign technician; optional: create MaterialRequest for parts.
3. When transfer confirmed, add **RepairJobPart** from transfer lines; add **LabourCharge**.
4. Create **RepairInvoice** (or compute from job); status = completed when invoiced.
5. Record **RepairPayment**; when fully paid, payment_status = paid.
6. Mark job status = collected; optional notification to customer.

---

## 4. Reporting (Data Source Mapping)

| Report | Main entities / aggregates |
|--------|----------------------------|
| Daily sales | Sale, SaleItem, Payment (unit=Shop, date filter) |
| Low stock | Product where quantity_in_stock < min_stock |
| Pending repairs | RepairJob where status in (received, in_progress) |
| Shop P&L | Sales revenue, COGS (from SaleItem × cost), expenses (Expense unit=Shop), transfer settlements received |
| Workshop P&L | Repair revenue (labour + parts), transfer settlements paid (material expense), other expenses (unit=Workshop) |
| Inventory valuation | Product × quantity × buying_price (or last cost) |
| Transfer ageing | TransferOrder (status=confirmed, unsettled amount), sum of TransferSettlement per order |

---

*Use this together with ONYANGO_HARDWARE_SYSTEM_DESIGN.md for implementation. Any new entity or flow should keep the same unit separation and internal transfer/settlement logic.*
