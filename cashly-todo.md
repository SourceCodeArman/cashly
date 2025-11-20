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
> - ⚠️ **Notifications**: Missing email service, NotificationPreference model, scheduled Celery tasks, and UI components (NotificationBell, NotificationDropdown) for header/navbar
> - ✅ **Settings Page**: Basic version implemented with Profile tab (first name, last name, email editing), Security tab (placeholders), Preferences tab (placeholders)
> - ⚠️ **Settings Enhancements**: Missing password change functionality, 2FA implementation, notification preferences, account management section, and subscription section (subscription management is on separate page)

## [x] Completed Features

### Core Infrastructure (Fully Implemented)
- [x] **User Authentication & Registration**
  - [x] User registration with email
  - [x] JWT authentication and token refresh
  - [x] Password reset flow (email-based)
  - [x] User profile endpoint (GET/PATCH)
  - [x] Custom User model with preferences and subscription tiers

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

## High Priority - Core Features

### 1. Budgeting System Implementation
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
  - [ ] Write tests:
    - [ ] Test budget CRUD operations
    - [ ] Test budget calculations
    - [ ] Test budget alerts
    - [ ] Test permissions

- [ ] **Backend - Budget Utilities** (Optional enhancement)
  - [ ] Create `backend/apps/budgets/utils.py`:
    - [ ] `get_budget_status(budget)` - Return status (on track, warning, exceeded) - Currently in view method
    - [ ] `get_budgets_needing_alerts(user)` - Find budgets approaching/exceeding limits
    - [ ] `get_active_budgets_for_period(user, month, year)` - Get budgets for specific period

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

### 2. Notifications & Alerts System
- [x] **Backend - Notification Models**
  - [x] Create `backend/apps/notifications/models.py`:
    - [x] `Notification` model (in-app notifications)
    - [x] Fields: type, title, message, read status, created_at, user, data (JSON)
    - [x] Notification types enum (transaction, goal, budget, account, system)
    - [ ] `NotificationPreference` model (user preferences) - NOT YET IMPLEMENTED

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

- [x] **Backend - Notification Views & API** ✅ Fully implemented
  - [x] `backend/apps/notifications/serializers.py`:
    - [x] `NotificationSerializer`
    - [x] `NotificationCreateSerializer`
    - [ ] `NotificationPreferenceSerializer` - NOT YET IMPLEMENTED
  - [x] `backend/apps/notifications/views.py`:
    - [x] `NotificationViewSet` - List, mark as read, delete notifications
    - [x] `UnreadCountView` - Get unread notification count
    - [ ] `NotificationPreferenceView` - Get/update user preferences - NOT YET IMPLEMENTED
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
- [ ] **Backend - Scheduled Celery Tasks for Notifications**
  - [ ] Add scheduled tasks to `backend/apps/notifications/tasks.py`:
    - [ ] `check_budget_alerts()` - Periodic task to check budgets
    - [ ] `check_goal_milestones()` - Check goal progress milestones
    - [ ] `send_weekly_summary()` - Weekly financial summary email
    - [ ] `send_monthly_summary()` - Monthly financial summary email
  - [ ] Schedule tasks in `backend/config/celery.py`

- [x] **Frontend - Notification Service**
  - [x] Create `frontend/src/services/notificationService.ts`:
    - [x] `getNotifications(filters?)` - Get notifications with optional filters
    - [x] `getNotification(id)` - Get single notification
    - [x] `markAsRead(id)` - Mark notification as read
    - [x] `markAllAsRead()` - Mark all as read
    - [x] `deleteNotification(id)` - Delete notification
    - [x] `getUnreadCount()` - Get unread count
    - [ ] `updatePreferences(preferences)` - Update notification preferences - NOT YET IMPLEMENTED

- [x] **Frontend - Notification Types**
  - [x] Create `frontend/src/types/notification.types.ts`:
    - [x] `Notification` interface
    - [x] `NotificationFilters` interface
    - [ ] `NotificationPreference` interface - NOT YET IMPLEMENTED
    - [ ] `NotificationType` enum - PARTIALLY IMPLEMENTED (types exist in backend)

- [x] **Frontend - Notification Components** ✅ Partially implemented
  - [x] `frontend/src/pages/Notifications.tsx` exists:
    - [x] Full notifications page with list view
    - [x] Group notifications by date
    - [x] Mark as read functionality
    - [x] Mark all as read functionality
    - [x] Delete notifications
    - [x] Empty state handling
  - [ ] Create `frontend/src/components/notifications/NotificationBell.tsx`:
    - [ ] Bell icon with unread count badge - NOT YET IMPLEMENTED
    - [ ] Click to open notification dropdown
    - [ ] Display in Header/navbar
  - [ ] Create `frontend/src/components/notifications/NotificationDropdown.tsx`:
    - [ ] Dropdown list of recent notifications - NOT YET IMPLEMENTED
    - [ ] Mark as read on click
    - [ ] Link to full notifications page
    - [ ] Show unread count badge
  - [ ] Add notification bell to main layout/navbar (Header.tsx) - NOT YET IMPLEMENTED

