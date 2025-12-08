# Cashly Development To-Do List

> **Last Updated:** November 2025 - Major UI Overhaul & Feature Release
> 
> **Key Updates:**
> - ✅ **UI Overhaul**: Complete redesign with new Sidebar, Dashboard Widgets, and responsive layout.
> - ✅ **Admin Dashboard**: Comprehensive admin interface for user management, system stats, and database monitoring.
> - ✅ **Budgeting System**: Fully implemented (Backend & Frontend).
> - ✅ **Subscriptions System**: Fully implemented (Stripe integration, models, views, frontend components, separate Subscription page)
> - ✅ **Notifications System**: Backend fully implemented (models, serializers, views, URLs, API endpoints, helper functions in tasks.py)
> - ✅ **Notifications Frontend**: Service, hooks, and Notifications page implemented
> - ✅ **Notifications**: Email service, NotificationPreference model, and scheduled Celery tasks fully implemented
> - ✅ **Settings Page**: Fully implemented with Profile (phone number), Security (password change), Preferences (notifications), and Accounts (list/disconnect) tabs.
> - ✅ **Settings Enhancements**: Password change, notification preferences, and account management implemented. Subscription management remains on separate page.


### Core Infrastructure (Fully Implemented)










## High Priority - Core Features

### 1. Budgeting System Implementation
  - [x] Write tests:
    - [x] Test budget CRUD operations
    - [x] Test budget calculations
    - [x] Test budget alerts
    - [x] Test permissions

- [x] **Backend - Budget Utilities** (Optional enhancement)
  - [x] Create `backend/apps/budgets/utils.py`:
    - [x] `get_budget_status(budget)` - Return status (on track, warning, exceeded) - Currently in view method
    - [x] `get_budgets_needing_alerts(user)` - Find budgets approaching/exceeding limits
    - [x] `get_active_budgets_for_period(user, month, year)` - Get budgets for specific period

### 2. Notifications & Alerts System
  - [x] `NotificationPreference` model (user preferences) - NOT YET IMPLEMENTED
  - [x] **Backend - Notification Service**
    - [x] Create `backend/apps/notifications/notification_service.py` (Implemented in `tasks.py`):
      - [x] `create_notification(user, type, title, message)` - Create in-app notification
      - [x] `send_email_notification(user, type, context)` - Send email
      - [x] `send_budget_alert(user, budget)` - Budget exceeded/approaching alert
    - [x] `send_goal_milestone_notification(user, goal, milestone)` - Goal milestone reached
    - [x] `send_transaction_alert(user, transaction)` - Unusual transaction alert
    - [x] Check user preferences before sending
    - [x] `NotificationType` enum - PARTIALLY IMPLEMENTED (types exist in backend)
    - [x] Real-time updates (WebSocket or polling) - NOT YET IMPLEMENTED


### 3. Settings Page Enhancements
  - [x] Email change with verification flow
  - [x] Add email change verification flow
  - [x] Create `frontend/src/components/settings/ProfileForm.tsx` (Inline in Settings.tsx)
  - [x] Create `frontend/src/components/settings/SecuritySettings.tsx` (Inline in Settings.tsx)

### 4. Sankey Diagram Visualization (Pro/Premium Feature)
  - [x] Create `backend/apps/analytics/sankey.py`:
    - [x] `get_sankey_data(user, start_date, end_date)` - Generate Sankey diagram data
    - [x] Flow: Income → Categories → Subcategories (or Income → Accounts → Categories)
    - [x] Calculate flow amounts between nodes
    - [x] Support multiple date ranges (monthly, quarterly, yearly)
  - [x] Add endpoint in `backend/apps/analytics/views.py`:
    - [x] `SankeyView` - GET `/api/v1/analytics/sankey/`
    - [x] Require Pro or Premium subscription tier
    - [x] Date range filtering
    - [x] Optional filters (accounts, categories)
  - [x] Add serializer in `backend/apps/analytics/serializers.py`:
    - [x] `SankeyDataSerializer` - Nodes and links structure
    - [x] Format compatible with frontend charting library

  - [x] Create `frontend/src/components/analytics/SankeyDiagram.tsx`:
    - [x] Use charting library (recharts, plotly, or d3-sankey)
    - [x] Interactive diagram with hover tooltips
    - [x] Show flow amounts on links
    - [x] Color coding by category type
    - [x] Responsive design
  - [x] Create `frontend/src/services/analyticsService.ts` method:
    - [x] `getSankeyData(startDate, endDate, filters?)` - Fetch Sankey data
  - [x] Add to Analytics page or create dedicated Sankey page
  - [x] Add subscription tier check (Pro/Premium only)
  - [x] Show upgrade prompt for Free tier users

  - [x] Add Sankey diagram to Analytics page
  - [x] Add date range selector
  - [x] Add export functionality (PNG/SVG)
  - [x] Add to dashboard as premium widget (optional)

### 5. Enhanced Analytics
- [x] **Backend - Advanced Analytics**
  - [x] Update `backend/apps/analytics/utils.py`:
    - [x] `get_spending_trends(user, months)` - Month-over-month trends
    - [x] `get_category_trends(user, category, months)` - Category-specific trends
    - [x] `get_spending_patterns(user, month, year)` - Day of week, time of month patterns
    - [x] `calculate_net_worth(user)` - Net worth calculation
    - [x] `get_income_vs_expense(user, month, year)` - Income vs expense comparison
    - [x] `get_top_categories(user, month, year, limit)` - Top spending categories
    - [x] `get_spending_forecast(user, months)` - Future spending predictions

- [x] **Backend - Analytics Endpoints**
  - [x] Update `backend/apps/analytics/views.py`:
    - [x] `TrendsView` - GET `/api/v1/analytics/trends/`
    - [x] `ForecastView` - GET `/api/v1/analytics/forecast/`
    - [x] `NetWorthView` - GET `/api/v1/analytics/net-worth/`
    - [x] `PatternsView` - GET `/api/v1/analytics/patterns/`
    - [x] `RecommendationsView` - GET `/api/v1/analytics/recommendations/`

