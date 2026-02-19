"""
Onyango Hardware — Shop & Workshop models.
References: main.Unit, main.Product, main.Customer, AUTH_USER_MODEL.
"""
from django.db import models
from django.conf import settings


def get_shop_unit():
    from main.models import Unit
    shop, _ = Unit.objects.get_or_create(code='shop', defaults={'name': 'Hardware Shop'})
    return shop.id


def get_workshop_unit():
    from main.models import Unit
    workshop, _ = Unit.objects.get_or_create(code='workshop', defaults={'name': 'Hardware Workshop'})
    return workshop.id


# ----------------------------
# Supplier & Purchasing (Shop)
# ----------------------------
class Supplier(models.Model):
    name = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=30)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    payment_terms = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class PurchaseOrder(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('partially_received', 'Partially Received'),
        ('received', 'Received'),
        ('closed', 'Closed'),
    )
    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='orders')
    order_date = models.DateField(auto_now_add=True)
    expected_delivery = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"PO #{self.id} - {self.supplier.name}"


class PurchaseOrderLine(models.Model):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('main.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=20, decimal_places=2)
    received_quantity = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"


class GoodsReceipt(models.Model):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='receipts')
    receipt_date = models.DateTimeField(auto_now_add=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"GR #{self.id} for PO #{self.order_id}"


class GoodsReceiptLine(models.Model):
    receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('main.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=20, decimal_places=2)


# ----------------------------
# Workshop: Job Types (fixed-price labour; managed by admin/manager)
# ----------------------------
class JobType(models.Model):
    """Fixed-price repair job type = labour + expected materials (one amount). Customer pays this; when paid, materials portion is sent to shop (transfer settlement), remainder is workshop income."""
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, null=True, unique=True)
    fixed_price = models.DecimalField(max_digits=20, decimal_places=2, default=0, help_text="Full price (TZS): labour + expected materials. No extra charge for materials.")
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} — TZS {self.fixed_price}"


# ----------------------------
# Workshop: Repair Jobs
# ----------------------------
class RepairJob(models.Model):
    STATUS_CHOICES = (
        ('received', 'Received'),
        ('in_progress', 'In Progress'),
        ('on_hold', 'On Hold'),
        ('completed', 'Completed'),
        ('collected', 'Collected'),
        ('cancelled', 'Cancelled'),
    )
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('normal', 'Normal'),
        ('high', 'High'),
    )
    unit = models.ForeignKey('main.Unit', on_delete=models.SET_NULL, null=True, related_name='repair_jobs')
    customer = models.ForeignKey('main.Customer', on_delete=models.CASCADE, related_name='repair_jobs')
    job_type = models.ForeignKey(JobType, on_delete=models.SET_NULL, null=True, blank=True, related_name='repair_jobs', help_text="Fixed price (labour + materials). Materials requested from shop; when paid, materials portion goes to shop, rest to workshop.")
    item_description = models.CharField(max_length=500)
    issue_description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')
    intake_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(blank=True, null=True)
    completed_date = models.DateTimeField(blank=True, null=True)
    collected_date = models.DateTimeField(blank=True, null=True)
    assigned_to = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_repair_jobs')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='created_repair_jobs')
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Repair #{self.id} - {self.customer.name}"


class RepairJobPart(models.Model):
    """Parts used in a repair; cost comes from transfer or product."""
    job = models.ForeignKey(RepairJob, on_delete=models.CASCADE, related_name='parts_used')
    product = models.ForeignKey('main.Product', on_delete=models.SET_NULL, null=True)
    transfer_line = models.ForeignKey('TransferOrderLine', on_delete=models.SET_NULL, null=True, blank=True, related_name='repair_parts')
    quantity_used = models.PositiveIntegerField(default=1)
    unit_cost = models.DecimalField(max_digits=20, decimal_places=2, default=0)  # transfer price or product cost
    unit_price_to_customer = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.product.name if self.product else 'Part'} x {self.quantity_used} (Job #{self.job_id})"


class LabourCharge(models.Model):
    job = models.ForeignKey(RepairJob, on_delete=models.CASCADE, related_name='labour_charges')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    labour_type = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.description} - {self.amount}"


class RepairInvoice(models.Model):
    PAYMENT_STATUS_CHOICES = (
        ('unpaid', 'Unpaid'),
        ('partial', 'Partially Paid'),
        ('paid', 'Paid'),
    )
    job = models.OneToOneField(RepairJob, on_delete=models.CASCADE, related_name='invoice')
    total_parts = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_labour = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice for Repair #{self.job_id}"


