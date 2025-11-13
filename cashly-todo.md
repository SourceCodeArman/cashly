# Cashly Development To-Do List

## High Priority - Core Features

### 1. Budgeting System Implementation
- [ ] **Backend - Budget Views & API**
  - [ ] Create `backend/apps/budgets/serializers.py` with:
    - [ ] `BudgetSerializer` (read operations)
    - [ ] `BudgetCreateSerializer` (create operations)
    - [ ] `BudgetUpdateSerializer` (update operations)
    - [ ] Validation for period dates, amounts, category ownership
  - [ ] Implement `backend/apps/budgets/views.py`:
    - [ ] `BudgetViewSet` with full CRUD operations
    - [ ] Filter by period, category, active status
    - [ ] Calculate spent vs budgeted amounts
    - [ ] Budget vs actual comparison endpoint
    - [ ] Budget alerts calculation (80% threshold)
  - [ ] Update `backend/apps/budgets/urls.py`:
    - [ ] Register BudgetViewSet routes
    - [ ] Add custom action routes if needed
  - [ ] Add permissions:
    - [ ] `IsOwnerOrReadOnly` for budget access
    - [ ] Ensure users can only access their own budgets
  - [ ] Write tests:
    - [ ] Test budget CRUD operations
    - [ ] Test budget calculations
    - [ ] Test budget alerts
    - [ ] Test permissions

- [ ] **Backend - Budget Utilities**
  - [ ] Create `backend/apps/budgets/utils.py`:
    - [ ] `calculate_budget_spent(budget, start_date, end_date)` - Calculate actual spending for budget period
    - [ ] `get_budget_status(budget)` - Return status (on track, warning, exceeded)
    - [ ] `get_budgets_needing_alerts(user)` - Find budgets approaching/exceeding limits
    - [ ] `get_budget_progress(budget)` - Calculate percentage spent
    - [ ] `get_active_budgets_for_period(user, month, year)` - Get budgets for specific period

- [ ] **Frontend - Budget Service**
  - [ ] Create `frontend/src/services/budgetService.ts`:
    - [ ] `getBudgets(period?)` - List budgets with optional period filter
    - [ ] `getBudget(budgetId)` - Get single budget
    - [ ] `createBudget(data)` - Create new budget
    - [ ] `updateBudget(budgetId, data)` - Update budget
    - [ ] `deleteBudget(budgetId)` - Delete budget
    - [ ] `getBudgetStatus(budgetId)` - Get budget vs actual comparison
    - [ ] Handle API response formats consistently

- [ ] **Frontend - Budget Types**
  - [ ] Create `frontend/src/types/budget.types.ts`:
    - [ ] `Budget` interface
    - [ ] `BudgetCreateData` interface
    - [ ] `BudgetUpdateData` interface
    - [ ] `BudgetStatus` interface (spent, remaining, percentage, etc.)
    - [ ] `PeriodType` type ('weekly' | 'monthly' | 'yearly')

- [ ] **Frontend - Budget Page**
  - [ ] Create `frontend/src/pages/BudgetsPage.tsx`:
    - [ ] List all budgets with status indicators
    - [ ] Show budget vs actual spending
    - [ ] Visual progress bars for each budget
    - [ ] Filter by period type and date range
    - [ ] Sort by status, amount, category
  - [ ] Add route in main router

- [ ] **Frontend - Budget Components**
  - [ ] Create `frontend/src/components/budgets/BudgetList.tsx`:
    - [ ] Display list of budgets
    - [ ] Show status badges (on track, warning, exceeded)
    - [ ] Show progress bars
    - [ ] Quick actions (edit, delete)
  - [ ] Create `frontend/src/components/budgets/BudgetCard.tsx`:
    - [ ] Individual budget card component
    - [ ] Display category, amount, period
    - [ ] Show spent vs budgeted
    - [ ] Visual progress indicator
  - [ ] Create `frontend/src/components/budgets/BudgetForm.tsx`:
    - [ ] Create/edit budget form
    - [ ] Category selection dropdown
    - [ ] Period type selection
    - [ ] Date range picker
    - [ ] Amount input with validation
    - [ ] Alert threshold configuration
  - [ ] Create `frontend/src/components/budgets/BudgetModal.tsx`:
    - [ ] Modal for creating/editing budgets
    - [ ] Reuse BudgetForm component
  - [ ] Create `frontend/src/components/budgets/BudgetStatusChart.tsx`:
    - [ ] Visual chart showing budget vs actual
    - [ ] Use charting library (recharts/chart.js)

