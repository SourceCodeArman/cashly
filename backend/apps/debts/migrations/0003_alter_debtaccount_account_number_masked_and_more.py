from django.db import models
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("debts", "0002_alter_debtaccount_minimum_payment"),
    ]

    operations = [
        migrations.AlterField(
            model_name="debtaccount",
            name="account_number_masked",
            field=models.CharField(
                blank=True, help_text="Last 4 digits", max_length=255
            ),
        ),
        migrations.AlterField(
            model_name="debtaccount",
            name="creditor_name",
            field=models.CharField(
                blank=True, help_text="Creditor/lender name", max_length=255
            ),
        ),
        migrations.AlterField(
            model_name="debtaccount",
            name="name",
            field=models.CharField(
                help_text="Debt name (e.g., Chase Credit Card)", max_length=255
            ),
        ),
        migrations.AlterField(
            model_name="debtaccount",
            name="notes",
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name="debtpayment",
            name="notes",
            field=models.TextField(blank=True),
        ),
    ]
