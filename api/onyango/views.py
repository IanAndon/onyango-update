from rest_framework import viewsets, status, permissions, serializers
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from django.db import transaction
from django.utils import timezone
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import Coalesce
from main.models import Unit, Product, Sale, StockEntry
from .models import (
    Supplier, PurchaseOrder, PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine,
    JobType, RepairJob, RepairJobPart, LabourCharge, RepairInvoice, RepairPayment,
    MaterialRequest, MaterialRequestLine, TransferOrder, TransferOrderLine, TransferSettlement,
    ActivityLog,
)
from .serializers import (
    UnitSerializer, SupplierSerializer, PurchaseOrderSerializer, PurchaseOrderLineSerializer,
    GoodsReceiptSerializer, JobTypeSerializer, RepairJobSerializer, RepairJobCreateUpdateSerializer,
    RepairInvoiceSerializer, RepairPaymentSerializer, MaterialRequestSerializer,
    TransferOrderSerializer, TransferSettlementSerializer, ActivityLogSerializer,
)
from .permissions import IsOwnerOrManager, IsOwnerOrManagerOrReadOnly, IsShopStaff, IsWorkshopStaff, CanApproveTransfer, CanSettleTransfer
from main.timeline import log_timeline


def log_activity(user, action_name, entity_type, entity_id=None, details=None):
    ActivityLog.objects.create(user=user, action=action_name, entity_type=entity_type, entity_id=entity_id, details=details)


# ---------- Units ----------
class UnitViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [permissions.IsAuthenticated]


# ---------- Suppliers ----------
class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by('name')
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated, IsShopStaff]
    search_fields = ['name', 'phone', 'email']
    filterset_fields = []


# ---------- Purchase Orders ----------
class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().select_related('supplier', 'created_by').order_by('-created_at')
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsShopStaff]
    filterset_fields = ['status', 'supplier']

    def perform_create(self, serializer):
        po = serializer.save()
        log_timeline('purchase_order_created', 'purchase_order', po.id, f"Purchase order #{po.id} created - {po.supplier.name}", user=self.request.user, details={'purchase_order_id': po.id, 'supplier_id': po.supplier_id})


# ---------- Goods Receipts ----------
class GoodsReceiptViewSet(viewsets.ModelViewSet):
    queryset = GoodsReceipt.objects.all().select_related('order', 'received_by').order_by('-receipt_date')
    serializer_class = GoodsReceiptSerializer
    permission_classes = [permissions.IsAuthenticated, IsShopStaff]

    def perform_create(self, serializer):
        receipt = serializer.save()
        log_timeline('goods_receipt', 'goods_receipt', receipt.id, f"Goods receipt #{receipt.id} for PO #{receipt.order_id}", user=self.request.user, details={'goods_receipt_id': receipt.id, 'purchase_order_id': receipt.order_id})

    def get_queryset(self):
        qs = super().get_queryset()
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs


# ---------- Job Types (admin/manager create & edit; cashier read-only) ----------
class JobTypeViewSet(viewsets.ModelViewSet):
    queryset = JobType.objects.filter(is_active=True).order_by('name')
    serializer_class = JobTypeSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrManagerOrReadOnly]

    def get_queryset(self):
        qs = JobType.objects.all().order_by('name')
        if self.request.query_params.get('active_only') == 'true':
            qs = qs.filter(is_active=True)
        return qs


# ---------- Repair Jobs ----------
class RepairJobViewSet(viewsets.ModelViewSet):
    queryset = RepairJob.objects.all().select_related('customer', 'unit', 'job_type', 'assigned_to', 'created_by').prefetch_related('labour_charges', 'parts_used', 'invoice').order_by('-intake_date')
    permission_classes = [permissions.IsAuthenticated, IsWorkshopStaff]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return RepairJobCreateUpdateSerializer
        return RepairJobSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        user = self.request.user
        if user.role == 'cashier':
            qs = qs.filter(Q(assigned_to=user) | Q(assigned_to__isnull=True))
        return qs

    def perform_create(self, serializer):
        job = serializer.save()
        log_activity(self.request.user, 'created_repair_job', 'repair_job', job.id)
        log_timeline('repair_job_created', 'repair_job', job.id, f"Repair job #{job.id} - {job.item_description} (Customer: {job.customer.name})", user=self.request.user, details={'repair_job_id': job.id, 'customer_id': job.customer_id})

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        job = self.get_object()
        if job.status not in ('received', 'in_progress', 'on_hold'):
            return Response({'error': 'Job cannot be completed in current status.'}, status=status.HTTP_400_BAD_REQUEST)
        job.status = 'completed'
        job.completed_date = timezone.now()
        job.save()
        log_activity(request.user, 'completed_repair_job', 'repair_job', job.id)
        log_timeline('repair_job_completed', 'repair_job', job.id, f"Repair job #{job.id} completed", user=request.user, details={'repair_job_id': job.id})
        return Response(RepairJobSerializer(job).data)

    @action(detail=True, methods=['post'])
    def collect(self, request, pk=None):
        job = self.get_object()
        if job.status != 'completed':
            return Response({'error': 'Job must be completed before collection.'}, status=status.HTTP_400_BAD_REQUEST)
        job.status = 'collected'
        job.collected_date = timezone.now()
        job.save()
        log_activity(request.user, 'collected_repair_job', 'repair_job', job.id)
        log_timeline('repair_job_collected', 'repair_job', job.id, f"Repair job #{job.id} collected by customer", user=request.user, details={'repair_job_id': job.id})
        return Response(RepairJobSerializer(job).data)


