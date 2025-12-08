# Generated manually for MFA backup codes feature

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_emailchangerequest'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='mfa_backup_codes',
            field=models.JSONField(
                blank=True,
                default=list,
                help_text='List of hashed backup codes for MFA recovery'
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='mfa_backup_codes_generated_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='When backup codes were last generated'
            ),
        ),
    ]
