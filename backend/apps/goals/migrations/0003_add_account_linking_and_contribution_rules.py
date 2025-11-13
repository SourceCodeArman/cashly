# Generated manually for account linking and contribution rules

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('goals', '0002_add_goal_enhancements'),
        ('accounts', '0001_initial'),
    ]

    operations = [
        # Add new fields to Goal model
        migrations.AddField(
            model_name='goal',
            name='destination_account',
            field=models.ForeignKey(
                blank=True,
                help_text='Destination account where goal funds accumulate. Null means cash savings.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='destination_goals',
                to='accounts.account'
            ),
        ),
        migrations.AddField(
            model_name='goal',
            name='transfer_authorized',
            field=models.BooleanField(
                default=False,
                help_text='User has authorized automatic transfers via Plaid'
            ),
        ),
        migrations.AddField(
            model_name='goal',
            name='initial_balance_synced',
            field=models.BooleanField(
                default=False,
                help_text='Destination account balance has been synced as initial current_amount'
            ),
        ),
        migrations.AddField(
            model_name='goal',
            name='contribution_rules',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Contribution rules configuration with source accounts'
            ),
        ),
        migrations.AddField(
            model_name='goal',
            name='reminder_settings',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Reminder settings for cash goals'
            ),
        ),
        # Change is_active default to False for new goals
        # But preserve existing goals as active (backward compatibility)
        migrations.AlterField(
            model_name='goal',
            name='is_active',
            field=models.BooleanField(
                default=False,
                help_text='Goal is active and can receive contributions'
            ),
        ),
        # Create TransferAuthorization model
        migrations.CreateModel(
            name='TransferAuthorization',
            fields=[
                ('authorization_id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('authorization_token', models.TextField(help_text='Encrypted Plaid authorization token')),
                ('plaid_authorization_id', models.CharField(blank=True, db_index=True, help_text='Plaid authorization identifier', max_length=255, null=True)),
                ('authorized_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(blank=True, help_text='When authorization expires', null=True)),
                ('status', models.CharField(choices=[('active', 'Active'), ('expired', 'Expired'), ('revoked', 'Revoked')], default='active', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('goal', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transfer_authorizations', to='goals.goal')),
            ],
            options={
                'verbose_name': 'Transfer Authorization',
                'verbose_name_plural': 'Transfer Authorizations',
                'db_table': 'transfer_authorizations',
                'ordering': ['-authorized_at'],
            },
        ),
        # Add indexes
        migrations.AddIndex(
            model_name='goal',
            index=models.Index(fields=['destination_account'], name='goals_destination_account_idx'),
        ),
        migrations.AddIndex(
            model_name='goal',
            index=models.Index(fields=['transfer_authorized'], name='goals_transfer_authorized_idx'),
        ),
        migrations.AddIndex(
            model_name='transferauthorization',
            index=models.Index(fields=['goal', 'status'], name='transfer_auth_goal_status_idx'),
        ),
        migrations.AddIndex(
            model_name='transferauthorization',
            index=models.Index(fields=['plaid_authorization_id'], name='transfer_auth_plaid_id_idx'),
        ),
        migrations.AddIndex(
            model_name='transferauthorization',
            index=models.Index(fields=['expires_at'], name='transfer_auth_expires_at_idx'),
        ),
        # Data migration: Set existing goals to is_active=True for backward compatibility
        migrations.RunPython(
            code=lambda apps, schema_editor: apps.get_model('goals', 'Goal').objects.all().update(is_active=True),
            reverse_code=lambda apps, schema_editor: None,
        ),
    ]

