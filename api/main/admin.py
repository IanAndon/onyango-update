from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DefaultUserAdmin
from .models import (
    Order, User, Customer, Category, Product, StockEntry, Unit,
    Sale, SaleItem, Payment, Refund, Expense
)


class UnitAdmin(admin.ModelAdmin):
    list_display = ('code', 'name')
    ordering = ('id',)


class UserAdmin(DefaultUserAdmin):
    fieldsets = DefaultUserAdmin.fieldsets + (
        ('Role & Permissions', {'fields': ('role', 'unit')}),
    )
    list_display = ('username', 'email', 'role', 'unit', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('role', 'unit', 'is_staff', 'is_active')
    list_display = ('username', 'email', 'role', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('role', 'is_staff', 'is_active')
    search_fields = ('username', 'email')
    ordering = ('username',)


class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'email', 'created_at')
    search_fields = ('name', 'phone', 'email')
    ordering = ('name',)


class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
    ordering = ('name',)


class ProductAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'category', 'buying_price', 'selling_price', 'wholesale_price',
        'quantity_in_stock', 'threshold', 'created_at'
    )
    search_fields = ('name', 'category__name')
    list_filter = ('category',)
    readonly_fields = ('created_at',)
    ordering = ('name',)

    def save_model(self, request, obj, form, change):
        if not change:
            obj._created_by = request.user
        super().save_model(request, obj, form, change)


class StockEntryAdmin(admin.ModelAdmin):
    list_display = ('product', 'entry_type', 'quantity', 'date', 'recorded_by')
    list_filter = ('entry_type', 'date')
    search_fields = ('product__name', 'recorded_by__username')
    readonly_fields = ('date',)
    ordering = ('-date',)


class SaleAdmin(admin.ModelAdmin):
    list_display = (
        'id', 'user', 'customer', 'payment_status',
        'total_amount', 'discount_amount', 'final_amount', 'paid_amount',  # ✅ include paid_amount
        'payment_method', 'date'
    )
    list_filter = ('payment_status', 'payment_method', 'date')
    search_fields = ('user__username', 'customer__name')
    readonly_fields = ('date',)
    ordering = ('-date',)



class SaleItemAdmin(admin.ModelAdmin):
    list_display = ('sale', 'product', 'quantity', 'price_per_unit', 'total_price')
    search_fields = ('product__name', 'sale__id')
    ordering = ('sale',)


class PaymentAdmin(admin.ModelAdmin):
    list_display = ('sale', 'amount_paid', 'payment_date', 'cashier', 'payment_method')
    list_filter = ('payment_date', 'cashier', 'payment_method')
    search_fields = ('sale__id', 'cashier__username')
    readonly_fields = ('payment_date',)
    ordering = ('-payment_date',)


class RefundAdmin(admin.ModelAdmin):
    # list_display = ('sale', 'product', 'quantity', 'refund_amount', 'refunded_by', 'refund_date')
    list_filter = ('refund_date', 'refunded_by')
    search_fields = ('sale__id', 'product__name', 'refunded_by__username')
    readonly_fields = ('refund_date',)
    ordering = ('-refund_date',)


class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('description', 'amount', 'category', 'date', 'recorded_by')
    list_filter = ('category', 'date')
    search_fields = ('description', 'recorded_by__username')
    readonly_fields = ('date',)
    ordering = ('-date',)

class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'status', 'order_type' , 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('customer__name',)
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)
admin.site.register(Unit, UnitAdmin)
admin.site.register(Order, OrderAdmin)
admin.site.register(User, UserAdmin)
admin.site.register(Customer, CustomerAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Product, ProductAdmin)
admin.site.register(StockEntry, StockEntryAdmin)
admin.site.register(Sale, SaleAdmin)
admin.site.register(SaleItem, SaleItemAdmin)
admin.site.register(Payment, PaymentAdmin)
admin.site.register(Refund, RefundAdmin)
admin.site.register(Expense, ExpenseAdmin)
