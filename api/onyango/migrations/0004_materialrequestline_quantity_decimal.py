# Generated for decimal quantity_requested (half/quarter support)

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onyango', '0003_transfersettlement_cleared_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='materialrequestline',
            name='quantity_requested',
            field=models.DecimalField(decimal_places=2, default=1, max_digits=20),
        ),
    ]
