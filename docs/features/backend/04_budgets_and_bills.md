# Backend Feature: Budgets & Recurring Bills

**App Components:** `apps.budgets`, `apps.bills`
**Primary Models:** `Budget`, `Bill`, `BillPayment`

## Overview
This feature set allows users to plan their finances. Budgets set spending limits on categories, while Bills track fixed recurring obligations.

## Detailed Feature Specifications

### 1. Budgeting Logic
*   **Model:** `Budget` links a `Category` to an `amount` and a `period` (monthly/weekly).
*   **Tracking:**
    *   Calculates `spent` amount dynamically by summing transactions in the target category for the current period.
    *   Calculates `remaining` balance.
*   **Alerts:** `alert_threshold` (default 80%) triggers a notification when spending crosses the line.

### 2. Bill Tracking
*   **Recurring Logic:**
    *   `frequency`: Monthly, Weekly, Bi-weekly, Yearly.
    *   `due_day`: Specific day of month (e.g., 5th).
    *   **Auto-Calculation:** `next_due_date` is automatically projected based on the last payment or creation date.
*   **Calendar Projection:**
    *   Endpoint: `GET /api/v1/bills/calendar/`
    *   Returns bill instances expanded over a date range for UI calendar views.

### 3. Bill Payments
*   **Endpoint:** `POST /api/v1/bills/{id}/pay/`
*   **Logic:**
    *   Records a `BillPayment`.
    *   Updates the Bill's `last_paid_date`.
    *   Advances `next_due_date` by one frequency interval.
    *   Optionally links to a real `Transaction` ID for reconciliation.

## Rigorous Testing Steps

### Automated Testing
```bash
python manage.py test apps.budgets.tests
python manage.py test apps.bills.tests
```

### Manual / API Scenario Testing

#### Scenario A: Budget Enforcement
1.  **Setup:** Create a Monthly budget of $500 for "Groceries".
2.  **Action:** Create transactions totaling $450 in "Groceries" for the current month.
3.  **Check:** Fetch Budget details.
    *   **Verify:** `spent` = 450, `progress` = 90%.
    *   **Verify:** `alert_triggered` = True (since > 80%).

#### Scenario B: Bill Cycle Logic
1.  **Setup:** Create a monthly bill due on the 10th. Current date: Jan 1st.
    *   **Verify:** `next_due_date` is Jan 10th.
2.  **Action:** Mark as Paid on Jan 9th.
3.  **Check:**
    *   `last_paid_date` = Jan 9th.
    *   `next_due_date` updates to **Feb 10th**.

#### Scenario C: Bi-Weekly Bills
1.  **Setup:** Create bi-weekly bill due Jan 1st.
2.  **Action:** Mark Paid.
3.  **Verify:** Next due date is Jan 15th (14 days later), not Feb 1st.

#### Scenario D: Calendar Projection
1.  **Action:** Request bill calendar for next 3 months.
2.  **Verify:** A monthly bill appears 3 times in the response (once per month).
