# Generated for decimal stock (quantity_in_stock, StockEntry.quantity)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0042_saleitem_quantity_decimal'),
    ]

    operations = [
        migrations.AlterField(
            model_name='product',
            name='quantity_in_stock',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=20),
        ),
        migrations.AlterField(
            model_name='stockentry',
            name='quantity',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=20),
        ),
    ]