- [x] **Backend - Analytics Serializers**
  - [x] Update `backend/apps/analytics/serializers.py`:
    - [x] `TrendsSerializer`
    - [x] `ForecastSerializer`
    - [x] `NetWorthSerializer`
    - [x] `PatternsSerializer`
    - [x] `RecommendationsSerializer`

- [x] **Frontend - Analytics Service**
  - [x] Create `frontend/src/services/analyticsService.ts`:
    - [x] `getTrends(months)` - Get spending trends
    - [x] `getForecast(months)` - Get spending forecast
    - [x] `getNetWorth()` - Get net worth
    - [x] `getPatterns(month, year)` - Get spending patterns
    - [x] `getRecommendations()` - Get personalized recommendations

- [x] **Frontend - Analytics Types**
  - [x] Create `frontend/src/types/analytics.types.ts`:
    - [x] `TrendData` interface
    - [x] `ForecastData` interface
    - [x] `NetWorthData` interface
    - [x] `PatternData` interface
    - [x] `Recommendation` interface

- [x] **Frontend - Analytics Components**
  - [x] Create `frontend/src/components/analytics/TrendsChart.tsx`:
    - [x] Line chart showing spending over time
    - [x] Compare multiple months
  - [x] Create `frontend/src/components/analytics/NetWorthCard.tsx`:
    - [x] Display current net worth
    - [x] Show trend (up/down)
  - [x] Create `frontend/src/components/analytics/PatternsChart.tsx`:
    - [x] Day of week spending chart
    - [x] Time of month spending chart
  - [x] Create `frontend/src/components/analytics/RecommendationsList.tsx`:
    - [x] Display personalized recommendations
    - [x] Actionable insights

- [x] **Frontend - Analytics Page**
  - [x] Create `frontend/src/pages/AnalyticsPage.tsx`:
    - [x] Full analytics dashboard
    - [x] Date range selector
    - [x] Multiple chart visualizations
    - [x] Export to CSV option
  - [x] Add route to main router

- [x] **Dashboard Integration**
  - [x] Individual widgets in `frontend/src/components/dashboard/widgets/`:
    - [x] Add net worth widget
    - [x] Add trends mini-chart (already exists as SpendingTrendWidget)
    - [x] Add recommendations widget

### 6. Transaction Enhancements
- [x] **Transaction Splitting**
  - [x] Backend:
    - [x] Create `TransactionSplit` model:
      - [x] Foreign key to Transaction
      - [x] Amount, category, description fields
    - [x] Update `TransactionSerializer` to include splits
    - [x] Add split validation (sum must equal transaction amount)
    - [x] Create split endpoints
  - [x] Frontend:
    - [x] Create `TransactionSplitForm.tsx` component
    - [x] Add split functionality to transaction detail/edit
    - [x] Display splits in transaction list

- [x] **Receipt Upload**
  - [x] Backend:
    - [x] Set up file storage (Cloudflare R2)
    - [x] Create `Receipt` model:
      - [x] Foreign key to Transaction
      - [x] File field, upload date
    - [x] Add receipt upload endpoint
    - [x] Add file validation (size, type)
  - [x] Frontend:
    - [x] Create `ReceiptUpload.tsx` component
    - [x] Add upload to transaction detail page
    - [x] Display receipt thumbnails
    - [x] Receipt viewer modal


  - [x] **Improved Recurring Detection**
  - [x] Backend:
    - [x] Create `backend/apps/transactions/recurring_detection.py`:
      - [x] Algorithm to detect recurring transactions automatically
      - [x] Match by merchant, amount, date patterns
      - [x] Update `is_recurring` flag automatically
    - [x] Create Celery task to run detection periodically
    - [x] Add endpoint to manually mark as recurring
  - [x] Frontend:
    - [x] Show recurring indicator in transaction list
    - [x] Filter by recurring transactions
    - [x] Recurring transactions view/page
    - [x] Manual detection trigger UI

  - [x] **Transfer Detection Improvements**
  - [x] Backend:
    - [x] Improve transfer detection logic:
      - [x] Match transfers between user's accounts automatically
      - [x] Better identification of transfer patterns
    - [x] Auto-categorize transfers
    - [x] Group related transfers

## Medium Priority - Advanced Features

### 7. Smart Insights & Recommendations
- [x] **Backend - Insights Engine**
  - [x] Create `backend/apps/insights/` app
  - [x] Create `backend/apps/insights/insight_engine.py`:
    - [x] Analyze spending patterns
    - [x] Detect unusual spending
    - [x] Identify subscription patterns
    - [x] Generate personalized recommendations
  - [x] Create insights models and API endpoints
  - [x] Create Celery tasks for periodic analysis

- [x] **Frontend - Insights Display**
  - [x] Create insights components
  - [x] Add insights section to dashboard
  - [x] Create insights page

### 8. Automated Savings Features
- [x] **Round-up Savings**
  - [x] Backend logic to calculate round-ups
  - [x] Auto-contribute to goals
  - [x] Frontend UI for enabling/disabling

- [x] **Percentage-based Savings**
  - [x] Backend calculation logic
  - [x] Frontend configuration UI

### 9. Multi-Factor Authentication (MFA)
  - [x] **Backend - MFA Implementation**
  - [x] Implement TOTP (Time-based OTP) generation
  - [x] Create MFA setup endpoint
  - [x] Create MFA verification endpoint
  - [x] Update login flow to require MFA when enabled
  - [x] Add backup codes generation

- [x] **Frontend - MFA UI**
  - [x] MFA setup flow
  - [x] QR code display for authenticator apps
  - [x] MFA verification during login
  - [x] Settings page MFA management

