from email.utils import parsedate
from django.shortcuts import get_object_or_404
import django_filters
from rest_framework import viewsets, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
from django.db import transaction
from django.db.models import Sum, Count, F
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear, ExtractMonth, Coalesce
from datetime import timedelta
from django.utils.timezone import now
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal, InvalidOperation
from django_filters.rest_framework import DjangoFilterBackend
from .pagination import OrderPagination, ProductPagination
from .rounding import round_two
from django_filters.rest_framework import FilterSet



from .models import (
    Category, Order, Product, StockEntry, Sale, SaleItem,
    Expense, Customer, Payment, Refund, TimelineEvent, Unit, DailyCashClose,
    Quote,
)
from .serializers import (
    CategorySerializer, ConfirmOrderSerializer, LoanSerializer, OrderSerializer, ProductSerializer, ProductSerializer, RejectOrderSerializer, SaleItemSerializer, StockEntrySerializer,
    SaleSerializer, ExpenseSerializer, CustomerSerializer,
    PaymentSerializer, UserCreateUpdateSerializer, RefundSerializer,
    MeSerializer, LoginSerializer, OrderUpdateSerializer, TimelineEventSerializer,
    POSCompleteSaleSerializer, QuoteSerializer,
)
from .permissions import (
    All, IsAdminOnly, IsAdminOrReadOnly, IsCashierOnly,
    IsCashierOrAdmin, IsStaffOnly, IsStaffOrAdmin,
)
from .timeline import log_timeline

User = get_user_model()


@ensure_csrf_cookie
def get_csrf_token(request):
    return JsonResponse({"detail": "CSRF cookie set"})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        access = serializer.validated_data["access"]
        refresh = serializer.validated_data["refresh"]

        access_max_age = 6 * 60 * 60               # 5 minutes
        refresh_max_age = 365 * 24 * 60 * 60       # 7 days

        response = Response({
            "detail": "Login successful",
            "user": serializer.validated_data.get("user"),
        }, status=status.HTTP_200_OK)

        # Set cookies on path '/' so they're sent on all requests
        response.set_cookie(
            'access_token',
            access,
            httponly=True,
            secure=False,  # Set True in prod with HTTPS
            samesite='Lax',
            max_age=access_max_age,
            path='/'
        )
        response.set_cookie(
            'refresh_token',
            refresh,
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=refresh_max_age,
            path='/'
        )

        return response

class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        response = Response({"detail": "Logged out"}, status=status.HTTP_200_OK)

        # Clear cookies by setting empty value and max_age=0
        response.set_cookie(
            'access_token',
            '',
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=0,
            path='/'
        )
        response.set_cookie(
            'refresh_token',
            '',
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=0,
            path='/'
        )

        return response


class AdminUnitOverviewView(APIView):
    """Shop overview: expenses, loans, stock movements grouped by unit (admin + cashier)."""
    permission_classes = [IsCashierOrAdmin]

    def get(self, request):
        from django.db.models import Q
        today = now().date()
        start_of_month = today.replace(day=1)
        units = Unit.objects.all().order_by('id')

        result = []
        for unit in units:
            expenses_qs = Expense.objects.filter(unit=unit, date__gte=start_of_month)
            expenses_total = expenses_qs.aggregate(t=Sum('amount'))['t'] or 0
            expenses_count = expenses_qs.count()
            expenses_recent = ExpenseSerializer(
                expenses_qs.select_related('unit', 'recorded_by').order_by('-date')[:10], many=True
            ).data

            loans_qs = Sale.objects.filter(is_loan=True).exclude(status='refunded')
            if unit.code == 'shop':
                loans_qs = loans_qs.filter(Q(unit=unit) | Q(unit__isnull=True))
            else:
                loans_qs = loans_qs.filter(unit=unit)
            loans_count = loans_qs.filter(
                Q(payment_status='not_paid') | Q(payment_status='partial')
            ).count()
            loans_outstanding = sum(
                (s.final_amount - s.paid_amount)
                for s in loans_qs.filter(
                    Q(payment_status='not_paid') | Q(payment_status='partial')
                )
            )
            loans_recent = LoanSerializer(
                loans_qs.select_related('unit', 'customer', 'user')[:10], many=True
            ).data

            if unit.code == 'shop':
                stock_qs = StockEntry.objects.filter(
                    Q(product__unit=unit) | Q(product__unit__isnull=True)
                ).select_related('product', 'product__unit', 'recorded_by').order_by('-date')[:50]
                stock_count = StockEntry.objects.filter(
                    Q(product__unit=unit) | Q(product__unit__isnull=True)
                ).count()
            else:
                stock_qs = StockEntry.objects.filter(product__unit=unit).select_related(
                    'product', 'product__unit', 'recorded_by'
                ).order_by('-date')[:50]
                stock_count = StockEntry.objects.filter(product__unit=unit).count()
            stock_recent = StockEntrySerializer(stock_qs[:15], many=True).data

            result.append({
                'unit': {'id': unit.id, 'code': unit.code, 'name': unit.name},
                'expenses': {
                    'count': expenses_count,
                    'total': float(expenses_total),
                    'recent': expenses_recent,
                },
                'loans': {
                    'count': loans_count,
                    'outstanding': float(loans_outstanding),
                    'recent': loans_recent,
                },
                'stock_movements': {
                    'count': stock_count,
                    'recent': stock_recent,
                },
            })

        # Add workshop repair debts (RepairInvoice unpaid/partial)
        workshop = Unit.objects.filter(code='workshop').first()
        if workshop:
            try:
                from onyango.models import RepairInvoice
                repair_invoices = RepairInvoice.objects.filter(
                    job__unit=workshop
                ).filter(
                    Q(payment_status='unpaid') | Q(payment_status='partial')
                )
                repair_debt_count = repair_invoices.count()
                repair_debt_outstanding = sum(
                    float(i.total_amount - i.paid_amount)
                    for i in repair_invoices
                )
                unit_data = next((r for r in result if r['unit']['code'] == 'workshop'), None)
                if unit_data:
                    unit_data['repair_debts'] = {
                        'count': repair_debt_count,
                        'outstanding': repair_debt_outstanding,
                    }
            except Exception:
                pass

        # All units combined (for admin overview)
        all_expenses = Expense.objects.filter(date__gte=start_of_month)
        all_loans = Sale.objects.filter(is_loan=True).exclude(status='refunded').filter(
            Q(payment_status='not_paid') | Q(payment_status='partial')
        )
        return Response({
            'units': result,
            'totals': {
                'expenses_count': all_expenses.count(),
                'expenses_total': float(all_expenses.aggregate(t=Sum('amount'))['t'] or 0),
                'loans_count': all_loans.count(),
                'loans_outstanding': sum(float(s.final_amount - s.paid_amount) for s in all_loans),
            },
        })


class POSCompleteSaleView(APIView):
    """Direct POS sale: one step, no Order/cashier handoff."""
    permission_classes = [permissions.IsAuthenticated, All]

    def post(self, request):
        serializer = POSCompleteSaleSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        log_timeline('sale_created', 'sale', sale.id, f"Sale #{sale.id} - TZS {sale.final_amount} ({sale.get_payment_status_display()})", user=request.user, details={'amount': str(sale.final_amount), 'payment_status': sale.payment_status, 'is_loan': sale.is_loan})
        if sale.paid_amount and float(sale.paid_amount) > 0:
            evt = 'loan_payment' if sale.is_loan else 'payment_recorded'
            log_timeline(evt, 'payment', None, f"Payment TZS {sale.paid_amount} for Sale #{sale.id}", user=request.user, details={'sale_id': sale.id, 'amount': str(sale.paid_amount)})
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)


