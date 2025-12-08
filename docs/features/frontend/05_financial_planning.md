# Frontend Feature: Financial Planning (Budgets & Bills)

**Components:** `Budgets`, `Bills`, `BudgetCard`, `BillCalendar`
**Pages:** `/budgets`, `/bills`

## Overview
Visual tools for forward-looking financial management.

## Detailed Feature Specifications

### 1. Budget Progress Cards
*   **Visual:** Card with a large progress bar.
*   **Logic:**
    *   Green: < 80% spent.
    *   Yellow: 80-100% spent.
    *   Red: > 100% spent.
*   **Content:** "$450 / $500", "5 days left in period".

### 2. Bills Calendar View
*   **Library:** `react-day-picker` (customized) or `react-big-calendar`.
*   **Display:**
    *   Days with bills have dots/markers.
    *   Clicking a day shows a popover with list of bills due.
*   **Status:** Paid bills shown dimmed/crossed out.

## Rigorous Testing Steps

### Manual UI Testing

#### Scenario A: Creating a Budget
1.  **Action:** Click "New Budget".
2.  **Action:** Select Category "Dining", Amount $200.
3.  **Action:** Save.
4.  **Verify:** New card appears.
5.  **Verify:** Progress bar immediately reflects existing dining transactions for the month.

#### Scenario B: Bill Payment
1.  **Action:** Go to Bills List view.
2.  **Action:** Click "Mark Paid" on "Netflix".
3.  **Verify:** Item moves to "Paid" tab/section.
4.  **Verify:** "Next Due" date on the item updates to next month.

#### Scenario C: Over-Budget Visuals
1.  **Pre-req:** Have a budget of $100. Spend $150.
2.  **Action:** View Budget page.
3.  **Verify:** Bar is Red. Text says "Over by $50".