### 10. Bill Management
- [x] **Backend - Bill Models**
  - [x] Create `Bill` model (`backend/apps/bills/models.py`)
  - [x] Create `BillPayment` model for tracking payment history
  - [x] Create bill tracking logic (mark as paid, calculate next due date)
  - [x] Create bill reminder system (`tasks.py`: `check_bill_reminders`, `check_overdue_bills`)
  - [x] Create serializers (`BillSerializer`, `BillCreateSerializer`, `BillPaymentSerializer`)
  - [x] Create views (`BillViewSet`, `BillPaymentViewSet` with CRUD, upcoming, overdue actions)
  - [x] Register URLs in `config/urls.py`
  - [x] Add tests (`tests.py`)

- [x] **Frontend - Bill Management**
  - [x] Create `billService.ts` (list, get, create, update, delete, markAsPaid, getUpcomingBills, getOverdueBills)
  - [x] Create `useBills.ts` hook
  - [x] Create `Bills.tsx` page with filters and summary stats
  - [x] Create `BillCard.tsx` component
  - [x] Create `BillForm.tsx` component
  - [x] Create `BillModal.tsx` component
  - [x] Create `BillPaymentModal.tsx` for recording payments
  - [x] Create `UpcomingBillsWidget.tsx` for sidebar display
  - [x] Bill reminders display (via notifications and tasks)

### 11. Debt Management System ✅ COMPLETED
- [x] **Backend - Debt Models**
  - [x] Create `backend/apps/debts/models.py`:
    - [x] `DebtAccount` model:
      - [x] Fields: debt_id, user, name, debt_type (credit_card, personal_loan, mortgage, auto_loan, student_loan, other)
      - [x] Fields: current_balance, original_balance, interest_rate (APR), minimum_payment
      - [x] Fields: due_date (day of month), payment_frequency (monthly, biweekly, weekly)
      - [x] Fields: account_number_masked, creditor_name, account_status (active, paid_off, closed)
      - [x] Fields: opened_date, payoff_date (target), last_payment_date, last_payment_amount
      - [x] Fields: is_active, notes, created_at, updated_at
    - [x] `DebtPayment` model:
      - [x] Fields: payment_id, debt_account, user, amount, payment_date
      - [x] Fields: payment_type (minimum, extra, full), applied_to_principal, applied_to_interest
      - [x] Fields: transaction_id (link to Transaction if from account), notes, created_at
    - [x] `DebtPayoffStrategy` model:
      - [x] Fields: strategy_id, user, strategy_type (snowball, avalanche, custom)
      - [x] Fields: target_payoff_date, monthly_payment_budget, priority_order (JSON)
      - [x] Fields: is_active, created_at, updated_at

- [x] **Backend - Debt Utilities**
  - [x] Create `backend/apps/debts/utils.py`:
    - [x] `calculate_interest_accrued(debt, days)` - Calculate interest for period
    - [x] `calculate_payoff_date(debt, monthly_payment)` - Calculate when debt will be paid off
    - [x] `calculate_total_interest(debt, payoff_date)` - Total interest paid over lifetime
    - [x] `calculate_minimum_payment(debt)` - Calculate minimum payment based on balance and rate
    - [x] `apply_payment_to_debt(debt, payment_amount)` - Apply payment, split principal/interest
    - [x] `generate_snowball_strategy(user, debts)` - Order debts by balance (smallest first)
    - [x] `generate_avalanche_strategy(user, debts)` - Order debts by interest rate (highest first)
    - [x] `calculate_strategy_savings(strategy)` - Compare total interest vs minimum payments
    - [x] `get_debt_payoff_projection(debt, monthly_payment)` - Project balance over time
    - [x] `get_total_debt_summary(user)` - Aggregate all debts (total balance, total minimum payments)

- [x] **Backend - Debt Serializers**
  - [x] Create `backend/apps/debts/serializers.py`:
    - [x] `DebtAccountSerializer` (read operations):
      - [x] Include calculated fields: days_until_due, interest_this_month, payoff_date_projection
      - [x] Include payment history summary
    - [x] `DebtAccountCreateSerializer` (create operations):
      - [x] Validation for interest_rate, balance, minimum_payment
      - [x] Validate due_date is valid day of month (1-31)
    - [x] `DebtAccountUpdateSerializer` (update operations):
      - [x] Allow updating balance, interest_rate, minimum_payment
      - [x] Auto-calculate changes when balance updated
    - [x] `DebtPaymentSerializer`:
      - [x] Include debt account info, formatted amounts
    - [x] `DebtPaymentCreateSerializer`:
      - [x] Validation for payment amount, date
      - [x] Auto-calculate principal vs interest split
    - [x] `DebtPayoffStrategySerializer`:
      - [x] Include debt order, projected savings, timeline

- [x] **Backend - Debt Views & API**
  - [x] Create `backend/apps/debts/views.py`:
    - [x] `DebtAccountViewSet` (CRUD operations):
      - [x] List user's debts with filters (active, type, status)
      - [x] Create new debt account
      - [x] Update debt (balance, rate, etc.)
      - [x] Delete debt account
      - [x] Custom action: `mark_paid_off` - Mark debt as paid off
      - [x] Custom action: `projection` - Get payoff projection
    - [x] `DebtPaymentViewSet`:
      - [x] List payments for a debt
      - [x] Record new payment
      - [x] Update payment (if manual entry)
      - [x] Delete payment (with balance recalculation)
      - [x] Link payment to transaction (if from connected account)
    - [x] `DebtPayoffStrategyViewSet`:
      - [x] Create strategy (snowball/avalanche)
      - [x] Get recommended strategy
      - [x] Update strategy priority order
      - [x] Get strategy projections and savings
    - [x] `DebtSummaryView` (APIView):
      - [x] GET `/api/v1/debts/summary/` - Total debt, total minimum payments, total interest
      - [x] Include breakdown by debt type
      - [x] Include debt-to-income ratio (if income data available)

- [x] **Backend - Debt Integration**
  - [x] Create `backend/apps/debts/urls.py`:
    - [x] Register all ViewSets and views
    - [x] Nested routes for payments under debts
  - [x] Add to main `config/urls.py`
  - [x] Create `backend/apps/debts/admin.py` for Django admin
  - [x] Add permissions (`IsOwnerOrReadOnly`)

