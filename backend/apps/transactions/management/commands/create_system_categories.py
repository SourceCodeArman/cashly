"""
Management command to create system categories.
"""
from django.core.management.base import BaseCommand
from apps.transactions.models import Category


class Command(BaseCommand):
    help = 'Create system categories for transactions'

    def handle(self, *args, **options):
        # Expense categories
        expense_categories = [
            {'name': 'Food & Dining', 'type': 'expense', 'icon': 'restaurant', 'color': '#FF6B6B'},
            {'name': 'Shopping', 'type': 'expense', 'icon': 'shopping', 'color': '#4ECDC4'},
            {'name': 'Transportation', 'type': 'expense', 'icon': 'car', 'color': '#45B7D1'},
            {'name': 'Bills & Utilities', 'type': 'expense', 'icon': 'bill', 'color': '#FFA07A'},
            {'name': 'Entertainment', 'type': 'expense', 'icon': 'entertainment', 'color': '#98D8C8'},
            {'name': 'Healthcare', 'type': 'expense', 'icon': 'health', 'color': '#F7DC6F'},
            {'name': 'Education', 'type': 'expense', 'icon': 'education', 'color': '#BB8FCE'},
            {'name': 'Personal Care', 'type': 'expense', 'icon': 'personal', 'color': '#85C1E2'},
            {'name': 'Travel', 'type': 'expense', 'icon': 'travel', 'color': '#F8B739'},
            {'name': 'Gas & Fuel', 'type': 'expense', 'icon': 'gas', 'color': '#E74C3C'},
            {'name': 'Groceries', 'type': 'expense', 'icon': 'grocery', 'color': '#2ECC71'},
            {'name': 'Home & Garden', 'type': 'expense', 'icon': 'home', 'color': '#9B59B6'},
            {'name': 'Subscriptions', 'type': 'expense', 'icon': 'subscription', 'color': '#3498DB'},
            {'name': 'Insurance', 'type': 'expense', 'icon': 'insurance', 'color': '#E67E22'},
            {'name': 'Taxes', 'type': 'expense', 'icon': 'tax', 'color': '#C0392B'},
            {'name': 'Other Expenses', 'type': 'expense', 'icon': 'other', 'color': '#95A5A6'},
        ]

        # Income categories
        income_categories = [
            {'name': 'Salary', 'type': 'income', 'icon': 'salary', 'color': '#27AE60'},
            {'name': 'Freelance', 'type': 'income', 'icon': 'freelance', 'color': '#16A085'},
            {'name': 'Investment', 'type': 'income', 'icon': 'investment', 'color': '#2980B9'},
            {'name': 'Rental Income', 'type': 'income', 'icon': 'rental', 'color': '#8E44AD'},
            {'name': 'Business Income', 'type': 'income', 'icon': 'business', 'color': '#D35400'},
            {'name': 'Gift', 'type': 'income', 'icon': 'gift', 'color': '#E91E63'},
            {'name': 'Refund', 'type': 'income', 'icon': 'refund', 'color': '#00BCD4'},
            {'name': 'Bonus', 'type': 'income', 'icon': 'bonus', 'color': '#FF9800'},
            {'name': 'Interest', 'type': 'income', 'icon': 'interest', 'color': '#4CAF50'},
            {'name': 'Other Income', 'type': 'income', 'icon': 'other', 'color': '#607D8B'},
        ]

        # Transfer category
        transfer_categories = [
            {'name': 'Transfer', 'type': 'transfer', 'icon': 'transfer', 'color': '#9E9E9E'},
        ]

        created_count = 0
        updated_count = 0

        for category_data in expense_categories + income_categories + transfer_categories:
            # System categories must have user=None
            category, created = Category.objects.get_or_create(
                name=category_data['name'],
                type=category_data['type'],
                is_system_category=True,
                user=None,  # System categories have no user
                defaults={
                    'icon': category_data.get('icon', ''),
                    'color': category_data.get('color', '#000000'),
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created category: {category.name} ({category.type})')
                )
            else:
                # Update existing category if needed
                if category.icon != category_data.get('icon', '') or category.color != category_data.get('color', '#000000'):
                    category.icon = category_data.get('icon', '')
                    category.color = category_data.get('color', '#000000')
                    category.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'Updated category: {category.name} ({category.type})')
                    )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully created {created_count} categories and updated {updated_count} categories.'
            )
        )

