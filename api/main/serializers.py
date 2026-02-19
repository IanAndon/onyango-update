from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import (
    Category, Customer, Refund, User, Product, StockEntry,
    Sale, SaleItem, Expense, Payment, Unit,
    Order, OrderItem, TimelineEvent, Quote, QuoteItem,
    get_portion_factor,
    get_effective_quantity,
)
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import update_last_login
from django.db import transaction
from .rounding import round_two
from decimal import Decimal, ROUND_HALF_UP


# ------------------------------ AUTH ------------------------------

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    access = serializers.CharField(read_only=True)
    refresh = serializers.CharField(read_only=True)

    def validate(self, data):
        user = authenticate(username=data.get("username"), password=data.get("password"))
        if user is None or not user.is_active:
            raise serializers.ValidationError("Invalid credentials or inactive account.")
        refresh = RefreshToken.for_user(user)
        update_last_login(None, user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "username": user.username,
            }
        }


# ------------------------------ USER ------------------------------

class MeSerializer(serializers.ModelSerializer):
    unit_id = serializers.SerializerMethodField()
    unit_code = serializers.SerializerMethodField()
    unit_name = serializers.SerializerMethodField()
    role = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'role', 'unit_id', 'unit_code', 'unit_name', 'last_login', 'date_joined']

    def get_unit_id(self, obj):
        return getattr(obj, 'unit_id', None)

    def get_unit_code(self, obj):
        return obj.unit.code if getattr(obj, 'unit', None) else None

    def get_unit_name(self, obj):
        return obj.unit.name if getattr(obj, 'unit', None) else None


class FullUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_superuser']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    unit_code = serializers.CharField(source='unit.code', read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'unit', 'unit_code', 'unit_name', 'is_active', 'last_login',
            'password', 'confirm_password',
        ]
        extra_kwargs = {'unit': {'required': False, 'allow_null': True}}

    def validate(self, data):
        is_create = not self.instance
        password = data.get('password') or ''
        confirm = data.get('confirm_password') or ''
        if is_create and not password:
            raise serializers.ValidationError({"password": "Password is required when creating a user."})
        if password or confirm:
            if password != confirm:
                raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', '')
        if not password:
            raise serializers.ValidationError({"password": "Password is required."})
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


# ------------------------------ CATEGORY & PRODUCT ------------------------------
class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name']


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = Product
        fields = '__all__'


# ------------------------------ CUSTOMER ------------------------------

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ['id', 'name', 'phone', 'email', 'address', 'created_at']
        read_only_fields = ['id', 'created_at']


# ------------------------------ CUSTOMER ------------------------------

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id',
            'name',
            'phone',
            'email',
            'address',
            'customer_type',
            'credit_limit',
            'is_vip',
            'is_blacklisted',
            'notes',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


# ------------------------------ STOCK ------------------------------




class StockEntrySerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), source='product', write_only=True)
    recorded_by = MeSerializer(read_only=True)

    class Meta:
        model = StockEntry
        fields = ['id', 'product', 'product_id', 'entry_type', 'quantity', 'date', 'recorded_by']



# ------------------------------ ORDERS ------------------------------

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    unit_price = serializers.DecimalField(read_only=True, max_digits=20, decimal_places=2)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_id', 'quantity', 'unit_price', 'portion']

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be positive.")
        return value



