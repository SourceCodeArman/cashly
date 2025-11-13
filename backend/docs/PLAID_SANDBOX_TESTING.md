# Plaid Sandbox Testing Guide

## Transaction Categories in Sandbox

### ⚠️ Known Limitation: Categories Are Not Reliably Returned in Sandbox

**Important:** Even with `user_transactions_dynamic`, Plaid Sandbox may still return `null` for categories. This is a **known limitation** of the Sandbox environment.

### Issue: Categories Shown in Link UI But Not in API Response

When testing in Plaid Sandbox, you may notice that:
- **Plaid Link UI** shows categories during the "Review Data" step
- **API Response** from `/transactions/get` returns `null` for `category` and `personal_finance_category` fields
- **Even with `user_transactions_dynamic`**, categories may still be `null`

**Why this happens:**
- The Link UI displays categories for **illustrative/display purposes only**
- These categories are **not guaranteed to be in the API response**
- Sandbox is designed for integration testing, not data completeness testing
- Categories shown in Link are part of the UI simulation, not actual API data

**This is expected behavior and not a bug in your code.**

### Solution: Use `user_transactions_dynamic` Test User

**⚠️ Important Note:** Even with `user_transactions_dynamic`, Plaid Sandbox may still return `null` for categories. This is a known limitation of the Sandbox environment. The categories shown in Plaid Link UI are for display purposes only and may not be present in the API response.

**Test User:** `user_transactions_dynamic`
**Password:** Any non-blank password (e.g., `pass_good`)

#### How to Use:

1. **In Plaid Link:**
   - When connecting a test account in Sandbox, use:
     - **Username:** `user_transactions_dynamic`
     - **Password:** `pass_good` (or any non-blank password)
   - This test user provides more realistic transaction data, but categories may still be null

2. **Expected Behavior:**
   - Transactions may still have `null` categories even with this test user
   - Categories shown in Link UI are not guaranteed to be in API responses
   - This is a known Sandbox limitation

### Alternative: Create Custom Transactions with Categories

You can manually create transactions with categories using the `/sandbox/transactions/create` endpoint. However, note that:

1. **Legacy Category Field Only:** The sandbox API supports the legacy `category` field (array of strings), not `personal_finance_category`
2. **Works with `user_transactions_dynamic`:** Can only be used with Items created using `user_transactions_dynamic`
3. **Manual Creation Required:** You must manually create each transaction with categories

#### Example Usage:

```python
from apps.transactions.sandbox_utils import create_sandbox_transaction_with_category
from apps.accounts.models import Account

# Get account instance
account = Account.objects.get(account_id='your-account-id')

# Create a transaction with category
result = create_sandbox_transaction_with_category(
    account=account,
    amount=-12.50,
    merchant_name="McDonald's",
    category=["Food and Drink", "Fast Food"],
    description="McDonald's lunch",
)

# Or create multiple test transactions
from apps.transactions.sandbox_utils import create_test_transactions_with_categories

created = create_test_transactions_with_categories(account, count=5)
```

#### Using the Management Command:

You can also create a Django management command to populate test transactions:

```python
# apps/transactions/management/commands/create_sandbox_transactions.py
from django.core.management.base import BaseCommand
from apps.accounts.models import Account
from apps.transactions.sandbox_utils import create_test_transactions_with_categories

class Command(BaseCommand):
    help = 'Create test transactions with categories in Sandbox'

    def add_arguments(self, parser):
        parser.add_argument('account_id', type=str, help='Account ID')
        parser.add_argument('--count', type=int, default=5, help='Number of transactions to create')

    def handle(self, *args, **options):
        account = Account.objects.get(account_id=options['account_id'])
        created = create_test_transactions_with_categories(account, count=options['count'])
        self.stdout.write(self.style.SUCCESS(f'Created {len(created)} transactions'))
```

**Note:** 
- Categories created this way use the legacy `category` field format
- These transactions will have categories when retrieved via `/transactions/get`
- Our application handles both legacy `category` and `personal_finance_category` fields

### Default Test Users

Plaid Sandbox provides several test users:

- **`user_good`**: Standard test user (categories may be null)
- **`user_transactions_dynamic`**: Returns transactions with categories ✅
- **`user_custom_identity`**: For identity testing
- **`user_required_oauth`**: For OAuth flow testing

### Testing Categories in Production/Development

**The Only Reliable Way to Test Categories:**

In Production and Development environments, categories are automatically populated by Plaid based on transaction data from the financial institution. **This is the recommended way to test category functionality.**

**Sandbox Limitations:**
- Categories are not reliably returned, even with `user_transactions_dynamic`
- Link UI may show categories, but API responses may not include them
- This is a known limitation and is expected behavior

**Recommendation:**
- For development/testing: Use Development environment if available
- For production: Categories will be automatically populated
- For Sandbox: Accept that categories will be null and test your fallback logic (AI categorization, default categories, etc.)

### Current Implementation

Our application handles missing categories gracefully:

1. **If `personal_finance_category` exists:** Maps to our system categories using `plaid_category_mapper.py`
2. **If legacy `category` field exists:** Can be mapped to our system categories
3. **If category is null (Sandbox case):** Falls back to:
   - AI categorization (if enabled)
   - Default "Other Expenses" or "Other Income" categories
   - User can manually categorize later

**This means:**
- Your application will work correctly even when categories are null
- Sandbox is useful for testing the fallback logic (AI categorization, default categories)
- For testing actual category mapping, use Development or Production environments

### References

- [Plaid Sandbox Documentation](https://plaid.com/docs/sandbox/)
- [Testing Transactions in Sandbox](https://plaid.com/docs/transactions/#testing-transactions-in-sandbox)
- [Sandbox Transactions Create API](https://plaid.com/docs/api/sandbox/#sandboxtransactionscreate)