- [x] **Frontend - Notification Hooks**
  - [x] Create `frontend/src/hooks/useNotifications.ts`:
    - [x] `useNotifications()` - Fetch notifications
    - [x] `useUnreadCount()` - Get unread count
    - [x] `useMarkAsRead()` - Mark as read mutation
    - [ ] Real-time updates (WebSocket or polling) - NOT YET IMPLEMENTED

- [ ] **Frontend - Settings Integration**
  - [ ] Update `frontend/src/pages/SettingsPage.tsx`:
    - [ ] Add notification preferences section
    - [ ] Toggle switches for each notification type
    - [ ] Email vs in-app preferences
    - [ ] Save preferences

### 3. Settings Page Enhancements
- [x] **Backend - User Profile Updates (Basic)**
  - [x] `UserProfileView` exists with GET/PATCH
  - [x] Basic user profile retrieval and update
  - [ ] Enhance `backend/apps/accounts/views.py`:
    - [x] Allow updating basic fields (username, email, first_name, last_name)
    - [ ] Phone number update
    - [ ] Email change with verification flow
    - [ ] Preferences JSON field update
  - [ ] Add email change verification flow
  - [ ] Add password change endpoint

- [x] **Frontend - Settings Page (Basic)** ✅ Partially implemented
  - [x] `frontend/src/pages/Settings.tsx` exists with tabs:
    - [x] Profile tab: Edit first name, last name, email (fully functional form)
    - [x] Security tab: Placeholder UI for password change and 2FA (buttons exist but not functional)
    - [x] Preferences tab: Placeholder UI for theme and notifications (buttons exist but not functional)
  - [ ] **Frontend - Settings Page Improvements**
    - [ ] Update `frontend/src/pages/Settings.tsx`:
      - [x] **Profile Section:** ✅ Implemented (first name, last name, email editing)
      - [ ] **Profile Section Enhancements:**
        - [ ] Edit phone number form
        - [ ] Profile picture upload (future)
      - [ ] **Account Section:** (New tab/section needed)
        - [ ] List connected accounts with disconnect option
        - [ ] Account sync status
        - [ ] Last synced timestamp
      - [ ] **Preferences Section:** (UI exists, needs functionality)
        - [ ] Default currency selection
        - [ ] Date format preferences
        - [ ] Theme preferences (light/dark mode toggle)
        - [ ] Notification preferences (from notifications feature)
      - [ ] **Security Section:** (UI exists, needs functionality)
        - [ ] Password change form and endpoint integration
        - [ ] MFA setup (when backend implemented)
        - [ ] Active sessions list
      - [ ] **Subscription Section:** (Note: Subscription management is on separate `/subscription` page)
        - [ ] Consider adding subscription summary/link in Settings
        - [ ] Or integrate subscription management into Settings page

- [ ] **Frontend - Settings Components**
  - [ ] Create `frontend/src/components/settings/ProfileForm.tsx`
  - [ ] Create `frontend/src/components/settings/PasswordForm.tsx`
  - [ ] Create `frontend/src/components/settings/AccountList.tsx`
  - [ ] Create `frontend/src/components/settings/PreferencesForm.tsx`
  - [ ] Create `frontend/src/components/settings/SecuritySettings.tsx`

### 4. Sankey Diagram Visualization (Pro/Premium Feature)
- [ ] **Backend - Sankey Data Endpoint**
  - [ ] Create `backend/apps/analytics/sankey.py`:
    - [ ] `get_sankey_data(user, start_date, end_date)` - Generate Sankey diagram data
    - [ ] Flow: Income → Categories → Subcategories (or Income → Accounts → Categories)
    - [ ] Calculate flow amounts between nodes
    - [ ] Support multiple date ranges (monthly, quarterly, yearly)
  - [ ] Add endpoint in `backend/apps/analytics/views.py`:
    - [ ] `SankeyView` - GET `/api/v1/analytics/sankey/`
    - [ ] Require Pro or Premium subscription tier
    - [ ] Date range filtering
    - [ ] Optional filters (accounts, categories)
  - [ ] Add serializer in `backend/apps/analytics/serializers.py`:
    - [ ] `SankeyDataSerializer` - Nodes and links structure
    - [ ] Format compatible with frontend charting library

- [ ] **Frontend - Sankey Diagram Component**
  - [ ] Create `frontend/src/components/analytics/SankeyDiagram.tsx`:
    - [ ] Use charting library (recharts, plotly, or d3-sankey)
    - [ ] Interactive diagram with hover tooltips
    - [ ] Show flow amounts on links
    - [ ] Color coding by category type
    - [ ] Responsive design
  - [ ] Create `frontend/src/services/analyticsService.ts` method:
    - [ ] `getSankeyData(startDate, endDate, filters?)` - Fetch Sankey data
  - [ ] Add to Analytics page or create dedicated Sankey page
  - [ ] Add subscription tier check (Pro/Premium only)
  - [ ] Show upgrade prompt for Free tier users

