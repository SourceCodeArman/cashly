# Frontend Feature: Accounts Manager & Plaid Link

**Components:** `Accounts`, `PlaidLinkButton`, `AccountCard`
**Page:** `/accounts`

## Overview
Interface for managing bank connections. The complexity here lies in the seamless integration of the Plaid Link modal and the handling of various account states (syncing, error, active).

## Detailed Feature Specifications

### 1. Plaid Link Integration
*   **Library:** `react-plaid-link`.
*   **Flow:**
    1.  Fetch `link_token` from backend on component mount (or button click).
    2.  Open Plaid Modal.
    3.  On Success (`public_token` returned): Send to backend.
    4.  UI: Show "Connecting..." spinner.

### 2. Account List
*   **Display:** Grid of cards.
*   **Card Content:**
    *   Institution Logo (if available, else generic icon).
    *   Account Name ("Plaid Checking").
    *   Mask ("**** 1234").
    *   Current Balance.
*   **Actions:** "Sync Now" (refresh balance), "Unlink" (delete).

### 3. Manual Accounts
*   **Purpose:** Tracking cash or unsupported assets.
*   **Modal:** Simple form taking Name, Type, and Current Balance.

## Rigorous Testing Steps

### Manual UI Testing

#### Scenario A: Linking a Bank (Sandbox)
1.  **Action:** Click "Connect Bank".
2.  **Verify:** Plaid modal opens.
3.  **Action:** Select "Chase", Login `user_good`/`pass_good`.
4.  **Action:** Complete flow.
5.  **Verify:** Modal closes.
6.  **Verify:** Toast "Account connected successfully".
7.  **Verify:** New card appears in the grid *without* needing a page refresh (Optimistic UI or React Query invalidation).

#### Scenario B: Force Sync
1.  **Action:** Find an existing account card.
2.  **Action:** Click the "Refresh" (Sync) icon.
3.  **Verify:** Icon spins.
4.  **Verify:** Toast "Balance updated".

#### Scenario C: Manual Account Creation
1.  **Action:** Click "Add Manual Account".
2.  **Action:** Name: "Wallet Cash", Balance: "50".
3.  **Action:** Submit.
4.  **Verify:** Card "Wallet Cash" appears with balance $50.