class ShopCashbookAPIView(APIView):
    """
    Daily cashbook for the Shop unit:
    - Payments (sales & loan repayments)
    - Expenses
    - Net cash for the day
    """
    permission_classes = [permissions.IsAuthenticated, All]

    def get(self, request):
        from django.db.models.functions import TruncDate
        from onyango.models import TransferSettlement, TransferOrder

        date_str = request.query_params.get('date')
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        shop = Unit.objects.filter(code='shop').first()
        if not shop:
            return Response({"error": "Shop unit not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Payments for sales belonging to the shop (or no unit treated as shop)
        payments_qs = Payment.objects.filter(
            payment_date__date=target_date,
            sale__status__in=['confirmed'],
        ).filter(
            Q(sale__unit=shop) | Q(sale__unit__isnull=True)
        ).select_related('sale', 'cashier')

        payments_total = payments_qs.aggregate(
            total=Coalesce(
                Sum('amount_paid'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        payments = [
            {
                "id": p.id,
                "sale_id": p.sale_id,
                "amount": float(p.amount_paid),
                "payment_method": p.payment_method,
                "cashier": p.cashier.username if p.cashier else None,
                "payment_date": p.payment_date.isoformat(),
                "type": "sale_payment",
            }
            for p in payments_qs.order_by('payment_date')
        ]

        # Material payments from workshop to shop (manual TransferSettlements on TransferOrders from shop)
        settlements_qs = TransferSettlement.objects.filter(
            settlement_date__date=target_date,
            transfer_order__from_unit=shop,
        ).select_related('transfer_order', 'settled_by')

        settlements_total = settlements_qs.aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        # Only cleared settlements should count towards expected cash in till
        settlements_cleared_qs = settlements_qs.filter(cleared=True)
        settlements_cleared_total = settlements_cleared_qs.aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        material_payments = [
            {
                "id": s.id,
                "transfer_id": s.transfer_order_id,
                "amount": float(s.amount),
                "payment_method": "workshop_materials",
                "cashier": s.settled_by.username if s.settled_by else None,
                "payment_date": s.settlement_date.isoformat(),
                "type": "material_payment",
                "cleared": bool(s.cleared),
            }
            for s in settlements_qs.order_by('settlement_date')
        ]

        # Combined incoming cash to shop: sales + workshop materials
        # For expected cash, include only shop sales + CLEARED materials
        total_incoming = (payments_total or Decimal('0')) + (settlements_cleared_total or Decimal('0'))

        # Expenses for the shop unit on that date
        expenses_qs = Expense.objects.filter(
            date=target_date,
            unit=shop,
        ).select_related('recorded_by')

        expenses_total = expenses_qs.aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')
        expenses = [
            {
                "id": e.id,
                "description": e.description,
                "amount": float(e.amount),
                "category": e.category,
                "recorded_by": e.recorded_by.username if e.recorded_by else None,
            }
            for e in expenses_qs.order_by('-id')
        ]

        expected_cash = float(total_incoming - expenses_total)

        close = DailyCashClose.objects.filter(unit=shop, date=target_date).first()

        return Response(
            {
                "unit": {"id": shop.id, "code": shop.code, "name": shop.name},
                "date": target_date.isoformat(),
                "payments_total": float(total_incoming),
                "expenses_total": float(expenses_total),
                "net_cash": expected_cash,
                "payments": payments + material_payments,
                "expenses": expenses,
                "close": {
                    "date": close.date.isoformat(),
                    "expected_cash": float(close.expected_cash),
                    "actual_cash": float(close.actual_cash),
                    "variance": float(close.variance),
                    "closed_by": close.closed_by.username if close.closed_by else None,
                    "created_at": close.created_at.isoformat(),
                }
                if close
                else None,
            }
        )


class DailyCashCloseView(APIView):
    """Record or update daily cash close for Shop unit."""
    permission_classes = [permissions.IsAuthenticated, All]

    def post(self, request):
        shop = Unit.objects.filter(code='shop').first()
        if not shop:
            return Response({"error": "Shop unit not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        date_str = request.data.get('date')
        actual_cash = request.data.get('actual_cash')

        if not date_str:
            return Response({"error": "date is required (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            actual_cash_val = Decimal(str(actual_cash))
        except (InvalidOperation, TypeError):
            return Response({"error": "Invalid actual_cash value."}, status=status.HTTP_400_BAD_REQUEST)

        # Reuse cashbook computation for expected_cash
        payments_total = Payment.objects.filter(
            payment_date__date=target_date,
            sale__status__in=['confirmed'],
        ).filter(
            Q(sale__unit=shop) | Q(sale__unit__isnull=True)
        ).aggregate(
            total=Coalesce(
                Sum('amount_paid'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        expenses_total = Expense.objects.filter(
            date=target_date,
            unit=shop,
        ).aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        expected_cash = payments_total - expenses_total
        variance = actual_cash_val - expected_cash

        close, created = DailyCashClose.objects.update_or_create(
            unit=shop,
            date=target_date,
            defaults={
                "expected_cash": expected_cash,
                "actual_cash": actual_cash_val,
                "variance": variance,
                "closed_by": request.user,
            },
        )

        return Response(
            {
                "date": close.date.isoformat(),
                "expected_cash": float(close.expected_cash),
                "actual_cash": float(close.actual_cash),
                "variance": float(close.variance),
                "closed_by": close.closed_by.username if close.closed_by else None,
                "created_at": close.created_at.isoformat(),
                "created": created,
            },
            status=status.HTTP_200_OK,
        )


class QuoteViewSet(viewsets.ModelViewSet):
    """
    Pro-forma invoices / quotes for cashiers and admins.
    """
    queryset = Quote.objects.all().select_related('unit', 'customer', 'created_by').prefetch_related('items__product').order_by('-created_at')
    serializer_class = QuoteSerializer
    permission_classes = [permissions.IsAuthenticated, IsCashierOrAdmin]

    def get_queryset(self):
        qs = super().get_queryset()
        unit_filter = self.request.query_params.get('unit')
        status_filter = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if unit_filter in ('shop', 'workshop'):
            qs = qs.filter(unit__code=unit_filter)
        elif unit_filter:
            qs = qs.filter(unit_id=unit_filter)
        if status_filter:
            qs = qs.filter(status=status_filter)
        if date_from:
            try:
                qs = qs.filter(created_at__date__gte=datetime.strptime(date_from.strip(), "%Y-%m-%d").date())
            except ValueError:
                pass
        if date_to:
            try:
                qs = qs.filter(created_at__date__lte=datetime.strptime(date_to.strip(), "%Y-%m-%d").date())
            except ValueError:
                pass
        return qs


class WorkshopCashbookAPIView(APIView):
    """
    Daily cashbook for the Workshop unit:
    - Incoming: repair payments (RepairPayment for workshop jobs)
    - Outgoing: material payments to shop (TransferSettlement where to_unit=workshop), workshop expenses
    - Net = repair payments - material payments - expenses
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from django.db.models import Value
        from django.db.models.functions import Coalesce
        from django.db.models import DecimalField
        from onyango.models import RepairPayment, TransferSettlement

        date_str = request.query_params.get('date')
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date() if date_str else now().date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        workshop = Unit.objects.filter(code='workshop').first()
        if not workshop:
            return Response({"error": "Workshop unit not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Incoming: repair payments for workshop jobs on this date
        repair_payments_qs = RepairPayment.objects.filter(
            payment_date__date=target_date,
            invoice__job__unit=workshop,
        ).select_related('invoice', 'invoice__job', 'received_by')

        payments_in_total = repair_payments_qs.aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        payments_in = [
            {
                "id": p.id,
                "job_id": p.invoice.job_id,
                "amount": float(p.amount),
                "payment_method": p.payment_method,
                "cashier": p.received_by.username if p.received_by else None,
                "payment_date": p.payment_date.isoformat(),
                "type": "repair_payment",
            }
            for p in repair_payments_qs.order_by('payment_date')
        ]

        # Outgoing: material payments (workshop paid to shop) on this date
        materials_qs = TransferSettlement.objects.filter(
            settlement_date__date=target_date,
            transfer_order__to_unit=workshop,
        ).select_related('transfer_order', 'settled_by')

        materials_total = materials_qs.aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        payments_out_materials = [
            {
                "id": s.id,
                "transfer_id": s.transfer_order_id,
                "amount": float(s.amount),
                "cashier": s.settled_by.username if s.settled_by else None,
                "payment_date": s.settlement_date.isoformat(),
                "type": "material_payment",
            }
            for s in materials_qs.order_by('settlement_date')
        ]

        # Outgoing: workshop expenses on this date
        expenses_qs = Expense.objects.filter(
            date=target_date,
            unit=workshop,
        ).select_related('recorded_by')

        expenses_total = expenses_qs.aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        expenses = [
            {
                "id": e.id,
                "description": e.description,
                "amount": float(e.amount),
                "category": e.category,
                "recorded_by": e.recorded_by.username if e.recorded_by else None,
            }
            for e in expenses_qs.order_by('-id')
        ]

        net_cash = payments_in_total - materials_total - expenses_total
        close = DailyCashClose.objects.filter(unit=workshop, date=target_date).first()

        return Response({
            "unit": {"id": workshop.id, "code": workshop.code, "name": workshop.name},
            "date": target_date.isoformat(),
            "payments_in_total": float(payments_in_total),
            "payments_out_materials_total": float(materials_total),
            "expenses_total": float(expenses_total),
            "net_cash": float(net_cash),
            "payments_in": payments_in,
            "payments_out_materials": payments_out_materials,
            "expenses": expenses,
            "close": {
                "date": close.date.isoformat(),
                "expected_cash": float(close.expected_cash),
                "actual_cash": float(close.actual_cash),
                "variance": float(close.variance),
                "closed_by": close.closed_by.username if close.closed_by else None,
                "created_at": close.created_at.isoformat(),
            }
            if close
            else None,
        })


class WorkshopCashCloseView(APIView):
    """Record or update daily cash close for Workshop unit."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from django.db.models import Value
        from django.db.models.functions import Coalesce
        from django.db.models import DecimalField
        from onyango.models import RepairPayment, TransferSettlement

        workshop = Unit.objects.filter(code='workshop').first()
        if not workshop:
            return Response({"error": "Workshop unit not configured."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        date_str = request.data.get('date')
        actual_cash = request.data.get('actual_cash')

        if not date_str:
            return Response({"error": "date is required (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            actual_cash_val = Decimal(str(actual_cash))
        except (InvalidOperation, TypeError):
            return Response({"error": "Invalid actual_cash value."}, status=status.HTTP_400_BAD_REQUEST)

        payments_in_total = RepairPayment.objects.filter(
            payment_date__date=target_date,
            invoice__job__unit=workshop,
        ).aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        materials_total = TransferSettlement.objects.filter(
            settlement_date__date=target_date,
            transfer_order__to_unit=workshop,
        ).aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        expenses_total = Expense.objects.filter(
            date=target_date,
            unit=workshop,
        ).aggregate(
            total=Coalesce(
                Sum('amount'),
                Value(0),
                output_field=DecimalField(max_digits=20, decimal_places=2),
            )
        )['total'] or Decimal('0')

        expected_cash = payments_in_total - materials_total - expenses_total
        variance = actual_cash_val - expected_cash

        close, created = DailyCashClose.objects.update_or_create(
            unit=workshop,
            date=target_date,
            defaults={
                "expected_cash": expected_cash,
                "actual_cash": actual_cash_val,
                "variance": variance,
                "closed_by": request.user,
            },
        )

        return Response(
            {
                "date": close.date.isoformat(),
                "expected_cash": float(close.expected_cash),
                "actual_cash": float(close.actual_cash),
                "variance": float(close.variance),
                "closed_by": close.closed_by.username if close.closed_by else None,
                "created_at": close.created_at.isoformat(),
                "created": created,
            },
            status=status.HTTP_200_OK,
        )


class AdminCashbookReportView(APIView):
    """
    Admin report: list daily cash closes from Shop and/or Workshop with optional date range and unit filter.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]

    def get(self, request):
        from datetime import datetime as dt
        date_from_str = request.query_params.get('date_from')
        date_to_str = request.query_params.get('date_to')
        unit_param = request.query_params.get('unit')  # 'shop', 'workshop', or unit id

        qs = DailyCashClose.objects.select_related('unit', 'closed_by').order_by('-date', '-created_at')

        if date_from_str:
            try:
                date_from = dt.strptime(date_from_str.strip(), '%Y-%m-%d').date()
                qs = qs.filter(date__gte=date_from)
            except ValueError:
                return Response({"error": "Invalid date_from. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)
        if date_to_str:
            try:
                date_to = dt.strptime(date_to_str.strip(), '%Y-%m-%d').date()
                qs = qs.filter(date__lte=date_to)
            except ValueError:
                return Response({"error": "Invalid date_to. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        if unit_param:
            if unit_param.lower() in ('shop', 'workshop'):
                qs = qs.filter(unit__code=unit_param.lower())
            else:
                try:
                    qs = qs.filter(unit_id=int(unit_param))
                except ValueError:
                    return Response({"error": "Invalid unit. Use 'shop', 'workshop', or a unit id."}, status=status.HTTP_400_BAD_REQUEST)

        results = []
        for close in qs:
            results.append({
                "id": close.id,
                "date": close.date.isoformat(),
                "unit": {
                    "id": close.unit_id,
                    "code": close.unit.code,
                    "name": close.unit.name,
                },
                "expected_cash": float(close.expected_cash),
                "actual_cash": float(close.actual_cash),
                "variance": float(close.variance),
                "closed_by": close.closed_by.username if close.closed_by else None,
                "created_at": close.created_at.isoformat(),
            })
        return Response({"results": results})


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Load user with unit so MeSerializer returns unit_id, unit_code, unit_name
        user = User.objects.select_related('unit').get(pk=request.user.pk)
        serializer = MeSerializer(user)
        return Response(serializer.data)



class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().select_related('unit').order_by('unit__code', 'username')
    serializer_class = UserCreateUpdateSerializer
    permission_classes = [IsAdminOnly]

    def get_queryset(self):
        qs = super().get_queryset()
        unit_filter = self.request.query_params.get('unit')
        if unit_filter in ('shop', 'workshop'):
            qs = qs.filter(unit__code=unit_filter)
        elif unit_filter == 'none':
            qs = qs.filter(unit__isnull=True)
        return qs

    @action(detail=False, methods=['get'])
    def staff(self, request):
        staff_users = User.objects.filter(order__isnull=False).distinct()
        serializer = self.get_serializer(staff_users, many=True)
        return Response(serializer.data)



class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]


class ProductFilter(FilterSet):
    out_of_stock = django_filters.BooleanFilter(method='filter_out_of_stock')

    class Meta:
        model = Product
        fields = ['category', 'out_of_stock']

    def filter_out_of_stock(self, queryset, name, value):
        if value:  # Only products with 0 or less in stock
            return queryset.filter(quantity_in_stock__lte=0)
        elif value is False:  # Only products with stock > 0
            return queryset.filter(quantity_in_stock__gt=0)
        return queryset  # None → return all

# Then in your ViewSet
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [django_filters.rest_framework.DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category']
    search_fields = ['name']
    ordering_fields = ['quantity_in_stock', 'created_at']

    def perform_create(self, serializer):
        product = serializer.save()
        StockEntry.objects.create(
            product=product,
            entry_type='added',
            quantity=product.quantity_in_stock,
            recorded_by=self.request.user
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminOrReadOnly])
    @transaction.atomic
    def update_stock(self, request, pk=None):
        from decimal import Decimal, InvalidOperation
        product = self.get_object()
        try:
            raw = request.data.get('quantity')
            new_quantity = Decimal(str(raw)) if raw is not None else Decimal('0')
            if new_quantity < 0:
                return Response({"detail": "Quantity cannot be negative."}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError, InvalidOperation):
            return Response({"detail": "Quantity must be a valid number."}, status=status.HTTP_400_BAD_REQUEST)

        product.quantity_in_stock += new_quantity
        product.save()

        StockEntry.objects.create(
            product=product,
            entry_type='quantity_updated',
            quantity=new_quantity,
            recorded_by=request.user
        )
        return Response({"detail": "Stock quantity updated.", "new_quantity": str(product.quantity_in_stock)})

    def perform_update(self, serializer):
        old_instance = self.get_object()
        old_quantity = old_instance.quantity_in_stock
        product = serializer.save()

        if old_quantity != product.quantity_in_stock:
            StockEntry.objects.create(
                product=product,
                entry_type='updated',
                quantity=product.quantity_in_stock,
                recorded_by=self.request.user
            )

    def perform_destroy(self, instance):
        StockEntry.objects.create(
            product=instance,
            entry_type='deleted',
            quantity=instance.quantity_in_stock,
            recorded_by=self.request.user
        )
        instance.delete()


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsStaffOrAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'email']
    ordering_fields = ['created_at', 'name']

    @action(detail=True, methods=['get'])
    def purchases(self, request, pk=None):
        customer = self.get_object()
        sale_items = SaleItem.objects.filter(sale__customer=customer)
        serializer = SaleItemSerializer(sale_items, many=True)
        return Response(serializer.data)

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related('sale', 'cashier')
    serializer_class = PaymentSerializer
    permission_classes = [IsStaffOrAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['sale']
    search_fields = ['sale__id', 'cashier__username']
    ordering_fields = ['payment_date', 'amount_paid']

    def perform_create(self, serializer):
        payment = serializer.save(cashier=self.request.user)
        evt = 'loan_payment' if getattr(payment.sale, 'is_loan', False) else 'payment_recorded'
        log_timeline(evt, 'payment', payment.id, f"Payment TZS {payment.amount_paid} for Sale #{payment.sale_id} ({payment.payment_method or 'N/A'})", user=self.request.user, details={'payment_id': payment.id, 'sale_id': payment.sale_id, 'amount': str(payment.amount_paid)})

    def perform_update(self, serializer):
        serializer.save()


class RefundViewSet(viewsets.ModelViewSet):
    queryset = Refund.objects.all()
    # serializer_class = RefundSerializer
    permission_classes = [IsStaffOrAdmin]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['sale__id', 'refunded_by__username']
    ordering_fields = ['refund_date', 'refund_amount']

    @transaction.atomic
    def perform_create(self, serializer):
        sale = serializer.validated_data['sale']
        if sale.refunds.exists():
            raise ValidationError("This sale has already been refunded.")
        serializer.save(refunded_by=self.request.user)

    def perform_update(self, serializer):
        # Refunds should be immutable — disable updates
        raise ValidationError("Refunds cannot be updated. Cancel and create a new one if needed.")

    @transaction.atomic
    def perform_destroy(self, instance):
        # Reverse the refund effect
        product = instance.product
        product.quantity_in_stock -= instance.quantity
        product.save(update_fields=['quantity_in_stock'])

        sale = instance.sale
        sale.refund_total = (sale.refund_total or 0) - instance.refund_amount
        sale.save(update_fields=['refund_total'])

        instance.delete()




class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['customer__name', 'notes']
    ordering_fields = ['created_at', 'status']
    pagination_class = OrderPagination

    def get_queryset(self):
        user = self.request.user
        status = self.request.query_params.get("status", None)
        date = self.request.query_params.get("date", None)  # <-- new date param

        base_qs = Order.objects.all()

        if status:
            base_qs = base_qs.filter(status=status)

        if date:
            # Filter orders by date only (ignoring time)
            base_qs = base_qs.filter(created_at__date=date)

        if user.role in ['admin']:
            return base_qs.order_by("-created_at")

        return base_qs.filter(user=user).order_by("-created_at", "-id")

    def update(self, request, *args, **kwargs):
        user = request.user
        if user.role != 'admin':
            return Response({"error": "Only admin can update orders via this endpoint."}, status=403)
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        user = request.user
        if user.role != 'admin':
            return Response({"error": "Only admin can delete orders via this endpoint."}, status=403)
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        order = serializer.save()
        log_timeline('order_created', 'order', order.id, f"Order #{order.id} created ({order.get_order_type_display()})", user=self.request.user, details={'order_id': order.id, 'status': order.status})

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    @transaction.atomic
    def confirm(self, request, pk=None):
        serializer = ConfirmOrderSerializer(
            data=request.data,
            context={'request': request, 'view': self}
        )
        serializer.is_valid(raise_exception=True)
        sale = serializer.save()
        log_timeline('order_confirmed', 'order', self.get_object().id, f"Order #{self.get_object().id} confirmed → Sale #{sale.id}", user=request.user, details={'order_id': self.get_object().id, 'sale_id': sale.id})
        log_timeline('sale_created', 'sale', sale.id, f"Sale #{sale.id} - TZS {sale.final_amount} ({sale.get_payment_status_display()})", user=request.user, details={'amount': str(sale.final_amount), 'payment_status': sale.payment_status, 'is_loan': sale.is_loan})
        if sale.paid_amount and float(sale.paid_amount) > 0:
            evt = 'loan_payment' if getattr(sale, 'is_loan', False) else 'payment_recorded'
            log_timeline(evt, 'payment', None, f"Payment TZS {sale.paid_amount} for Sale #{sale.id}", user=request.user, details={'sale_id': sale.id, 'amount': str(sale.paid_amount)})
        return Response(SaleSerializer(sale).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'], permission_classes=[IsStaffOrAdmin])
    def update_rejected(self, request, pk=None):
        order = self.get_object()

        serializer = OrderUpdateSerializer(order, data=request.data, partial=True)

        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
        except ValidationError as e:
            return Response({'errors': e.detail}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({'errors': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[IsStaffOrAdmin])
    def reject(self, request, pk=None):
        user = request.user
        order = self.get_object()

        if order.status != "pending":
            return Response({"error": "Only pending orders can be rejected."}, status=400)

        # if user.is_staff:
        #     return Response({"error": "Staff cannot reject orders."}, status=403)

        serializer = RejectOrderSerializer(
            data=request.data,
            context={'request': request, 'view': self}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_timeline('order_rejected', 'order', order.id, f"Order #{order.id} rejected", user=request.user, details={'order_id': order.id})
        return Response({'message': 'Order rejected successfully'}, status=200)

    @action(detail=True, methods=["post"], permission_classes=[IsStaffOrAdmin])
    def resend(self, request, pk=None):
        user = request.user
        order = self.get_object()

        if order.status != "rejected":
            return Response({"error": "Only rejected orders can be resent."}, status=400)


        order.status = "updated"
        order.save()

        return Response({"message": "Order moved back to cashier."})

    @action(detail=True, methods=["delete"], permission_classes=[IsStaffOrAdmin])
    def delete_rejected(self, request, pk=None):
        user = request.user
        order = self.get_object()

        if order.status != "rejected":
            return Response({"error": "Only rejected orders can be deleted."}, status=400)

        if not user.is_staff:
            return Response({"error": "Only staff can delete rejected orders."}, status=403)

        order.delete()
        return Response({"message": "Rejected order permanently deleted."}, status=204)
    

class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer
    permission_classes = [All]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['fulfillment_status', 'status', 'payment_status']
    search_fields = ['customer__name', 'payment_method']
    ordering_fields = ['date', 'total_amount', 'status']

    def get_queryset(self):
        user = self.request.user
        qs = Sale.objects.all().select_related('customer', 'user', 'checked_by').prefetch_related('items__product')

        # 🔐 Role restriction: cashier sees only their sales
        if user.role == 'cashier':
            qs = qs.filter(user=user)

        # 🗓 Date filtering: date, or start_date+end_date, else today
        date_param = self.request.query_params.get('date')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            qs = qs.filter(date__date__range=[start_date, end_date])
        elif date_param:
            qs = qs.filter(date__date=date_param)
        else:
            qs = qs.filter(date__date=now().date())  # default: today

        return qs

    @action(detail=True, methods=['post'], url_path='mark-checked')
    def mark_checked(self, request, pk=None):
        """Store keeper marks that all order items have been given correctly."""
        if request.user.role not in ('storekeeper', 'manager', 'admin', 'owner'):
            return Response(
                {"detail": "Only store keeper or manager can mark sales as checked."},
                status=status.HTTP_403_FORBIDDEN,
            )
        sale = self.get_object()
        if sale.status != 'confirmed':
            return Response(
                {"detail": "Only confirmed sales can be marked as checked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if sale.fulfillment_status == 'checked':
            return Response(
                {"detail": "This sale is already marked as checked."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sale.fulfillment_status = 'checked'
        sale.checked_by = request.user
        sale.checked_at = timezone.now()
        sale.save(update_fields=['fulfillment_status', 'checked_by', 'checked_at'])
        return Response(SaleSerializer(sale).data)

    @action(detail=True, methods=['post'], permission_classes=[IsStaffOrAdmin])
    @transaction.atomic
    def refund(self, request, pk=None):
        sale = self.get_object()

        # 🔒 Refund window (10 days)
        refund_window_days = 10
        refund_deadline = sale.date + timedelta(days=refund_window_days)
        if now() > refund_deadline:
            return Response(
                {"detail": "Refund window expired. Cannot refund this sale."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Already refunded or unpaid
        if sale.paid_amount <= 0:
            return Response(
                {"detail": "This sale was not paid. Cannot process refund."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if sale.status == 'refunded':
            return Response(
                {"detail": "This sale has already been refunded."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create Refund (model save() updates sale status, refund_total, creates Payment, returns stock)
        refund = Refund.objects.create(
            sale=sale,
            refunded_by=request.user,
            total_refund_amount=sale.paid_amount
        )

        log_timeline('refund_created', 'refund', refund.id, f"Refund #{refund.id} - TZS {refund.total_refund_amount} for Sale #{sale.id}", user=request.user, details={'refund_id': refund.id, 'sale_id': sale.id, 'amount': str(refund.total_refund_amount)})

        return Response(
            {"detail": f"Refund processed. Refunded amount: {refund.total_refund_amount} TZS"},
            status=status.HTTP_200_OK
        )


class SalesSummaryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = now().date()
        current_year = today.year
        current_month = today.month
        base_qs = _sales_queryset_for_unit(request)

        current_month_revenue = (
            base_qs
            .filter(date__year=current_year, date__month=current_month)
            .aggregate(total=Sum('paid_amount'))['total'] or 0
        )

        monthly_sales_count = (
            base_qs
            .filter(date__year=current_year, date__month=current_month)
            .count()
        )

        if current_month == 1:
            prev_year = current_year - 1
            prev_month = 12
        else:
            prev_year = current_year
            prev_month = current_month - 1

        prev_month_revenue = (
            base_qs
            .filter(date__year=prev_year, date__month=prev_month)
            .aggregate(total=Sum('paid_amount'))['total'] or 0
        )

        todays_revenue = (
            base_qs
            .filter(date__date=today)
            .aggregate(total=Sum('paid_amount'))['total'] or 0
        )

        if prev_month_revenue == 0:
            progress_percent = 100.0 if current_month_revenue > 0 else 0.0
        else:
            progress_percent = ((current_month_revenue - prev_month_revenue) / prev_month_revenue) * 100

        data = {
            "monthly_revenue": float(current_month_revenue),
            "monthly_sales_count": monthly_sales_count,
            "todays_revenue": float(todays_revenue),
            "prev_month_revenue": float(prev_month_revenue),
            "progress_percent": round(progress_percent, 2),
        }
        return Response(data)




from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.utils.timezone import now
from decimal import Decimal, InvalidOperation
from .models import Sale
from .serializers import LoanSerializer
from .permissions import IsStaffOrAdmin

class LoanViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LoanSerializer
    permission_classes = [All]

    def get_queryset(self):
        user = self.request.user
        qs = Sale.objects.filter(is_loan=True).exclude(status='refunded').select_related('unit', 'customer', 'user')

        # Non-admin: filter by user's unit or own sales
        if user.role == 'cashier':
            if user.unit_id:
                qs = qs.filter(unit=user.unit)
            else:
                qs = qs.filter(user=user)
        # Admin can filter by unit param
        unit_param = self.request.query_params.get('unit')
        if unit_param and user.role in ('admin', 'owner', 'manager'):
            qs = qs.filter(unit_id=unit_param)

        # Optional status filter
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(payment_status=status_param)

        # Optional date filter (single date or range)
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        single_date = self.request.query_params.get('date')

        if start_date and end_date:
            qs = qs.filter(date__date__range=[start_date, end_date])
        elif single_date:
            qs = qs.filter(date__date=single_date)
        else:
            qs = qs.filter(date__date=now().date())  # default: today

        return qs

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        user = request.user
        qs = Sale.objects.filter(is_loan=True).exclude(status='refunded')

        # Non-admin: filter by unit or own
        if user.role == 'cashier':
            if user.unit_id:
                qs = qs.filter(unit=user.unit)
            else:
                qs = qs.filter(user=user)
        unit_param = request.query_params.get('unit')
        if unit_param and user.role in ('admin', 'owner', 'manager'):
            qs = qs.filter(unit_id=unit_param)

        # Optional status filter
        status_param = request.query_params.get('status')
        if status_param:
            qs = qs.filter(payment_status=status_param)

        # Optional date filter
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        single_date = request.query_params.get('date')

        if start_date and end_date:
            qs = qs.filter(date__date__range=[start_date, end_date])
        elif single_date:
            qs = qs.filter(date__date=single_date)
        else:
            qs = qs.filter(date__date=now().date())

        # Counts
        unpaid_count = qs.filter(payment_status='not_paid').count()
        partial_count = qs.filter(payment_status='partial').count()
        paid_count = qs.filter(payment_status='paid').count()

        # Total outstanding = sum(final_amount - paid_amount) for loans not fully paid
        total_outstanding = sum((s.final_amount - s.paid_amount) for s in qs if s.payment_status != 'paid')

        return Response({
            "unpaid_count": unpaid_count,
            "partial_count": partial_count,
            "paid_count": paid_count,
            "total_outstanding": total_outstanding,
        })
    
    @action(detail=True, methods=['post'], url_path='pay')
    def pay_loan(self, request, pk=None):
        sale = self.get_object()
        raw_amount = request.data.get("amount")

        if raw_amount is None:
            return Response({"error": "Amount is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(raw_amount).strip())
        except (InvalidOperation, ValueError, TypeError):
            return Response({"error": "Invalid amount format"}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"error": "Amount must be greater than 0"}, status=status.HTTP_400_BAD_REQUEST)

        remaining = sale.final_amount - sale.paid_amount
        if amount > remaining:
            return Response({"error": "Payment exceeds remaining balance"}, status=status.HTTP_400_BAD_REQUEST)

        payment_method = request.data.get("payment_method") or "loan"
        with transaction.atomic():
            Payment.objects.create(
                sale=sale,
                amount_paid=amount,
                cashier=request.user,
                payment_method=payment_method,
            )
            # Payment.save() triggers sale.update_paid_amount() and sale.save() (which sets payment_status)
        log_timeline('loan_payment', 'payment', None, f"Loan payment TZS {amount} for Sale #{sale.id}", user=request.user, details={'sale_id': sale.id, 'amount': str(amount)})

        return Response({"message": "Payment recorded successfully"}, status=status.HTTP_200_OK)



#Update ExpenseViewSet` to filter expenses by date range
from django.utils.dateparse import parse_date
class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [All]

    def get_queryset(self):
        request = self.request
        user = request.user
        queryset = Expense.objects.all().select_related('unit', 'recorded_by')

        # Non-admin: filter by user's unit
        if user.role not in ('admin', 'owner', 'manager') and user.unit_id:
            queryset = queryset.filter(unit=user.unit)
        # Admin can filter by unit param
        unit_param = request.query_params.get('unit')
        if unit_param and user.role in ('admin', 'owner', 'manager'):
            queryset = queryset.filter(unit_id=unit_param)

        # Parse start_date and end_date from query params
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        today = now().date()
        start_date = parse_date(start_date_str) if start_date_str else today
        end_date = parse_date(end_date_str) if end_date_str else today
        start_datetime = make_aware(datetime.combine(start_date, datetime.min.time()))
        end_datetime = make_aware(datetime.combine(end_date, datetime.max.time()))

        return queryset.filter(date__range=(start_datetime, end_datetime)).order_by('-date')

    def perform_create(self, serializer):
        user = self.request.user
        # Each unit has its own expenses: cashiers can only create for their unit
        if user.role not in ('admin', 'owner', 'manager'):
            if not user.unit_id:
                raise ValidationError(
                    {'unit': 'You must be assigned to a unit (Shop or Workshop) to record expenses. Ask an admin to assign your unit.'}
                )
            serializer.validated_data['unit'] = user.unit
        else:
            unit = serializer.validated_data.get('unit')
            if not unit and user.unit_id:
                serializer.validated_data['unit'] = user.unit
        # Optional: use request date so expense appears on the date the user expects (e.g. today in their timezone)
        date_str = self.request.data.get('date')
        if date_str:
            try:
                from datetime import datetime as dt
                parsed = dt.strptime(date_str, '%Y-%m-%d').date()
                serializer.validated_data['date'] = parsed
            except (ValueError, TypeError):
                pass
        expense = serializer.save(recorded_by=user)
        log_timeline('expense_created', 'expense', expense.id, f"Expense: {expense.description} - TZS {expense.amount} ({expense.get_category_display()})", user=self.request.user, details={'expense_id': expense.id, 'amount': str(expense.amount), 'category': expense.category})


class StockEntryFilter(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="date", lookup_expr='gte')
    end_date = django_filters.DateFilter(field_name="date", lookup_expr='lte')
    product = django_filters.NumberFilter(field_name="product__id")
    unit = django_filters.NumberFilter(field_name="product__unit", lookup_expr='exact')

    class Meta:
        model = StockEntry
        fields = ['start_date', 'end_date', 'product', 'unit']


class StockEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = StockEntrySerializer
    permission_classes = [All]
    filter_backends = [
        DjangoFilterBackend,
        filters.OrderingFilter,
        filters.SearchFilter
    ]
    filterset_class = StockEntryFilter
    search_fields = ['product__name', 'recorded_by__username']
    ordering_fields = ['date', 'quantity']

    def get_queryset(self):
        user = self.request.user
        qs = StockEntry.objects.all().select_related('product', 'product__unit', 'recorded_by').order_by('-date')
        # Non-admin: filter by user's unit (product.unit)
        if user.role not in ('admin', 'owner', 'manager') and user.unit_id:
            qs = qs.filter(product__unit=user.unit)
        return qs


class TimelineEventViewSet(viewsets.ReadOnlyModelViewSet):
    """List all timeline events (sales, payments, loans, refunds, expenses, orders, transfers, repairs) with created_at."""
    serializer_class = TimelineEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = TimelineEvent.objects.all().select_related('user')
        entity_type = self.request.query_params.get('entity_type')
        event_type = self.request.query_params.get('event_type')
        date_after = self.request.query_params.get('date_after')
        date_before = self.request.query_params.get('date_before')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        if event_type:
            qs = qs.filter(event_type=event_type)
        if date_after:
            qs = qs.filter(created_at__date__gte=date_after)
        if date_before:
            qs = qs.filter(created_at__date__lte=date_before)
        return qs.order_by('-created_at')[:500]


# REPORTS AND DASHBOARD



from django.db.models import Q, Sum, Count, F, ExpressionWrapper, DecimalField, Value

from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear
from django.db.models import Sum, F, ExpressionWrapper, DecimalField, Q, Count, Value
from django.utils.timezone import now
from datetime import timedelta
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import permissions


class ReportSummaryAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        period = request.query_params.get('period', 'daily').lower()
        today = now().date()

        if period == 'daily':
            start_date = today
            trunc_func = TruncDay
        elif period == 'weekly':
            start_date = today - timedelta(days=today.weekday())
            trunc_func = TruncWeek
        elif period == 'monthly':
            start_date = today.replace(day=1)
            trunc_func = TruncMonth
        elif period == 'yearly':
            start_date = today.replace(month=1, day=1)
            trunc_func = TruncYear
        else:
            return Response({"error": "Invalid period. Choose from daily, weekly, monthly, yearly."}, status=status.HTTP_400_BAD_REQUEST)

        sales_qs = Sale.objects.filter(date__date__gte=start_date).exclude(status='refunded')
        expenses_qs = Expense.objects.filter(date__gte=start_date)

        total_sales = sales_qs.aggregate(total=Sum('paid_amount'))['total'] or 0
        total_expenses = expenses_qs.aggregate(total=Sum('amount'))['total'] or 0
        orders_count = sales_qs.aggregate(count=Count('id'))['count'] or 0

        stock_value = Product.objects.aggregate(total=Sum(F('quantity_in_stock') * F('selling_price')))['total'] or 0

        profit = total_sales - total_expenses
        loss = -profit if profit < 0 else 0

        data = {
            "period": period,
            "sales": total_sales,
            "expenses": total_expenses,
            "stock": stock_value,
            "orders": orders_count,
            "profit": profit if profit > 0 else 0,
            "loss": loss,
        }
        return Response(data)




class RefundViewSet(viewsets.ModelViewSet):
    queryset = Refund.objects.all()
    serializer_class = RefundSerializer
    permission_classes = [IsStaffOrAdmin]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['sale__id', 'refunded_by__username']
    ordering_fields = ['refund_date', 'refund_amount']

    @transaction.atomic
    def perform_create(self, serializer):
        # Refund model handles stock and sale refund_total automatically
        refund = serializer.save(refunded_by=self.request.user)
        log_timeline('refund_created', 'refund', refund.id, f"Refund #{refund.id} - TZS {refund.total_refund_amount} for Sale #{refund.sale_id}", user=self.request.user, details={'refund_id': refund.id, 'sale_id': refund.sale_id, 'amount': str(refund.total_refund_amount)})

    @transaction.atomic
    def perform_destroy(self, instance):
        # Rollback stock
        instance.product.remove_stock(instance.quantity, instance.refunded_by)

        # Adjust sale refund_total
        sale = instance.sale
        sale.refund_total = (sale.refund_total or 0) - instance.refund_amount
        if sale.refund_total <= 0:
            sale.status = 'confirmed'
            sale.payment_status = 'paid' if sale.paid_amount >= sale.final_amount else 'partial'
        sale.save()

        instance.delete()



def _sales_queryset_for_unit(request):
    """Sale queryset (non-refunded), optionally filtered by unit (query param unit_id)."""
    from django.db.models import Q
    qs = Sale.objects.exclude(status='refunded')
    unit_id = request.query_params.get('unit')
    if unit_id:
        unit = Unit.objects.filter(id=unit_id).first()
        if unit:
            if unit.code == 'shop':
                qs = qs.filter(Q(unit=unit) | Q(unit__isnull=True))
            else:
                qs = qs.filter(unit=unit)
    return qs


class DashboardMetricsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        valid_sales = _sales_queryset_for_unit(request)
        total_sales = valid_sales.count()
        total_revenue = valid_sales.aggregate(total=Sum('paid_amount'))['total'] or 0
        return Response({
            'total_sales': total_sales,
            'total_revenue': float(total_revenue),
        })



class MonthlySalesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_year = now().year
        base_qs = _sales_queryset_for_unit(request)
        monthly_sales = (
            base_qs
            .filter(date__year=current_year)
            .annotate(month=ExtractMonth('date'))
            .values('month')
            .annotate(total_amount=Sum('paid_amount'))
            .order_by('month')
        )
        sales_data = [0] * 12
        for entry in monthly_sales:
            sales_data[entry['month'] - 1] = float(entry['total_amount'] or 0)
        return Response({"sales": sales_data})



from django.db.models import Sum, F, Q
from django.db.models.functions import TruncDate
from django.utils.timezone import now
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from datetime import datetime
from django.utils import timezone
from decimal import Decimal
from .models import Sale, SaleItem, Expense, Refund

class SalesReportAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # --- Date parameters ---
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        today = timezone.localdate()

        # --- Date handling ---
        if start_date and end_date:
            try:
                start = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
                end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
            except ValueError:
                return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)
        elif start_date and not end_date:
            start = end = datetime.strptime(start_date.strip(), "%Y-%m-%d").date()
        elif end_date and not start_date:
            start = end = datetime.strptime(end_date.strip(), "%Y-%m-%d").date()
        else:
            start = end = today

        # --- QuerySets ---
        sales_qs = Sale.objects.annotate(day=TruncDate('date')).filter(
            day__range=[start, end]
        ).exclude(status="refunded")

        expenses_qs = Expense.objects.filter(date__range=[start, end])

        try:
            refunds_qs = Refund.objects.filter(refund_date__date__range=[start, end])
        except Exception:
            refunds_qs = Refund.objects.filter(refund_date__range=[start, end])

        loans_qs = Sale.objects.annotate(day=TruncDate('date')).filter(
            day__range=[start, end], is_loan=True
        ).exclude(status="refunded")

        # --- Aggregations ---
        total_sales = sales_qs.aggregate(total=Sum("paid_amount"))["total"] or Decimal(0)
        total_discounts = sales_qs.aggregate(total=Sum("discount_amount"))["total"] or Decimal(0)
        total_refunds = refunds_qs.aggregate(total=Sum("total_refund_amount"))["total"] or Decimal(0)
        total_expenses = expenses_qs.aggregate(total=Sum("amount"))["total"] or Decimal(0)
        total_loans = loans_qs.aggregate(
            total=Sum(F('total_amount') - F('paid_amount'))
        )['total'] or Decimal(0)

        # Gross profit from confirmed sales only (refunded sales excluded).
        # So when you refund a sale, its margin simply drops out of gross_profit — profit goes to 0 for that sale, not negative.
        sale_items = SaleItem.objects.filter(
            sale__in=sales_qs,
            sale__status='confirmed'
        ).select_related("product")
        gross_profit = sum(
            (si.product.selling_price - si.product.buying_price) * si.quantity
            for si in sale_items
        )
        if not isinstance(gross_profit, Decimal):
            gross_profit = Decimal(str(gross_profit))

        # Profit = gross profit - discount - expenses - loans. No refund subtraction: refunded sales are already excluded from gross_profit.
        profit = gross_profit - total_discounts - total_expenses - total_loans

        sales_count = sales_qs.count()

        # --- Prepare chart data ---
        chart_dates, chart_sales, chart_expenses, chart_discounts, chart_refunds, chart_loans = [], [], [], [], [], []

        for n in range((end - start).days + 1):
            single_date = start + timedelta(days=n)
            chart_dates.append(single_date.strftime("%Y-%m-%d"))

            day_sales_raw = sales_qs.filter(day=single_date).aggregate(total=Sum("paid_amount"))["total"] or Decimal(0)
            day_discount = sales_qs.filter(day=single_date).aggregate(total=Sum("discount_amount"))["total"] or Decimal(0)
            day_refunds = refunds_qs.filter(refund_date__date=single_date).aggregate(total=Sum("total_refund_amount"))["total"] or Decimal(0)
            day_expenses = expenses_qs.filter(date=single_date).aggregate(total=Sum("amount"))["total"] or Decimal(0)
            day_loans = loans_qs.filter(day=single_date).aggregate(total=Sum(F('total_amount') - F('paid_amount')))["total"] or Decimal(0)

            chart_sales.append(float(day_sales_raw - day_refunds))
            chart_expenses.append(float(day_expenses))
            chart_discounts.append(float(day_discount))
            chart_refunds.append(float(day_refunds))
            chart_loans.append(float(day_loans))

        # --- Response ---
        data = {
            "start_date": start.strftime("%Y-%m-%d"),
            "end_date": end.strftime("%Y-%m-%d"),
            "total_sales": float(total_sales),
            "sales_count": sales_count,
            "total_expenses": float(total_expenses),
            "total_discounts": float(total_discounts),
            "total_refunds": float(total_refunds),
            "total_loans": float(total_loans),
            "gross_profit": float(gross_profit),
            "profit": float(profit),
            "chart": {
                "dates": chart_dates,
                "sales": chart_sales,
                "expenses": chart_expenses,
                "discounts": chart_discounts,
                "refunds": chart_refunds,
                "loans": chart_loans,
            }
        }

        return Response(data)






class RecentLoginsAPIView(APIView):
    permission_classes = [IsAdminOnly]

    def get(self, request):
        recent_users = User.objects.filter(last_login__isnull=False).order_by('-last_login')[:5]
        data = [
            {"username": u.username, "last_login": u.last_login, "role": u.role}
            for u in recent_users
        ]
        return Response(data)


class RecentSalesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        base_qs = _sales_queryset_for_unit(request)
        recent_sales = base_qs.order_by('-date')[:10]
        serializer = SaleSerializer(recent_sales, many=True)
        return Response(serializer.data)



# StockReportAPIView
from django.db.models import Sum, F, DecimalField
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth, TruncYear, Coalesce
from django.utils.timezone import now
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

class StockReportAPIView(APIView):
    permission_classes = [IsCashierOrAdmin]

    def get(self, request):
        # --- Date parameters ---
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")
        today = now().date()

        # --- Date handling ---
        try:
            if start_date_str and end_date_str:
                start_date = datetime.strptime(start_date_str.strip(), "%Y-%m-%d").date()
                end_date = datetime.strptime(end_date_str.strip(), "%Y-%m-%d").date()
            elif start_date_str and not end_date_str:
                start_date = end_date = datetime.strptime(start_date_str.strip(), "%Y-%m-%d").date()
            elif end_date_str and not start_date_str:
                start_date = end_date = datetime.strptime(end_date_str.strip(), "%Y-%m-%d").date()
            else:
                start_date = end_date = today
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD"}, status=400)

        # Limit to shop inventory: products with unit=shop or unit is null
        shop = Unit.objects.filter(code='shop').first()
        product_base_qs = Product.objects.all()
        if shop:
            product_base_qs = product_base_qs.filter(Q(unit=shop) | Q(unit__isnull=True))

        # --- Total stock quantity ---
        total_stock_qty = product_base_qs.aggregate(
            total_qty=Coalesce(Sum('quantity_in_stock'), 0, output_field=DecimalField(max_digits=20, decimal_places=2))
        )['total_qty']
        # --- Total stock value excluding low stock products ---
        products = product_base_qs.annotate(
            stock_value=ExpressionWrapper(
                F('buying_price') * F('quantity_in_stock'),
                output_field=DecimalField(max_digits=25, decimal_places=2)
            )
        ).filter(quantity_in_stock__gt=0)  # exclude low stock products

        total_stock_value = products.aggregate(total=Sum('stock_value'))['total'] or 0

        # --- Low stock products (with average daily sales and suggested reorder) ---
        low_stock_qs = product_base_qs.filter(quantity_in_stock__lte=F('threshold')).values(
            'id', 'name', 'threshold', 'quantity_in_stock'
        )

        # Sales for average daily calculation (shop sales only if shop exists)
        item_sales_qs = SaleItem.objects.filter(
            sale__status='confirmed',
            sale__date__date__range=[start_date, end_date]
        )
        if shop:
            item_sales_qs = item_sales_qs.filter(Q(sale__unit=shop) | Q(sale__unit__isnull=True))

        sold_by_product = {
            row['product_id']: row['total_sold']
            for row in item_sales_qs.values('product_id').annotate(
                total_sold=Coalesce(Sum('quantity'), 0, output_field=DecimalField(max_digits=20, decimal_places=2))
            )
        }

        days = max(1, (end_date - start_date).days + 1)
        low_stock_products = []
        for p in low_stock_qs:
            pid = p['id']
            threshold = p['threshold'] or 0
            qty = p['quantity_in_stock'] or 0
            total_sold = sold_by_product.get(pid, 0)
            avg_daily = float(total_sold) / float(days) if days > 0 else 0.0
            # Simple rule: target 30 days of cover based on recent demand
            target_stock = avg_daily * 30
            suggested = max(0, int(round(target_stock - qty)))
            low_stock_products.append({
                **p,
                'avg_daily_sales': avg_daily,
                'suggested_reorder': suggested,
            })

        # --- Most sold items (fast movers) ---
        most_sold_qs = SaleItem.objects.filter(
            sale__status='confirmed',
            sale__date__date__range=[start_date, end_date]
        ).values('product__id', 'product__name').annotate(
            total_sold=Coalesce(Sum('quantity'), 0, output_field=DecimalField(max_digits=20, decimal_places=2))
        ).order_by('-total_sold')[:10]

        # --- Slow movers: products with stock > 0 and no sales in range ---
        products_with_stock = Product.objects.filter(quantity_in_stock__gt=0)
        sold_product_ids = set(
            most_sold_qs.values_list('product__id', flat=True)
        ) | set(
            SaleItem.objects.filter(
                sale__status='confirmed',
                sale__date__date__range=[start_date, end_date]
            ).values_list('product_id', flat=True)
        )
        slow_movers_qs = products_with_stock.exclude(id__in=sold_product_ids).values(
            'id', 'name', 'threshold', 'quantity_in_stock'
        )[:50]

        # --- Stock movements (restock vs sold) ---
        restock_qs = StockEntry.objects.filter(
            date__date__range=[start_date, end_date],
            entry_type__in=['added', 'in']
        ).annotate(period=TruncDay('date')).values('period').annotate(
            total=Coalesce(Sum('quantity'), 0, output_field=DecimalField(max_digits=20, decimal_places=2))
        ).order_by('period')

        sales_qs = SaleItem.objects.filter(
            sale__status='confirmed',
            sale__date__date__range=[start_date, end_date]
        ).annotate(period=TruncDay('sale__date')).values('period').annotate(
            total=Coalesce(Sum('quantity'), 0, output_field=DecimalField(max_digits=20, decimal_places=2))
        ).order_by('period')

        def qs_to_dict(qs):
            d = {}
            for e in qs:
                dt = e['period']
                key = dt.date().isoformat() if hasattr(dt, 'date') else str(dt)
                d[key] = e['total']
            return d

        restocks_data = qs_to_dict(restock_qs)
        sales_data = qs_to_dict(sales_qs)
        all_dates = sorted(set(list(restocks_data.keys()) + list(sales_data.keys())))

        # --- Transfers out to workshop (shop → workshop) ---
        transferred_out_qs = StockEntry.objects.filter(
            date__date__range=[start_date, end_date],
            entry_type='transferred_out'
        ).values('product__id', 'product__name').annotate(
            total_transferred=Coalesce(Sum('quantity'), 0, output_field=DecimalField(max_digits=20, decimal_places=2))
        ).order_by('-total_transferred')

        # --- Response ---
        response = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "totalStockQty": total_stock_qty,
            "totalStockValue": total_stock_value,
            "lowStockProducts": list(low_stock_products),
            "mostSoldItems": list(most_sold_qs),
            "slowMovers": list(slow_movers_qs),
            "transferredOutSummary": list(transferred_out_qs),
            "stockMovement": [
                {
                    "date": date,
                    "Restocked": restocks_data.get(date, 0),
                    "Sold": sales_data.get(date, 0),
                } for date in all_dates
            ],
        }

        return Response(response)










from django.utils.timezone import now
from django.utils.timezone import make_aware
from datetime import timedelta, datetime
from django.db.models.functions import TruncDate
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, DecimalField

#Short report view
from decimal import Decimal
from django.db.models import Sum, Count, DecimalField, F
from django.utils.timezone import now, make_aware
from django.db.models.functions import TruncDate
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from datetime import datetime, timedelta




class ShortReportAPIView(APIView):
    permission_classes = [IsAdminOnly]

    def get(self, request):
        user = request.user

        start_date_str = request.GET.get('start')
        end_date_str = request.GET.get('end')

        def parse_date(date_str):
            try:
                return make_aware(datetime.strptime(date_str, '%Y-%m-%d'))
            except Exception:
                return None

        today = now().date()
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)

        start_date = parse_date(start_date_str) or make_aware(datetime.combine(start_of_week, datetime.min.time()))
        end_date = parse_date(end_date_str) or make_aware(datetime.combine(end_of_week, datetime.max.time()))

        # Restrict sales by role
        if user.role == 'cashier':
            sales_qs = Sale.objects.filter(user=user, date__range=(start_date, end_date))
        elif user.role == 'admin':
            sales_qs = Sale.objects.filter(date__range=(start_date, end_date))
        else:
            return Response({"detail": "Unauthorized."}, status=403)

        # Group sales by day
        sales_summary = (
            sales_qs
            .annotate(day=TruncDate('date'))
            .values('day')
            .annotate(
                total_sales=Sum('paid_amount', output_field=DecimalField()),
                total_amount=Sum('total_amount', output_field=DecimalField()),   # for loan calc
                total_discount=Sum('discount_amount', output_field=DecimalField()),
                total_refunds=Sum('refund_total', output_field=DecimalField()),
                sales_count=Count('id'),
            )
            .order_by('day')
        )

        # Expenses per day
        expenses_qs = Expense.objects.filter(date__range=(start_date, end_date))
        expenses_summary = expenses_qs.values('date').annotate(
            total_expenses=Sum('amount', output_field=DecimalField())
        )
        expenses_dict = {item['date']: item['total_expenses'] for item in expenses_summary}

        # Loan amount per day (only is_loan=True sales, same as sales report)
        loans_qs = Sale.objects.filter(
            date__range=(start_date, end_date),
            is_loan=True,
        ).exclude(status='refunded')
        if user.role == 'cashier':
            loans_qs = loans_qs.filter(user=user)
        loans_summary = (
            loans_qs.annotate(day=TruncDate('date'))
            .values('day')
            .annotate(
                loan_amount=Sum(F('total_amount') - F('paid_amount'), output_field=DecimalField())
            )
        )
        loans_dict = {}
        for item in loans_summary:
            d = item['day'].date() if hasattr(item['day'], 'date') else item['day']
            loans_dict[d] = item['loan_amount'] or 0

        report = []
        grand_totals = {
            "total_sales": Decimal(0),
            "total_discount": Decimal(0),
            "total_refunds": Decimal(0),
            "total_expenses": Decimal(0),
            "total_loans": Decimal(0),
            "total_profit": Decimal(0),
            "sales_count": 0,
        }

        for item in sales_summary:
            date = item['day'].date() if hasattr(item['day'], 'date') else item['day']
            total_sales = Decimal(item['total_sales'] or 0)
            total_amount = Decimal(item['total_amount'] or 0)
            total_discount = Decimal(item['total_discount'] or 0)
            total_refunds = Decimal(item['total_refunds'] or 0)
            total_expenses = Decimal(expenses_dict.get(date, 0))

            # Loan amount = unpaid from is_loan=True sales only (align with sales report)
            loan_amount = Decimal(loans_dict.get(date, 0))

            # Gross profit from confirmed sales that day (refunded excluded → their margin just drops out, profit stays 0 for them)
            sale_items = SaleItem.objects.filter(
                sale__date__date=date,
                sale__in=sales_qs,
                sale__status='confirmed',
            ).select_related("product")

            gross_profit = sum(
                (si.product.selling_price - si.product.buying_price) * si.quantity
                for si in sale_items
            )

            # Profit = gross margin - discount - expenses - unpaid (loans). No refund subtraction.
            profit = gross_profit - total_discount - total_expenses - loan_amount

            report.append({
                "date": date.strftime('%Y-%m-%d'),
                "total_sales": float(total_sales),
                "total_discount": float(total_discount),
                "total_refunds": float(total_refunds),
                "total_expenses": float(total_expenses),
                "loans": float(loan_amount),
                "profit": float(profit),
                "sales_count": item['sales_count'] or 0,
            })

            grand_totals["total_sales"] += total_sales
            grand_totals["total_discount"] += total_discount
            grand_totals["total_refunds"] += total_refunds
            grand_totals["total_expenses"] += total_expenses
            grand_totals["total_loans"] += loan_amount
            grand_totals["total_profit"] += profit
            grand_totals["sales_count"] += item['sales_count'] or 0

        return Response({
            "start_date": start_date.strftime('%Y-%m-%d'),
            "end_date": end_date.strftime('%Y-%m-%d'),
            "report": report,
            "totals": {k: float(v) if isinstance(v, Decimal) else v for k, v in grand_totals.items()},
        }, status=200)


class CustomerStatementAPIView(APIView):
    """
    Per-customer shop statement: sales, payments, and outstanding balances.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        customer_id = request.query_params.get("customer_id")
        if not customer_id:
            return Response({"error": "customer_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            customer = Customer.objects.get(id=customer_id)
        except Customer.DoesNotExist:
            return Response({"error": "Customer not found."}, status=status.HTTP_404_NOT_FOUND)

        # Optional date filters
        start_date_str = request.query_params.get("start_date")
        end_date_str = request.query_params.get("end_date")

        try:
            start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date() if start_date_str else None
            end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date() if end_date_str else None
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        shop = Unit.objects.filter(code='shop').first()

        sales_qs = Sale.objects.filter(customer=customer).exclude(status='refunded')
        if shop:
            sales_qs = sales_qs.filter(Q(unit=shop) | Q(unit__isnull=True))

        if start_date and end_date:
            sales_qs = sales_qs.filter(date__date__range=[start_date, end_date])
        elif start_date:
            sales_qs = sales_qs.filter(date__date__gte=start_date)
        elif end_date:
            sales_qs = sales_qs.filter(date__date__lte=end_date)

        sales_qs = sales_qs.select_related('user').prefetch_related('items__product', 'payments')

        sales_data = []
        total_invoiced = Decimal('0')
        total_paid = Decimal('0')
        total_outstanding = Decimal('0')

        for sale in sales_qs.order_by('date', 'id'):
            final_amount = Decimal(sale.final_amount or 0)
            paid_amount = Decimal(sale.paid_amount or 0)
            outstanding = final_amount - paid_amount

            total_invoiced += final_amount
            total_paid += paid_amount
            total_outstanding += max(outstanding, Decimal('0'))

            items = [
                {
                    "product": item.product.name if item.product else None,
                    "quantity": item.quantity,
                    "price_per_unit": float(item.price_per_unit),
                    "total_price": float(item.total_price),
                }
                for item in sale.items.all()
            ]

            payments = [
                {
                    "id": p.id,
                    "amount": float(p.amount_paid),
                    "payment_method": p.payment_method,
                    "payment_date": p.payment_date.isoformat(),
                    "cashier": p.cashier.username if p.cashier else None,
                }
                for p in sale.payments.all().order_by('payment_date')
            ]

            sales_data.append(
                {
                    "id": sale.id,
                    "date": sale.date.isoformat(),
                    "sale_type": sale.sale_type,
                    "status": sale.status,
                    "payment_status": sale.payment_status,
                    "final_amount": float(final_amount),
                    "paid_amount": float(paid_amount),
                    "outstanding": float(outstanding),
                    "user": sale.user.username if sale.user else None,
                    "items": items,
                    "payments": payments,
                }
            )

        return Response(
            {
                "customer": CustomerSerializer(customer).data,
                "summary": {
                    "total_invoiced": float(total_invoiced),
                    "total_paid": float(total_paid),
                    "total_outstanding": float(total_outstanding),
                    "sale_count": len(sales_data),
                },
                "sales": sales_data,
            }
        )