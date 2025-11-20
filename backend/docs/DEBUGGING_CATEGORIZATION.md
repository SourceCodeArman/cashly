# Debugging Transaction Categorization

This guide helps you debug why transactions are being categorized as "Other Expenses" or "Other Income".

## Debugging Steps

### 1. Check Django Logs

The categorization process now includes detailed logging. Check `backend/logs/django.log` for:

- `[PLAID DEBUG]` - Raw Plaid transaction data
- `[PLAID RAW DATA]` - First 5 transactions with full details
- `[CATEGORIZATION]` - Category mapping process

### 2. View Saved Plaid Responses

Plaid responses are automatically saved to `backend/logs/plaid_responses/` directory:

```bash
# List all saved responses
ls -lt backend/logs/plaid_responses/

# View the most recent response
cat backend/logs/plaid_responses/plaid_response_*.json | jq '.response.transactions[0]' | less
```

Each file contains:
- Full Plaid API response
- Account information
- Timestamp
- Transaction data including `personal_finance_category`

### 3. Check What Plaid Is Sending

Look for the `personal_finance_category` field in the saved JSON files:

```json
{
  "personal_finance_category": {
    "primary": "FOOD_AND_DRINK",
    "detailed": "FOOD_AND_DRINK_RESTAURANT"
  }
}
```

### 4. Verify Category Mappings

Check if the Plaid category exists in the mapping:

```python
# In Django shell
from apps.transactions.plaid_category_mapper import PLAID_DETAILED_CATEGORY_MAPPING, PLAID_PRIMARY_CATEGORY_MAPPING

# Check if a category exists
'FOOD_AND_DRINK_RESTAURANT' in PLAID_DETAILED_CATEGORY_MAPPING
'FOOD_AND_DRINK' in PLAID_PRIMARY_CATEGORY_MAPPING

# See what it maps to
PLAID_DETAILED_CATEGORY_MAPPING.get('FOOD_AND_DRINK_RESTAURANT')
```

### 5. Verify System Categories Exist

Ensure all system categories are created:

```bash
python manage.py create_system_categories
```

Then verify in Django shell:

```python
from apps.transactions.models import Category

# Check if categories exist
Category.objects.filter(is_system_category=True).values_list('name', 'type')
```

### 6. Common Issues

#### Issue: Plaid returns `null` for `personal_finance_category`
- **Cause**: Some transactions (especially transfers or pending transactions) don't have categories
- **Solution**: This is expected. Transactions without categories will use "Other Expenses" or "Other Income"

#### Issue: Category mapping exists but category not found in cache
- **Cause**: Category name mismatch (case sensitivity, spacing, etc.)
- **Solution**: Check the log output for "Available categories" to see what's actually in the cache

#### Issue: Mapping exists but wrong category type
- **Cause**: Plaid category type doesn't match transaction amount type
- **Solution**: Check the `[CATEGORIZATION]` logs to see the mapping process

### 7. Enable More Verbose Logging

To see more detailed logs, set logging level in Django settings:

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'INFO',  # Change to 'DEBUG' for more verbose
            ...
        },
    },
    'loggers': {
        'apps.transactions': {
            'level': 'INFO',  # Change to 'DEBUG' for more verbose
            ...
        },
    },
}
```

### 8. Test Categorization Manually

You can test categorization on a specific transaction:

```python
# In Django shell
from apps.transactions.models import Transaction
from apps.transactions.plaid_category_mapper import map_plaid_category_to_system_category

# Get a transaction
txn = Transaction.objects.first()

# Check its Plaid category
print(txn.plaid_category)

# Try to map it
if txn.plaid_category:
    category = map_plaid_category_to_system_category(
        txn.plaid_category,
        transaction_type='expense' if txn.amount < 0 else 'income',
        user=txn.user
    )
    print(f"Mapped to: {category}")
```

## Next Steps

After gathering the debug information:

1. Check if Plaid is sending `personal_finance_category` data
2. Verify the category names match exactly (case-sensitive)
3. Check if the mapped category exists in your database
4. Review the categorization logs to see where the process fails

