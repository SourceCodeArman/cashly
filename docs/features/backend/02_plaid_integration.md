# Backend Feature: Plaid Integration & Account Management

**App Component:** `apps.accounts`
**Primary Models:** `Account`, `PlaidItem` (implied context)

## Overview
This feature manages the secure connection to external financial institutions using Plaid. It handles the "Link" flow, exchanging public tokens for permanent access tokens, and synchronizing account data (balances, account numbers, types) securely.

## Detailed Feature Specifications

### 1. Link Token Generation
*   **Endpoint:** `POST /api/v1/accounts/create_link_token/`
*   **Purpose:** secure initialization of the frontend Plaid Link widget.
*   **Logic:**
    *   Communicates with Plaid API (`/link/token/create`).
    *   Passes `client_user_id` (hashed user ID) for internal tracking.
    *   Configures allowed products: `['transactions', 'auth']`.
    *   Sets webhook URL for real-time updates.

### 2. Public Token Exchange
*   **Endpoint:** `POST /api/v1/accounts/exchange_public_token/`
*   **Purpose:** Finalize the connection and store credentials.
*   **Logic:**
    *   Receives `public_token` from frontend.
    *   Calls Plaid `/item/public_token/exchange`.
    *   Receives `access_token` and `item_id`.
    *   **Security:** Encrypts and stores the `access_token`.
    *   Immediately triggers an initial balance/transaction sync.

### 3. Account Synchronization
*   **Endpoint:** `GET /api/v1/accounts/` (List), `POST /api/v1/accounts/{id}/sync/` (Force Sync)
*   **Logic:**
    *   Fetches latest balances via Plaid `/accounts/balance/get`.
    *   Updates local `Account` records.
    *   Maps Plaid types (e.g., `depository`) to internal types (`checking`, `savings`).
    *   Handles "mask" (last 4 digits) for UI display.

### 4. Webhook Handling
*   **Endpoint:** `POST /api/v1/webhooks/plaid/`
*   **Events Handled:**
    *   `SYNC_UPDATES_AVAILABLE`: Triggers background celery task to fetch new transactions.
    *   `ITEM_LOGIN_REQUIRED`: Marks account as "Needs Attention" (re-auth flow).

## Rigorous Testing Steps

### Automated Testing
Run the Plaid service integration tests:
```bash
python manage.py test apps.accounts.tests.test_plaid_service
```

### Manual / Sandbox Testing

#### Scenario A: Connect New Bank
1.  **Prerequisite:** Valid Plaid Sandbox credentials in `.env`.
2.  **Step 1 (Get Token):** Call `/create_link_token/`.
    *   **Verify:** Response contains `link_token` (starts with `link-sandbox-...`).
3.  **Step 2 (Simulate Frontend):**
    *   *Note:* You cannot generate a public token via API only. You must use the Plaid Dashboard or a test utility to get a `public_token` for the sandbox environment.
    *   Call `/exchange_public_token/` with `{"public_token": "public-sandbox-..."}`.
    *   **Verify:** HTTP 200 OK.
    *   **Verify:** Database table `accounts_account` has new rows (e.g., "Plaid Checking").

#### Scenario B: Balance Updates
1.  **Action:** Trigger a manual sync via `/accounts/{id}/sync/`.
2.  **Mocking:** In Sandbox, use Plaid's "Fire Webhook" tool to simulate a balance change.
3.  **Verify:** `current_balance` field in database updates to match the mocked value.

#### Scenario C: Error Handling
1.  **Invalid Token:** Try exchanging a fake/expired public token.
    *   **Expect:** 400 Bad Request (Plaid API Error).
2.  **Duplicate Link:** Try linking the same bank account twice.
    *   **Expect:** 400 Bad Request ("Item already exists").
