from django.db import models
import django.core.validators
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("transactions", "0007_alter_category_rules"),
    ]

    operations = [
        migrations.AlterField(
            model_name="transaction",
            name="description",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="merchant_name",
            field=models.CharField(
                max_length=255,
                validators=[
                    django.core.validators.MinLengthValidator(2),
                    django.core.validators.MaxLengthValidator(200),
                ],
            ),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="notes",
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="transaction",
            name="subcategory",
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
