# Creating Test Transactions with Categories

This guide explains how to create test transactions with proper categories for testing categorization.

## Overview

Since Plaid Sandbox doesn't reliably return `personal_finance_category` data, we have two approaches:

1. **Direct Database Creation (Recommended)**: Create transactions directly in the database with proper categories
2. **Plaid Sandbox API**: Create transactions via Plaid API (may still have null categories)

## Recommended Approach: Direct Database Creation

This approach creates transactions directly in your database with proper categories mapped from the Plaid category taxonomy. This is more reliable for testing since it doesn't depend on Plaid Sandbox's unreliable category data.

## Usage

### Method 1: Direct Database Creation (Recommended)

#### 1. List Available Test Transaction Templates

```bash
cd backend
source venv/bin/activate
python manage.py create_test_transactions dummy --list-available
```

This shows all available test transaction templates with their expected categories.

#### 2. Create Test Transactions Directly in Database

```bash
# Get an account ID
python manage.py shell -c "from apps.accounts.models import Account; print([str(a.account_id) for a in Account.objects.all()[:1]])"

# Create 10 test transactions with proper categories
python manage.py create_test_transactions <account-id> --count 10

# Create 20 transactions spread over the past 60 days
python manage.py create_test_transactions <account-id> --count 20 --days-back 60
```

**Advantages:**
- ✅ Transactions are created immediately with proper categories
- ✅ Categories are correctly mapped using Plaid taxonomy
- ✅ No dependency on Plaid Sandbox API
- ✅ Works reliably for testing

### Method 2: Plaid Sandbox API (Alternative)

**Note:** This method may still result in transactions without categories due to Sandbox limitations.

```bash
# Create transactions via Plaid Sandbox API
python manage.py create_sandbox_transactions <account-id> --count 10

# Then sync to import them
# Via API or frontend: Click "Sync Now" on the account
```

## Important Notes

1. **Categories May Still Be Null**: Even with well-known merchant names, Plaid Sandbox may still return `null` for `personal_finance_category`. This is a known Sandbox limitation.

2. **Merchant Names Matter**: We use well-known merchant names (like "McDonald's", "Starbucks", "Amazon") that Plaid recognizes, which increases the chance of getting categories.

3. **Sync After Creation**: Transactions created via Sandbox API need to be synced to appear in your database.

4. **Categories Assigned Automatically**: Plaid assigns categories automatically based on merchant name and description - we can't specify categories directly in the create request.

## Available Test Transactions

The command includes pre-defined test transactions for:

- **Income**: Payroll, Dividends, Tax Refunds
- **Food & Dining**: Fast Food, Coffee, Groceries, Restaurants
- **Transportation**: Gas, Uber, Public Transit
- **Shopping**: Amazon, Target, Best Buy
- **Bills & Utilities**: Electric, Internet, Phone
- **Entertainment**: Netflix, Spotify, Movies
- **Healthcare**: Pharmacy, Doctor visits
- **Personal Care**: Gym, Hair Salon
- **Travel**: Airlines, Hotels

## Example Workflow

```bash
# 1. Get your account ID
python manage.py shell -c "from apps.accounts.models import Account; print([str(a.account_id) for a in Account.objects.all()[:1]])"

# 2. Create test transactions
python manage.py create_sandbox_transactions <your-account-id> --count 15

# 3. Sync the account (via frontend or API)
# 4. Check transactions in the UI - they should have categories if Plaid assigned them
```

## Troubleshooting

- **"Account not found"**: Make sure you're using the correct account UUID
- **"Account is not connected to Plaid"**: The account must have a Plaid access token
- **Transactions created but no categories**: This is expected in Sandbox - categories may still be null
- **Import errors**: Make sure the account is synced after creating transactions

## Alternative: Use Development Environment

For reliable category testing, use Plaid's Development environment where categories are properly populated:

1. Set `PLAID_ENV=development` in your `.env` file
2. Connect a real account (in development mode)
3. Categories will be automatically assigned by Plaid

