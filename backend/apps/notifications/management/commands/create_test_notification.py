"""
Management command to create test notifications.

Usage:
    python manage.py create_test_notification --username=testuser
    python manage.py create_test_notification --username=testuser --type=goal --count=3
    python manage.py create_test_notification --username=testuser --type=all
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.notifications.tasks import (
    create_notification,
    create_goal_milestone_notification,
    create_budget_exceeded_notification,
    create_transaction_notification,
    create_account_sync_notification,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Create test notifications for a user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            required=True,
            help='Username of the user to create notifications for'
        )
        parser.add_argument(
            '--type',
            type=str,
            choices=['transaction', 'goal', 'budget', 'account', 'system', 'all'],
            default='all',
            help='Type of notification to create (default: all)'
        )
        parser.add_argument(
            '--count',
            type=int,
            default=1,
            help='Number of notifications to create (default: 1)'
        )

    def handle(self, *args, **options):
        username = options['username']
        notification_type = options['type']
        count = options['count']

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'User with username "{username}" does not exist')
            )
            return

        created_count = 0

        if notification_type == 'all':
            # Create one of each type
            types = ['transaction', 'goal', 'budget', 'account', 'system']
            for i in range(count):
                for notif_type in types:
                    self._create_notification_by_type(user, notif_type, i)
                    created_count += 1
        else:
            # Create notifications of specified type
            for i in range(count):
                self._create_notification_by_type(user, notification_type, i)
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} notification(s) for user "{username}"'
            )
        )

    def _create_notification_by_type(self, user, notification_type, index):
        """Create a notification of the specified type."""
        if notification_type == 'transaction':
            if index % 2 == 0:
                create_transaction_notification(
                    user, 'large', 500.00 + (index * 10), f'Merchant {index + 1}'
                )
            else:
                create_transaction_notification(
                    user, 'unusual', 250.00 + (index * 5), f'Store {index + 1}'
                )

        elif notification_type == 'goal':
            milestones = [25, 50, 75, 100]
            milestone = milestones[index % len(milestones)]
            create_goal_milestone_notification(
                user, f'Test Goal {index + 1}', milestone
            )

        elif notification_type == 'budget':
            create_budget_exceeded_notification(
                user,
                f'Category {index + 1}',
                500.00 + (index * 50),
                400.00 + (index * 40)
            )

        elif notification_type == 'account':
            statuses = ['success', 'failed', 'pending']
            status = statuses[index % len(statuses)]
            error_msg = 'Connection timeout' if status == 'failed' else None
            create_account_sync_notification(
                user, f'Test Account {index + 1}', status, error_msg
            )

        elif notification_type == 'system':
            messages = [
                'System maintenance scheduled for tonight',
                'New features available - check them out!',
                'Your account settings have been updated',
                'Security alert: New login detected',
            ]
            message = messages[index % len(messages)]
            titles = [
                'System Maintenance',
                'New Features Available',
                'Settings Updated',
                'Security Alert',
            ]
            title = titles[index % len(titles)]
            create_notification(
                user,
                'system',
                title,
                message,
                {'index': index}
            )

