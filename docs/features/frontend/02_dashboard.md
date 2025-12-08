# Frontend Feature: Dashboard

**Components:** `Dashboard`, `SummaryWidget`, `RecentTransactions`, `SpendingChart`
**Page:** `/dashboard`

## Overview
The command center of the application. It aggregates data from multiple backend endpoints to give an at-a-glance view of financial health.

## Detailed Feature Specifications

### 1. Summary Widgets
*   **Net Worth:** Calculated sum of all accounts. Color-coded (Green if positive, Red if negative).
*   **Monthly Spending:** Total expense transactions for current month.
*   **Active Budgets:** Count of budgets currently "At Risk" or "Over".

### 2. Visualizations
*   **Library:** `recharts`.
*   **Spending Trend:** Area chart showing spending over last 30 days.
*   **Category Breakdown:** Donut chart of top 5 spending categories.

### 3. Responsive Layout
*   **Desktop:** 3-column grid. Widgets top, Charts middle, Recent Transactions list bottom/side.
*   **Mobile:** Single column stack. Hamburger menu for navigation.

## Rigorous Testing Steps

### Manual UI Testing

#### Scenario A: Loading State
1.  **Action:** Refresh the page.
2.  **Verify:** All widgets show Skeleton loaders (gray pulsing boxes) for ~500ms.
3.  **Verify:** No layout shift ("jumping") when real data loads.

#### Scenario B: Data Accuracy
1.  **Pre-req:** Create a transaction for $1000 "Rent".
2.  **Action:** Check "Monthly Spending" widget.
3.  **Verify:** It includes the $1000.
4.  **Action:** Delete that transaction.
5.  **Action:** Refresh Dashboard.
6.  **Verify:** Widget decreases by $1000.

#### Scenario C: Mobile View
1.  **Action:** Open Chrome DevTools -> Toggle Device Toolbar (Mobile).
2.  **Verify:** Sidebar disappears.
3.  **Verify:** "Menu" button appears in top header.
4.  **Verify:** Widgets stack vertically, no horizontal scrolling required.