- [ ] **Frontend - Budget Hooks**
  - [ ] Create `frontend/src/hooks/useBudgets.ts`:
    - [ ] `useBudgets()` - Fetch and manage budgets list
    - [ ] `useBudget(budgetId)` - Fetch single budget
    - [ ] `useCreateBudget()` - Create budget mutation
    - [ ] `useUpdateBudget()` - Update budget mutation
    - [ ] `useDeleteBudget()` - Delete budget mutation
    - [ ] Handle loading and error states

- [ ] **Integration - Dashboard Budget Widget**
  - [ ] Update `frontend/src/components/dashboard/DashboardWidgets.tsx`:
    - [ ] Add budget summary widget
    - [ ] Show budgets approaching limits
    - [ ] Quick link to budgets page
  - [ ] Update `backend/apps/analytics/utils.py`:
    - [ ] Add `get_budget_summary(user, month, year)` function
  - [ ] Update `backend/apps/analytics/serializers.py`:
    - [ ] Add budget summary to DashboardSerializer

### 2. Notifications & Alerts System
- [ ] **Backend - Notification Models**
  - [ ] Create `backend/apps/notifications/models.py`:
    - [ ] `Notification` model (in-app notifications)
    - [ ] `NotificationPreference` model (user preferences)
    - [ ] Fields: type, title, message, read status, created_at, user
    - [ ] Notification types enum (budget_alert, goal_milestone, transaction_alert, etc.)

- [ ] **Backend - Email Service Setup**
  - [ ] Choose email provider (SendGrid recommended)
  - [ ] Add email settings to `backend/config/settings/base.py`:
    - [ ] `EMAIL_BACKEND` configuration
    - [ ] `SENDGRID_API_KEY` or `AWS_SES` configuration
    - [ ] `DEFAULT_FROM_EMAIL` setting
  - [ ] Create `backend/apps/notifications/email_service.py`:
    - [ ] `send_email(to, subject, html_content, text_content)` function
    - [ ] Email template rendering
    - [ ] Error handling and logging

- [ ] **Backend - Notification Service**
  - [ ] Create `backend/apps/notifications/notification_service.py`:
    - [ ] `create_notification(user, type, title, message)` - Create in-app notification
    - [ ] `send_email_notification(user, type, context)` - Send email
    - [ ] `send_budget_alert(user, budget)` - Budget exceeded/approaching alert
    - [ ] `send_goal_milestone_notification(user, goal, milestone)` - Goal milestone reached
    - [ ] `send_transaction_alert(user, transaction)` - Unusual transaction alert
    - [ ] Check user preferences before sending

- [ ] **Backend - Notification Views & API**
  - [ ] Create `backend/apps/notifications/serializers.py`:
    - [ ] `NotificationSerializer`
    - [ ] `NotificationPreferenceSerializer`
  - [ ] Create `backend/apps/notifications/views.py`:
    - [ ] `NotificationViewSet` - List, mark as read, delete notifications
    - [ ] `NotificationPreferenceView` - Get/update user preferences
    - [ ] `UnreadCountView` - Get unread notification count
  - [ ] Create `backend/apps/notifications/urls.py`:
    - [ ] Register notification routes
  - [ ] Add to main `config/urls.py`

- [ ] **Backend - Celery Tasks for Notifications**
  - [ ] Create `backend/apps/notifications/tasks.py`:
    - [ ] `check_budget_alerts()` - Periodic task to check budgets
    - [ ] `check_goal_milestones()` - Check goal progress milestones
    - [ ] `send_weekly_summary()` - Weekly financial summary email
    - [ ] `send_monthly_summary()` - Monthly financial summary email
  - [ ] Schedule tasks in `backend/config/celery.py`

- [ ] **Frontend - Notification Service**
  - [ ] Create `frontend/src/services/notificationService.ts`:
    - [ ] `getNotifications(unreadOnly?)` - Get notifications
    - [ ] `markAsRead(notificationId)` - Mark notification as read
    - [ ] `markAllAsRead()` - Mark all as read
    - [ ] `deleteNotification(notificationId)` - Delete notification
    - [ ] `getUnreadCount()` - Get unread count
    - [ ] `updatePreferences(preferences)` - Update notification preferences

- [ ] **Frontend - Notification Types**
  - [ ] Create `frontend/src/types/notification.types.ts`:
    - [ ] `Notification` interface
    - [ ] `NotificationPreference` interface
    - [ ] `NotificationType` enum

