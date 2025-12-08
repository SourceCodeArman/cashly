# Frontend Features & Testing Guide

This document details the frontend architecture, user interface flows, and rigorous testing protocols for the Cashly React Application.

## 1. Authentication Flows
**Components:** `Login.tsx`, `Register.tsx`, `AuthLayout.tsx`

### Features
*   **Form Validation**: Zod schema validation for email format and password complexity.
*   **Error Handling**: Toast notifications for invalid credentials or server errors.
*   **Token Management**: Automatic storage of JWT in local storage/cookies.
*   **Protected Routes**: `ProtectedLayout` redirects unauthenticated users.

### Testing Steps (Manual UI)
1.  **Registration Validation**:
    *   Navigate to `/register`.
    *   Enter invalid email (e.g., "test").
    *   **Verify**: Input border turns red, "Invalid email" error appears.
    *   Enter short password.
    *   **Verify**: "Password must be at least 8 characters" error appears.
2.  **Successful Login**:
    *   Navigate to `/login`.
    *   Enter valid credentials.
    *   Click "Sign In".
    *   **Verify**: Redirects to `/dashboard`, "Welcome back" toast appears.
3.  **Route Protection**:
    *   Logout.
    *   Attempt to visit `/dashboard` directly in URL bar.
    *   **Verify**: Immediate redirect to `/login`.

---

## 2. Dashboard
**Page:** `Dashboard.tsx`

### Features
*   **Widgets**: "Net Worth", "Recent Transactions", "Budget Health".
*   **Visualizations**: Line chart for balance history, Pie chart for spending.
*   **Quick Actions**: "Add Transaction", "Transfer".

### Testing Steps
1.  **Data Loading**:
    *   Load page.
    *   **Verify**: Skeleton loaders appear while fetching.
    *   **Verify**: Charts render with animation after data loads.
2.  **Responsiveness**:
    *   Resize window to Mobile size (<768px).
    *   **Verify**: Sidebar collapses to hamburger menu, grid layout stacks vertically.

---

## 3. Accounts Management
**Page:** `Accounts.tsx`

### Features
*   **Plaid Link Integration**: Modal for connecting banks.
*   **Account Cards**: Displays balance, mask (last 4 digits), and type.
*   **Manual Accounts**: Form to add cash/offline accounts.

### Testing Steps
1.  **Connect Bank (Plaid Link)**:
    *   Click "Connect Account".
    *   Select "Chase" (Sandbox).
    *   Enter `user_good` / `pass_good`.
    *   Complete flow.
    *   **Verify**: New account card appears in list automatically (Optimistic update or refetch).
2.  **Refresh Balance**:
    *   Click "Refresh" icon on account card.
    *   **Verify**: Spinner indicates loading, toast confirms "Balance updated".

---

## 4. Transactions Interface
**Page:** `Transactions.tsx`

### Features
*   **Data Table**: Sortable columns (Date, Merchant, Amount, Category).
*   **Filtering**: Date Range Picker, Category Multi-select, Account Filter.
*   **Bulk Actions**: Select multiple -> Bulk Categorize / Delete.
*   **Edit Modal**: Change category, date, notes, or split transaction.

### Testing Steps
1.  **Search & Filter**:
    *   Type "Uber" in search bar.
    *   **Verify**: Table only shows Uber transactions.
    *   Select "Dining" category filter.
    *   **Verify**: Table shows only dining transactions.
2.  **Edit Transaction**:
    *   Click on a transaction row.
    *   Change category to "Entertainment".
    *   Save.
    *   **Verify**: Row updates immediately in the table.
3.  **Split Transaction UI**:
    *   Open Edit Modal.
    *   Click "Split".
    *   Add row.
    *   Enter amounts $10 and $20 (Total $30).
    *   **Verify**: Validation prevents saving if split total != transaction total.

---

## 5. Budgeting Tools
**Page:** `Budgets.tsx`

### Features
*   **Progress Bars**: Visual indicator of spent vs limit.
*   **Color Coding**: Green (Safe), Yellow (Warning >80%), Red (Over budget).
*   **Create Modal**: Select category, amount, and recurrence.

### Testing Steps
1.  **Create Budget**:
    *   Click "New Budget".
    *   Select "Groceries", Amount "500".
    *   Save.
    *   **Verify**: New budget card appears.
2.  **Visual Check**:
    *   Observe a budget where Spent > Limit.
    *   **Verify**: Progress bar is Red.

---

## 6. Goals & Savings
**Page:** `Goals.tsx`

### Features
*   **Goal Cards**: Circular progress indicators.
*   **Drag & Drop**: (If implemented) Reorder priority.
*   **Contribution Modal**: Add funds to a goal.

### Testing Steps
1.  **Add Goal**:
    *   Click "Create Goal".
    *   Name: "New Car", Target: "20000".
    *   Save.
    *   **Verify**: Goal appears with 0% progress.
2.  **Contribute**:
    *   Click "Add Funds".
    *   Amount: "1000".
    *   **Verify**: Progress updates (e.g., to 5%).

---

## 7. Bills Calendar
**Page:** `Bills.tsx`

### Features
*   **Calendar View**: Monthly view showing bill due dates.
*   **List View**: Sorted list of upcoming bills.
*   **Status Toggles**: Mark as "Paid".

### Testing Steps
1.  **View Switching**:
    *   Toggle between "List" and "Calendar".
    *   **Verify**: Data consistency (same bills shown).
2.  **Mark as Paid**:
    *   Find a bill due today.
    *   Click checkbox/button "Mark Paid".
    *   **Verify**: Bill moves to "Past/Paid" section or date updates to next month.

---

## 8. Analytics & Insights
**Page:** `Analytics.tsx`, `InsightsPage.tsx`

### Features
*   **Interactive Charts**: Recharts integration (Pie, Bar, Area).
*   **Date Range Control**: "Last 30 Days", "YTD", "Last Year".

### Testing Steps
1.  **Chart Interaction**:
    *   Hover over "Spending by Category" pie chart slice.
    *   **Verify**: Tooltip shows Category Name and Exact Amount.
2.  **Change Period**:
    *   Select "Last Year".
    *   **Verify**: Charts reload with new data context.

---

## 9. Settings
**Page:** `Settings.tsx`

### Features
*   **Theme Toggle**: Light/Dark/System mode.
*   **Profile Update**: Change Name/Email.
*   **Subscription Management**: Stripe Portal integration.

### Testing Steps
1.  **Theme Switch**:
    *   Toggle "Dark Mode".
    *   **Verify**: App background turns dark, text turns light immediately.
2.  **Update Profile**:
    *   Change First Name.
    *   Save.
    *   **Verify**: Header user avatar/name updates.

