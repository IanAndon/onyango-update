from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView,  # optional but good to have
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('main.urls')),  # main app routes (POS, orders, sales, etc.)
    path('api/onyango/', include('onyango.urls')),  # Onyango Hardware: workshop, transfers, suppliers

    # Add these Simple JWT endpoints for token refresh and verification
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]