- [x] **Backend - Debt Calculations & Tasks**
  - [x] Create `backend/apps/debts/tasks.py`:
    - [x] `update_debt_balances()` - Periodic task to apply interest
    - [x] `check_upcoming_due_dates()` - Alert users of upcoming payments
    - [x] `sync_debt_payments_from_transactions()` - Link transactions to debt payments
    - [x] `recalculate_debt_projections()` - Update payoff dates based on payment history
  - [x] Schedule tasks in `backend/config/celery.py`

- [x] **Frontend - Debt Service**
  - [x] Create `frontend/src/services/debtService.ts`:
    - [x] `getDebts(filters?)` - List debts with optional filters
    - [x] `getDebt(debtId)` - Get single debt with details
    - [x] `createDebt(data)` - Create new debt account
    - [x] `updateDebt(debtId, data)` - Update debt
    - [x] `deleteDebt(debtId)` - Delete debt
    - [x] `markPaidOff(debtId)` - Mark debt as paid off
    - [x] `getDebtProjection(debtId, monthlyPayment)` - Get payoff projection
    - [x] `getPayments(debtId)` - Get payment history
    - [x] `recordPayment(debtId, paymentData)` - Record new payment
    - [x] `getStrategy(type)` - Get payoff strategy (snowball/avalanche)
    - [x] `createStrategy(data)` - Create custom strategy
    - [x] `getSummary()` - Get debt summary/aggregates

- [x] **Frontend - Debt Types**
  - [x] Create `frontend/src/types/debt.types.ts`:
    - [x] `DebtAccount` interface
    - [x] `DebtType` type ('credit_card' | 'personal_loan' | 'mortgage' | 'auto_loan' | 'student_loan' | 'other')
    - [x] `DebtAccountStatus` type ('active' | 'paid_off' | 'closed')
    - [x] `DebtCreateData` interface
    - [x] `DebtUpdateData` interface
    - [x] `DebtPayment` interface
    - [x] `PaymentType` type ('minimum' | 'extra' | 'full')
    - [x] `DebtPaymentCreateData` interface
    - [x] `DebtPayoffStrategy` interface
    - [x] `StrategyType` type ('snowball' | 'avalanche' | 'custom')
    - [x] `DebtProjection` interface
    - [x] `DebtSummary` interface

- [x] **Frontend - Debt Page**
  - [x] Create `frontend/src/pages/DebtsPage.tsx`:
    - [x] List all debts with key metrics
    - [x] Total debt summary card
    - [x] Filter by type, status
    - [x] Sort by balance, interest rate, payoff date
    - [x] Quick actions (add debt, record payment, view strategy)
  - [x] Add route in main router

- [x] **Frontend - Debt Components**
  - [x] Create `frontend/src/components/debts/DebtList.tsx`:
    - [x] Display list of debts
    - [x] Show balance, interest rate, minimum payment, due date
    - [x] Progress indicator for payoff
    - [x] Quick actions (edit, record payment, mark paid off)
  - [x] Create `frontend/src/components/debts/DebtCard.tsx`:
    - [x] Individual debt card component
    - [x] Display key metrics prominently
    - [x] Show days until due date
    - [x] Visual progress to payoff
    - [x] Interest accrued this month
  - [x] Create `frontend/src/components/debts/DebtForm.tsx`:
    - [x] Create/edit debt form
    - [x] Debt type selection
    - [x] Balance, interest rate, minimum payment inputs
    - [x] Due date configuration (day of month)
    - [x] Creditor name, account number (masked)
    - [x] Validation and error handling
  - [x] Create `frontend/src/components/debts/DebtModal.tsx`:
    - [x] Modal for creating/editing debts
    - [x] Reuse DebtForm component
  - [x] Create `frontend/src/components/debts/DebtDetailView.tsx`:
    - [x] Detailed view of single debt
    - [x] Payment history table
    - [x] Payoff projection chart
    - [x] Interest breakdown
    - [x] Payment form inline
  - [x] Create `frontend/src/components/debts/PaymentForm.tsx`:
    - [x] Record payment form
    - [x] Amount input
    - [x] Payment type selection (minimum, extra, full)
    - [x] Payment date picker
    - [x] Link to transaction option
    - [x] Notes field
  - [x] Create `frontend/src/components/debts/PaymentHistory.tsx`:
    - [x] Table of payment history
    - [x] Show amount, date, type, principal/interest split
    - [x] Sort and filter options
  - [x] Create `frontend/src/components/debts/DebtPayoffStrategy.tsx`:
    - [x] Display recommended strategy (snowball vs avalanche)
    - [x] Show debt order
    - [x] Projected savings calculation
    - [x] Timeline visualization
    - [x] Allow custom priority ordering
  - [x] Create `frontend/src/components/debts/DebtProjectionChart.tsx`:
    - [x] Chart showing balance over time
    - [x] Projected payoff date
    - [x] Interest vs principal breakdown
    - [x] Use charting library (recharts/chart.js)
  - [x] Create `frontend/src/components/debts/DebtSummaryCard.tsx`:
    - [x] Total debt amount
    - [x] Total minimum payments
    - [x] Total interest (monthly/yearly)
    - [x] Debt-to-income ratio (if available)
    - [x] Breakdown by type

- [x] **Frontend - Debt Hooks**
  - [x] Create `frontend/src/hooks/useDebts.ts`:
    - [x] `useDebts(filters?)` - Fetch and manage debts list
    - [x] `useDebt(debtId)` - Fetch single debt
    - [x] `useCreateDebt()` - Create debt mutation
    - [x] `useUpdateDebt()` - Update debt mutation
    - [x] `useDeleteDebt()` - Delete debt mutation
    - [x] `useRecordPayment()` - Record payment mutation
    - [x] `useDebtProjection()` - Get payoff projection
    - [x] `useDebtStrategy()` - Get/create strategy
    - [x] `useDebtSummary()` - Get debt summary
    - [x] Handle loading and error states

