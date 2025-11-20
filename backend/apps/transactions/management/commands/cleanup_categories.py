"""
Management command to clean up old categories that aren't part of the new hierarchy.
"""
from django.core.management.base import BaseCommand
from apps.transactions.models import Category


class Command(BaseCommand):
    help = 'Remove old user-created and system categories that are not part of the new hierarchy'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # List of category names that should be kept (from seed_categories.py)
        keep_categories = {
            # Parent categories
            'Food & Dining', 'Transportation', 'Home & Utilities', 'Lifestyle',
            'Health & Education', 'Other', 'Employment', 'Investments',
            # Subcategories
            'Groceries', 'Dining', 'Gas', 'Fuel', 'Utilities',
            'Entertainment', 'Shopping', 'Healthcare', 'Education',
            'Salary', 'Freelance', 'Investment'
        }
        
        # Get all categories that are NOT in the keep list
        categories_to_delete = Category.objects.exclude(name__in=keep_categories)
        
        count = categories_to_delete.count()
        
        if count == 0:
            self.stdout.write(self.style.SUCCESS('No categories to delete'))
            return
        
        self.stdout.write(f'Found {count} categories to delete:')
        for cat in categories_to_delete:
            self.stdout.write(f'  - {cat.name} ({cat.type}, system={cat.is_system_category})')
        
        if dry_run:
            self.stdout.write(self.style.WARNING('\\nDRY RUN - No categories were deleted'))
            self.stdout.write(f'Run without --dry-run to delete {count} categories')
        else:
            categories_to_delete.delete()
            self.stdout.write(self.style.SUCCESS(f'\\nSuccessfully deleted {count} categories'))
