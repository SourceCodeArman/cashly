# Generated manually for Plaid category support

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('transactions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='plaid_category',
            field=models.JSONField(blank=True, default=dict, help_text='Plaid personal finance category: primary and detailed', null=True),
        ),
    ]

