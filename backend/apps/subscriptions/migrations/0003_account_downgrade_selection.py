from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('subscriptions', '0002_subscription_pending_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='AccountDowngradeSelection',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('accounts_to_keep', models.JSONField(default=list, help_text='List of account UUIDs to keep active (max 3 for free tier)')),
                ('selection_completed_at', models.DateTimeField(blank=True, help_text='When user completed account selection', null=True)),
                ('deactivation_scheduled_at', models.DateTimeField(help_text='When excess accounts should be deactivated (subscription period end)')),
                ('deactivation_completed_at', models.DateTimeField(blank=True, help_text='When excess accounts were actually deactivated', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('subscription', models.ForeignKey(help_text='Subscription being cancelled', on_delete=django.db.models.deletion.CASCADE, related_name='account_downgrade_selections', to='subscriptions.subscription')),
                ('user', models.ForeignKey(help_text='User making the selection', on_delete=django.db.models.deletion.CASCADE, related_name='account_downgrade_selections', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Account Downgrade Selection',
                'verbose_name_plural': 'Account Downgrade Selections',
                'db_table': 'account_downgrade_selections',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='accountdowngradeselection',
            index=models.Index(fields=['subscription', 'user'], name='account_dow_subscr_8f9a2b_idx'),
        ),
        migrations.AddIndex(
            model_name='accountdowngradeselection',
            index=models.Index(fields=['deactivation_scheduled_at', 'deactivation_completed_at'], name='account_dow_deactiv_7c8d3e_idx'),
        ),
        migrations.AddIndex(
            model_name='accountdowngradeselection',
            index=models.Index(fields=['user', 'selection_completed_at'], name='account_dow_user_id_9e4f5a_idx'),
        ),
    ]

