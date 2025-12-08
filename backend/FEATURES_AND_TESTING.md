# Backend Features & Testing Guide

This document details the backend architecture, feature set, and rigorous testing protocols for the Cashly API.

## 1. Authentication & User Management
**App:** `accounts`
**Base URL:** `/api/v1/auth/`

### Features
*   **Registration**: User creation with email unique validation.
*   **Login**: JWT (JSON Web Token) pair generation (Access/Refresh).
*   **MFA (Multi-Factor Authentication)**: TOTP-based 2FA setup and verification.
*   **Password Management**: Reset and Change password flows.

### Use Cases
1.  **New User Signup**: User submits email/password -> System creates account -> Returns JWT.
2.  **Secure Login**: User submits credentials -> System validates -> Checks MFA status -> Returns JWT or MFA challenge.
3.  **MFA Setup**: User requests setup -> System generates QR URI -> User verifies OTP -> MFA Enabled.

### Testing Steps

#### Automated Tests
Run the auth test suite:
```bash
python manage.py test apps.accounts.tests
```

#### Manual / Postman Testing
**Scenario: Full Auth Flow**
1.  **Register**:
    *   `POST /api/v1/auth/register/`
    *   Body: `{"email": "test@example.com", "password": "ComplexPassword123!", "first_name": "Test"}`
    *   **Expect**: `201 Created`, Returns `access` and `refresh` tokens.
2.  **Login (No MFA)**:
    *   `POST /api/v1/auth/login/`
    *   Body: `{"email": "test@example.com", "password": "ComplexPassword123!"}`
    *   **Expect**: `200 OK`, Returns tokens.
3.  **Enable MFA**:
    *   Auth Header: `Bearer <access_token>`
    *   `POST /api/v1/auth/mfa/setup/`
    *   **Expect**: `200 OK`, Returns `otp_uri` (for QR code) and `secret`.
4.  **Verify MFA**:
    *   `POST /api/v1/auth/mfa/verify/`
    *   Body: `{"code": "<6-digit-otp>"}`
    *   **Expect**: `200 OK`, `mfa_enabled` becomes `true`.

---

## 2. Financial Accounts (Plaid Integration)
**App:** `accounts`
**Base URL:** `/api/v1/accounts/`

### Features
*   **Link Token Generation**: Creates a secure session for Plaid Link.
*   **Public Token Exchange**: Swaps temporary public token for permanent access token.
*   **Account Sync**: Fetches and stores account details (Checking, Savings, Credit, etc.).
*   **Webhook Handling**: Processes real-time updates from Plaid.

### Use Cases
1.  **Link Bank**: User clicks "Connect Bank" -> Backend gets Link Token -> User completes Plaid flow -> Backend exchanges token -> Accounts saved.
2.  **Sync Balances**: Periodic background task updates account balances via Plaid API.

### Testing Steps

#### Automated Tests
```bash
python manage.py test apps.accounts.tests.test_plaid_service
```

#### Manual Testing (Sandbox)
1.  **Create Link Token**:
    *   `POST /api/v1/accounts/create_link_token/`
    *   **Expect**: `200 OK`, Returns `link_token`.
2.  **Exchange Token (Simulated)**:
    *   *Note: Requires a valid public_token from Plaid Sandbox frontend.*
    *   `POST /api/v1/accounts/exchange_public_token/`
    *   Body: `{"public_token": "public-sandbox-...", "metadata": {...}}`
    *   **Expect**: `200 OK`, Database populated with new `Account` records.
3.  **Verify Data**:
    *   `GET /api/v1/accounts/`
    *   **Expect**: List of accounts (e.g., "Plaid Checking", "Plaid Saving").

---

## 3. Transactions
**App:** `transactions`
**Base URL:** `/api/v1/transactions/`

### Features
*   **CRUD Operations**: Create (mostly automated), Read, Update (User edits), Delete.
*   **Categorization**: Rule-based and manual categorization.
*   **Splitting**: Dividing one transaction into multiple categories.
*   **Receipts**: Image/PDF upload and linking.

