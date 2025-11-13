from django.core.management.base import BaseCommand, CommandError
from rest_framework.test import APIRequestFactory

from apps.accounts.webhooks import PlaidWebhookView


class Command(BaseCommand):
    help = "Simulate Plaid webhook events for local development."

    def add_arguments(self, parser):
        parser.add_argument(
            '--item-id',
            dest='item_id',
            required=True,
            help='Plaid item_id to target.',
        )
        parser.add_argument(
            '--type',
            dest='webhook_type',
            default='TRANSACTIONS',
            help='Webhook type (e.g., TRANSACTIONS, ITEM, AUTH).',
        )
        parser.add_argument(
            '--code',
            dest='webhook_code',
            default='DEFAULT_UPDATE',
            help='Webhook code (e.g., INITIAL_UPDATE, DEFAULT_UPDATE, ERROR).',
        )
        parser.add_argument(
            '--accounts',
            dest='account_ids',
            help='Comma separated list of Plaid account IDs.',
        )

    def handle(self, *args, **options):
        item_id = options['item_id']
        webhook_type = options['webhook_type']
        webhook_code = options['webhook_code']
        account_ids = (
            [account.strip() for account in options['account_ids'].split(',')] if options['account_ids'] else None
        )

        payload = {
            'webhook_type': webhook_type,
            'webhook_code': webhook_code,
            'item_id': item_id,
        }
        if account_ids:
            payload['account_ids'] = account_ids

        factory = APIRequestFactory()
        request = factory.post('/api/v1/accounts/webhook/', payload, format='json')
        response = PlaidWebhookView.as_view()(request)

        if response.status_code >= 400:
            raise CommandError(f"Webhook simulation failed with status {response.status_code}: {response.data}")

        self.stdout.write(self.style.SUCCESS(f"Webhook simulated successfully: {payload}"))

