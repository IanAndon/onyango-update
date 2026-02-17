from django.contrib import admin
from .models import (
    Supplier, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine,
    RepairJob, RepairJobPart, LabourCharge, RepairInvoice, RepairPayment,
    MaterialRequest, MaterialRequestLine, TransferOrder, TransferOrderLine, TransferSettlement,
    ActivityLog,
)


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'contact_person', 'created_at')
    search_fields = ('name', 'phone', 'email')


class PurchaseOrderLineInline(admin.TabularInline):
    model = PurchaseOrderLine
    extra = 0


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'supplier', 'order_date', 'status', 'created_by', 'created_at')
    list_filter = ('status',)
    search_fields = ('supplier__name',)
    inlines = [PurchaseOrderLineInline]


class GoodsReceiptLineInline(admin.TabularInline):
    model = GoodsReceiptLine
    extra = 0


@admin.register(GoodsReceipt)
class GoodsReceiptAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'receipt_date', 'received_by')
    inlines = [GoodsReceiptLineInline]


class RepairJobPartInline(admin.TabularInline):
    model = RepairJobPart
    extra = 0


class LabourChargeInline(admin.TabularInline):
    model = LabourCharge
    extra = 0


@admin.register(RepairJob)
class RepairJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'item_description', 'status', 'assigned_to', 'intake_date', 'due_date')
    list_filter = ('status', 'priority')
    search_fields = ('customer__name', 'item_description')
    inlines = [RepairJobPartInline, LabourChargeInline]


@admin.register(RepairInvoice)
class RepairInvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'total_amount', 'paid_amount', 'payment_status', 'created_at')


@admin.register(RepairPayment)
class RepairPaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'amount', 'payment_method', 'payment_date', 'received_by')


class MaterialRequestLineInline(admin.TabularInline):
    model = MaterialRequestLine
    extra = 0


@admin.register(MaterialRequest)
class MaterialRequestAdmin(admin.ModelAdmin):
    list_display = ('id', 'repair_job', 'status', 'requested_by', 'created_at')
    list_filter = ('status',)
    inlines = [MaterialRequestLineInline]


class TransferOrderLineInline(admin.TabularInline):
    model = TransferOrderLine
    extra = 0


@admin.register(TransferOrder)
class TransferOrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_unit', 'to_unit', 'status', 'total_amount', 'settled_amount', 'transfer_date')
    list_filter = ('status',)
    inlines = [TransferOrderLineInline]


@admin.register(TransferSettlement)
class TransferSettlementAdmin(admin.ModelAdmin):
    list_display = ('id', 'transfer_order', 'amount', 'settlement_date', 'settled_by')


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'action', 'entity_type', 'entity_id', 'timestamp')
    list_filter = ('entity_type',)
    readonly_fields = ('timestamp',)