- [ ] **Frontend - Notification Components**
  - [ ] Create `frontend/src/components/notifications/NotificationBell.tsx`:
    - [ ] Bell icon with unread count badge
    - [ ] Click to open notification dropdown
  - [ ] Create `frontend/src/components/notifications/NotificationDropdown.tsx`:
    - [ ] Dropdown list of recent notifications
    - [ ] Mark as read on click
    - [ ] Link to full notifications page
  - [ ] Create `frontend/src/components/notifications/NotificationList.tsx`:
    - [ ] Full list of notifications
    - [ ] Filter by type, read status
    - [ ] Pagination
  - [ ] Create `frontend/src/components/notifications/NotificationItem.tsx`:
    - [ ] Individual notification item
    - [ ] Show type icon, title, message, timestamp
    - [ ] Mark as read button
  - [ ] Add notification bell to main layout/navbar

- [ ] **Frontend - Notification Hooks**
  - [ ] Create `frontend/src/hooks/useNotifications.ts`:
    - [ ] `useNotifications()` - Fetch notifications
    - [ ] `useUnreadCount()` - Get unread count
    - [ ] `useMarkAsRead()` - Mark as read mutation
    - [ ] Real-time updates (WebSocket or polling)

- [ ] **Frontend - Settings Integration**
  - [ ] Update `frontend/src/pages/SettingsPage.tsx`:
    - [ ] Add notification preferences section
    - [ ] Toggle switches for each notification type
    - [ ] Email vs in-app preferences
    - [ ] Save preferences

### 3. Settings Page Enhancements
- [ ] **Backend - User Profile Updates**
  - [ ] Update `backend/apps/accounts/views.py`:
    - [ ] Enhance `UserProfileView` to allow updating:
      - [ ] Full name
      - [ ] Phone number
      - [ ] Email (with verification)
      - [ ] Preferences JSON field
  - [ ] Add email change verification flow
  - [ ] Add password change endpoint (if not exists)

- [ ] **Frontend - Settings Page Improvements**
  - [ ] Update `frontend/src/pages/SettingsPage.tsx`:
    - [ ] **Profile Section:**
      - [ ] Edit full name form
      - [ ] Edit email form (with verification)
      - [ ] Edit phone number form
      - [ ] Change password form
      - [ ] Profile picture upload (future)
    - [ ] **Account Section:**
      - [ ] List connected accounts with disconnect option
      - [ ] Account sync status
      - [ ] Last synced timestamp
    - [ ] **Preferences Section:**
      - [ ] Default currency selection
      - [ ] Date format preferences
      - [ ] Theme preferences (if dark mode exists)
    - [ ] **Security Section:**
      - [ ] MFA setup (when implemented)
      - [ ] Active sessions list
      - [ ] Password change
    - [ ] **Notifications Section:**
      - [ ] Notification preferences (from notifications feature)
    - [ ] **Subscription Section:**
      - [ ] Current tier display
      - [ ] Upgrade/downgrade options (if premium features exist)
      - [ ] Billing information

- [ ] **Frontend - Settings Components**
  - [ ] Create `frontend/src/components/settings/ProfileForm.tsx`
  - [ ] Create `frontend/src/components/settings/PasswordForm.tsx`
  - [ ] Create `frontend/src/components/settings/AccountList.tsx`
  - [ ] Create `frontend/src/components/settings/PreferencesForm.tsx`
  - [ ] Create `frontend/src/components/settings/SecuritySettings.tsx`

### 4. Enhanced Analytics
- [ ] **Backend - Advanced Analytics**
  - [ ] Update `backend/apps/analytics/utils.py`:
    - [ ] `get_spending_trends(user, months)` - Month-over-month trends
    - [ ] `get_category_trends(user, category, months)` - Category-specific trends
    - [ ] `get_spending_patterns(user, month, year)` - Day of week, time of month patterns
    - [ ] `calculate_net_worth(user)` - Net worth calculation
    - [ ] `get_income_vs_expense(user, month, year)` - Income vs expense comparison
    - [ ] `get_top_categories(user, month, year, limit)` - Top spending categories
    - [ ] `get_spending_forecast(user, months)` - Future spending predictions

- [ ] **Backend - Analytics Endpoints**
  - [ ] Update `backend/apps/analytics/views.py`:
    - [ ] `TrendsView` - GET `/api/v1/analytics/trends/`
    - [ ] `ForecastView` - GET `/api/v1/analytics/forecast/`
    - [ ] `NetWorthView` - GET `/api/v1/analytics/net-worth/`
    - [ ] `PatternsView` - GET `/api/v1/analytics/patterns/`
    - [ ] `RecommendationsView` - GET `/api/v1/analytics/recommendations/`

