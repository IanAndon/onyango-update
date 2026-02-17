# Generated manually for optional quote date

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0039_quote_customer_address_customer_tin_vat_percent'),
    ]

    operations = [
        migrations.AddField(
            model_name='quote',
            name='quote_date',
            field=models.DateField(blank=True, help_text='Optional date to show on the quote (e.g. document date).', null=True),
            preserve_default=True,
        ),
    ]