- [x] **Integration - Goals Integration**
  - [x] Update `backend/apps/goals/models.py`:
    - [x] Add `debt_account` ForeignKey to Goal model (optional)
    - [x] Link debt payoff goals to debt accounts
  - [x] Update `frontend/src/components/goals/GoalForm.tsx`:
    - [x] Allow selecting debt account for debt payoff goals
    - [x] Auto-populate target amount from debt balance
  - [x] Update goal completion logic:
    - [x] When debt payoff goal completed, mark debt as paid off
    - [x] Sync goal progress with debt balance

- [x] **Integration - Dashboard Integration**
  - [x] Update `backend/apps/analytics/utils.py`:
    - [x] Add `get_debt_summary(user)` function
  - [x] Update `backend/apps/analytics/serializers.py`:
    - [x] Add debt summary to DashboardSerializer
  - [x] Update `frontend/src/components/dashboard/DashboardWidgets.tsx`:
    - [x] Add debt summary widget
    - [x] Show total debt, upcoming payments
    - [x] Quick link to debts page
    - [x] Debt payoff progress indicator

- [x] **Integration - Transactions Integration**
  - [x] Update transaction categorization:
    - [x] Auto-detect debt payments from transactions
    - [x] Suggest linking transaction to debt payment
  - [x] Create transaction → debt payment link:
    - [x] Allow linking existing transaction to debt payment
    - [x] Auto-create debt payment from transaction
  - [x] Update `frontend/src/components/transactions/TransactionDetail.tsx`:
    - [x] Show linked debt payment if applicable
    - [x] Add "Link to Debt Payment" action

- [x] **Testing**
  - [x] Backend tests:
    - [x] Test debt CRUD operations
    - [x] Test payment recording and balance updates
    - [x] Test interest calculations
    - [x] Test payoff strategy calculations
    - [x] Test debt projections
    - [x] Test permissions
  - [x] Frontend tests:
    - [x] Test debt components
    - [x] Test payment forms
    - [x] Test strategy calculations
    - [x] Test integration with goals

## Remaining Tasks - Polish & Infrastructure

> **Note:** All core PRD features (Phases 1-4) are COMPLETE ✅
> See [implementation_plan.md](.gemini/antigravity/brain/e6d9f82a-4037-49e0-b3b5-2503c2807ee3/implementation_plan.md) for full details.

---

### Phase 1: Quick Wins (UX Polish) - Priority: HIGH
*Low effort, high impact improvements - Est: 2-3 days*

- [ ] **1.1 Loading States**
  - [ ] Add skeleton loaders to list views (Transactions, Budgets, Goals, Debts, Bills)
  - [ ] Add loading spinners to form submissions
  - [ ] Add loading indicators during data fetching

- [ ] **1.2 Error Handling**
  - [ ] Create/enhance `ErrorBoundary` component for graceful error recovery
  - [ ] Add user-friendly error messages for API failures
  - [ ] Add retry buttons for failed requests

- [ ] **1.3 Empty States**
  - [ ] Design and implement empty state components for all list views
  - [ ] Add helpful CTAs in empty states (e.g., "Add your first budget")
  - [ ] Add illustrations or icons for empty states

- [ ] **1.4 Confirmation Dialogs**
  - [ ] Add confirmation dialog for delete actions across all modules
  - [ ] Add confirmation for disconnect bank account
  - [ ] Add confirmation for cancel subscription

- [ ] **1.5 Mobile Responsiveness**
  - [ ] Audit all pages on mobile viewport
  - [ ] Fix layout issues on mobile
  - [ ] Improve touch targets for mobile users

- [ ] **1.6 Notifications & Feedback**
  - [ ] Ensure toast notifications appear for all CRUD operations
  - [ ] Add success/error feedback for all form submissions
  - [ ] Standardize notification styling

---

### Phase 2: Testing - Priority: HIGH
*Ensure stability and prevent regressions - Est: 5-7 days*

- [ ] **2.1 Backend Unit Tests**
  - [ ] Add tests for `apps/budgets/` (verify coverage ≥80%)
  - [ ] Add tests for `apps/bills/` (CRUD, reminders)
  - [ ] Verify tests for `apps/debts/` coverage
  - [ ] Add tests for `apps/insights/` (insight generation)
  - [ ] Add tests for `apps/notifications/` (creation, preferences)

- [ ] **2.2 Backend Integration Tests**
  - [ ] Test Plaid webhook handling end-to-end
  - [ ] Test Stripe webhook handling end-to-end
  - [ ] Test transaction sync flow
  - [ ] Test notification delivery flow

- [ ] **2.3 Backend API Tests**
  - [ ] Add API endpoint tests for all ViewSets
  - [ ] Test authentication and authorization
  - [ ] Test pagination and filtering

- [ ] **2.4 Frontend Component Tests**
  - [ ] Add tests for critical components (BudgetCard, DebtCard, TransactionList)
  - [ ] Add tests for form validation
  - [ ] Add tests for hooks

- [ ] **2.5 E2E Tests (Playwright)**
  - [ ] Setup Playwright test framework
  - [ ] Add test for login flow
  - [ ] Add test for transaction list and filtering
  - [ ] Add test for creating a budget
  - [ ] Add test for creating a goal

---

### Phase 3: Documentation - Priority: MEDIUM
*Improve maintainability and onboarding - Est: 2 days*

- [ ] **3.1 API Documentation (Swagger/OpenAPI)**
  - [ ] Review all endpoints have proper descriptions
  - [ ] Add request/response examples to all endpoints
  - [ ] Add error response documentation
  - [ ] Document authentication flow

- [ ] **3.2 Code Documentation**
  - [ ] Add/update docstrings for all public functions (backend)
  - [ ] Add module-level docstrings
  - [ ] Document complex algorithms (recurring detection, insights engine)
  - [ ] Add JSDoc comments to frontend services
  - [ ] Document component props with TypeScript

