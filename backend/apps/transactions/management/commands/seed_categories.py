"""
Management command to seed system categories with simplified structure.
"""

from django.core.management.base import BaseCommand
from apps.transactions.models import Category


class Command(BaseCommand):
    help = "Seed system categories for transactions with simplified structure"

    def handle(self, *args, **options):
        # Simplified expense categories (5 main categories)
        expense_categories = [
            {"name": "Food & Dining", "icon": "utensils", "color": "#FF9800"},
            {"name": "Transportation", "icon": "car", "color": "#2196F3"},
            {"name": "Shopping", "icon": "shopping-cart", "color": "#E91E63"},
            {"name": "Bills & Utilities", "icon": "zap", "color": "#FFC107"},
            {"name": "Other", "icon": "sparkles", "color": "#9E9E9E"},
        ]

        # Simplified income category (1 main category)
        income_categories = [
            {"name": "Income", "icon": "dollar-sign", "color": "#4CAF50"},
        ]

        created_count = 0
        updated_count = 0

        # Create expense categories
        for cat_data in expense_categories:
            category, created = Category.objects.update_or_create(
                name=cat_data["name"],
                type="expense",
                is_system_category=True,
                defaults={
                    "icon": cat_data["icon"],
                    "color": cat_data["color"],
                    "user": None,
                    "parent_category": None,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created expense category: {category.name}")
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f"Updated expense category: {category.name}")
                )

        # Create income categories
        for cat_data in income_categories:
            category, created = Category.objects.update_or_create(
                name=cat_data["name"],
                type="income",
                is_system_category=True,
                defaults={
                    "icon": cat_data["icon"],
                    "color": cat_data["color"],
                    "user": None,
                    "parent_category": None,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"Created income category: {category.name}")
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f"Updated income category: {category.name}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nSuccessfully seeded categories: {created_count} created, {updated_count} updated"
            )
        )