# ---------- Repair Payments ----------
class RepairPaymentViewSet(viewsets.ModelViewSet):
    queryset = RepairPayment.objects.all().select_related('invoice', 'received_by').order_by('-payment_date')
    serializer_class = RepairPaymentSerializer
    permission_classes = [permissions.IsAuthenticated, IsWorkshopStaff]

    def perform_create(self, serializer):
        payment = serializer.save(received_by=self.request.user)
        log_timeline('repair_payment', 'repair_payment', payment.id, f"Repair payment TZS {payment.amount} for Job #{payment.invoice.job_id}", user=self.request.user, details={'repair_payment_id': payment.id, 'invoice_id': payment.invoice_id, 'amount': str(payment.amount)})


# ---------- Material Requests ----------
class MaterialRequestViewSet(viewsets.ModelViewSet):
    queryset = MaterialRequest.objects.all().select_related('unit', 'repair_job', 'requested_by', 'reviewed_by').prefetch_related('lines__product').order_by('-created_at')
    serializer_class = MaterialRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        mr = serializer.save()
        # Timeline: material request created as submitted (requested) so shop can approve
        job = mr.repair_job
        customer_name = getattr(getattr(job, 'customer', None), 'name', None) if job else None
        log_activity(self.request.user, 'created_material_request', 'material_request', mr.id)
        title = f"Material request #{mr.id} created and submitted for approval"
        if job and customer_name:
            title = f"Material request #{mr.id} for Repair #{job.id} ({customer_name}) submitted for approval"
        log_timeline(
            'material_request_submitted',
            'material_request',
            mr.id,
            title,
            user=self.request.user,
            details={
                'material_request_id': mr.id,
                'repair_job_id': job.id if job else None,
                'customer_name': customer_name,
            },
        )

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def update(self, request, *args, **kwargs):
        mr = self.get_object()
        # Allow editing draft, rejected, submitted, and approved requests
        # For approved requests, we'll update the associated TransferOrder
        if mr.status not in ('draft', 'rejected', 'submitted', 'approved'):
            return Response(
                {'error': 'This request cannot be edited in its current status.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Store old status before any changes
        old_status = mr.status
        # When workshop edits a rejected request, clear rejection fields and set to draft so they can resubmit
        if mr.status == 'rejected':
            mr.rejection_reason = None
            mr.reviewed_by = None
            mr.reviewed_at = None
            mr.status = 'draft'
            mr.save()
        # Pass old_status to serializer context so perform_update can use it
        serializer = self.get_serializer(mr, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.old_status = old_status  # Store for perform_update
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        mr = serializer.save()
        old_status = getattr(serializer, 'old_status', mr.status)
        
        # If approved request is being updated, we need to update the TransferOrder
        if old_status == 'approved':
            transfer = getattr(mr, 'transfer_order', None)
            if transfer:
                with transaction.atomic():
                    # Calculate new total from updated lines
                    new_total = 0
                    existing_lines_map = {line.product_id: line for line in transfer.lines.all()}
                    new_lines_data = []
                    
                    # Validate stock and prepare new lines
                    for line in mr.lines.all():
                        product = line.product
                        # Refresh product to get latest stock
                        product.refresh_from_db()
                        qty_requested = line.quantity_requested
                        
                        # Check stock availability (consider already transferred quantities)
                        existing_line = existing_lines_map.get(product.id)
                        already_transferred = existing_line.quantity if existing_line else 0
                        current_stock = product.quantity_in_stock or 0
                        
                        # If increasing quantity, check if additional stock is available
                        if qty_requested > already_transferred:
                            additional_needed = qty_requested - already_transferred
                            if current_stock < additional_needed:
                                raise serializers.ValidationError({
                                    'lines': [f"Insufficient stock for {product.name} (available {current_stock}, need {additional_needed} more)."]
                                })
                        
                        price = product.buying_price or 0
                        new_total += price * qty_requested
                        new_lines_data.append({
                            'product': product,
                            'quantity': qty_requested,
                            'transfer_price': price,
                            'existing_line': existing_line,
                        })
                    
                    # Update or create transfer lines
                    for item in new_lines_data:
                        existing_line = item['existing_line']
                        if existing_line:
                            # Update existing line (quantity change)
                            old_qty = existing_line.quantity
                            new_qty = item['quantity']
                            if new_qty != old_qty:
                                # Adjust stock by the difference
                                diff = new_qty - old_qty
                                product = existing_line.product
                                if diff > 0:
                                    # Increasing quantity - deduct the difference
                                    product.quantity_in_stock -= diff
                                else:
                                    # Decreasing quantity - add back the difference
                                    product.quantity_in_stock += abs(diff)
                                product.save()
                                
                                # Update stock entry
                                StockEntry.objects.create(
                                    product=product,
                                    entry_type='transferred_out' if diff > 0 else 'transferred_in',
                                    quantity=abs(diff),
                                    recorded_by=self.request.user,
                                    ref_type='transfer_order',
                                    ref_id=transfer.id,
                                )
                                
                                existing_line.quantity = new_qty
                                existing_line.transfer_price = item['transfer_price']
                                existing_line.save()
                        else:
                            # New line - create it and deduct stock
                            TransferOrderLine.objects.create(
                                transfer=transfer,
                                product=item['product'],
                                quantity=item['quantity'],
                                transfer_price=item['transfer_price'],
                            )
                            item['product'].quantity_in_stock -= item['quantity']
                            item['product'].save()
                            StockEntry.objects.create(
                                product=item['product'],
                                entry_type='transferred_out',
                                quantity=item['quantity'],
                                recorded_by=self.request.user,
                                ref_type='transfer_order',
                                ref_id=transfer.id,
                            )
                    
                    # Remove lines that are no longer in the request
                    request_product_ids = {line.product_id for line in mr.lines.all()}
                    for transfer_line in transfer.lines.all():
                        if transfer_line.product_id not in request_product_ids:
                            # Add back stock for removed line
                            transfer_line.product.quantity_in_stock += transfer_line.quantity
                            transfer_line.product.save()
                            StockEntry.objects.create(
                                product=transfer_line.product,
                                entry_type='transferred_in',
                                quantity=transfer_line.quantity,
                                recorded_by=self.request.user,
                                ref_type='transfer_order',
                                ref_id=transfer.id,
                            )
                            transfer_line.delete()
                    
                    # Update transfer total (but don't change settled_amount - that's based on payments)
                    transfer.total_amount = new_total
                    # Update status based on settled_amount vs new total
                    if transfer.settled_amount >= new_total:
                        transfer.status = 'closed'
                    elif transfer.settled_amount > 0:
                        transfer.status = 'partially_settled'
                    else:
                        transfer.status = 'confirmed'  # Keep confirmed if no payments yet
                    transfer.save()
        
        log_activity(self.request.user, 'updated_material_request', 'material_request', mr.id)
        status_msg = 'updated' if old_status == 'approved' else 'updated (back to draft – can resubmit)'
        log_timeline(
            'material_request_updated',
            'material_request',
            mr.id,
            f"Material request #{mr.id} {status_msg}",
            user=self.request.user,
            details={'material_request_id': mr.id, 'old_status': old_status},
        )

    def destroy(self, request, *args, **kwargs):
        mr = self.get_object()
        if mr.status not in ('draft', 'rejected'):
            return Response(
                {'error': 'Only draft or rejected requests can be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mr_id = mr.id
        mr.delete()
        log_activity(request.user, 'deleted_material_request', 'material_request', mr_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        """Workshop: resubmit a draft (or previously rejected) request so shop can approve again."""
        mr = self.get_object()
        if mr.status not in ('draft', 'rejected'):
            return Response(
                {'error': 'Only draft or rejected requests can be resubmitted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Prevent resubmitting when any line has quantity greater than current stock
        insufficient = []
        for line in mr.lines.all():
            product = line.product
            if product and product.quantity_in_stock is not None and product.quantity_in_stock < line.quantity_requested:
                insufficient.append(f"{product.name} (in stock {product.quantity_in_stock}, requested {line.quantity_requested})")
        if insufficient:
            return Response(
                {'error': 'Cannot resubmit. Insufficient stock for: ' + '; '.join(insufficient)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        mr.status = 'submitted'
        mr.rejection_reason = None
        mr.reviewed_by = None
        mr.reviewed_at = None
        mr.save()
        log_activity(request.user, 'submitted_material_request', 'material_request', mr.id)
        log_timeline(
            'material_request_submitted',
            'material_request',
            mr.id,
            f"Material request #{mr.id} resubmitted for approval",
            user=request.user,
            details={'material_request_id': mr.id},
        )
        return Response({'message': 'Resubmitted. Shop can approve or reject again.', 'status': 'submitted'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, CanApproveTransfer])
    def approve(self, request, pk=None):
        mr = self.get_object()
        if mr.status != 'submitted':
            return Response({'error': 'Only submitted requests can be approved.'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            mr.status = 'approved'
            mr.reviewed_by = request.user
            mr.reviewed_at = timezone.now()
            mr.save()
            shop = Unit.objects.filter(code='shop').first()
            workshop = Unit.objects.filter(code='workshop').first()
            if not shop or not workshop:
                return Response({'error': 'Shop or Workshop unit not configured.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            total = 0
            lines_data = []
            for line in mr.lines.all():
                if line.product.quantity_in_stock < line.quantity_requested:
                    return Response({'error': f'Insufficient stock for {line.product.name}'}, status=status.HTTP_400_BAD_REQUEST)
                price = line.product.buying_price
                total += price * line.quantity_requested
                lines_data.append({'product': line.product, 'quantity': line.quantity_requested, 'transfer_price': price})
            transfer = TransferOrder.objects.create(
                material_request=mr,
                from_unit=shop,
                to_unit=workshop,
                status='draft',
                total_amount=total,
                settled_amount=0,
            )
            for item in lines_data:
                TransferOrderLine.objects.create(
                    transfer=transfer,
                    product=item['product'],
                    quantity=item['quantity'],
                    transfer_price=item['transfer_price'],
                )
            transfer.status = 'confirmed'
            transfer.confirmed_by = request.user
            transfer.confirmed_at = timezone.now()
            transfer.save()
            for line in transfer.lines.all():
                line.product.quantity_in_stock -= line.quantity
                line.product.save()
                StockEntry.objects.create(
                    product=line.product,
                    entry_type='transferred_out',
                    quantity=line.quantity,
                    recorded_by=request.user,
                    ref_type='transfer_order',
                    ref_id=transfer.id,
                )
            log_activity(request.user, 'approved_material_request', 'material_request', mr.id, {'transfer_id': transfer.id})
            log_timeline('material_request_approved', 'material_request', mr.id, f"Material request #{mr.id} approved", user=request.user, details={'material_request_id': mr.id})
            log_timeline('transfer_confirmed', 'transfer_order', transfer.id, f"Transfer #{transfer.id} confirmed - TZS {transfer.total_amount} (Shop → Workshop)", user=request.user, details={'transfer_id': transfer.id, 'amount': str(transfer.total_amount)})
        return Response({'message': 'Approved and transfer created.', 'transfer_id': transfer.id}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, CanApproveTransfer])
    def reject(self, request, pk=None):
        mr = self.get_object()
        if mr.status != 'submitted':
            return Response({'error': 'Only submitted requests can be rejected.'}, status=status.HTTP_400_BAD_REQUEST)
        reason = request.data.get('rejection_reason', '')
        mr.status = 'rejected'
        mr.reviewed_by = request.user
        mr.reviewed_at = timezone.now()
        mr.rejection_reason = reason
        mr.save()
        log_activity(request.user, 'rejected_material_request', 'material_request', mr.id)
        log_timeline('material_request_rejected', 'material_request', mr.id, f"Material request #{mr.id} rejected", user=request.user, details={'material_request_id': mr.id, 'reason': reason})
        return Response({'message': 'Request rejected.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        mr = self.get_object()
        if mr.status != 'draft':
            return Response({'error': 'Only draft requests can be submitted.'}, status=status.HTTP_400_BAD_REQUEST)
        mr.status = 'submitted'
        mr.save()
        log_activity(request.user, 'submitted_material_request', 'material_request', mr.id)
        log_timeline('material_request_submitted', 'material_request', mr.id, f"Material request #{mr.id} submitted for approval", user=request.user, details={'material_request_id': mr.id})
        return Response({'message': 'Submitted.'}, status=status.HTTP_200_OK)


# ---------- Transfer Orders ----------
class TransferOrderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TransferOrder.objects.all().select_related('from_unit', 'to_unit', 'material_request', 'material_request__repair_job').prefetch_related('lines__product').order_by('-transfer_date')
    serializer_class = TransferOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        job_id = self.request.query_params.get('job')
        date_str = self.request.query_params.get('date')
        if status_filter:
            qs = qs.filter(status=status_filter)
        if job_id:
            qs = qs.filter(material_request__repair_job_id=job_id)
        if date_str:
            # Simple date filter (YYYY-MM-DD) on transfer_date
            qs = qs.filter(transfer_date__date=date_str)
        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsWorkshopStaff])
    def pay(self, request, pk=None):
        """
        Workshop cashier manually pays materials for this transfer.
        - Only allowed when the related job invoice is fully paid.
        - Creates a TransferSettlement and updates settled_amount/status via model logic.
        - No automatic revenue transfer from job payments.
        """
        from decimal import Decimal

        transfer = self.get_object()
        mr = transfer.material_request
        job = getattr(mr, 'repair_job', None) if mr else None
        if not job or not hasattr(job, 'invoice') or not job.invoice:
            return Response({'error': 'This transfer is not linked to a repair job invoice.'}, status=status.HTTP_400_BAD_REQUEST)

        invoice = job.invoice
        if invoice.payment_status != 'paid':
            return Response({'error': 'Cannot pay materials before job is fully paid.'}, status=status.HTTP_400_BAD_REQUEST)

        raw_amount = request.data.get('amount')
        try:
            amount = Decimal(str(raw_amount))
        except Exception:
            return Response({'error': 'Invalid amount.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount <= 0:
            return Response({'error': 'Amount must be positive.'}, status=status.HTTP_400_BAD_REQUEST)

        total = transfer.total_amount or Decimal('0')
        settled = transfer.settled_amount or Decimal('0')
        outstanding = total - settled
        if outstanding <= 0:
            return Response({'error': 'Materials already fully paid.'}, status=status.HTTP_400_BAD_REQUEST)
        if amount > outstanding:
            return Response({'error': 'Payment exceeds outstanding material balance.'}, status=status.HTTP_400_BAD_REQUEST)

        settlement = TransferSettlement.objects.create(
            transfer_order=transfer,
            amount=amount,
            settled_by=request.user,
            notes=f"Manual material payment for Repair #{job.id}",
        )

        # TransferSettlement.save updates transfer.settled_amount and status
        transfer.refresh_from_db()
        new_outstanding = (transfer.total_amount or Decimal('0')) - (transfer.settled_amount or Decimal('0'))

        log_activity(request.user, 'paid_materials', 'transfer_order', transfer.id, {'settlement_id': settlement.id, 'amount': str(amount)})
        log_timeline(
            'materials_paid',
            'transfer_order',
            transfer.id,
            f"Materials payment TZS {amount} for Transfer #{transfer.id} (Repair #{job.id})",
            user=request.user,
            details={'transfer_order_id': transfer.id, 'repair_job_id': job.id, 'amount': str(amount)},
        )

        return Response(
            {
                'message': 'Material payment recorded.',
                'transfer_id': transfer.id,
                'settled_amount': str(transfer.settled_amount or 0),
                'outstanding': str(new_outstanding),
                'status': transfer.status,
            },
            status=status.HTTP_200_OK,
        )


# ---------- Transfer Settlements ----------
class TransferSettlementViewSet(viewsets.ModelViewSet):
    queryset = TransferSettlement.objects.all().select_related('transfer_order', 'settled_by').order_by('-settlement_date')
    serializer_class = TransferSettlementSerializer
    permission_classes = [permissions.IsAuthenticated, CanSettleTransfer]

    def perform_create(self, serializer):
        settlement = serializer.save()
        log_timeline('transfer_settled', 'transfer_settlement', settlement.id, f"Settlement TZS {settlement.amount} for Transfer #{settlement.transfer_order_id}", user=self.request.user, details={'settlement_id': settlement.id, 'transfer_order_id': settlement.transfer_order_id, 'amount': str(settlement.amount)})

    def get_queryset(self):
        qs = super().get_queryset()
        transfer_id = self.request.query_params.get('transfer_order')
        if transfer_id:
            qs = qs.filter(transfer_order_id=transfer_id)
        return qs

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsShopStaff])
    def clear(self, request, pk=None):
        """
        Shop cashier marks that this materials payment has been received in cash and reconciled.
        This does NOT change settled_amount (that is already set when settlement was created),
        but allows cashbook/reporting to distinguish between system-settled vs cash-cleared amounts.
        """
        settlement = self.get_object()
        user = request.user
        unit = getattr(user, 'unit', None)
        if unit and unit.code != 'shop' and user.role not in ('admin', 'owner', 'manager'):
            return Response({'error': 'Only shop users can clear material payments.'}, status=status.HTTP_403_FORBIDDEN)

        if settlement.cleared:
            return Response({'message': 'Already cleared.'}, status=status.HTTP_200_OK)

        settlement.cleared = True
        settlement.cleared_at = timezone.now()
        settlement.cleared_by = user
        settlement.save()

        log_activity(user, 'cleared_material_payment', 'transfer_settlement', settlement.id, {'transfer_order_id': settlement.transfer_order_id, 'amount': str(settlement.amount)})
        log_timeline('materials_payment_cleared', 'transfer_settlement', settlement.id, f"Materials payment TZS {settlement.amount} for Transfer #{settlement.transfer_order_id} cleared in cash by {user.username}", user=user, details={'settlement_id': settlement.id, 'transfer_order_id': settlement.transfer_order_id, 'amount': str(settlement.amount)})

        return Response({'message': 'Marked as cleared.'}, status=status.HTTP_200_OK)


# ---------- Activity Log ----------
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all().select_related('user').order_by('-timestamp')[:200]
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrManager]


# ---------- Dashboard (Onyango) ----------
class OnyangoDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from main.models import Expense
        from decimal import Decimal
        today = timezone.now().date()
        shop = Unit.objects.filter(code='shop').first()
        workshop = Unit.objects.filter(code='workshop').first()

        # Shop: today's sales (from main.Sale with unit=shop or no unit for backward compat)
        sales_qs = Sale.objects.exclude(status='refunded')
        if shop:
            sales_qs = sales_qs.filter(Q(unit=shop) | Q(unit__isnull=True))
        daily_sales = sales_qs.filter(date__date=today).aggregate(total=Sum('paid_amount'))['total'] or 0
        low_stock = Product.objects.filter(quantity_in_stock__lte=F('threshold')).count()

        # Workshop: pending and completed today
        if workshop:
            pending_repairs = RepairJob.objects.filter(unit=workshop).exclude(status__in=('completed', 'collected', 'cancelled')).count()
            completed_today = RepairJob.objects.filter(unit=workshop, completed_date__date=today).count()
            repair_revenue_today = RepairPayment.objects.filter(invoice__job__unit=workshop, payment_date__date=today).aggregate(total=Sum('amount'))['total'] or 0
            # Materials paid to shop today (cash out from workshop) and implied income
            materials_paid_today = TransferSettlement.objects.filter(
                settlement_date__date=today,
                transfer_order__to_unit=workshop,
            ).aggregate(total=Coalesce(Sum('amount'), Decimal('0')))['total'] or Decimal('0')
            workshop_income_today = (Decimal(str(repair_revenue_today or 0)) - materials_paid_today)
        else:
            pending_repairs = RepairJob.objects.exclude(status__in=('completed', 'collected', 'cancelled')).count()
            completed_today = RepairJob.objects.filter(completed_date__date=today).count()
            repair_revenue_today = RepairPayment.objects.filter(payment_date__date=today).aggregate(total=Sum('amount'))['total'] or 0
            materials_paid_today = Decimal('0')
            workshop_income_today = Decimal(str(repair_revenue_today or 0))

        # Pending transfers (unsettled)
        open_transfers = TransferOrder.objects.exclude(status='closed')
        pending_transfers = open_transfers.count()
        pending_transfer_outstanding = Decimal('0')
        for t in open_transfers:
            pending_transfer_outstanding += (t.total_amount or Decimal('0')) - (t.settled_amount or Decimal('0'))

        return Response({
            'daily_sales': float(daily_sales),
            'repair_revenue_today': float(repair_revenue_today),
            'workshop_materials_paid_today': float(materials_paid_today),
            'workshop_income_today': float(workshop_income_today),
            'low_stock_count': low_stock,
            'pending_repairs': pending_repairs,
            'completed_repairs_today': completed_today,
            'pending_transfers_count': pending_transfers,
            'pending_transfer_amount': float(pending_transfer_outstanding),
        })