- [ ] **3.3 User Documentation**
  - [ ] Create basic user guide (Getting Started)
  - [ ] Document feature workflows
  - [ ] Add FAQ section

---

### Phase 4: Performance & Optimization - Priority: MEDIUM
*Improve speed and efficiency - Est: 2-3 days*

- [ ] **4.1 Database Optimization**
  - [ ] Audit existing indexes on frequently queried fields
  - [ ] Add indexes for common filter patterns (user_id + date ranges)
  - [ ] Optimize slow queries (use Django Debug Toolbar)
  - [ ] Review N+1 query issues with `select_related`/`prefetch_related`

- [ ] **4.2 Caching**
  - [ ] Implement Redis caching for dashboard data
  - [ ] Cache frequently accessed analytics
  - [ ] Add cache invalidation on data changes

- [ ] **4.3 Frontend Optimization**
  - [ ] Implement code splitting for routes (React.lazy)
  - [ ] Add lazy loading for non-critical components
  - [ ] Optimize bundle size (webpack-bundle-analyzer)
  - [ ] Optimize images and assets

---

### Phase 5: Security Enhancements - Priority: MEDIUM-HIGH
*Strengthen security posture - Est: 3-4 days*

- [ ] **5.1 Security Audit**
  - [ ] Review authentication/authorization implementation
  - [ ] Check for SQL injection vulnerabilities
  - [ ] Check for XSS vulnerabilities
  - [ ] Review API rate limiting configuration
  - [ ] Add security headers (CSP, HSTS, etc.)

- [ ] **5.2 Compliance**
  - [ ] Review data encryption at rest
  - [ ] Implement audit logging for sensitive operations
  - [ ] Document data retention policies
  - [ ] Review GDPR requirements (if applicable)

---

## Notes

- **All core features complete** - Budgeting, Goals, Bills, Debts, Analytics, Insights, Notifications, MFA, Subscriptions
- **Focus on polish** - Remaining work is UX improvements, testing, and infrastructure
- **Test as you go** - Don't skip testing when implementing quick wins
- **Estimated total effort** - 14-19 days for all remaining tasks


## [x] Completed Features
- [x] **User Authentication & Registration**
  - [x] User registration with email
  - [x] JWT authentication and token refresh
  - [x] Password reset flow (email-based)
  - [x] User profile endpoint (GET/PATCH)
  - [x] Custom User model with preferences and subscription tiers
  - [x] **Dockerize Backend**
    - [x] Create Dockerfile
    - [x] Create docker-compose.yml
    - [x] Create entrypoint.sh
    - [x] Add README.docker.md
- [x] **Bank Account Integration (Plaid)**
  - [x] Plaid Link integration for account connection
  - [x] Account model with encryption for Plaid tokens
  - [x] Account sync and transaction import
  - [x] Webhook handling for Plaid events
  - [x] Support for multiple account types (checking, savings, credit card, investment)
  - [x] Account error tracking and management
  - [x] Custom account names
- [x] **Transaction Management**
  - [x] Transaction CRUD operations
  - [x] Transaction filtering (date range, amount, category, account, recurring, transfer)
  - [x] Transaction search (merchant name, description)
  - [x] Transaction categorization (automatic and manual)
  - [x] Plaid category mapping
  - [x] Category suggestions (AI-based)
  - [x] Recurring transaction detection
  - [x] Transfer detection
  - [x] Transaction notes and tags
- [x] **Category System**
  - [x] Category model (system and user-created)
  - [x] Category CRUD operations
  - [x] Category hierarchy (parent/child)
  - [x] System categories seed command
  - [x] Category icons and colors
  - [x] Category auto-categorization rules
- [x] **Savings Goals**
  - [x] Goal CRUD operations
  - [x] Goal types (emergency_fund, vacation, purchase, debt_payoff, custom)
  - [x] Goal progress tracking and completion
  - [x] Manual and automatic contributions
  - [x] Goal account linking (destination_account)
  - [x] Transfer authorization (TransferAuthorization model)
  - [x] Contribution rules (JSON field with multiple rule types)
  - [x] Reminder settings (JSON field for cash goals)
  - [x] Goal services (sync balance, process rules, etc.)
  - [x] Goal archiving
- [x] **Dashboard Analytics (Basic)**
  - [x] Dashboard endpoint
  - [x] Account balance summary
  - [x] Recent transactions
  - [x] Monthly spending summary
  - [x] Goal progress
  - [x] Category spending chart
  - [x] Dashboard serializers
- [x] **Background Tasks (Celery)**
  - [x] Account sync tasks
  - [x] Transaction sync tasks
  - [x] Goal contribution processing tasks
  - [x] Goal balance sync tasks
- [x] **API Infrastructure**
  - [x] RESTful API endpoints
  - [x] Consistent JSON response format
  - [x] API versioning (v1)
  - [x] Error handling and validation
  - [x] Permission classes
  - [x] Swagger/OpenAPI documentation
- [x] **Frontend Infrastructure**
  - [x] React + TypeScript application
  - [x] User authentication UI
  - [x] Account management interface
  - [x] Transaction list and filters
  - [x] Goals management
  - [x] Dashboard with charts
  - [x] Responsive design with Tailwind CSS
  - [x] React Query for data fetching
  - [x] Zustand for state management
- [x] **Subscriptions System (Stripe Integration)**
  - [x] Subscription model with Stripe integration
  - [x] Stripe subscription management (create, update, cancel)
  - [x] Stripe webhook handling
  - [x] Subscription views and API endpoints
  - [x] Frontend subscription service
  - [x] Frontend subscription components (SubscriptionInfo, SubscriptionForm, StripeCardElements)
  - [x] Settings page subscription section
  - [x] Stripe configuration and pricing setup
