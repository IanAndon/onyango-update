from rest_framework.routers import DefaultRouter
from django.urls import include, path

from .views import SalesReportAPIView, ShortReportAPIView, CustomerStatementAPIView

from .views import (
    CategoryViewSet, DashboardMetricsView, LoanViewSet, LogoutView, MeView, MonthlySalesAPIView, ReportSummaryAPIView,
    RecentLoginsAPIView, RecentSalesAPIView, SalesSummaryAPIView,
    StockEntryViewSet, StockReportAPIView, UserViewSet,
    ProductViewSet, SaleViewSet, ExpenseViewSet,
    PaymentViewSet, RefundViewSet, CustomerViewSet,
    LoginView, get_csrf_token, OrderViewSet, TimelineEventViewSet,
    POSCompleteSaleView, AdminUnitOverviewView, ShopCashbookAPIView, DailyCashCloseView,
    WorkshopCashbookAPIView, WorkshopCashCloseView, AdminCashbookReportView, QuoteViewSet,
)

router = DefaultRouter()

router.register(r'users', UserViewSet, basename='user')            # uniform basename singular
router.register(r'products', ProductViewSet, basename='product')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'loans', LoanViewSet, basename='loans')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'stock-entries', StockEntryViewSet, basename='stockentry')

router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'refunds', RefundViewSet, basename='refund')

router.register(r'orders', OrderViewSet, basename='order')
router.register(r'customers', CustomerViewSet, basename='customers')
router.register(r'timeline', TimelineEventViewSet, basename='timeline')
router.register(r'quotes', QuoteViewSet, basename='quote')

# Main API URLs
urlpatterns = router.urls

# Additional API paths
urlpatterns += [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('api/csrf-token/', get_csrf_token, name='csrf-token'),
    path('me/', MeView.as_view(), name='me'),

    # Reports & dashboard
    path('dashboard/metrics/', DashboardMetricsView.as_view(), name='dashboard-metrics'),
    path('dashboard/monthly-sales/', MonthlySalesAPIView.as_view(), name='monthly-sales'),
    path('dashboard/recent-logins/', RecentLoginsAPIView.as_view(), name='recent-logins'),
    path('dashboard/recent-orders/', RecentSalesAPIView.as_view(), name='recent-sales'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('pos/complete-sale/', POSCompleteSaleView.as_view(), name='pos-complete-sale'),
    path('admin/unit-overview/', AdminUnitOverviewView.as_view(), name='admin-unit-overview'),
    path('finance/shop-cashbook/', ShopCashbookAPIView.as_view(), name='shop-cashbook'),
    path('finance/shop-cash-close/', DailyCashCloseView.as_view(), name='shop-cash-close'),
    path('finance/workshop-cashbook/', WorkshopCashbookAPIView.as_view(), name='workshop-cashbook'),
    path('finance/workshop-cash-close/', WorkshopCashCloseView.as_view(), name='workshop-cash-close'),
    path('admin/cashbook-report/', AdminCashbookReportView.as_view(), name='admin-cashbook-report'),
    path('dashboard/sales-summary/', SalesSummaryAPIView.as_view(), name='sales-summary'),
    path("reports/sales/", SalesReportAPIView.as_view(), name="sales-report"),
    path("reports/stock/", StockReportAPIView.as_view(), name="stock-report"),
    path('reports/short/', ShortReportAPIView.as_view(), name='short-report'),
    path('reports/customer-statement/', CustomerStatementAPIView.as_view(), name='customer-statement'),

]


# path("api/wholesale-report/", get_wholesale_report),
# 