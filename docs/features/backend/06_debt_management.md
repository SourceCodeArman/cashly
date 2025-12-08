# Backend Feature: Debt Management

**App Component:** `apps.debts`
**Primary Models:** `DebtAccount`, `DebtPayment`

## Overview
Specialized module for tracking liability accounts (Credit Cards, Loans) and generating mathematical strategies to pay them off efficiently.

## Detailed Feature Specifications

### 1. Debt Account Modeling
*   **Fields:** `apr` (Interest Rate), `minimum_payment`, `current_balance`.
*   **Differentiating:** Unlike standard accounts, these focus on *negative* net worth and interest accumulation.

### 2. Payoff Strategies (The "Brain")
*   **Endpoint:** `GET /api/v1/debts/strategy/`
*   **Inputs:** `monthly_budget` (amount user can pay total per month).
*   **Algorithms:**
    *   **Snowball:** Sort debts by *Balance Ascending*. Pay min on all, throw excess at smallest balance. Psychological win.
    *   **Avalanche:** Sort debts by *APR Descending*. Pay min on all, throw excess at highest interest. Mathematically optimal.
*   **Output:** Ordered list of payments for the current month and projected "Debt Free Date".

## Rigorous Testing Steps

### Automated Testing
```bash
python manage.py test apps.debts.tests
```

### Manual / API Scenario Testing

#### Scenario A: Payoff Calculation (Snowball)
1.  **Setup:**
    *   Debt A: $1000 @ 20% APR (Min $25)
    *   Debt B: $5000 @ 5% APR (Min $100)
    *   Budget: $500/month.
2.  **Action:** Request Snowball Strategy.
3.  **Verify:**
    *   Debt A Payment: $400 (Budget - Min B).
    *   Debt B Payment: $100 (Min B).
    *   **Logic:** Focuses fire on Debt A first because it has lower balance.

#### Scenario B: Payoff Calculation (Avalanche)
1.  **Setup:** Same as above.
2.  **Action:** Request Avalanche Strategy.
3.  **Verify:**
    *   Debt A Payment: $400 (Budget - Min B) -> *Coincidentally same as Snowball here because A has higher rate too.*
    *   *Variation:* Change Debt B APR to 30%.
    *   **New Verify:** Debt B gets $475 (Budget - Min A), Debt A gets $25.

#### Scenario C: Insufficient Budget
1.  **Action:** Request strategy with Budget $50.
2.  **Expect:** Error/Warning. "Budget $50 is less than minimum payments total ($125)".
