# Backend Feature: Transactions & Categorization

**App Component:** `apps.transactions`
**Primary Models:** `Transaction`, `Category`, `TransactionSplit`, `Receipt`

## Overview
The core of the financial tracking system. This module handles the ingestion, management, and classification of financial transactions. It supports complex features like splitting a single transaction into multiple categories and attaching receipt evidence.

## Detailed Feature Specifications

### 1. Transaction Management (CRUD)
*   **Listing:** `GET /api/v1/transactions/`
    *   **Filters:** `start_date`, `end_date`, `account_id`, `category_id`, `min_amount`, `max_amount`, `search` (merchant name).
    *   **Pagination:** Page-based (limit/offset).
*   **Updating:** `PATCH /api/v1/transactions/{id}/`
    *   Fields editable by user: `category`, `notes`, `date` (if manual), `is_recurring`.
*   **Creation:** Mostly handled via Plaid sync, but supports manual entry for cash accounts.

### 2. Splitting Transactions
*   **Endpoint:** `POST /api/v1/transactions/{id}/split/`
*   **Logic:**
    *   Takes a list of "splits" (Amount + Category).
    *   **Validation:** Sum of split amounts MUST equal the original transaction amount.
    *   **Storage:** Creates `TransactionSplit` records linked to the parent transaction.
    *   **Display:** Parent transaction remains, but reporting queries use the splits if present.

### 3. Categorization Engine
*   **Automatic:** When ingesting from Plaid, uses Plaid's `personal_finance_category` to map to internal `Category` model.
*   **Rules:** System supports user-defined rules (e.g., "If merchant contains 'Starbucks', set category to 'Coffee'").
*   **Manual:** User can override any category.

### 4. Receipt Management
*   **Endpoint:** `POST /api/v1/transactions/{id}/receipts/`
*   **Storage:** Uploads file to Cloudflare R2 (S3 compatible).
*   **Linking:** Stores reference in `Receipt` model.

## Rigorous Testing Steps

### Automated Testing
```bash
python manage.py test apps.transactions.tests
```

### Manual / API Scenario Testing

#### Scenario A: Filtering & Search
1.  **Action:** Call `/transactions/?search=Uber`.
2.  **Verify:** Only results with "Uber" in `merchant_name` are returned.
3.  **Action:** Call `/transactions/?min_amount=100`.
4.  **Verify:** No transactions < $100 are returned.

#### Scenario B: Complex Splitting
1.  **Setup:** Identify a transaction for $100.00.
2.  **Action:** Send Split Request:
    ```json
    {
      "splits": [
        { "amount": 60.00, "category_id": "uuid-food" },
        { "amount": 40.00, "category_id": "uuid-transport" }
      ]
    }
    ```
3.  **Verify:** 200 OK.
4.  **Edge Case:** Send splits summing to $99.99.
    *   **Expect:** 400 Bad Request ("Split amounts do not equal transaction total").

#### Scenario C: Receipt Upload
1.  **Action:** POST a JPEG image to `/receipts/` endpoint.
2.  **Verify:** Response includes `file_url`.
3.  **Verify:** Clicking the URL downloads/displays the image correctly.

#### Scenario D: Custom Categories
1.  **Action:** Create new category "Gaming" via `POST /categories/`.
2.  **Action:** Update a transaction to use this new category.
3.  **Verify:** Transaction details now reflect "Gaming".