- [ ] **Backend - Analytics Serializers**
  - [ ] Update `backend/apps/analytics/serializers.py`:
    - [ ] `TrendsSerializer`
    - [ ] `ForecastSerializer`
    - [ ] `NetWorthSerializer`
    - [ ] `PatternsSerializer`
    - [ ] `RecommendationsSerializer`

- [ ] **Frontend - Analytics Service**
  - [ ] Create `frontend/src/services/analyticsService.ts`:
    - [ ] `getTrends(months)` - Get spending trends
    - [ ] `getForecast(months)` - Get spending forecast
    - [ ] `getNetWorth()` - Get net worth
    - [ ] `getPatterns(month, year)` - Get spending patterns
    - [ ] `getRecommendations()` - Get personalized recommendations

- [ ] **Frontend - Analytics Types**
  - [ ] Create `frontend/src/types/analytics.types.ts`:
    - [ ] `TrendData` interface
    - [ ] `ForecastData` interface
    - [ ] `NetWorthData` interface
    - [ ] `PatternData` interface
    - [ ] `Recommendation` interface

- [ ] **Frontend - Analytics Components**
  - [ ] Create `frontend/src/components/analytics/TrendsChart.tsx`:
    - [ ] Line chart showing spending over time
    - [ ] Compare multiple months
  - [ ] Create `frontend/src/components/analytics/NetWorthCard.tsx`:
    - [ ] Display current net worth
    - [ ] Show trend (up/down)
  - [ ] Create `frontend/src/components/analytics/PatternsChart.tsx`:
    - [ ] Day of week spending chart
    - [ ] Time of month spending chart
  - [ ] Create `frontend/src/components/analytics/RecommendationsList.tsx`:
    - [ ] Display personalized recommendations
    - [ ] Actionable insights

- [ ] **Frontend - Analytics Page**
  - [ ] Create `frontend/src/pages/AnalyticsPage.tsx`:
    - [ ] Full analytics dashboard
    - [ ] Date range selector
    - [ ] Multiple chart visualizations
    - [ ] Export to CSV option
  - [ ] Add route to main router

- [ ] **Dashboard Integration**
  - [ ] Update `frontend/src/components/dashboard/DashboardWidgets.tsx`:
    - [ ] Add net worth widget
    - [ ] Add trends mini-chart
    - [ ] Add recommendations widget

### 5. Transaction Enhancements
- [ ] **Transaction Splitting**
  - [ ] Backend:
    - [ ] Create `TransactionSplit` model:
      - [ ] Foreign key to Transaction
      - [ ] Amount, category, description fields
    - [ ] Update `TransactionSerializer` to include splits
    - [ ] Add split validation (sum must equal transaction amount)
    - [ ] Create split endpoints
  - [ ] Frontend:
    - [ ] Create `TransactionSplitForm.tsx` component
    - [ ] Add split functionality to transaction detail/edit
    - [ ] Display splits in transaction list

- [ ] **Receipt Upload**
  - [ ] Backend:
    - [ ] Set up file storage (S3 or local)
    - [ ] Create `Receipt` model:
      - [ ] Foreign key to Transaction
      - [ ] File field, upload date
    - [ ] Add receipt upload endpoint
    - [ ] Add file validation (size, type)
  - [ ] Frontend:
    - [ ] Create `ReceiptUpload.tsx` component
    - [ ] Add upload to transaction detail page
    - [ ] Display receipt thumbnails
    - [ ] Receipt viewer modal

- [ ] **Improved Recurring Detection**
  - [ ] Backend:
    - [ ] Create `backend/apps/transactions/recurring_detection.py`:
      - [ ] Algorithm to detect recurring transactions
      - [ ] Match by merchant, amount, date patterns
      - [ ] Update `is_recurring` flag automatically
    - [ ] Create Celery task to run detection periodically
    - [ ] Add endpoint to manually mark as recurring
  - [ ] Frontend:
    - [ ] Show recurring indicator in transaction list
    - [ ] Filter by recurring transactions
    - [ ] Recurring transactions view/page

- [ ] **Transfer Detection Improvements**
  - [ ] Backend:
    - [ ] Improve transfer detection logic:
      - [ ] Match transfers between user's accounts
      - [ ] Better identification of transfer patterns
    - [ ] Auto-categorize transfers
    - [ ] Group related transfers

## Medium Priority - Advanced Features

