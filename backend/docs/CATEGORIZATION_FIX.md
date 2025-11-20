# Fixing Transaction Categorization Issue

## Problem
All transactions are being marked as "Other Expenses" and "Other Income" instead of proper categories.

## Root Cause Analysis

Based on the debug logs, we found:

1. **Plaid responses show `personal_finance_category: null`** - Plaid is not providing category data for transactions
2. **No transactions in sync range** - Recent syncs show `"transactions": []`, meaning no new transactions to sync
3. **Existing transactions already categorized as "Other"** - Transactions were previously synced and assigned default categories

## Why Plaid Categories Are Null

In Plaid's sandbox environment, `personal_finance_category` may be `null` for:
- Test transactions
- Certain transaction types (transfers, pending transactions)
- Transactions that Plaid hasn't categorized yet

## Solutions

### Option 1: Recategorize Existing Transactions (If Plaid Data Exists)

If transactions have `plaid_category` stored in the database, you can recategorize them:

```bash
# Recategorize all transactions with Plaid category data
python manage.py categorize_from_plaid --overwrite

# Recategorize for a specific user
python manage.py categorize_from_plaid --user-id=<user-id> --overwrite

# Dry run to see what would change
python manage.py categorize_from_plaid --dry-run
```

### Option 2: Use AI Categorization (If Available)

If AI categorization is enabled, transactions without Plaid categories can be categorized using AI:

```python
# In Django shell
from apps.transactions.models import Transaction
from apps.transactions.categorization import auto_categorize_transaction, apply_category_to_transaction

# Get uncategorized transactions
uncategorized = Transaction.objects.filter(category__isnull=True)

for txn in uncategorized[:10]:  # Test with first 10
    suggested = auto_categorize_transaction(txn)
    if suggested:
        apply_category_to_transaction(txn, suggested, user_modified=False)
        print(f"Categorized {txn.merchant_name} as {suggested.name}")
```

### Option 3: Manual Categorization via API

Use the bulk categorize endpoint:

```bash
# Get transaction IDs
curl -X POST http://localhost:8000/api/v1/transactions/bulk_categorize_from_plaid/ \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"transaction_ids": ["<id1>", "<id2>"]}'
```

### Option 4: Check Plaid Sandbox Test Data

Plaid sandbox may not provide categories for all test transactions. Try:

1. **Use Plaid's test credentials** that include category data
2. **Connect a real account** (in development mode) to get real category data
3. **Check Plaid dashboard** to see if categories are available for your test accounts

## Debugging Steps

1. **Check if transactions have Plaid category data stored:**
   ```python
   from apps.transactions.models import Transaction
   txns_with_plaid = Transaction.objects.exclude(plaid_category__isnull=True).exclude(plaid_category={})
   print(f"Transactions with Plaid data: {txns_with_plaid.count()}")
   for txn in txns_with_plaid[:5]:
       print(f"{txn.merchant_name}: {txn.plaid_category}")
   ```

2. **Check what categories are assigned:**
   ```python
   from django.db.models import Count
   from apps.transactions.models import Transaction
   Transaction.objects.values('category__name').annotate(count=Count('id')).order_by('-count')
   ```

3. **Check Plaid response files:**
   ```bash
   # View most recent response
   cat backend/logs/plaid_responses/plaid_response_*.json | jq '.response.transactions[0].personal_finance_category'
   ```

## Next Steps

1. Run the debug script to see current state:
   ```bash
   cd backend
   source venv/bin/activate  # or your virtualenv
   python debug_categorization.py
   ```

2. If transactions have `plaid_category` data, recategorize:
   ```bash
   python manage.py categorize_from_plaid --overwrite --dry-run  # Test first
   python manage.py categorize_from_plaid --overwrite  # Actually do it
   ```

3. If no Plaid data exists, consider:
   - Using AI categorization (if enabled)
   - Manually categorizing important transactions
   - Connecting real accounts for testing (if in development)

## Prevention

To prevent this in the future:

1. **Enable AI categorization** as a fallback when Plaid categories are missing
2. **Log warnings** when Plaid categories are null (already implemented)
3. **Use Plaid test credentials** that include category data
4. **Consider merchant name matching** as a fallback categorization method

