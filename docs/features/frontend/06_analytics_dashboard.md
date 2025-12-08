# Frontend Feature: Analytics Dashboard

**Components:** `Analytics`, `SpendingPieChart`, `CashFlowBarChart`
**Page:** `/analytics`

## Overview
A data visualization suite providing deep insights into spending habits.

## Detailed Feature Specifications

### 1. Interactive Charts
*   **Spending by Category (Pie/Donut):**
    *   **Hover:** Tooltip shows specific amount and percentage.
    *   **Click:** (Optional) Drills down into that category's transactions list.
*   **Cash Flow (Bar):**
    *   Stacked bars for "Income" vs "Expenses" per month.

### 2. Date Range Controls
*   **Presets:** "Last 30 Days", "Last 90 Days", "This Year", "Last Year".
*   **Custom:** Date picker range.

## Rigorous Testing Steps

### Manual UI Testing

#### Scenario A: Chart Interaction
1.  **Action:** Hover over the largest slice of the Pie Chart.
2.  **Verify:** Tooltip appears. Values match the legend.

#### Scenario B: Period Switching
1.  **Action:** Note the total spending for "Last 30 Days".
2.  **Action:** Switch to "This Year".
3.  **Verify:** Chart animates/reloads. Totals increase (assuming usage > 30 days).

#### Scenario C: Empty State
1.  **Action:** Select a date range with no transactions (e.g., next year).
2.  **Verify:** Charts show "No data available" or empty state placeholder, not broken UI.
