from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('subscriptions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='subscription',
            name='pending_plan',
            field=models.CharField(blank=True, choices=[('premium', 'Premium'), ('pro', 'Pro')], help_text='Pending plan to apply at next renewal', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='subscription',
            name='pending_billing_cycle',
            field=models.CharField(blank=True, choices=[('monthly', 'Monthly'), ('annual', 'Annual')], help_text='Pending billing cycle to apply at next renewal', max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='subscription',
            name='pending_price_id_monthly',
            field=models.CharField(blank=True, help_text='Monthly price ID for pending plan change', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='subscription',
            name='pending_price_id_annual',
            field=models.CharField(blank=True, help_text='Annual price ID for pending plan change', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='subscription',
            name='pending_requested_at',
            field=models.DateTimeField(blank=True, help_text='When the pending plan change was requested', null=True),
        ),
    ]

