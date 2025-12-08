# Backend Feature: Analytics & Reporting

**App Component:** `apps.analytics`
**Primary ViewSets:** `AnalyticsViewSet`

## Overview
Provides read-only, highly aggregated data for visualization. Optimized for performance using database-level aggregation (SQL `GROUP BY`) rather than Python-level processing.

## Detailed Feature Specifications

### 1. Spending by Category
*   **Endpoint:** `GET /api/v1/analytics/spending_by_category/`
*   **Query Params:** `start_date`, `end_date`.
*   **Logic:** Sums transaction amounts grouped by `category__name`.
*   **Output:**
    ```json
    [
      { "category": "Housing", "amount": 1200.00, "color": "#FF0000" },
      { "category": "Food", "amount": 450.50, "color": "#00FF00" }
    ]
    ```

### 2. Cash Flow (Income vs Expense)
*   **Endpoint:** `GET /api/v1/analytics/cash_flow/`
*   **Granularity:** Daily or Monthly.
*   **Logic:** Separates transactions into `amount > 0` (Income) and `amount < 0` (Expense) and groups by date.

### 3. Net Worth History
*   **Endpoint:** `GET /api/v1/analytics/net_worth/`
*   **Logic:** Snapshots of (Sum of Asset Accounts - Sum of Liability Accounts) over time.

## Rigorous Testing Steps

### Automated Testing
```bash
python manage.py test apps.analytics.tests
```

### Manual / API Scenario Testing

#### Scenario A: Date Filtering
1.  **Setup:** Create transaction in Jan 2023 and Jan 2024.
2.  **Action:** Request Analytics for 2024.
3.  **Verify:** The 2023 transaction contributes $0 to the totals.

#### Scenario B: Category Hierarchy
1.  **Setup:** Category "Food" has subcategory "Groceries".
2.  **Action:** Transaction in "Groceries".
3.  **Verify:** spending_by_category can optionally roll up "Groceries" into "Food" total if `rollup=true` param is passed (if implemented), otherwise shows "Groceries" specifically.

#### Scenario C: Performance (Load Test)
1.  **Setup:** Seed database with 10,000 transactions.
2.  **Action:** Request Spending by Category.
3.  **Verify:** Response time < 200ms (ensures DB indexing is working).
