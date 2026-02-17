from decimal import Decimal, ROUND_HALF_UP

def round_two(value):
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
