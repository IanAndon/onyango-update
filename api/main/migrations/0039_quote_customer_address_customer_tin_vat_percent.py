# Generated manually for quote customer address, TIN, and VAT %

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0038_sale_fulfillment_check'),
    ]

    operations = [
        migrations.AddField(
            model_name='quote',
            name='customer_address',
            field=models.TextField(blank=True, default=''),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='quote',
            name='customer_tin',
            field=models.CharField(blank=True, default='', max_length=50),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='quote',
            name='vat_percent',
            field=models.DecimalField(blank=True, decimal_places=2, help_text='VAT percentage applied to (subtotal - discount).', max_digits=5, null=True),
            preserve_default=True,
        ),
    ]
