# Backend Feature: Goals & Savings

**App Component:** `apps.goals`
**Primary Models:** `Goal`, `Contribution`, `TransferAuthorization`

## Overview
Enables users to set financial targets (e.g., "New Car", "Emergency Fund") and track progress. It integrates with Plaid to allow *real* money movement via Transfer Authorization if enabled.

## Detailed Feature Specifications

### 1. Goal Management
*   **Fields:** `target_amount`, `current_amount` (calculated), `deadline` (date).
*   **Progress:** `(current / target) * 100`.
*   **Status:** Active, Achieved, Archived.

### 2. Contributions
*   **Endpoint:** `POST /api/v1/goals/{id}/contribute/`
*   **Manual:** User manually logs "I saved $50".
*   **Automated (Rules):** "Round-up" logic or "Save 5% of income" rules trigger automatic creation of contribution records.
*   **Sync:** Every contribution updates the parent Goal's `current_amount`.

### 3. Plaid Transfer Integration (Advanced)
*   **Logic:**
    *   Uses Plaid's `/transfer/authorization/create` API.
    *   Ensures user has sufficient funds in source account.
    *   If approved, executes transfer to the designated "Savings" account.
    *   **Security:** Requires explicit `TransferAuthorization` record before execution.

## Rigorous Testing Steps

### Automated Testing
```bash
python manage.py test apps.goals.tests
```

### Manual / API Scenario Testing

#### Scenario A: Goal Lifecycle
1.  **Create:** POST `/goals/` -> "Vacation", Target $2000.
2.  **Contribute:** POST `/contribute/` -> $500.
3.  **Verify:** Goal `current_amount` is 500, `progress` is 25%.
4.  **Achieve:** Contribute remaining $1500.
    *   **Verify:** Goal status changes to `is_completed: true`.

#### Scenario B: Deadline Projection
1.  **Setup:** Goal $1200, Deadline in 12 months (1 year). Current savings $0.
2.  **Action:** Calculate "Required Monthly Contribution".
    *   **Expect:** Logic returns $100/month.
3.  **Action:** Contribute $600 immediately.
    *   **Expect:** Required monthly drops to ~$50/month for remaining 12 months.

#### Scenario C: Negative Contributions (Withdrawals)
1.  **Action:** Contribute -$100 (Withdrawal).
2.  **Verify:** Goal `current_amount` decreases.
3.  **Verify:** Logic handles going below 0 gracefully (clamps to 0 if needed, or allows negative if debt).