class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    user = MeSerializer(read_only=True)
    customer = CustomerSerializer(read_only=True)

    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source='customer',
        write_only=True,
        required=False,
        allow_null=True
    )
    customer_name = serializers.CharField(write_only=True, required=False)
    customer_phone = serializers.CharField(write_only=True, required=False)

    notes = serializers.CharField(required=False, allow_blank=True)
    order_type = serializers.CharField(default='retail')
    discount_amount = serializers.DecimalField(
        max_digits=20, decimal_places=2, required=False, min_value=0, default=0
    )

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'customer', 'customer_id',
            'customer_name', 'customer_phone',
            'order_type', 'status', 'notes',
            'discount_amount', 'created_at', 'items'
        ]
        read_only_fields = ['id', 'user', 'status', 'created_at']

    def validate(self, data):
        order_type = data.get('order_type', 'retail')
        customer = data.get('customer')
        customer_name = self.initial_data.get('customer_name')
        customer_phone = self.initial_data.get('customer_phone')

        # Wholesale orders require customer info if no existing customer
        if order_type == 'wholesale' and not customer:
            if not customer_name or not customer_phone:
                raise serializers.ValidationError("Wholesale orders require customer name and phone.")

        return data

    def create(self, validated_data):
        request = self.context['request']
        items_data = validated_data.pop('items')
        order_type = validated_data.get('order_type', 'retail')
        customer = validated_data.get('customer')

        # Auto-create customer if not provided
        if not customer:
            name = self.initial_data.get('customer_name')
            phone = self.initial_data.get('customer_phone')
            if name and phone:
                customer, _ = Customer.objects.get_or_create(
                    phone=phone, defaults={'name': name}
                )
                validated_data['customer'] = customer
            else:
                validated_data.pop('customer', None)

        with transaction.atomic():
            order = Order.objects.create(user=request.user, **validated_data)

            order_items = []
            for item_data in items_data:
                product = item_data['product']
                quantity = item_data['quantity']

                # Pick unit price based on order type
                if order_type == 'wholesale' and product.wholesale_price > 0:
                    unit_price = product.wholesale_price
                else:
                    unit_price = product.selling_price

                order_items.append(OrderItem(
                    order=order,
                    product=product,
                    quantity=quantity,
                    unit_price=unit_price
                ))

            OrderItem.objects.bulk_create(order_items)

        return order


class OrderUpdateSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source='customer',
        write_only=True,
        required=False,
        allow_null=True
    )
    customer_name = serializers.CharField(write_only=True, required=False)
    customer_phone = serializers.CharField(write_only=True, required=False)

    discount_amount = serializers.DecimalField(
        max_digits=20, decimal_places=2, required=False, min_value=0, default=0
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    order_type = serializers.CharField(required=False)

    class Meta:
        model = Order
        fields = [
            'discount_amount', 'notes', 'order_type',
            'customer_id', 'customer_name', 'customer_phone',
            'items',
        ]

    def validate(self, data):
        order_type = data.get('order_type', self.instance.order_type if self.instance else 'retail')
        customer = data.get('customer') or (self.instance.customer if self.instance else None)
        customer_name = self.initial_data.get('customer_name')
        customer_phone = self.initial_data.get('customer_phone')

        # Wholesale orders require customer info if no existing customer
        if order_type == 'wholesale' and not customer:
            if not customer_name or not customer_phone:
                raise serializers.ValidationError("Wholesale orders require customer name and phone.")

        # Sanity check: discount cannot exceed subtotal
        if 'items' in self.initial_data:
            subtotal = 0
            for item in self.initial_data['items']:
                price = float(item.get('unit_price', 0))
                qty = float(item.get('quantity', 0))
                subtotal += price * qty

            discount = float(data.get('discount_amount', 0))
            if discount > subtotal:
                raise serializers.ValidationError("Discount cannot exceed subtotal.")

        return data

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        # Update order fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        with transaction.atomic():
            instance.save()

            if items_data is not None:
                # Delete old items first
                instance.items.all().delete()

                order_type = validated_data.get('order_type', instance.order_type)
                order_items = []

                for item_data in items_data:
                    product = item_data['product']
                    quantity = item_data['quantity']

                    # Decide unit price based on order type
                    if order_type == 'wholesale' and product.wholesale_price > 0:
                        unit_price = product.wholesale_price
                    else:
                        unit_price = product.selling_price

                    order_items.append(OrderItem(
                        order=instance,
                        product=product,
                        quantity=quantity,
                        unit_price=unit_price,
                    ))

                OrderItem.objects.bulk_create(order_items)

        return instance







class SaleItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True
    )

    price_per_unit = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = SaleItem
        fields = ['id', 'product', 'product_id', 'quantity', 'price_per_unit', 'total_price']

    def get_price_per_unit(self, obj):
        return str(round_two(obj.price_per_unit))

    def get_total_price(self, obj):
        return str(round_two(obj.total_price))

    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("Quantity must be positive.")
        return value


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    user = serializers.StringRelatedField(read_only=True)
    customer = CustomerSerializer(read_only=True)

    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(),
        source='customer',
        write_only=True,
        required=False
    )
    customer_name = serializers.CharField(write_only=True, required=False)
    customer_phone = serializers.CharField(write_only=True, required=False)

    discount_amount = serializers.DecimalField(
        max_digits=20, decimal_places=2, required=False, min_value=0, default=0
    )

    items_input = SaleItemSerializer(many=True, write_only=True, source='items')

    checked_by_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'user', 'customer', 'customer_id', 'customer_name', 'customer_phone',
            'sale_type', 'payment_status', 'status', 'is_loan',
            'total_amount', 'discount_amount', 'final_amount',
            'refund_total', 'payment_method', 'date',
            'items', 'items_input', 'paid_amount',
            'fulfillment_status', 'checked_by', 'checked_by_username', 'checked_at',
        ]
        read_only_fields = ['id', 'user', 'final_amount', 'refund_total', 'date']

    def get_checked_by_username(self, obj):
        return obj.checked_by.username if obj.checked_by else None

    def validate(self, data):
        sale_type = data.get('sale_type', 'retail')
        customer = data.get('customer')
        customer_name = self.initial_data.get('customer_name')
        customer_phone = self.initial_data.get('customer_phone')

        if sale_type == 'wholesale' and not customer:
            if not customer_name or not customer_phone:
                raise serializers.ValidationError("Wholesale sales require customer name and phone.")

        # sanity check: discount cannot exceed subtotal
        if 'items' in self.initial_data:
            subtotal = 0
            for item in self.initial_data['items']:
                price = float(item.get('unit_price', 0))
                qty = float(item.get('quantity', 0))
                subtotal += price * qty

            discount = float(data.get('discount_amount', 0))
            if discount > subtotal:
                raise serializers.ValidationError("Discount cannot exceed subtotal.")

        return data


class QuoteItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.all(), source='product', write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = QuoteItem
        fields = ['id', 'product_id', 'product_name', 'description', 'quantity', 'unit_price', 'line_total']
        read_only_fields = ['line_total']


class QuoteSerializer(serializers.ModelSerializer):
    items = QuoteItemSerializer(many=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Quote
        fields = [
            'id',
            'unit', 'unit_name',
            'customer', 'customer_name', 'customer_phone',
            'customer_address', 'customer_tin',
            'vat_percent',
            'created_by', 'created_by_username',
            'status', 'quote_date', 'valid_until',
            'subtotal', 'discount_amount', 'tax_amount', 'total_amount',
            'notes',
            'sale',
            'items',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'subtotal', 'total_amount', 'created_at', 'updated_at']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if not validated_data.get('unit') and user and getattr(user, 'unit', None):
            validated_data['unit'] = user.unit
        if user and not validated_data.get('created_by'):
            validated_data['created_by'] = user

        quote = Quote.objects.create(**validated_data)

        subtotal = Decimal('0')
        for item in items_data:
          product = item.get('product')
          description = item.get('description') or (product.name if product else '')
          qty = item.get('quantity') or Decimal('1')
          unit_price = item.get('unit_price') or Decimal('0')
          line = QuoteItem.objects.create(
              quote=quote,
              product=product,
              description=description,
              quantity=qty,
              unit_price=unit_price,
          )
          subtotal += line.line_total

        quote.subtotal = round_two(subtotal)
        quote.total_amount = round_two(subtotal - quote.discount_amount)
        quote.save()
        return quote

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if items_data is not None:
            instance.items.all().delete()
            subtotal = Decimal('0')
            for item in items_data:
                product = item.get('product')
                description = item.get('description') or (product.name if product else '')
                qty = item.get('quantity') or Decimal('1')
                unit_price = item.get('unit_price') or Decimal('0')
                line = QuoteItem.objects.create(
                    quote=instance,
                    product=product,
                    description=description,
                    quantity=qty,
                    unit_price=unit_price,
                )
                subtotal += line.line_total
            instance.subtotal = round_two(subtotal)
        instance.total_amount = round_two(instance.subtotal - instance.discount_amount)
        instance.save()
        return instance




class ConfirmOrderSerializer(serializers.Serializer):
    payment_method = serializers.CharField()
    amount_paid = serializers.DecimalField(max_digits=20, decimal_places=2, required=False, default=0)

    def validate(self, data):
        order_id = self.context['view'].kwargs.get('pk')
        try:
            data['order'] = Order.objects.get(id=order_id, status__in=['pending', 'updated'])
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order not found or already processed.")
        return data

    def create(self, validated_data):
        order = validated_data['order']
        cashier = self.context['request'].user
        payment_method = validated_data.get('payment_method')
        amount_paid = validated_data.get('amount_paid', Decimal('0'))

        # Calculate totals using product prices and effective qty (e.g. 2 + quarter = 2.25)
        total_amount = Decimal('0')
        for item in order.items.all():
            if not item.product:
                raise serializers.ValidationError(f"Order item {item.id} is missing a product.")

            price = (
                item.product.wholesale_price
                if order.order_type == 'wholesale'
                else item.product.selling_price
            )
            portion = getattr(item, 'portion', 'full')
            effective_qty = get_effective_quantity(item.quantity, portion)
            total_amount += price * effective_qty

        total_amount = round_two(total_amount)

        # Ensure discount is valid
        discount_amount = order.discount_amount or Decimal('0')
        if discount_amount > total_amount:
            raise serializers.ValidationError("Discount cannot exceed total order amount.")

        final_amount = round_two(total_amount - discount_amount)

        # Determine payment status and loan flag
        if amount_paid == 0:
            payment_status = 'not_paid'
            is_loan = True
        elif amount_paid < final_amount:
            payment_status = 'partial'
            is_loan = True
        elif amount_paid == final_amount:
            payment_status = 'paid'
            is_loan = False
        else:
            raise serializers.ValidationError("Paid amount cannot exceed final amount.")

        # Create Sale
        sale = Sale.objects.create(
            order=order,
            user=cashier,
            customer=order.customer,
            total_amount=total_amount,
            discount_amount=discount_amount,
            final_amount=final_amount,
            paid_amount=amount_paid,
            payment_status=payment_status,
            payment_method=payment_method,
            status='confirmed',
            sale_type=order.order_type,
            is_loan=is_loan,
        )

        # Create SaleItems and handle stock (effective qty e.g. 1.5, 2.25; deduct exact)
        for item in order.items.all():
            price = (
                item.product.wholesale_price
                if order.order_type == 'wholesale'
                else item.product.selling_price
            )
            portion = getattr(item, 'portion', 'full')
            effective_qty = get_effective_quantity(item.quantity, portion)
            line_total = round_two(price * effective_qty)

            SaleItem.objects.create(
                sale=sale,
                product=item.product,
                quantity=effective_qty,
                price_per_unit=round_two(price),
                total_price=line_total,
                portion=portion,
            )

            item.product.remove_stock(effective_qty, cashier)

        # Record Payment if any
        if amount_paid > 0:
            Payment.objects.create(
                sale=sale,
                amount_paid=amount_paid,
                cashier=cashier,
                payment_method=payment_method,
            )
            sale.update_paid_amount()

        # Finalize order
        order.status = 'confirmed'
        order.save()

        return sale

class RejectOrderSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        order_id = self.context['view'].kwargs.get('pk')
        try:
            data['order'] = Order.objects.get(id=order_id, status='pending')
        except Order.DoesNotExist:
            raise serializers.ValidationError("Order not found or already processed.")
        return data

    def create(self, validated_data):
        order = validated_data['order']
        order.status = 'rejected'
        order.save()
        # optionally log a reason somewhere if needed
        return order


# ------------------------------ POS (Direct Sale - no Order) ------------------------------

class POSItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=20, decimal_places=2, min_value=Decimal('0.01'))