### Use Cases
1.  **View History**: User filters transactions by date range and account.
2.  **Split Expense**: User splits a $100 "Target" purchase into $50 "Groceries" and $50 "Home Goods".
3.  **Recategorize**: User changes "Uber" from "Travel" to "Transport".

### Testing Steps
1.  **List Transactions**:
    *   `GET /api/v1/transactions/?start_date=2024-01-01&end_date=2024-01-31`
    *   **Expect**: JSON list of transactions.
2.  **Split Transaction**:
    *   `POST /api/v1/transactions/{id}/split/`
    *   Body: `{"splits": [{"amount": 50, "category_id": "uuid-1"}, {"amount": 50, "category_id": "uuid-2"}]}`
    *   **Expect**: `200 OK`, Sum of splits must equal original amount.
3.  **Upload Receipt**:
    *   `POST /api/v1/transactions/{id}/receipts/`
    *   Form Data: `file=@receipt.jpg`
    *   **Expect**: `201 Created`.

---

## 4. Budgets
**App:** `budgets`
**Base URL:** `/api/v1/budgets/`

### Features
*   **Period Tracking**: Weekly/Monthly/Yearly budgets.
*   **Category Linking**: 1-to-1 mapping of budget to category.
*   **Alerts**: Configurable threshold (e.g., notify at 80% usage).

### Testing Steps
1.  **Create Budget**:
    *   `POST /api/v1/budgets/`
    *   Body: `{"category_id": "uuid", "amount": 500.00, "period_type": "monthly"}`
    *   **Expect**: `201 Created`.
2.  **Check Status**:
    *   `GET /api/v1/budgets/`
    *   **Expect**: Response includes `spent` vs `amount` and `remaining`.

---

## 5. Bills & Recurring Payments
**App:** `bills`
**Base URL:** `/api/v1/bills/`

### Features
*   **Recurring Logic**: Supports complex frequencies (bi-weekly, monthly on 3rd).
*   **Calendar Projection**: API to get bills due in a date range.
*   **Autopay Tracking**: Flagging bills as autopay vs manual.

### Testing Steps
1.  **Create Bill**:
    *   `POST /api/v1/bills/`
    *   Body: `{"name": "Netflix", "amount": 15.99, "frequency": "monthly", "due_day": 15}`
    *   **Expect**: `201 Created`, `next_due_date` calculated correctly.
2.  **Mark Paid**:
    *   `POST /api/v1/bills/{id}/pay/`
    *   **Expect**: `next_due_date` advances by one period.

---

## 6. Goals (Savings)
**App:** `goals`
**Base URL:** `/api/v1/goals/`

### Features
*   **Target Tracking**: Current vs Target amount.
*   **Contributions**: Manual logs or linked transaction automations.
*   **Plaid Transfer**: Authorizing transfers from linked accounts.

### Testing Steps
1.  **Create Goal**:
    *   `POST /api/v1/goals/`
    *   Body: `{"name": "Vacation", "target_amount": 2000.00}`
    *   **Expect**: `201 Created`.
2.  **Add Contribution**:
    *   `POST /api/v1/goals/{id}/contribute/`
    *   Body: `{"amount": 100.00, "date": "2024-10-01"}`
    *   **Expect**: `200 OK`, Goal `current_amount` increases.

---

## 7. Debt Management
**App:** `debts`
**Base URL:** `/api/v1/debts/`

### Features
*   **Account Tracking**: APR, Balances, Minimum Payments.
*   **Payoff Strategy**: Calculation endpoint for Snowball vs Avalanche methods.

### Testing Steps
1.  **Generate Strategy**:
    *   `GET /api/v1/debts/strategy/?type=avalanche&monthly_budget=1000`
    *   **Expect**: Ordered list of debts to pay, projected payoff date.

---

## 8. Analytics
**App:** `analytics`
**Base URL:** `/api/v1/analytics/`

### Features
*   **Spending by Category**: Aggregated transaction data.
*   **Cash Flow**: Income vs Expenses over time.
*   **Sankey Data**: specialized format for flow visualization.

### Testing Steps
1.  **Get Category Breakdown**:
    *   `GET /api/v1/analytics/spending_by_category/?period=last_30_days`
    *   **Expect**: JSON object `{"Groceries": 450.00, "Rent": 1200.00, ...}`.

