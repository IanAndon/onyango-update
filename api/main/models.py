from decimal import Decimal
from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.db import models, transaction
from django.conf import settings
from datetime import timedelta

# ----------------------------
# Unit (Onyango: Shop vs Workshop)
# ----------------------------
class Unit(models.Model):
    """Operational unit: Shop (owns inventory) or Workshop (repairs)."""
    code = models.CharField(max_length=20, unique=True)  # 'shop', 'workshop'
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['id']


# ----------------------------
# Custom User
# ----------------------------
class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('owner', 'Owner'),
        ('manager', 'Manager'),
        ('cashier', 'Cashier'),
        ('technician', 'Technician'),
        ('storekeeper', 'Storekeeper'),
        ('staff', 'Staff'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    def __str__(self):
        return self.username


# ----------------------------
# Customer
# ----------------------------
class Customer(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    CUSTOMER_TYPE_CHOICES = (
        ('individual', 'Individual'),
        ('contractor', 'Contractor'),
        ('company', 'Company'),
    )
    customer_type = models.CharField(
        max_length=20, choices=CUSTOMER_TYPE_CHOICES, default='individual'
    )
    credit_limit = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True,
        help_text="Maximum allowed outstanding debt for this customer (TZS)."
    )
    is_vip = models.BooleanField(default=False)
    is_blacklisted = models.BooleanField(
        default=False,
        help_text="If true, customer cannot take new loans (debt sales).",
    )
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


# ----------------------------
# Category & Product
# ----------------------------
class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, blank=True, null=True, unique=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')  # default Shop
    buying_price = models.DecimalField(max_digits=20, decimal_places=2)
    selling_price = models.DecimalField(max_digits=20, decimal_places=2)
    wholesale_price = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    quantity_in_stock = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    threshold = models.IntegerField(default=5, help_text="Minimum quantity before stock is considered low.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    _created_by = None  # temp holder for auto stock entry

    def __str__(self):
        return self.name

    def add_stock(self, quantity, user):
        qty = Decimal(str(quantity))
        self.quantity_in_stock += qty
        self.save()
        StockEntry.objects.create(
            product=self,
            entry_type='in',
            quantity=qty,
            recorded_by=user
        )

    def remove_stock(self, quantity, user):
        qty = Decimal(str(quantity))
        if self.quantity_in_stock < qty:
            raise ValueError("Not enough stock available.")
        self.quantity_in_stock -= qty
        self.save()
        StockEntry.objects.create(
            product=self,
            entry_type='sold',
            quantity=qty,
            recorded_by=user
        )

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        initial_quantity = self.quantity_in_stock
        super().save(*args, **kwargs)
        if is_new and (initial_quantity or 0) > 0 and self._created_by:
            StockEntry.objects.create(
                product=self,
                entry_type='added',
                quantity=initial_quantity,
                recorded_by=self._created_by
            )
            # self._created_by = None


class StockEntry(models.Model):
    ENTRY_TYPE_CHOICES = (
        ('added', 'Added'),
        ('updated', 'Updated'),
        ('deleted', 'Deleted'),
        ('quantity_updated', 'Quantity Updated'),
        ('sold', 'Sold'),
        ('in', 'Stock In'),
        ('transferred_out', 'Transferred Out'),
        ('received', 'Received'),
        ('adjusted', 'Adjusted'),
        ('returned', 'Returned'),
        ('written_off', 'Written Off'),
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    entry_type = models.CharField(max_length=24, choices=ENTRY_TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    date = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    ref_type = models.CharField(max_length=50, blank=True, null=True)  # e.g. 'transfer_order', 'sale'
    ref_id = models.PositiveIntegerField(blank=True, null=True)

    def __str__(self):
        return f"{self.get_entry_type_display()} - {self.quantity} units of {self.product.name}"


# ----------------------------
# Order & OrderItems (Created by staff, pending cashier confirmation)
# ----------------------------
class Order(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('cancelled', 'Cancelled'),
        ('confirmed', 'Confirmed'),
    )

    ORDER_TYPE_CHOICES = (
        ('retail', 'Retail'),
        ('wholesale', 'Wholesale'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)  # staff
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True, null=True)
    order_type = models.CharField(max_length=20, choices=ORDER_TYPE_CHOICES, default='retail')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # 🆕 Added discount percent at order level
    discount_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    def __str__(self):
        return f"Order #{self.id} - {self.status}"

    def confirm(self, cashier_user, payment_method=None):
        if self.status != 'pending':
            raise Exception("Order already processed.")

        with transaction.atomic():
            total_amount = sum(
                item.product.selling_price * get_effective_quantity(item.quantity, getattr(item, 'portion', 'full'))
                for item in self.items.all()
            )

            # ⬇️ Sale uses order discount
            sale = Sale.objects.create(
                order=self,
                user=cashier_user,
                customer=self.customer,
                total_amount=total_amount,
                discount_amount=self.discount_amount,
                payment_status='pending',
                payment_method=payment_method,
                sale_type=self.order_type
            )

            for item in self.items.all():
                portion = getattr(item, 'portion', 'full')
                effective_qty = get_effective_quantity(item.quantity, portion)
                line_total = item.product.selling_price * effective_qty
                SaleItem.objects.create(
                    sale=sale,
                    product=item.product,
                    quantity=effective_qty,
                    price_per_unit=item.product.selling_price,
                    total_price=line_total,
                    portion=portion,
                )
                item.product.remove_stock(effective_qty, cashier_user)

            self.status = 'confirmed'
            self.save()

            return sale


PORTION_CHOICES = [
    ('full', 'Full'),
    ('half', 'Half'),
    ('quarter', 'Quarter'),
]

PORTION_FACTOR = {'full': Decimal('1'), 'half': Decimal('0.5'), 'quarter': Decimal('0.25')}

# Extra amount added to whole quantity: "1 and half" = 1 + 0.5, "2 and quarter" = 2 + 0.25
PORTION_EXTRA = {'full': Decimal('0'), 'half': Decimal('0.5'), 'quarter': Decimal('0.25')}


def get_portion_factor(portion):
    return PORTION_FACTOR.get(portion or 'full', Decimal('1'))


def get_portion_extra(portion):
    return PORTION_EXTRA.get(portion or 'full', Decimal('0'))


def get_effective_quantity(whole_quantity, portion):
    """Effective quantity for pricing: e.g. 2 + quarter -> 2.25, 1 + half -> 1.5."""
    return Decimal(whole_quantity) + get_portion_extra(portion)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    portion = models.CharField(max_length=10, choices=PORTION_CHOICES, default='full')
    created_at = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True, null=True, blank=True)

    def __str__(self):
        return f"{self.product} x {self.quantity} (Order #{self.order.id})"


# ----------------------------
# Sale & SaleItems (Finalized by cashier)
# ----------------------------
class Sale(models.Model):
    # your existing fields...
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('partial', 'Partially Paid'),
        ('loan', 'Loan (Active)'),
        ('not_paid', 'Not Paid'),
    )
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('refunded', 'Refunded'),
    ]

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales')
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='sale', null=True, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)  # cashier
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=20, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=20, decimal_places=2, blank=True, null=True)
    paid_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    date = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    sale_type = models.CharField(max_length=20, default='retail')

    # ADD THESE FIELDS
    is_loan = models.BooleanField(default=False)
    refund_total = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    # Store keeper fulfillment check (items given correctly)
    FULFILLMENT_STATUS_CHOICES = [
        ('pending', 'Pending check'),
        ('checked', 'Checked'),
    ]
    fulfillment_status = models.CharField(
        max_length=20, choices=FULFILLMENT_STATUS_CHOICES, default='pending'
    )
    checked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sales_checked',
    )
    checked_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        # Correct discount logic (raw TZS subtraction)
        self.final_amount = self.total_amount - self.discount_amount

        if self.final_amount < 0:
            self.final_amount = 0  # never negative

        # Use paid_amount to determine status
        if self.paid_amount >= self.final_amount and self.final_amount > 0:
            self.payment_status = 'paid'
        elif 0 < self.paid_amount < self.final_amount:
            self.payment_status = 'partial'
        elif self.paid_amount == 0:
            self.payment_status = 'not_paid'
        else:
            self.payment_status = 'pending'

        super().save(*args, **kwargs)
    def update_paid_amount(self):
        # Recalculate paid amount based on Payment entries
        self.paid_amount = sum(p.amount_paid for p in self.payments.all())
        self.save()

    def __str__(self):
        return f"Sale #{self.id} - {self.final_amount} TZS"