### 6. Smart Insights & Recommendations
- [ ] **Backend - Insights Engine**
  - [ ] Create `backend/apps/insights/` app
  - [ ] Create `backend/apps/insights/insight_engine.py`:
    - [ ] Analyze spending patterns
    - [ ] Detect unusual spending
    - [ ] Identify subscription patterns
    - [ ] Generate personalized recommendations
  - [ ] Create insights models and API endpoints
  - [ ] Create Celery tasks for periodic analysis

- [ ] **Frontend - Insights Display**
  - [ ] Create insights components
  - [ ] Add insights section to dashboard
  - [ ] Create insights page

### 7. Automated Savings Features
- [ ] **Round-up Savings**
  - [ ] Backend logic to calculate round-ups
  - [ ] Auto-contribute to goals
  - [ ] Frontend UI for enabling/disabling

- [ ] **Percentage-based Savings**
  - [ ] Backend calculation logic
  - [ ] Frontend configuration UI

### 8. Multi-Factor Authentication (MFA)
- [ ] **Backend - MFA Implementation**
  - [ ] Implement TOTP (Time-based OTP) generation
  - [ ] Create MFA setup endpoint
  - [ ] Create MFA verification endpoint
  - [ ] Update login flow to require MFA when enabled
  - [ ] Add backup codes generation

- [ ] **Frontend - MFA UI**
  - [ ] MFA setup flow
  - [ ] QR code display for authenticator apps
  - [ ] MFA verification during login
  - [ ] Settings page MFA management

### 9. Bill Management
- [ ] **Backend - Bill Models**
  - [ ] Create `Bill` model
  - [ ] Create bill tracking logic
  - [ ] Create bill reminder system

- [ ] **Frontend - Bill Management**
  - [ ] Create bills page
  - [ ] Bill creation/editing
  - [ ] Bill reminders display
  - [ ] Calendar integration

### 10. Debt Management System
- [ ] **Backend - Debt Models**
  - [ ] Create `backend/apps/debts/models.py`:
    - [ ] `DebtAccount` model:
      - [ ] Fields: debt_id, user, name, debt_type (credit_card, personal_loan, mortgage, auto_loan, student_loan, other)
      - [ ] Fields: current_balance, original_balance, interest_rate (APR), minimum_payment
      - [ ] Fields: due_date (day of month), payment_frequency (monthly, biweekly, weekly)
      - [ ] Fields: account_number_masked, creditor_name, account_status (active, paid_off, closed)
      - [ ] Fields: opened_date, payoff_date (target), last_payment_date, last_payment_amount
      - [ ] Fields: is_active, notes, created_at, updated_at
    - [ ] `DebtPayment` model:
      - [ ] Fields: payment_id, debt_account, user, amount, payment_date
      - [ ] Fields: payment_type (minimum, extra, full), applied_to_principal, applied_to_interest
      - [ ] Fields: transaction_id (link to Transaction if from account), notes, created_at
    - [ ] `DebtPayoffStrategy` model:
      - [ ] Fields: strategy_id, user, strategy_type (snowball, avalanche, custom)
      - [ ] Fields: target_payoff_date, monthly_payment_budget, priority_order (JSON)
      - [ ] Fields: is_active, created_at, updated_at

- [ ] **Backend - Debt Utilities**
  - [ ] Create `backend/apps/debts/utils.py`:
    - [ ] `calculate_interest_accrued(debt, days)` - Calculate interest for period
    - [ ] `calculate_payoff_date(debt, monthly_payment)` - Calculate when debt will be paid off
    - [ ] `calculate_total_interest(debt, payoff_date)` - Total interest paid over lifetime
    - [ ] `calculate_minimum_payment(debt)` - Calculate minimum payment based on balance and rate
    - [ ] `apply_payment_to_debt(debt, payment_amount)` - Apply payment, split principal/interest
    - [ ] `generate_snowball_strategy(user, debts)` - Order debts by balance (smallest first)
    - [ ] `generate_avalanche_strategy(user, debts)` - Order debts by interest rate (highest first)
    - [ ] `calculate_strategy_savings(strategy)` - Compare total interest vs minimum payments
    - [ ] `get_debt_payoff_projection(debt, monthly_payment)` - Project balance over time
    - [ ] `get_total_debt_summary(user)` - Aggregate all debts (total balance, total minimum payments)

