from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='error_code',
            field=models.CharField(
                blank=True,
                help_text='Last Plaid error code received for this account',
                max_length=100,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='account',
            name='error_message',
            field=models.TextField(
                blank=True,
                help_text='Last Plaid error message received for this account',
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='account',
            name='last_error_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='account',
            name='plaid_institution_id',
            field=models.CharField(
                blank=True,
                help_text='Plaid institution identifier',
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='account',
            name='plaid_item_id',
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text='Plaid item identifier associated with the account',
                max_length=255,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='account',
            name='plaid_products',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of Plaid products enabled for the item',
            ),
        ),
        migrations.AddField(
            model_name='account',
            name='webhook_url',
            field=models.URLField(
                blank=True,
                help_text='Webhook configured for Plaid item events',
                null=True,
            ),
        ),
        migrations.AddIndex(
            model_name='account',
            index=models.Index(
                fields=['plaid_item_id'],
                name='accounts_plaid_i_9b99f2_idx',
            ),
        ),
    ]

