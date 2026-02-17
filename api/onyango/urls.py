from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views

router = DefaultRouter()
router.register(r'units', views.UnitViewSet, basename='unit')
router.register(r'job-types', views.JobTypeViewSet, basename='jobtype')
router.register(r'suppliers', views.SupplierViewSet, basename='supplier')
router.register(r'purchase-orders', views.PurchaseOrderViewSet, basename='purchaseorder')
router.register(r'goods-receipts', views.GoodsReceiptViewSet, basename='goodsreceipt')
router.register(r'repair-jobs', views.RepairJobViewSet, basename='repairjob')
router.register(r'repair-payments', views.RepairPaymentViewSet, basename='repairpayment')
router.register(r'material-requests', views.MaterialRequestViewSet, basename='materialrequest')
router.register(r'transfer-orders', views.TransferOrderViewSet, basename='transferorder')
router.register(r'transfer-settlements', views.TransferSettlementViewSet, basename='transfersettlement')
router.register(r'activity-logs', views.ActivityLogViewSet, basename='activitylog')

urlpatterns = [
    path('dashboard/', views.OnyangoDashboardView.as_view(), name='onyango-dashboard'),
    path('', include(router.urls)),
]