class POSCompleteSaleSerializer(serializers.Serializer):
    """Direct POS sale: create Sale + SaleItems + deduct stock + Payment in one step."""
    items = POSItemSerializer(many=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), required=False, allow_null=True
    )
    payment_method = serializers.CharField()
    amount_paid = serializers.DecimalField(max_digits=20, decimal_places=2, required=True, min_value=0)
    discount_amount = serializers.DecimalField(max_digits=20, decimal_places=2, required=False, default=0, min_value=0)
    notes = serializers.CharField(required=False, allow_blank=True)
    order_type = serializers.ChoiceField(choices=[('retail', 'retail'), ('wholesale', 'wholesale')], default='retail')

    def validate(self, data):
        if not data.get('items'):
            raise serializers.ValidationError("At least one item is required.")
        order_type = data.get('order_type', 'retail')
        if order_type == 'wholesale' and not data.get('customer_id'):
            raise serializers.ValidationError("Customer is required for wholesale sales.")
        return data

    def create(self, validated_data):
        request = self.context['request']
        user = request.user
        items_data = validated_data.pop('items')
        payment_method = validated_data.get('payment_method')
        amount_paid = validated_data.get('amount_paid', Decimal('0'))
        discount_amount = validated_data.get('discount_amount', Decimal('0'))
        notes = validated_data.get('notes', '')
        order_type = validated_data.get('order_type', 'retail')
        customer = validated_data.get('customer_id')

        with transaction.atomic():
            total_amount = Decimal('0')
            items_to_create = []
            products_to_deduct = []

            for item_data in items_data:
                try:
                    product = Product.objects.select_for_update().get(id=item_data['product_id'])
                except Product.DoesNotExist:
                    raise serializers.ValidationError(f"Product {item_data['product_id']} not found.")
                effective_qty = Decimal(str(item_data['quantity']))
                if product.quantity_in_stock < effective_qty:
                    raise serializers.ValidationError(
                        f"Insufficient stock for {product.name}. Available: {product.quantity_in_stock}"
                    )
                price = product.wholesale_price if order_type == 'wholesale' and product.wholesale_price else product.selling_price
                line_total = round_two(price * effective_qty)
                total_amount += line_total
                items_to_create.append({
                    'product': product, 'quantity': effective_qty,
                    'price_per_unit': round_two(price), 'total_price': line_total,
                    'portion': 'full',
                })
                products_to_deduct.append({'product': product, 'quantity': effective_qty})

            total_amount = round_two(total_amount)
            if discount_amount > total_amount:
                raise serializers.ValidationError("Discount cannot exceed total amount.")
            final_amount = round_two(total_amount - discount_amount)

            if amount_paid > final_amount:
                raise serializers.ValidationError("Amount paid cannot exceed final amount.")

            # Partial payment / debt / loan requires customer; only full payment allows walk-in
            if amount_paid < final_amount and not customer:
                raise serializers.ValidationError(
                    "Customer is required for partial payment or debt. Only full cash payments can be made with walk-in."
                )

            # Enforce customer risk rules for debt / partial payments
            if customer and amount_paid < final_amount:
                # Blacklisted customers cannot take new loans
                if getattr(customer, 'is_blacklisted', False):
                    raise serializers.ValidationError(
                        "This customer is blacklisted and cannot take new loans. Accept full payment only."
                    )

                # Credit limit check (if configured)
                if customer.credit_limit:
                    # Existing outstanding loans (any unit), excluding refunded sales
                    active_loans = Sale.objects.filter(
                        customer=customer,
                        is_loan=True,
                    ).exclude(status='refunded')
                    existing_outstanding = sum(
                        (s.final_amount - s.paid_amount)
                        for s in active_loans
                        if (s.final_amount or 0) > (s.paid_amount or 0)
                    )
                    new_debt = final_amount - amount_paid
                    if existing_outstanding + new_debt > customer.credit_limit:
                        raise serializers.ValidationError(
                            f"Credit limit exceeded for this customer. "
                            f"Limit: {customer.credit_limit}, current debt: {existing_outstanding}, "
                            f"new debt: {new_debt}."
                        )

            if amount_paid == 0:
                payment_status = 'not_paid'
                is_loan = True
            elif amount_paid < final_amount:
                payment_status = 'partial'
                is_loan = True
            else:
                payment_status = 'paid'
                is_loan = False

            shop_unit = Unit.objects.filter(code='shop').first()
            sale = Sale.objects.create(
                order=None,
                user=user,
                customer=customer,
                unit=shop_unit,
                total_amount=total_amount,
                discount_amount=discount_amount,
                final_amount=final_amount,
                paid_amount=amount_paid,
                payment_status=payment_status,
                payment_method=payment_method,
                status='confirmed',
                sale_type=order_type,
                is_loan=is_loan,
            )

            for item in items_to_create:
                SaleItem.objects.create(sale=sale, **item)

            for pd in products_to_deduct:
                pd['product'].remove_stock(pd['quantity'], user)

            if amount_paid > 0:
                Payment.objects.create(
                    sale=sale, amount_paid=amount_paid,
                    cashier=user, payment_method=payment_method,
                )
                sale.update_paid_amount()

        return sale


class LoanSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    unit_name = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id',
            'customer_name',
            'user_name',
            'unit_name',
            'date',
            'total_amount',
            'final_amount',
            'paid_amount',
            'payment_status',
            'is_loan',
        ]

    def get_customer_name(self, obj):
        return obj.customer.name if obj.customer else "retail customer"

    def get_user_name(self, obj):
        return obj.user.username if obj.user else "Unknown"

    def get_unit_name(self, obj):
        return obj.unit.name if obj.unit else "Shop"


class PaymentSerializer(serializers.ModelSerializer):
    cashier = serializers.HiddenField(default=serializers.CurrentUserDefault())
    cashier_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'sale', 'amount_paid', 'payment_date', 'cashier', 'cashier_username', 'payment_method']
        read_only_fields = ['payment_date']

    def get_cashier_username(self, obj):
        return obj.cashier.username if obj.cashier else None




    

class RefundSerializer(serializers.ModelSerializer):
    refunded_by = MeSerializer(read_only=True)

    class Meta:
        model = Refund
        fields = ['id', 'sale', 'refunded_by', 'refund_date', 'total_refund_amount']
        read_only_fields = ['id', 'refund_date', 'refunded_by', 'total_refund_amount']

    def create(self, validated_data):
        user = self.context['request'].user
        sale = validated_data['sale']

        # Only allow refund if not already refunded
        if sale.status == 'refunded':
            raise serializers.ValidationError("This sale has already been refunded.")

        refund = Refund.objects.create(
            sale=sale,
            refunded_by=user,
            total_refund_amount=sale.paid_amount
        )
        return refund


class ExpenseSerializer(serializers.ModelSerializer):
    recorded_by = MeSerializer(read_only=True)
    unit_name = serializers.CharField(source='unit.name', read_only=True)

    class Meta:
        model = Expense
        fields = ['id', 'description', 'amount', 'category', 'date', 'recorded_by', 'unit', 'unit_name', 'updated_at']




class PurchaseSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name')
    date = serializers.DateTimeField(source='sale.created_at', format='%Y-%m-%dT%H:%M:%S%z')

    class Meta:
        model = SaleItem
        fields = ['id', 'product_name', 'quantity', 'price_per_unit', 'total_price', 'date']


class TimelineEventSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = TimelineEvent
        fields = ['id', 'created_at', 'event_type', 'event_type_display', 'entity_type', 'entity_id', 'user', 'username', 'description', 'details']
        read_only_fields = ['id', 'created_at']