class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    quantity = models.DecimalField(max_digits=20, decimal_places=2, default=1)  # effective qty e.g. 1.5, 2.25
    price_per_unit = models.DecimalField(max_digits=20, decimal_places=2)
    total_price = models.DecimalField(max_digits=20, decimal_places=2)
    portion = models.CharField(max_length=10, choices=PORTION_CHOICES, default='full')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.product} x {self.quantity} (Sale #{self.sale.id})"


# ----------------------------
# Payment
# ----------------------------
class Payment(models.Model):
    sale = models.ForeignKey(Sale, related_name="payments", on_delete=models.CASCADE)
    amount_paid = models.DecimalField(max_digits=20, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    cashier = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.amount_paid} TZS for Sale #{self.sale.id}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding  # Only trigger update when creating, not updating
        super().save(*args, **kwargs)
        if is_new:
            self.sale.update_paid_amount()


# ----------------------------
# Refunds
# ----------------------------
class Refund(models.Model):
    sale = models.ForeignKey(Sale, related_name="refunds", on_delete=models.CASCADE)
    refunded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    refund_date = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    total_refund_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        # Auto set refund amount to the paid amount of the sale
        self.total_refund_amount = self.sale.paid_amount
        super().save(*args, **kwargs)
        # Update sale status and refund total (once)
        self.sale.status = 'refunded'
        self.sale.payment_status = 'refunded'
        self.sale.refund_total = (self.sale.refund_total or 0) + self.total_refund_amount
        self.sale.save()
        # Log reverse payment (single negative payment)
        Payment.objects.create(
            sale=self.sale,
            amount_paid=-self.total_refund_amount,
            cashier=self.refunded_by,
            payment_method="refund"
        )
        self.sale.update_paid_amount()
        # Return items to stock
        for item in self.sale.items.select_related("product").all():
            if item.product:
                item.product.add_stock(item.quantity, self.refunded_by)

    def __str__(self):
        return f"Refund #{self.id} for Sale #{self.sale.id}"

# ----------------------------
# Expenses
# ----------------------------
class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('rent', 'Rent'),
        ('electricity', 'Electricity'),
        ('salary', 'Salary'),
        ('inventory', 'Inventory Refill'),
        ('misc', 'Miscellaneous'),
    ]

    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    date = models.DateField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        verbose_name_plural = "Expenses"

    def __str__(self):
        return f"{self.description} - {self.amount} TZS"