- [ ] **Backend - Debt Serializers**
  - [ ] Create `backend/apps/debts/serializers.py`:
    - [ ] `DebtAccountSerializer` (read operations):
      - [ ] Include calculated fields: days_until_due, interest_this_month, payoff_date_projection
      - [ ] Include payment history summary
    - [ ] `DebtAccountCreateSerializer` (create operations):
      - [ ] Validation for interest_rate, balance, minimum_payment
      - [ ] Validate due_date is valid day of month (1-31)
    - [ ] `DebtAccountUpdateSerializer` (update operations):
      - [ ] Allow updating balance, interest_rate, minimum_payment
      - [ ] Auto-calculate changes when balance updated
    - [ ] `DebtPaymentSerializer`:
      - [ ] Include debt account info, formatted amounts
    - [ ] `DebtPaymentCreateSerializer`:
      - [ ] Validation for payment amount, date
      - [ ] Auto-calculate principal vs interest split
    - [ ] `DebtPayoffStrategySerializer`:
      - [ ] Include debt order, projected savings, timeline

- [ ] **Backend - Debt Views & API**
  - [ ] Create `backend/apps/debts/views.py`:
    - [ ] `DebtAccountViewSet` (CRUD operations):
      - [ ] List user's debts with filters (active, type, status)
      - [ ] Create new debt account
      - [ ] Update debt (balance, rate, etc.)
      - [ ] Delete debt account
      - [ ] Custom action: `mark_paid_off` - Mark debt as paid off
      - [ ] Custom action: `projection` - Get payoff projection
    - [ ] `DebtPaymentViewSet`:
      - [ ] List payments for a debt
      - [ ] Record new payment
      - [ ] Update payment (if manual entry)
      - [ ] Delete payment (with balance recalculation)
      - [ ] Link payment to transaction (if from connected account)
    - [ ] `DebtPayoffStrategyViewSet`:
      - [ ] Create strategy (snowball/avalanche)
      - [ ] Get recommended strategy
      - [ ] Update strategy priority order
      - [ ] Get strategy projections and savings
    - [ ] `DebtSummaryView` (APIView):
      - [ ] GET `/api/v1/debts/summary/` - Total debt, total minimum payments, total interest
      - [ ] Include breakdown by debt type
      - [ ] Include debt-to-income ratio (if income data available)

- [ ] **Backend - Debt Integration**
  - [ ] Create `backend/apps/debts/urls.py`:
    - [ ] Register all ViewSets and views
    - [ ] Nested routes for payments under debts
  - [ ] Add to main `config/urls.py`
  - [ ] Create `backend/apps/debts/admin.py` for Django admin
  - [ ] Add permissions (`IsOwnerOrReadOnly`)

- [ ] **Backend - Debt Calculations & Tasks**
  - [ ] Create `backend/apps/debts/tasks.py`:
    - [ ] `update_debt_balances()` - Periodic task to apply interest
    - [ ] `check_upcoming_due_dates()` - Alert users of upcoming payments
    - [ ] `sync_debt_payments_from_transactions()` - Link transactions to debt payments
    - [ ] `recalculate_debt_projections()` - Update payoff dates based on payment history
  - [ ] Schedule tasks in `backend/config/celery.py`

- [ ] **Frontend - Debt Service**
  - [ ] Create `frontend/src/services/debtService.ts`:
    - [ ] `getDebts(filters?)` - List debts with optional filters
    - [ ] `getDebt(debtId)` - Get single debt with details
    - [ ] `createDebt(data)` - Create new debt account
    - [ ] `updateDebt(debtId, data)` - Update debt
    - [ ] `deleteDebt(debtId)` - Delete debt
    - [ ] `markPaidOff(debtId)` - Mark debt as paid off
    - [ ] `getDebtProjection(debtId, monthlyPayment)` - Get payoff projection
    - [ ] `getPayments(debtId)` - Get payment history
    - [ ] `recordPayment(debtId, paymentData)` - Record new payment
    - [ ] `getStrategy(type)` - Get payoff strategy (snowball/avalanche)
    - [ ] `createStrategy(data)` - Create custom strategy
    - [ ] `getSummary()` - Get debt summary/aggregates

- [ ] **Frontend - Debt Types**
  - [ ] Create `frontend/src/types/debt.types.ts`:
    - [ ] `DebtAccount` interface
    - [ ] `DebtType` type ('credit_card' | 'personal_loan' | 'mortgage' | 'auto_loan' | 'student_loan' | 'other')
    - [ ] `DebtAccountStatus` type ('active' | 'paid_off' | 'closed')
    - [ ] `DebtCreateData` interface
    - [ ] `DebtUpdateData` interface
    - [ ] `DebtPayment` interface
    - [ ] `PaymentType` type ('minimum' | 'extra' | 'full')
    - [ ] `DebtPaymentCreateData` interface
    - [ ] `DebtPayoffStrategy` interface
    - [ ] `StrategyType` type ('snowball' | 'avalanche' | 'custom')
    - [ ] `DebtProjection` interface
    - [ ] `DebtSummary` interface

