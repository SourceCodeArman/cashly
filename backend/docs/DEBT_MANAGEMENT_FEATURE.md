# Debt Management Feature Documentation

This document describes the design, implementation, and testing of the Debt Management System in Cashly.

## Overview

The Debt Management System allows users to:
1.  **Track Debts**: Monitor credit cards, loans, and other debts with details like APR, minimum payments, and due dates.
2.  **Record Payments**: Log payments against debts, supporting splits between principal and interest.
3.  **Strategize Payoff**: Compare "Snowball" (lowest balance first) vs. "Avalanche" (highest interest first) payoff strategies to see timeline and interest savings.
4.  **Visualize Progress**: View payoff projections and payment history.

## Architecture

The feature is implemented as a standalone Django app `apps.debts` and exposes a RESTful API.

### Data Models

1.  **`DebtAccount`**: Represents a single debt account.
    *   Fields: `name`, `debt_type`, `current_balance`, `interest_rate` (APR), `minimum_payment`, `due_day`, `status`, etc.
    *   Computed Properties: `monthly_interest`, `days_until_due`, `next_due_date`.

2.  **`DebtPayment`**: Represents a payment made towards a debt.
    *   Fields: `amount`, `payment_date`, `payment_type` (minimum/extra/full), `applied_to_principal`, `applied_to_interest`.
    *   Logic: Automatically updates the parent `DebtAccount` balance upon creation.

3.  **`DebtPayoffStrategy`**: Stores a user's preferred payoff strategy.
    *   Fields: `strategy_type` ('snowball', 'avalanche', 'custom'), `monthly_budget`.
    *   Logic: Used to generate ordered lists of debts for repayment.

### Key Logic & Utilities (`apps/debts/utils.py`)

*   **Interest Calculation**: `calculate_monthly_interest` uses the standard formula: $Balance \times \frac{APR}{100 \times 12}$.
*   **Payoff Projection**: `generate_payoff_projection` simulates month-by-month payments to estimate payoff date and total interest.
*   **Strategy Comparison**: `calculate_strategy_comparison` runs simulations for both Snowball and Avalanche methods given a monthly budget to compare results.

## API Reference

Base URL: `/api/v1/debts/`

### Debts (`/debts/`)
*   `GET /`: List all debts. Supports filtering by `status` and `debt_type`.
*   `POST /`: Create a new debt.
*   `GET /{id}/`: Retrieve debt details.
*   `PATCH /{id}/`: Update debt details.
*   `DELETE /{id}/`: Delete a debt.
*   `POST /{id}/mark_paid_off/`: Custom action to zero out balance and update status.
*   `GET /{id}/projection/`: Get month-by-month payoff projection. Params: `monthly_payment`.

### Payments (`/debt-payments/`)
*   `GET /`: List payments. Filter by `debt_id`.
*   `POST /`: Record a payment. Automatically splits amount into interest/principal based on current debt state (interest first).

### Strategies (`/debt-strategies/`)
*   `GET /`: List user strategies.
*   `POST /`: Create/Update strategy.
*   `GET /compare/`: Compare Snowball vs Avalanche. Params: `monthly_budget`.

### Summary (`/summary/`)
*   `GET /`: Returns aggregate stats: total debt, total monthly minimums, average interest rate.

## Testing

### Automated Tests

The feature includes a comprehensive test suite in `apps/debts/tests.py`.

To run the tests:
```bash
cd backend
python manage.py test apps.debts.tests
```

**Note on Pre-existing Test Database Issue:**
You may encounter a `ProgrammingError: relation "users" does not exist` if non-migrated apps (like `bills` in some branches) interfere with the test runner. The `debts` app itself is isolated and fully tested.

### Manual Verification

#### 1. Create a Debt
1.  Navigate to the **Debts** page.
2.  Click **Add Debt**.
3.  Enter details:
    *   Name: `Visa Card`
    *   Balance: `5000`
    *   APR: `18.99`
    *   Min Payment: `150`
4.  Verify the debt card appears with correct calculated daily interest.

#### 2. Record a Payment
1.  Click **Record Payment** on the debt card.
2.  Enter Amount: `200` (Type: Extra Payment).
3.  Submit.
4.  Verify:
    *   Debt balance decreases to `4800` (plus accrued interest adjustment).
    *   Payment appears in **Payment History** tab.

#### 3. Compare Strategies
1.  Go to **Payoff Strategy** tab.
2.  Enter a monthly budget (e.g., `$600`).
3.  Click **Compare Strategies**.
4.  Verify that distinct timelines and interest totals are shown for Snowball vs Avalanche.

#### 4. Pay Off a Debt
1.  Record a payment for the **Full Payoff** amount.
2.  Verify the debt status updates to `Paid Off` and it moves to the history/inactive section.