- [ ] **Integration**
  - [ ] Add Sankey diagram to Analytics page
  - [ ] Add date range selector
  - [ ] Add export functionality (PNG/SVG)
  - [ ] Add to dashboard as premium widget (optional)

### 5. Enhanced Analytics
- [x] **Backend - Basic Analytics (Implemented)**
  - [x] `get_account_balance_summary(user)` - Account balance summary
  - [x] `get_recent_transactions(user, limit)` - Recent transactions
  - [x] `get_monthly_spending_summary(user, month, year)` - Monthly spending by category
  - [x] `get_goal_progress(user)` - Goal progress tracking
  - [x] `get_category_spending_chart(user, month, year)` - Category spending chart
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

### 6. Transaction Enhancements
- [x] **Basic Transaction Features (Implemented)**
  - [x] Transaction CRUD operations
  - [x] Transaction filtering and search
  - [x] Transaction categorization (automatic and manual)
  - [x] Recurring transaction detection (basic - is_recurring flag)
  - [x] Transfer detection (basic - is_transfer flag)
  - [x] Transaction notes and tags
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

- [x] **Basic Recurring Detection (Implemented)**
  - [x] `is_recurring` flag on Transaction model
  - [ ] **Improved Recurring Detection**
  - [ ] Backend:
    - [ ] Create `backend/apps/transactions/recurring_detection.py`:
      - [ ] Algorithm to detect recurring transactions automatically
      - [ ] Match by merchant, amount, date patterns
      - [ ] Update `is_recurring` flag automatically
    - [ ] Create Celery task to run detection periodically
    - [ ] Add endpoint to manually mark as recurring
  - [ ] Frontend:
    - [ ] Show recurring indicator in transaction list
    - [ ] Filter by recurring transactions
    - [ ] Recurring transactions view/page

- [x] **Basic Transfer Detection (Implemented)**
  - [x] `is_transfer` flag on Transaction model
  - [ ] **Transfer Detection Improvements**
  - [ ] Backend:
    - [ ] Improve transfer detection logic:
      - [ ] Match transfers between user's accounts automatically
      - [ ] Better identification of transfer patterns
    - [ ] Auto-categorize transfers
    - [ ] Group related transfers

## Medium Priority - Advanced Features

### 7. Smart Insights & Recommendations
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

### 8. Automated Savings Features
- [ ] **Round-up Savings**
  - [ ] Backend logic to calculate round-ups
  - [ ] Auto-contribute to goals
  - [ ] Frontend UI for enabling/disabling

- [ ] **Percentage-based Savings**
  - [ ] Backend calculation logic
  - [ ] Frontend configuration UI

### 9. Multi-Factor Authentication (MFA)
- [x] **Backend - MFA Models (Prepared)**
  - [x] MFA fields on User model (mfa_enabled, mfa_secret)
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

### 10. Bill Management
- [ ] **Backend - Bill Models**
  - [ ] Create `Bill` model
  - [ ] Create bill tracking logic
  - [ ] Create bill reminder system

- [ ] **Frontend - Bill Management**
  - [ ] Create bills page
  - [ ] Bill creation/editing
  - [ ] Bill reminders display
  - [ ] Calendar integration

### 11. Debt Management System
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

### 12. Code Quality & Testing
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

### 13. Documentation
- [x] **API Documentation (Basic)**
  - [x] Swagger/OpenAPI documentation setup (drf-yasg)
  - [x] API endpoints documented in Swagger UI
  - [x] Basic README with setup instructions
  - [x] Plaid sandbox testing guide
  - [x] Supabase setup guide
  - [x] SendGrid testing guide
  - [ ] Ensure all endpoints are fully documented in Swagger
  - [ ] Add request/response examples
  - [ ] Add error response documentation

- [ ] **Code Documentation**
  - [ ] Add docstrings to all functions/classes
  - [ ] Update README with new features
  - [ ] Create user guide/documentation

### 14. Performance & Optimization
- [ ] **Database Optimization**
  - [ ] Add missing database indexes
  - [ ] Optimize slow queries
  - [ ] Add database query caching

- [ ] **Frontend Optimization**
  - [ ] Implement code splitting
  - [ ] Optimize bundle size
  - [ ] Add lazy loading for routes
  - [ ] Optimize images and assets

### 15. Security Enhancements
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

- **Prioritize Budgeting Frontend** - Backend is complete, frontend implementation is the next critical step
- **Notification UI Components** - Add NotificationBell and NotificationDropdown to header for better UX
- **Settings Functionality** - Implement password change, 2FA, and preferences to complete the Settings page
- **Sankey Diagram** - Premium feature for Pro/Premium tiers - visual flow analysis of income and spending
- **Email Notifications** - Complete notification system with email service and scheduled Celery tasks
- **Test as you build** - Don't skip testing for new features
- **Consider user feedback** - Adjust priorities based on actual user needs

This list is comprehensive and can be broken down into smaller tasks as needed. Start with the High Priority section and work through items systematically.

