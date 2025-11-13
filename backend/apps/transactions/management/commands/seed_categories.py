"""
Management command to seed system categories.
"""
from django.core.management.base import BaseCommand
from apps.transactions.models import Category


class Command(BaseCommand):
    help = 'Seed system categories for transactions'

    def handle(self, *args, **options):
        # Expense categories
        expense_categories = [
            {'name': 'Groceries', 'icon': 'shopping-cart', 'color': '#4CAF50'},
            {'name': 'Dining', 'icon': 'utensils', 'color': '#FF9800'},
            {'name': 'Transportation', 'icon': 'car', 'color': '#2196F3'},
            {'name': 'Utilities', 'icon': 'bolt', 'color': '#FFC107'},
            {'name': 'Entertainment', 'icon': 'film', 'color': '#9C27B0'},
            {'name': 'Shopping', 'icon': 'bag', 'color': '#E91E63'},
            {'name': 'Healthcare', 'icon': 'heart', 'color': '#F44336'},
            {'name': 'Education', 'icon': 'book', 'color': '#3F51B5'},
            {'name': 'Other', 'icon': 'more-horizontal', 'color': '#9E9E9E'},
        ]
        
        # Income categories
        income_categories = [
            {'name': 'Salary', 'icon': 'briefcase', 'color': '#4CAF50'},
            {'name': 'Freelance', 'icon': 'laptop', 'color': '#2196F3'},
            {'name': 'Investment', 'icon': 'trending-up', 'color': '#9C27B0'},
            {'name': 'Other', 'icon': 'dollar-sign', 'color': '#9E9E9E'},
        ]
        
        created_count = 0
        updated_count = 0
        
        # Create expense categories
        for cat_data in expense_categories:
            category, created = Category.objects.update_or_create(
                name=cat_data['name'],
                type='expense',
                is_system_category=True,
                defaults={
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'user': None,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created expense category: {category.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated expense category: {category.name}')
                )
        
        # Create income categories
        for cat_data in income_categories:
            category, created = Category.objects.update_or_create(
                name=cat_data['name'],
                type='income',
                is_system_category=True,
                defaults={
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'user': None,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created income category: {category.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated income category: {category.name}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully seeded categories: {created_count} created, {updated_count} updated'
            )
        )