- [x] **Backend - Budget Model** ✅ Fully implemented
- [x] **Backend - Budget Views & API** ✅ Fully implemented
  - [x] `backend/apps/budgets/serializers.py` exists with:
    - [x] `BudgetSerializer` (read operations)
    - [x] `BudgetCreateSerializer` (create operations)
    - [x] Validation for period dates, amounts, category ownership
  - [x] `backend/apps/budgets/views.py` implemented:
    - [x] `BudgetViewSet` with full CRUD operations
    - [x] Filter by period, category
    - [x] Calculate spent vs budgeted amounts (`_calculate_budget_usage` method)
    - [x] Budget usage summary endpoint (`usage_summary` action)
    - [x] Budget alerts calculation (80% threshold via `alert_threshold_reached`)
    - [x] Subscription limit checking on create
  - [x] `backend/apps/budgets/urls.py` configured:
    - [x] BudgetViewSet routes registered
    - [x] Custom action routes available
  - [x] Permissions implemented:
    - [x] `IsOwnerOrReadOnly` for budget access
    - [x] Users can only access their own budgets
- [x] **Frontend - Budget Service**
  - [x] Create `frontend/src/services/budgetService.ts`:
    - [x] `getBudgets(period?)` - List budgets with optional period filter
    - [x] `getBudget(budgetId)` - Get single budget
    - [x] `createBudget(data)` - Create new budget
    - [x] `updateBudget(budgetId, data)` - Update budget
    - [x] `deleteBudget(budgetId)` - Delete budget
    - [x] `getBudgetStatus(budgetId)` - Get budget vs actual comparison
    - [x] Handle API response formats consistently
- [x] **Frontend - Budget Types**
  - [x] Create `frontend/src/types/budget.types.ts`:
    - [x] `Budget` interface
    - [x] `BudgetCreateData` interface
    - [x] `BudgetUpdateData` interface
    - [x] `BudgetStatus` interface (spent, remaining, percentage, etc.)
    - [x] `PeriodType` type ('weekly' | 'monthly' | 'yearly')
- [x] **Frontend - Budget Page**
  - [x] Create `frontend/src/pages/BudgetsPage.tsx`:
    - [x] List all budgets with status indicators
    - [x] Show budget vs actual spending
    - [x] Visual progress bars for each budget
    - [x] Filter by period type and date range
    - [x] Sort by status, amount, category
  - [x] Add route in main router
- [x] **Frontend - Budget Components**
  - [x] Create `frontend/src/components/budgets/BudgetList.tsx`:
    - [x] Display list of budgets
    - [x] Show status badges (on track, warning, exceeded)
    - [x] Show progress bars
    - [x] Quick actions (edit, delete)
  - [x] Create `frontend/src/components/budgets/BudgetCard.tsx`:
    - [x] Individual budget card component
    - [x] Display category, amount, period
    - [x] Show spent vs budgeted
    - [x] Visual progress indicator
  - [x] Create `frontend/src/components/budgets/BudgetForm.tsx`:
    - [x] Create/edit budget form
    - [x] Category selection dropdown
    - [x] Period type selection
    - [x] Date range picker
    - [x] Amount input with validation
    - [x] Alert threshold configuration
  - [x] Create `frontend/src/components/budgets/BudgetModal.tsx`:
    - [x] Modal for creating/editing budgets
    - [x] Reuse BudgetForm component
  - [x] Create `frontend/src/components/budgets/BudgetStatusChart.tsx`:
    - [x] Visual chart showing budget vs actual
    - [x] Use charting library (recharts/chart.js)
- [x] **Frontend - Budget Hooks**
  - [x] Create `frontend/src/hooks/useBudgets.ts`:
    - [x] `useBudgets()` - Fetch and manage budgets list
    - [x] `useBudget(budgetId)` - Fetch single budget
    - [x] `useCreateBudget()` - Create budget mutation
    - [x] `useUpdateBudget()` - Update budget mutation
    - [x] `useDeleteBudget()` - Delete budget mutation
    - [x] Handle loading and error states
- [x] **Integration - Dashboard Budget Widget**
  - [x] Update `frontend/src/components/dashboard/DashboardWidgets.tsx`:
    - [x] Add budget summary widget
    - [x] Show budgets approaching limits
    - [x] Quick link to budgets page
  - [x] Update `backend/apps/analytics/utils.py`:
    - [x] Add `get_budget_summary(user, month, year)` function
  - [x] Update `backend/apps/analytics/serializers.py`:
    - [x] Add budget summary to DashboardSerializer
- [x] **Backend - Notification Models**
  - [x] Create `backend/apps/notifications/models.py`:
    - [x] `Notification` model (in-app notifications)
    - [x] Fields: type, title, message, read status, created_at, user, data (JSON)
    - [x] Notification types enum (transaction, goal, budget, account, system)
- [x] **Backend - Email Service Setup**
  - [x] Choose email provider (SendGrid recommended)
  - [x] Add email settings to `backend/config/settings/base.py`:
    - [x] `EMAIL_BACKEND` configuration
    - [x] `SENDGRID_API_KEY` or `AWS_SES` configuration
    - [x] `DEFAULT_FROM_EMAIL` setting
  - [x] Create `backend/apps/notifications/email_service.py`:
    - [x] `send_email(to, subject, html_content, text_content)` function
    - [x] Email template rendering
    - [x] Error handling and logging
- [x] **Backend - Notification Views & API** ✅ Fully implemented
  - [x] `backend/apps/notifications/serializers.py`:
    - [x] `NotificationSerializer`
    - [x] `NotificationCreateSerializer`
    - [x] `NotificationPreferenceSerializer`
  - [x] `backend/apps/notifications/views.py`:
    - [x] `NotificationViewSet` - List, mark as read, delete notifications
    - [x] `UnreadCountView` - Get unread notification count
    - [x] `NotificationPreferenceView` - Get/update user preferences
  - [x] `backend/apps/notifications/urls.py`:
    - [x] Register notification routes
    - [x] Add to main `config/urls.py`
