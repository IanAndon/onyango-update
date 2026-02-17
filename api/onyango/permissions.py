from rest_framework import permissions


class IsOwnerOrManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('owner', 'manager', 'admin')
        )


class IsOwnerOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('owner', 'admin')
        )


class IsShopStaff(permissions.BasePermission):
    """Cashier or manager/owner - can access shop (POS, inventory, transfers out)."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('owner', 'manager', 'admin', 'cashier')
        )


class IsWorkshopStaff(permissions.BasePermission):
    """Cashier or manager/owner - can access workshop (repair jobs, material requests)."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('owner', 'manager', 'admin', 'cashier')
        )


class CanApproveTransfer(permissions.BasePermission):
    """Only shop cashier (or shop unit) can approve/reject material requests; workshop cashier cannot."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role not in ('owner', 'manager', 'admin', 'cashier'):
            return False
        # Must be assigned to shop unit; workshop cashier (unit=workshop) is not allowed
        unit = getattr(request.user, 'unit', None)
        if unit is None:
            return False
        return getattr(unit, 'code', None) == 'shop'


class CanSettleTransfer(permissions.BasePermission):
    """Workshop side: cashier or manager/owner can record settlement."""
    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('owner', 'manager', 'admin', 'cashier')
        )


class IsOwnerOrManagerOrReadOnly(permissions.BasePermission):
    """Allow read for any authenticated user; create/update/delete only for admin/owner/manager."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.role in ('owner', 'manager', 'admin')