- [ ] **Frontend - Debt Page**
  - [ ] Create `frontend/src/pages/DebtsPage.tsx`:
    - [ ] List all debts with key metrics
    - [ ] Total debt summary card
    - [ ] Filter by type, status
    - [ ] Sort by balance, interest rate, payoff date
    - [ ] Quick actions (add debt, record payment, view strategy)
  - [ ] Add route in main router

- [ ] **Frontend - Debt Components**
  - [ ] Create `frontend/src/components/debts/DebtList.tsx`:
    - [ ] Display list of debts
    - [ ] Show balance, interest rate, minimum payment, due date
    - [ ] Progress indicator for payoff
    - [ ] Quick actions (edit, record payment, mark paid off)
  - [ ] Create `frontend/src/components/debts/DebtCard.tsx`:
    - [ ] Individual debt card component
    - [ ] Display key metrics prominently
    - [ ] Show days until due date
    - [ ] Visual progress to payoff
    - [ ] Interest accrued this month
  - [ ] Create `frontend/src/components/debts/DebtForm.tsx`:
    - [ ] Create/edit debt form
    - [ ] Debt type selection
    - [ ] Balance, interest rate, minimum payment inputs
    - [ ] Due date configuration (day of month)
    - [ ] Creditor name, account number (masked)
    - [ ] Validation and error handling
  - [ ] Create `frontend/src/components/debts/DebtModal.tsx`:
    - [ ] Modal for creating/editing debts
    - [ ] Reuse DebtForm component
  - [ ] Create `frontend/src/components/debts/DebtDetailView.tsx`:
    - [ ] Detailed view of single debt
    - [ ] Payment history table
    - [ ] Payoff projection chart
    - [ ] Interest breakdown
    - [ ] Payment form inline
  - [ ] Create `frontend/src/components/debts/PaymentForm.tsx`:
    - [ ] Record payment form
    - [ ] Amount input
    - [ ] Payment type selection (minimum, extra, full)
    - [ ] Payment date picker
    - [ ] Link to transaction option
    - [ ] Notes field
  - [ ] Create `frontend/src/components/debts/PaymentHistory.tsx`:
    - [ ] Table of payment history
    - [ ] Show amount, date, type, principal/interest split
    - [ ] Sort and filter options
  - [ ] Create `frontend/src/components/debts/DebtPayoffStrategy.tsx`:
    - [ ] Display recommended strategy (snowball vs avalanche)
    - [ ] Show debt order
    - [ ] Projected savings calculation
    - [ ] Timeline visualization
    - [ ] Allow custom priority ordering
  - [ ] Create `frontend/src/components/debts/DebtProjectionChart.tsx`:
    - [ ] Chart showing balance over time
    - [ ] Projected payoff date
    - [ ] Interest vs principal breakdown
    - [ ] Use charting library (recharts/chart.js)
  - [ ] Create `frontend/src/components/debts/DebtSummaryCard.tsx`:
    - [ ] Total debt amount
    - [ ] Total minimum payments
    - [ ] Total interest (monthly/yearly)
    - [ ] Debt-to-income ratio (if available)
    - [ ] Breakdown by type

- [ ] **Frontend - Debt Hooks**
  - [ ] Create `frontend/src/hooks/useDebts.ts`:
    - [ ] `useDebts(filters?)` - Fetch and manage debts list
    - [ ] `useDebt(debtId)` - Fetch single debt
    - [ ] `useCreateDebt()` - Create debt mutation
    - [ ] `useUpdateDebt()` - Update debt mutation
    - [ ] `useDeleteDebt()` - Delete debt mutation
    - [ ] `useRecordPayment()` - Record payment mutation
    - [ ] `useDebtProjection()` - Get payoff projection
    - [ ] `useDebtStrategy()` - Get/create strategy
    - [ ] `useDebtSummary()` - Get debt summary
    - [ ] Handle loading and error states

- [ ] **Integration - Goals Integration**
  - [ ] Update `backend/apps/goals/models.py`:
    - [ ] Add `debt_account` ForeignKey to Goal model (optional)
    - [ ] Link debt payoff goals to debt accounts
  - [ ] Update `frontend/src/components/goals/GoalForm.tsx`:
    - [ ] Allow selecting debt account for debt payoff goals
    - [ ] Auto-populate target amount from debt balance
  - [ ] Update goal completion logic:
    - [ ] When debt payoff goal completed, mark debt as paid off
    - [ ] Sync goal progress with debt balance