def update_repair_invoice_totals(job):
    """
    Job type fixed price = labour + expected materials (one amount customer pays).
    total_amount = that fixed price (we do NOT add materials on top).
    total_parts = materials cost (from transfer) — used only to split payment:
    when paid, materials portion goes to shop (transfer settlement), remainder = workshop income.
    """
    from decimal import Decimal
    inv = getattr(job, 'invoice', None)
    if not inv:
        return
    inv.total_parts = sum(
        (p.quantity_used * p.unit_cost) for p in job.parts_used.all()
    )
    if job.job_type_id:
        inv.total_amount = job.job_type.fixed_price + inv.tax_amount
        inv.total_labour = max(Decimal('0'), inv.total_amount - inv.total_parts - inv.tax_amount)  # workshop income
    else:
        inv.total_labour = sum(lc.amount for lc in job.labour_charges.all())
        inv.total_amount = inv.total_labour + inv.total_parts + inv.tax_amount
    inv.save()


class RepairPayment(models.Model):
    invoice = models.ForeignKey(RepairInvoice, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    payment_method = models.CharField(max_length=50)  # cash, mobile_money, card
    payment_date = models.DateTimeField(auto_now_add=True)
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    materials_settled = models.BooleanField(default=False, help_text="True when materials portion has been sent to shop via TransferSettlement.")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.invoice.paid_amount = sum(p.amount for p in self.invoice.payments.all())
        if self.invoice.paid_amount >= self.invoice.total_amount:
            self.invoice.payment_status = 'paid'
        elif self.invoice.paid_amount > 0:
            self.invoice.payment_status = 'partial'
        self.invoice.save()
        self._settle_materials_to_shop()

    def _settle_materials_to_shop(self):
        """
        Manual-only mode: material payments are NOT auto-settled from customer payments.
        Workshop cashier will explicitly record material payments against transfers.
        """
        # Mark as not auto-settled; actual settlements are created via explicit cashier actions.
        if not self.materials_settled:
            RepairPayment.objects.filter(pk=self.pk).update(materials_settled=False)


# ----------------------------
# Internal Transfer (Shop -> Workshop)
# ----------------------------
class MaterialRequest(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    unit = models.ForeignKey('main.Unit', on_delete=models.SET_NULL, null=True, related_name='material_requests')
    repair_job = models.ForeignKey(RepairJob, on_delete=models.SET_NULL, null=True, blank=True, related_name='material_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='requested_materials')
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_material_requests')
    reviewed_at = models.DateTimeField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Material Request #{self.id} - {self.get_status_display()}"


class MaterialRequestLine(models.Model):
    request = models.ForeignKey(MaterialRequest, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('main.Product', on_delete=models.CASCADE)
    quantity_requested = models.DecimalField(max_digits=20, decimal_places=2, default=1)

    def __str__(self):
        return f"{self.product.name} x {self.quantity_requested}"


class TransferOrder(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('partially_settled', 'Partially Settled'),
        ('closed', 'Closed'),
    )
    material_request = models.OneToOneField(MaterialRequest, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfer_order')
    from_unit = models.ForeignKey('main.Unit', on_delete=models.SET_NULL, null=True, related_name='transfers_out')  # Shop
    to_unit = models.ForeignKey('main.Unit', on_delete=models.SET_NULL, null=True, related_name='transfers_in')   # Workshop
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default='draft')
    transfer_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(blank=True, null=True)
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    settled_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    confirmed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='confirmed_transfers')
    confirmed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Transfer #{self.id} - {self.get_status_display()}"


class TransferOrderLine(models.Model):
    transfer = models.ForeignKey(TransferOrder, on_delete=models.CASCADE, related_name='lines')
    product = models.ForeignKey('main.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    transfer_price = models.DecimalField(max_digits=20, decimal_places=2)  # cost to workshop

    def __str__(self):
        return f"{self.product.name} x {self.quantity} @ {self.transfer_price}"


class TransferSettlement(models.Model):
    transfer_order = models.ForeignKey(TransferOrder, on_delete=models.CASCADE, related_name='settlements')
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    settlement_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    settled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    notes = models.TextField(blank=True, null=True)
    # Shop cashier can mark when the materials payment has been received in cash and reconciled
    cleared = models.BooleanField(default=False)
    cleared_at = models.DateTimeField(blank=True, null=True)
    cleared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cleared_material_settlements',
    )

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        t = self.transfer_order
        t.settled_amount = sum(s.amount for s in t.settlements.all())
        if t.settled_amount >= t.total_amount:
            t.status = 'closed'
        elif t.settled_amount > 0:
            t.status = 'partially_settled'
        t.save()

    def __str__(self):
        return f"Settlement {self.amount} for Transfer #{self.transfer_order_id}"


# ----------------------------
# Activity Log
# ----------------------------
class ActivityLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)  # sale, transfer_order, repair_job, etc.
    entity_id = models.PositiveIntegerField(blank=True, null=True)
    details = models.JSONField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} by {self.user} at {self.timestamp}"