# ----------------------------
# Timeline (all key events with created_at / updated_at)
# ----------------------------
class TimelineEvent(models.Model):
    """Central timeline: every sale, payment, loan payment, refund, expense, order, transfer, repair, etc."""
    EVENT_TYPES = (
        ('order_created', 'Order created'),
        ('order_confirmed', 'Order confirmed'),
        ('order_rejected', 'Order rejected'),
        ('sale_created', 'Sale created'),
        ('payment_recorded', 'Payment recorded'),
        ('loan_payment', 'Loan payment'),
        ('refund_created', 'Refund created'),
        ('expense_created', 'Expense recorded'),
        ('stock_in', 'Stock in'),
        ('stock_out', 'Stock out'),
        ('stock_adjusted', 'Stock adjusted'),
        ('transfer_confirmed', 'Transfer confirmed'),
        ('transfer_settled', 'Transfer settled'),
        ('repair_job_created', 'Repair job created'),
        ('repair_job_completed', 'Repair job completed'),
        ('repair_job_collected', 'Repair job collected'),
        ('repair_payment', 'Repair payment'),
        ('material_request_submitted', 'Material request submitted'),
        ('material_request_approved', 'Material request approved'),
        ('material_request_rejected', 'Material request rejected'),
        ('purchase_order_created', 'Purchase order created'),
        ('goods_receipt', 'Goods received'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(max_length=40, choices=EVENT_TYPES)
    entity_type = models.CharField(max_length=30)  # sale, payment, order, refund, expense, transfer_order, repair_job, etc.
    entity_id = models.PositiveIntegerField(blank=True, null=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=500)
    details = models.JSONField(blank=True, null=True)  # e.g. {"amount": 1000, "sale_id": 5}

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_event_type_display()} at {self.created_at}"


# ----------------------------
# Daily cash close (per unit, per day)
# ----------------------------
class DailyCashClose(models.Model):
    """End-of-day cash reconciliation for a unit (e.g. Shop)."""
    unit = models.ForeignKey(Unit, on_delete=models.CASCADE, related_name='daily_cash_closes')
    date = models.DateField()
    expected_cash = models.DecimalField(max_digits=20, decimal_places=2)
    actual_cash = models.DecimalField(max_digits=20, decimal_places=2)
    variance = models.DecimalField(max_digits=20, decimal_places=2)
    closed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('unit', 'date')
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"Cash close {self.unit.code} {self.date} (variance {self.variance})"


# ----------------------------
# Quotes / Pro-forma invoices (per unit, per customer)
# ----------------------------
class Quote(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
    )

    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotes')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='quotes')
    customer_name = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=50, blank=True)
    customer_address = models.TextField(blank=True)
    customer_tin = models.CharField(max_length=50, blank=True)
    vat_percent = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="VAT percentage applied to (subtotal - discount).")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_quotes')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    quote_date = models.DateField(null=True, blank=True, help_text="Optional date to show on the quote (e.g. document date).")
    valid_until = models.DateField(null=True, blank=True)

    subtotal = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    notes = models.TextField(blank=True)

    # Optional link when converted to a real sale
    sale = models.ForeignKey(Sale, on_delete=models.SET_NULL, null=True, blank=True, related_name='origin_quotes')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Quote #{self.id} - {self.total_amount} TZS"


class QuoteItem(models.Model):
    quote = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=20, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        self.line_total = (self.unit_price or 0) * (self.quantity or 0)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} x {self.quantity} (Quote #{self.quote_id})"
