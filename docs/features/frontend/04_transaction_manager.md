# Frontend Feature: Transactions Manager

**Components:** `Transactions`, `DataTable`, `TransactionEditModal`, `SplitModal`
**Page:** `/transactions`

## Overview
The most data-heavy part of the application. Requires a high-performance data table with filtering, sorting, and bulk editing capabilities.

## Detailed Feature Specifications

### 1. Data Table
*   **Library:** `@tanstack/react-table`.
*   **Columns:** Date, Merchant, Category (Badge), Account, Amount (Red/Green), Actions.
*   **Pagination:** Server-side pagination (10/20/50 rows per page).

### 2. Filtering & Search
*   **Search Bar:** Debounced input (searches merchant/notes).
*   **Filters:**
    *   **Date:** Date Range Picker (Start - End).
    *   **Category:** Multi-select dropdown.
    *   **Account:** Single select.

### 3. Transaction Splitting UI
*   **Modal:** triggered from Edit menu.
*   **Logic:**
    *   Row 1: Fixed (e.g., "Groceries" $60).
    *   Row 2: Dynamic (e.g., "Home" $40).
    *   **Validation:** Footer shows "Remaining Amount". Save button disabled unless Remaining == 0.

## Rigorous Testing Steps

### Manual UI Testing

#### Scenario A: Filtering
1.  **Action:** Open Date Picker -> Select "Last Month".
2.  **Verify:** Table updates. URL query params update (e.g., `?start=...&end=...`).
3.  **Action:** Refresh page.
4.  **Verify:** Filter persists (read from URL).

#### Scenario B: Bulk Categorization
1.  **Action:** Click checkboxes for 3 "Uber" transactions.
2.  **Action:** Click "Bulk Edit" button in header.
3.  **Action:** Select Category "Transport".
4.  **Verify:** All 3 rows update to "Transport".

#### Scenario C: Splitting Validation
1.  **Action:** Open Split Modal for a $100 transaction.
2.  **Action:** Add Split: $60.
3.  **Verify:** UI shows "$40 remaining". Save button Disabled.
4.  **Action:** Add Split: $50.
5.  **Verify:** UI shows "-$10 over". Save button Disabled.
6.  **Action:** Correct to $40.
7.  **Verify:** UI shows "$0 remaining". Save button Enabled.
