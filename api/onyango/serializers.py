from rest_framework import serializers
from django.db import transaction
from main.models import Unit, Product, Customer
from main.rounding import round_two
from .models import (
    Supplier, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine,
    JobType, RepairJob, RepairJobPart, LabourCharge, RepairInvoice, RepairPayment,
    MaterialRequest, MaterialRequestLine, TransferOrder, TransferOrderLine, TransferSettlement,
    ActivityLog,
)


# ---------- Unit (read-only from main) ----------
class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = ['id', 'code', 'name']


# ---------- Supplier & Purchasing ----------
class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['created_at']


class PurchaseOrderLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = PurchaseOrderLine
        fields = ['id', 'product', 'product_name', 'quantity', 'unit_price', 'received_quantity']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    lines = PurchaseOrderLineSerializer(many=True, required=False)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'supplier', 'supplier_name', 'order_date', 'expected_delivery', 'status', 'notes', 'lines', 'created_by', 'created_at']
        read_only_fields = ['created_at']

    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        request = self.context.get('request')
        validated_data['created_by'] = request.user if request else None
        po = PurchaseOrder.objects.create(**validated_data)
        for line in lines_data:
            PurchaseOrderLine.objects.create(order=po, **line)
        return po


class GoodsReceiptLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = GoodsReceiptLine
        fields = ['id', 'product', 'quantity', 'unit_price']


class GoodsReceiptSerializer(serializers.ModelSerializer):
    lines = GoodsReceiptLineSerializer(many=True)

    class Meta:
        model = GoodsReceipt
        fields = ['id', 'order', 'lines', 'notes', 'received_by', 'receipt_date']
        read_only_fields = ['receipt_date']

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        request = self.context.get('request')
        validated_data['received_by'] = request.user if request else None
        receipt = GoodsReceipt.objects.create(**validated_data)
        for line in lines_data:
            grl = GoodsReceiptLine.objects.create(receipt=receipt, **line)
            product = grl.product
            product.quantity_in_stock += grl.quantity
            product.save()
            from main.models import StockEntry
            StockEntry.objects.create(
                product=product,
                entry_type='received',
                quantity=grl.quantity,
                recorded_by=validated_data['received_by'],
                ref_type='goods_receipt',
                ref_id=receipt.id,
            )
            pol = receipt.order.lines.filter(product=product).first()
            if pol:
                pol.received_quantity = (pol.received_quantity or 0) + grl.quantity
                pol.save()
        return receipt


# ---------- Job Type ----------
class JobTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobType
        fields = ['id', 'name', 'code', 'fixed_price', 'description', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


# ---------- Customer (minimal from main) ----------
class CustomerMinSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'address']


# ---------- Repair Job ----------
class LabourChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabourCharge
        fields = ['id', 'description', 'amount', 'labour_type']


class RepairJobPartSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = RepairJobPart
        fields = ['id', 'product', 'product_name', 'transfer_line', 'quantity_used', 'unit_cost', 'unit_price_to_customer']


class RepairInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairInvoice
        fields = ['id', 'job', 'total_parts', 'total_labour', 'tax_amount', 'total_amount', 'paid_amount', 'payment_status', 'created_at']


class RepairPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RepairPayment
        fields = ['id', 'invoice', 'amount', 'payment_method', 'payment_date', 'received_by']
        read_only_fields = ['payment_date']


class JobTypeMinSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobType
        fields = ['id', 'name', 'code', 'fixed_price']