- [x] **Backend - Notification Helper Functions** ✅ Implemented
  - [x] `backend/apps/notifications/tasks.py` exists with helper functions:
    - [x] `create_notification()` - Create in-app notification
    - [x] `create_goal_milestone_notification()` - Goal milestone notifications
    - [x] `create_budget_exceeded_notification()` - Budget exceeded notifications
    - [x] `create_transaction_notification()` - Transaction alerts
    - [x] `create_account_sync_notification()` - Account sync notifications
    - [x] Account selection/deactivation notification helpers
- [x] **Backend - Scheduled Celery Tasks for Notifications**
  - [x] Add scheduled tasks to `backend/apps/notifications/tasks.py`:
    - [x] `check_budget_alerts()` - Periodic task to check budgets
    - [x] `check_goal_milestones()` - Check goal progress milestones
    - [x] `send_weekly_summary()` - Weekly financial summary email
    - [x] `send_monthly_summary()` - Monthly financial summary email
  - [x] Schedule tasks in `backend/config/celery.py`
- [x] **Frontend - Notification Service**
  - [x] Create `frontend/src/services/notificationService.ts`:
    - [x] `getNotifications(filters?)` - Get notifications with optional filters
    - [x] `getNotification(id)` - Get single notification
    - [x] `markAsRead(id)` - Mark notification as read
    - [x] `markAllAsRead()` - Mark all as read
    - [x] `deleteNotification(id)` - Delete notification
    - [x] `getUnreadCount()` - Get unread count
    - [x] `updatePreferences(preferences)` - Update notification preferences
    - [x] `updatePreferences(preferences)` - Update notification preferences
- [x] **Frontend - Notification Types**
  - [x] Create `frontend/src/types/notification.types.ts`:
    - [x] `Notification` interface
    - [x] `NotificationFilters` interface
    - [x] `NotificationPreference` interface
- [x] **Frontend - Notification Components** ✅ Partially implemented
  - [x] `frontend/src/pages/Notifications.tsx` exists:
    - [x] Full notifications page with list view
    - [x] Group notifications by date
    - [x] Mark as read functionality
    - [x] Mark all as read functionality
    - [x] Delete notifications
    - [x] Empty state handling
  - [x] Create `frontend/src/components/notifications/NotificationBell.tsx`:
    - [x] Bell icon with unread count badge
    - [x] Click to open notification dropdown
    - [x] Display in Header/navbar
  - [x] Create `frontend/src/components/notifications/NotificationDropdown.tsx`:
    - [x] Dropdown list of recent notifications
    - [x] Mark as read on click
    - [x] Link to full notifications page
    - [x] Show unread count badge
  - [x] Add notification bell to main layout/navbar (Header.tsx)
- [x] **Frontend - Notification Hooks**
  - [x] Create `frontend/src/hooks/useNotifications.ts`:
    - [x] `useNotifications()` - Fetch notifications
    - [x] `useUnreadCount()` - Get unread count
    - [x] `useMarkAsRead()` - Mark as read mutation
- [x] **Frontend - Settings Integration**
  - [x] Update `frontend/src/pages/Settings.tsx`:
    - [x] Add notification preferences section
    - [x] Toggle switches for each notification type
    - [x] Email vs in-app preferences
    - [x] Save preferences
- [x] **Backend - User Profile Updates**
  - [x] `UserProfileView` exists with GET/PATCH
  - [x] Basic user profile retrieval and update
  - [x] Enhance `backend/apps/accounts/views.py`:
    - [x] Allow updating basic fields (username, email, first_name, last_name)
    - [x] Phone number update
    - [x] Preferences JSON field update
  - [x] Add password change endpoint
- [x] **Frontend - Settings Page** ✅ Fully implemented
  - [x] `frontend/src/pages/Settings.tsx` exists with tabs:
    - [x] Profile tab: Edit first name, last name, email, phone number
    - [x] Security tab: Password change form
    - [x] Preferences tab: Theme and notification preferences
    - [x] Accounts tab: List connected accounts with disconnect option
      - [x] **Subscription Section:** (Note: Subscription management is on separate `/subscription` page)
        - [x] Link to subscription page added
- [x] **Frontend - Settings Components**
  - [x] Create `frontend/src/components/settings/PasswordChangeForm.tsx`
  - [x] Create `frontend/src/components/settings/AccountList.tsx`
  - [x] Create `frontend/src/components/settings/NotificationPreferencesForm.tsx`
- [x] **Backend - Sankey Data Endpoint**
- [x] **Frontend - Sankey Diagram Component**
- [x] **Integration**
- [x] **Backend - Basic Analytics (Implemented)**
  - [x] `get_account_balance_summary(user)` - Account balance summary
  - [x] `get_recent_transactions(user, limit)` - Recent transactions
  - [x] `get_monthly_spending_summary(user, month, year)` - Monthly spending by category
  - [x] `get_goal_progress(user)` - Goal progress tracking
  - [x] `get_category_spending_chart(user, month, year)` - Category spending chart
- [x] **Basic Transaction Features (Implemented)**
  - [x] Transaction CRUD operations
  - [x] Transaction filtering and search
  - [x] Transaction categorization (automatic and manual)
  - [x] Recurring transaction detection (basic - is_recurring flag)
  - [x] Transfer detection (basic - is_transfer flag)
  - [x] Transaction notes and tags
- [x] **Basic Recurring Detection (Implemented)**
  - [x] `is_recurring` flag on Transaction model
- [x] **Basic Transfer Detection (Implemented)**
  - [x] `is_transfer` flag on Transaction model
- [x] **Backend - MFA Models (Prepared)**
  - [x] MFA fields on User model (mfa_enabled, mfa_secret)
- [x] **API Documentation (Basic)**
  - [x] Swagger/OpenAPI documentation setup (drf-yasg)
  - [x] API endpoints documented in Swagger UI
  - [x] Basic README with setup instructions
  - [x] Plaid sandbox testing guide
  - [x] Supabase setup guide
  - [x] SendGrid testing guide