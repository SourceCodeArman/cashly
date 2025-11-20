"""
Management command to seed system categories with hierarchical structure.
"""
from django.core.management.base import BaseCommand
from apps.transactions.models import Category


class Command(BaseCommand):
    help = 'Seed system categories for transactions with hierarchical structure'

    def handle(self, *args, **options):
        # Parent categories for expenses
        parent_expense_categories = [
            {'name': 'Food & Dining', 'icon': 'utensils', 'color': '#FF9800'},
            {'name': 'Transportation', 'icon': 'car', 'color': '#2196F3'},
            {'name': 'Home & Utilities', 'icon': 'home', 'color': '#FFC107'},
            {'name': 'Lifestyle', 'icon': 'shopping-bag', 'color': '#E91E63'},
            {'name': 'Health & Education', 'icon': 'heart', 'color': '#F44336'},
            {'name': 'Other', 'icon': 'more-horizontal', 'color': '#9E9E9E'},
        ]
        
        # Subcategories for expenses (mapped to parent)
        expense_subcategories = {
            'Food & Dining': [
                {'name': 'Groceries', 'icon': 'shopping-cart', 'color': '#4CAF50'},
                {'name': 'Dining', 'icon': 'utensils', 'color': '#FF9800'},
            ],
            'Transportation': [
                {'name': 'Gas', 'icon': 'fuel', 'color': '#2196F3'},
                {'name': 'Fuel', 'icon': 'droplet', 'color': '#03A9F4'},
            ],
            'Home & Utilities': [
                {'name': 'Utilities', 'icon': 'bolt', 'color': '#FFC107'},
            ],
            'Lifestyle': [
                {'name': 'Entertainment', 'icon': 'film', 'color': '#9C27B0'},
                {'name': 'Shopping', 'icon': 'bag', 'color': '#E91E63'},
            ],
            'Health & Education': [
                {'name': 'Healthcare', 'icon': 'heart-pulse', 'color': '#F44336'},
                {'name': 'Education', 'icon': 'book', 'color': '#3F51B5'},
            ],
        }
        
        # Parent categories for income
        parent_income_categories = [
            {'name': 'Employment', 'icon': 'briefcase', 'color': '#4CAF50'},
            {'name': 'Investments', 'icon': 'trending-up', 'color': '#9C27B0'},
            {'name': 'Other', 'icon': 'dollar-sign', 'color': '#9E9E9E'},
        ]
        
        # Subcategories for income (mapped to parent)
        income_subcategories = {
            'Employment': [
                {'name': 'Salary', 'icon': 'briefcase', 'color': '#4CAF50'},
                {'name': 'Freelance', 'icon': 'laptop', 'color': '#2196F3'},
            ],
            'Investments': [
                {'name': 'Investment', 'icon': 'trending-up', 'color': '#9C27B0'},
            ],
        }
        
        created_count = 0
        updated_count = 0
        
        # Create parent expense categories
        for cat_data in parent_expense_categories:
            category, created = Category.objects.update_or_create(
                name=cat_data['name'],
                type='expense',
                is_system_category=True,
                parent_category=None,  # Parent categories have no parent
                defaults={
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'user': None,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created parent expense category: {category.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated parent expense category: {category.name}')
                )
            
            # Create subcategories for this parent
            if cat_data['name'] in expense_subcategories:
                for subcat_data in expense_subcategories[cat_data['name']]:
                    subcategory, sub_created = Category.objects.update_or_create(
                        name=subcat_data['name'],
                        type='expense',
                        is_system_category=True,
                        defaults={
                            'icon': subcat_data['icon'],
                            'color': subcat_data['color'],
                            'user': None,
                            'parent_category': category,
                        }
                    )
                    if sub_created:
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'  Created subcategory: {subcategory.name}')
                        )
                    else:
                        updated_count += 1
                        self.stdout.write(
                            self.style.WARNING(f'  Updated subcategory: {subcategory.name}')
                        )
        
        # Create parent income categories
        for cat_data in parent_income_categories:
            category, created = Category.objects.update_or_create(
                name=cat_data['name'],
                type='income',
                is_system_category=True,
                parent_category=None,  # Parent categories have no parent
                defaults={
                    'icon': cat_data['icon'],
                    'color': cat_data['color'],
                    'user': None,
                }
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Created parent income category: {category.name}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'Updated parent income category: {category.name}')
                )
            
            # Create subcategories for this parent
            if cat_data['name'] in income_subcategories:
                for subcat_data in income_subcategories[cat_data['name']]:
                    subcategory, sub_created = Category.objects.update_or_create(
                        name=subcat_data['name'],
                        type='income',
                        is_system_category=True,
                        defaults={
                            'icon': subcat_data['icon'],
                            'color': subcat_data['color'],
                            'user': None,
                            'parent_category': category,
                        }
                    )
                    if sub_created:
                        created_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(f'  Created subcategory: {subcategory.name}')
                        )
                    else:
                        updated_count += 1
                        self.stdout.write(
                            self.style.WARNING(f'  Updated subcategory: {subcategory.name}')
                        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\nSuccessfully seeded categories: {created_count} created, {updated_count} updated'
            )
        )