class RepairJobSerializer(serializers.ModelSerializer):
    customer_detail = CustomerMinSerializer(source='customer', read_only=True)
    job_type_detail = JobTypeMinSerializer(source='job_type', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    labour_charges = LabourChargeSerializer(many=True, read_only=True)
    parts_used = RepairJobPartSerializer(many=True, read_only=True)
    invoice = RepairInvoiceSerializer(read_only=True)

    class Meta:
        model = RepairJob
        fields = [
            'id', 'unit', 'customer', 'customer_detail', 'job_type', 'job_type_detail', 'item_description', 'issue_description',
            'status', 'priority', 'intake_date', 'due_date', 'completed_date', 'collected_date',
            'assigned_to', 'assigned_to_username', 'created_by', 'notes',
            'labour_charges', 'parts_used', 'invoice',
        ]
        read_only_fields = ['intake_date']


class RepairJobCreateUpdateSerializer(serializers.ModelSerializer):
    labour_charges = LabourChargeSerializer(many=True, required=False)
    parts_used = RepairJobPartSerializer(many=True, required=False)

    class Meta:
        model = RepairJob
        fields = [
            'id', 'customer', 'job_type', 'item_description', 'issue_description', 'status', 'priority',
            'due_date', 'assigned_to', 'notes', 'labour_charges', 'parts_used',
        ]

    def create(self, validated_data):
        labour_data = validated_data.pop('labour_charges', [])
        parts_data = validated_data.pop('parts_used', [])
        request = self.context.get('request')
        workshop = Unit.objects.filter(code='workshop').first()
        if workshop:
            validated_data['unit'] = workshop
        validated_data['created_by'] = request.user if request else None
        job = RepairJob.objects.create(**validated_data)
        for l in labour_data:
            LabourCharge.objects.create(job=job, **l)
        for p in parts_data:
            RepairJobPart.objects.create(job=job, **p)
        RepairInvoice.objects.create(job=job)
        from .models import update_repair_invoice_totals
        update_repair_invoice_totals(job)
        return job

    def update(self, instance, validated_data):
        labour_data = validated_data.pop('labour_charges', None)
        parts_data = validated_data.pop('parts_used', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if labour_data is not None:
            instance.labour_charges.all().delete()
            for l in labour_data:
                LabourCharge.objects.create(job=instance, **l)
        if parts_data is not None:
            instance.parts_used.all().delete()
            for p in parts_data:
                RepairJobPart.objects.create(job=instance, **p)
        from .models import update_repair_invoice_totals
        update_repair_invoice_totals(instance)
        return instance


# ---------- Material Request & Transfer ----------
class MaterialRequestLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    quantity_in_stock = serializers.DecimalField(source='product.quantity_in_stock', max_digits=20, decimal_places=2, read_only=True)
    unit_price = serializers.DecimalField(source='product.buying_price', max_digits=20, decimal_places=2, read_only=True)

    class Meta:
        model = MaterialRequestLine
        fields = ['id', 'product', 'product_name', 'quantity_requested', 'quantity_in_stock', 'unit_price']


class MaterialRequestSerializer(serializers.ModelSerializer):
    lines = MaterialRequestLineSerializer(many=True)
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    repair_job_id = serializers.IntegerField(source='repair_job.id', read_only=True)
    repair_job_detail = RepairJobSerializer(source='repair_job', read_only=True)

    class Meta:
        model = MaterialRequest
        fields = [
            'id', 'unit', 'repair_job', 'repair_job_id', 'repair_job_detail', 'status', 'lines',
            'requested_by', 'requested_by_username', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'notes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        # Prevent workshop from submitting requests with quantities greater than shop stock
        for line in lines_data:
            product = line.get('product')
            qty_requested = line.get('quantity_requested') or 0
            if product and product.quantity_in_stock is not None:
                from decimal import Decimal
                q = Decimal(str(qty_requested))
                if q > product.quantity_in_stock:
                    raise serializers.ValidationError({
                        'lines': [f"Insufficient stock for {product.name} (in stock {product.quantity_in_stock}, requested {q})."]
                    })
        request = self.context.get('request')
        workshop = Unit.objects.filter(code='workshop').first()
        if workshop:
            validated_data['unit'] = workshop
        validated_data['requested_by'] = request.user if request else None
        # New requests are saved as 'submitted' (requested) so the shop cashier can approve immediately
        validated_data['status'] = 'submitted'
        mr = MaterialRequest.objects.create(**validated_data)
        for line in lines_data:
            MaterialRequestLine.objects.create(request=mr, **line)
        return mr

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)
        # Only allow updating fields that workshop can change (rejected/draft requests)
        for attr, value in validated_data.items():
            if attr not in ('created_at', 'updated_at', 'requested_by', 'reviewed_by', 'reviewed_at', 'status'):
                setattr(instance, attr, value)
        if lines_data is not None:
            instance.lines.all().delete()
            for line in lines_data:
                MaterialRequestLine.objects.create(request=instance, **line)
        instance.save()
        return instance


class TransferOrderLineSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)

    class Meta:
        model = TransferOrderLine
        fields = ['id', 'product', 'product_name', 'quantity', 'transfer_price']


class TransferOrderSerializer(serializers.ModelSerializer):
    lines = TransferOrderLineSerializer(many=True, read_only=True)
    from_unit_name = serializers.CharField(source='from_unit.name', read_only=True)
    to_unit_name = serializers.CharField(source='to_unit.name', read_only=True)
    material_request_id = serializers.IntegerField(source='material_request.id', read_only=True)
    job_id = serializers.IntegerField(source='material_request.repair_job_id', read_only=True)

    class Meta:
        model = TransferOrder
        fields = [
            'id', 'material_request', 'material_request_id', 'job_id',
            'from_unit', 'to_unit', 'from_unit_name', 'to_unit_name',
            'status', 'transfer_date', 'due_date', 'total_amount', 'settled_amount', 'confirmed_at',
            'lines',
        ]
        read_only_fields = ['transfer_date', 'total_amount', 'settled_amount', 'confirmed_at']


class TransferSettlementSerializer(serializers.ModelSerializer):
    cashier = serializers.CharField(source='settled_by.username', read_only=True)

    class Meta:
        model = TransferSettlement
        fields = [
            'id',
            'transfer_order',
            'amount',
            'settlement_date',
            'payment_method',
            'cashier',
            'notes',
            'cleared',
        ]
        read_only_fields = ['settlement_date', 'cleared']

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['settled_by'] = request.user if request else None
        return super().create(validated_data)


# ---------- Activity Log ----------
class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ['id', 'user', 'username', 'action', 'entity_type', 'entity_id', 'details', 'timestamp']
