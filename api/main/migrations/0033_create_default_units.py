from django.db import migrations


def create_units(apps, schema_editor):
    Unit = apps.get_model('main', 'Unit')
    Unit.objects.get_or_create(code='shop', defaults={'name': 'Hardware Shop'})
    Unit.objects.get_or_create(code='workshop', defaults={'name': 'Hardware Workshop'})


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0032_onyango_unit_and_roles'),
    ]

    operations = [
        migrations.RunPython(create_units, noop),
    ]