- [ ] **Integration - Dashboard Integration**
  - [ ] Update `backend/apps/analytics/utils.py`:
    - [ ] Add `get_debt_summary(user)` function
  - [ ] Update `backend/apps/analytics/serializers.py`:
    - [ ] Add debt summary to DashboardSerializer
  - [ ] Update `frontend/src/components/dashboard/DashboardWidgets.tsx`:
    - [ ] Add debt summary widget
    - [ ] Show total debt, upcoming payments
    - [ ] Quick link to debts page
    - [ ] Debt payoff progress indicator

- [ ] **Integration - Transactions Integration**
  - [ ] Update transaction categorization:
    - [ ] Auto-detect debt payments from transactions
    - [ ] Suggest linking transaction to debt payment
  - [ ] Create transaction → debt payment link:
    - [ ] Allow linking existing transaction to debt payment
    - [ ] Auto-create debt payment from transaction
  - [ ] Update `frontend/src/components/transactions/TransactionDetail.tsx`:
    - [ ] Show linked debt payment if applicable
    - [ ] Add "Link to Debt Payment" action

- [ ] **Testing**
  - [ ] Backend tests:
    - [ ] Test debt CRUD operations
    - [ ] Test payment recording and balance updates
    - [ ] Test interest calculations
    - [ ] Test payoff strategy calculations
    - [ ] Test debt projections
    - [ ] Test permissions
  - [ ] Frontend tests:
    - [ ] Test debt components
    - [ ] Test payment forms
    - [ ] Test strategy calculations
    - [ ] Test integration with goals

## Lower Priority - Polish & Advanced

### 11. Code Quality & Testing
- [ ] **Backend Testing**
  - [ ] Increase test coverage for all apps
  - [ ] Add integration tests
  - [ ] Add API endpoint tests
  - [ ] Add Celery task tests

- [ ] **Frontend Testing**
  - [ ] Add component tests
  - [ ] Add integration tests
  - [ ] Add E2E tests (Playwright/Cypress)

- [ ] **Code Quality**
  - [ ] Run linters and fix issues
  - [ ] Add type checking (TypeScript strict mode)
  - [ ] Code review and refactoring
  - [ ] Performance optimization

### 12. Documentation
- [ ] **API Documentation**
  - [ ] Ensure all endpoints are documented in Swagger
  - [ ] Add request/response examples
  - [ ] Add error response documentation

- [ ] **Code Documentation**
  - [ ] Add docstrings to all functions/classes
  - [ ] Update README with new features
  - [ ] Create user guide/documentation

### 13. Performance & Optimization
- [ ] **Database Optimization**
  - [ ] Add missing database indexes
  - [ ] Optimize slow queries
  - [ ] Add database query caching

- [ ] **Frontend Optimization**
  - [ ] Implement code splitting
  - [ ] Optimize bundle size
  - [ ] Add lazy loading for routes
  - [ ] Optimize images and assets

### 14. Security Enhancements
- [ ] **Security Audit**
  - [ ] Review authentication/authorization
  - [ ] Check for SQL injection vulnerabilities
  - [ ] Check for XSS vulnerabilities
  - [ ] Review API rate limiting
  - [ ] Add security headers

- [ ] **Compliance**
  - [ ] GDPR compliance (if applicable)
  - [ ] Data encryption at rest
  - [ ] Audit logging

## Quick Wins (Low Effort, High Impact)

- [ ] Add loading states to all API calls
- [ ] Add error handling and user-friendly error messages
- [ ] Add empty states to all list views
- [ ] Add confirmation dialogs for destructive actions
- [ ] Improve mobile responsiveness
- [ ] Add keyboard shortcuts for common actions
- [ ] Add tooltips and help text
- [ ] Improve form validation and error display
- [ ] Add success notifications/toasts
- [ ] Add pagination to all list views

---

## Notes

- **Prioritize Budgeting System first** - This is the highest user value feature that's missing
- **Notifications are critical** - They keep users engaged and informed
- **Settings improvements** - Better user experience and account management
- **Enhanced analytics** - Provides more value to users
- **Test as you build** - Don't skip testing for new features
- **Consider user feedback** - Adjust priorities based on actual user needs

This list is comprehensive and can be broken down into smaller tasks as needed. Start with the High Priority section and work through items systematically.

