"""
Management command to clear all recurring transaction flags.
"""
from django.core.management.base import BaseCommand
from apps.transactions.models import Transaction


class Command(BaseCommand):
    help = 'Clear all recurring transaction flags from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm that you want to clear all recurring flags',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(
                self.style.WARNING(
                    'This will clear ALL recurring transaction flags. '
                    'Run with --confirm to proceed.'
                )
            )
            return

        # Count how many will be affected
        count = Transaction.objects.filter(is_recurring=True).count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No recurring flags found to clear.'))
            return

        # Clear the flags
        updated = Transaction.objects.filter(is_recurring=True).update(is_recurring=False)

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully cleared {updated} recurring transaction flags.'
            )
        )
