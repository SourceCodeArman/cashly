"""
Django management command to create Stripe products and prices.
"""
import stripe
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Create Stripe products and prices for Premium and Pro plans'
    
    def handle(self, *args, **options):
        """Create products and prices in Stripe."""
        if not settings.STRIPE_SECRET_KEY:
            self.stdout.write(
                self.style.ERROR('STRIPE_SECRET_KEY not configured in settings')
            )
            return
        
        stripe.api_key = settings.STRIPE_SECRET_KEY
        
        # Pricing configuration
        products_config = [
            {
                'name': 'Premium',
                'description': 'Premium subscription for Cashly',
                'prices': [
                    {'amount': 999, 'currency': 'usd', 'interval': 'month', 'label': 'Monthly'},
                    {'amount': 9999, 'currency': 'usd', 'interval': 'year', 'label': 'Annual'},
                ]
            },
            {
                'name': 'Pro',
                'description': 'Pro subscription for Cashly',
                'prices': [
                    {'amount': 1999, 'currency': 'usd', 'interval': 'month', 'label': 'Monthly'},
                    {'amount': 19999, 'currency': 'usd', 'interval': 'year', 'label': 'Annual'},
                ]
            },
        ]
        
        created_products = {}
        
        for product_config in products_config:
            product_name = product_config['name']
            self.stdout.write(f'\nCreating product: {product_name}')
            
            try:
                # Check if product already exists
                products = stripe.Product.list(active=True, limit=100)
                existing_product = None
                for prod in products.data:
                    if prod.name == product_name:
                        existing_product = prod
                        break
                
                if existing_product:
                    self.stdout.write(
                        self.style.WARNING(f'Product "{product_name}" already exists: {existing_product.id}')
                    )
                    product = existing_product
                else:
                    # Create product
                    product = stripe.Product.create(
                        name=product_name,
                        description=product_config['description'],
                    )
                    self.stdout.write(
                        self.style.SUCCESS(f'Created product: {product.id}')
                    )
                
                created_products[product_name.lower()] = {
                    'product_id': product.id,
                    'prices': {}
                }
                
                # Create prices
                for price_config in product_config['prices']:
                    price_label = price_config['label']
                    self.stdout.write(f'  Creating {price_label} price...')
                    
                    # Check if price already exists
                    prices = stripe.Price.list(
                        product=product.id,
                        active=True,
                        limit=100
                    )
                    existing_price = None
                    for price in prices.data:
                        if (price.unit_amount == price_config['amount'] and
                            price.currency == price_config['currency'] and
                            price.recurring.interval == price_config['interval']):
                            existing_price = price
                            break
                    
                    if existing_price:
                        self.stdout.write(
                            self.style.WARNING(f'  Price "{price_label}" already exists: {existing_price.id}')
                        )
                        price = existing_price
                    else:
                        # Create price
                        price = stripe.Price.create(
                            product=product.id,
                            unit_amount=price_config['amount'],
                            currency=price_config['currency'],
                            recurring={
                                'interval': price_config['interval'],
                            },
                        )
                        self.stdout.write(
                            self.style.SUCCESS(f'  Created price: {price.id}')
                        )
                    
                    interval_key = price_config['interval']
                    created_products[product_name.lower()]['prices'][interval_key] = price.id
                    
            except stripe.StripeError as e:
                self.stdout.write(
                    self.style.ERROR(f'Stripe error creating {product_name}: {e}')
                )
                continue
        
        # Output configuration
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('Configuration for settings.py or .env:'))
        self.stdout.write('=' * 80)
        
        self.stdout.write('\n# Stripe Price IDs')
        self.stdout.write(f'STRIPE_PREMIUM_MONTHLY_PRICE_ID={created_products.get("premium", {}).get("prices", {}).get("month", "")}')
        self.stdout.write(f'STRIPE_PREMIUM_ANNUAL_PRICE_ID={created_products.get("premium", {}).get("prices", {}).get("year", "")}')
        self.stdout.write(f'STRIPE_PRO_MONTHLY_PRICE_ID={created_products.get("pro", {}).get("prices", {}).get("month", "")}')
        self.stdout.write(f'STRIPE_PRO_ANNUAL_PRICE_ID={created_products.get("pro", {}).get("prices", {}).get("year", "")}')
        
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS('Products and prices created successfully!'))
        self.stdout.write('=' * 80)


