from django.db import migrations, models
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_account_plaid_fields'),
    ]

    operations = [
        migrations.CreateModel(
            name='PlaidWebhookEvent',
            fields=[
                ('event_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('item_id', models.CharField(db_index=True, max_length=255)),
                ('webhook_type', models.CharField(max_length=100)),
                ('webhook_code', models.CharField(max_length=100)),
                ('payload', models.JSONField(blank=True, default=dict)),
                ('received_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'db_table': 'plaid_webhook_events',
                'ordering': ['-received_at'],
            },
        ),
        migrations.AddIndex(
            model_name='plaidwebhookevent',
            index=models.Index(fields=['item_id', 'webhook_type', 'webhook_code', 'received_at'], name='plaid_webh_item_id__3d0fd4_idx'),
        ),
    ]

