# Goal Account Linking and Custom Contribution Rules

## Overview

Add the ability for users to link a savings/checking account (or choose "cash" for physical cash savings) when creating goals, and configure custom contribution rules for automatic goal contributions. Account linking enables display/tracking, automatic transfers via Plaid, and contribution filtering by source account.

**Key Features:**
- Destination account selection (one savings/checking account or "cash")
- Automatic balance sync for destination accounts
- Multiple source accounts with per-account or general contribution rules
- Transfer authorization flow (goal inactive until authorized)
- Cash goal reminder system (email/app notifications)
- Proper goal activation workflow

## Backend Changes

### 1. Database Schema Updates

**File: `backend/apps/goals/models.py`**

- Add `destination_account` field to `Goal` model:
  - ForeignKey to `Account` (nullable, allows cash option)
  - `on_delete=models.SET_NULL` to preserve goals if account is deleted
  - `null=True, blank=True`
  - Help text: "Destination account where goal funds accumulate. Null means cash savings."
  - Only accepts checking or savings account types

- Add `transfer_authorized` field to `Goal` model:
  - BooleanField, default=False
  - Tracks if user has authorized automatic transfers via Plaid
  - Required for goal activation if destination is an account

- Add `initial_balance_synced` field to `Goal` model:
  - BooleanField, default=False
  - Tracks if destination account balance has been synced as initial `current_amount`

- Add `contribution_rules` JSONField to `Goal` model:
  - Store rule configuration with source accounts
  - Default: empty dict
  - Structure:
    ```json
    {
      "enabled": true,
      "destination_account_id": "uuid-of-savings-account",
      "source_accounts": [
        {
          "account_id": "checking-account-uuid",
          "rule": {
            "type": "fixed_monthly",
            "amount": 200.00,
            "frequency": "monthly"
          }
        },
        {
          "account_id": "another-checking-uuid",
          "rule": {
            "type": "percentage_income",
            "percentage": 10,
            "min_amount": 50.00,
            "max_amount": 500.00
          }
        }
      ],
      "general_rule": {
        "type": "fixed_monthly",
        "amount": 50.00,
        "frequency": "monthly"
      }
    }
    ```
  - Rule types supported:
    - `fixed_monthly`, `fixed_weekly`, `fixed_daily`: Fixed amount at interval
    - `percentage_income`: Percentage of income transactions
    - `conditional_balance`: When account balance exceeds threshold
    - `conditional_transaction`: When transaction amount exceeds threshold
    - `payday`: On specific dates (e.g., 1st and 15th of month)

- Add `reminder_settings` JSONField to `Goal` model:
  - For cash goals only
  - Structure:
    ```json
    {
      "enabled": true,
      "frequency": "weekly",
      "channels": ["email", "push"],
      "day_of_week": 1,
      "time": "09:00",
      "message_template": "Time to set aside ${amount} for {goal_name}"
    }
    ```

- Update `is_active` field behavior:
  - Default to `False` for new goals
  - Only set to `True` after transfer authorization (for account goals) or immediately (for cash goals)

- Create migration for new fields

**New Model: `TransferAuthorization`**

**File: `backend/apps/goals/models.py`**

- Create new model to track Plaid transfer authorizations:
  - `authorization_id` (UUID, primary key)
  - `goal` (ForeignKey to Goal)
  - `authorization_token` (encrypted, from Plaid)
  - `authorized_at` (DateTime)
  - `expires_at` (DateTime, nullable)
  - `status` (CharField: active, expired, revoked)
  - `plaid_authorization_id` (CharField, from Plaid response)

### 2. Serializer Updates

**File: `backend/apps/goals/serializers.py`**

- Update `GoalCreateSerializer`:
  - Add `destination_account_id` field (UUID, optional, nullable)
  - Add `contribution_rules` field (JSON/dict, optional)
  - Add `reminder_settings` field (JSON/dict, optional, for cash goals)
  - Validate `destination_account_id`:
    - If provided, must belong to user
    - Must be checking or savings type (not credit_card or investment)
    - If null, goal is cash-based
  - Validate `contribution_rules` structure:
    - Must have `enabled` boolean
    - `source_accounts` array with valid account IDs
    - Rule-specific validation (amount > 0, percentage 0-100, etc.)
    - Validate source accounts belong to user and are checking/savings
  - Validate `reminder_settings`:
    - Only valid if `destination_account_id` is null (cash goal)
    - Validate frequency, channels, day_of_week, time format

- Update `GoalSerializer`:
  - Add `destination_account_id` (read-only, from destination_account)
  - Add `destination_account_name` (read-only, display name or "Cash")
  - Add `destination_account_type` (read-only, "checking", "savings", or "cash")
  - Add `transfer_authorized` field
  - Add `initial_balance_synced` field
  - Add `contribution_rules` field
  - Add `reminder_settings` field
  - Include account info in response
  - Add `is_activation_pending` computed field (goal created but not authorized)

### 3. View Updates

**File: `backend/apps/goals/views.py`**

- Update `GoalViewSet.perform_create()`:
  - Handle `destination_account_id` from serializer
  - Set `destination_account` on goal creation (null for cash)
  - Validate account type is checking or savings (or null for cash)
  - Set `is_active = False` initially
  - Set `transfer_authorized = False` initially
  - If destination account provided:
    - Fetch account balance from Plaid
    - Set `current_amount = account.balance`
    - Set `initial_balance_synced = True`
  - If cash goal:
    - Set `is_active = True` immediately (no authorization needed)
    - Initialize `current_amount = 0.00`

- Add new action `authorize_transfers(request, pk=None)`:
  - `POST /api/v1/goals/:id/authorize-transfers/`
  - Initiate Plaid Transfer authorization flow
  - Create TransferAuthorization record
  - Update goal: `transfer_authorized = True`, `is_active = True`
  - Return authorization status

- Add new action `sync_destination_balance(request, pk=None)`:
  - `POST /api/v1/goals/:id/sync-balance/`
  - Manually sync destination account balance
  - Update goal `current_amount` with latest balance
  - Useful if user wants to refresh balance

- Update `GoalViewSet.perform_update()`:
  - Allow updating `destination_account`, `contribution_rules`, `reminder_settings`
  - Validate account changes
  - If destination account changes:
    - If changing from account to cash: Set `transfer_authorized = False`
    - If changing from cash to account: Require authorization
    - Sync new destination account balance if account provided
  - If contribution rules change: Validate source accounts still exist

### 4. Service Layer Updates

**File: `backend/apps/goals/services.py`**

- Add function `sync_destination_account_balance(goal: Goal)`:
  - Fetch current balance from Plaid for destination account
  - Update goal `current_amount` with account balance
  - Set `initial_balance_synced = True`
  - Return updated balance

- Add function `process_contribution_rules(goal: Goal, date_range: Optional[Tuple] = None)`:
  - Only process if goal is active and `transfer_authorized = True`
  - Evaluate all enabled contribution rules for a goal
  - Handle different rule types:
    - **Fixed frequency**: Create contribution at specified interval (daily/weekly/monthly)
    - **Percentage income**: Calculate percentage of income transactions, create contributions
    - **Conditional balance**: Check account balance, create contribution if threshold met
    - **Conditional transaction**: Monitor transactions, create contribution when condition met
    - **Payday**: Create contribution on specific dates
  - For each source account:
    - Apply account-specific rule if exists, otherwise use general rule
    - Calculate contribution amount
    - Execute transfer if destination is account (not cash)
  - Create Contribution records when rules are triggered
  - Return summary of contributions created

- Add function `execute_automatic_transfer(goal: Goal, source_account: Account, amount: Decimal)`:
  - Validate goal has destination account (not cash)
  - Validate `transfer_authorized = True`
  - Check source account balance via Plaid
  - If sufficient funds:
    - Initiate Plaid transfer: source → destination
    - Create Contribution record with transfer details
    - Update goal `current_amount`
    - Return transfer ID and status
  - If insufficient funds:
    - Log error, send notification to user
    - Return error status

- Add function `send_cash_reminder(goal: Goal)`:
  - Only for cash goals
  - Check reminder settings
  - Send email notification if enabled
  - Send push notification if enabled and mobile app available
  - Include goal name, target amount, current amount, suggested contribution

- Update `process_transaction_for_goals()`:
  - Consider contribution rules when processing transactions
  - Check if transaction matches rule conditions (percentage_income, conditional_transaction)
  - Filter by source account if goal has specific source accounts
  - Only process if goal is active

- Add periodic task (Celery) to process contribution rules:
  - Run daily to check all active goals
  - Process fixed frequency rules (daily/weekly/monthly)
  - Process conditional rules (balance checks, payday)
  - Execute automatic transfers if enabled and authorized
  - Send cash reminders based on reminder settings

- Add periodic task to sync destination account balances:
  - Run daily for all active goals with destination accounts
  - Sync balance from Plaid
  - Update `current_amount` if balance changed (user may have made external deposits)

### 5. Plaid Transfer Integration

**File: `backend/apps/accounts/plaid_service.py` or new `backend/apps/goals/transfer_service.py`**

- Add function `initiate_transfer_authorization(goal: Goal, user)`:
  - Use Plaid Transfer UI or API to initiate authorization
  - Return authorization link/token for user to complete
  - Store authorization status

- Add function `complete_transfer_authorization(authorization_token: str, goal: Goal)`:
  - Complete Plaid transfer authorization
  - Store authorization details in TransferAuthorization model
  - Update goal: `transfer_authorized = True`, `is_active = True`

- Add function `initiate_transfer(source_account: Account, destination_account: Account, amount: Decimal, description: str)`:
  - Use Plaid Transfer API to create transfer
  - Handle authorization (must be pre-authorized)
  - Return transfer ID and status
  - Store transfer details for tracking

- Add webhook handler for transfer status updates:
  - Handle Plaid transfer webhooks
  - Update contribution status based on transfer completion/failure
  - Handle transfer reversals
  - Update goal `current_amount` on successful transfer

### 6. Notification Service Integration

**File: `backend/apps/goals/tasks.py` or notification service**

- Add Celery task `send_cash_goal_reminders()`:
  - Query all active cash goals with reminders enabled
  - Check reminder schedule (frequency, day_of_week, time)
  - Send email notifications
  - Send push notifications (if mobile app integration exists)

- Add email template for cash reminders:
  - Include goal name, target, current amount, progress
  - Suggested contribution amount
  - Link to add contribution

### 7. Account Filtering

**File: `backend/apps/accounts/views.py` or `serializers.py`**

- Add endpoint or filter for goal-compatible accounts:
  - `GET /api/v1/accounts/goal-compatible/`
  - Filter by account_type: checking or savings only
  - Exclude credit_card and investment types
  - Return account_id, name, type, balance for dropdown
  - Include account balance for display

## Frontend Changes

### 1. Type Definitions

**File: `frontend/src/types/goal.types.ts`**

- Add `destination_account_id?: string | null` to `Goal` type
- Add `destination_account_name?: string` to `Goal` type
- Add `destination_account_type?: 'checking' | 'savings' | 'cash'` to `Goal` type
- Add `transfer_authorized?: boolean` to `Goal` type
- Add `initial_balance_synced?: boolean` to `Goal` type
- Add `is_activation_pending?: boolean` to `Goal` type
- Add `contribution_rules?: ContributionRulesConfig` to `Goal` type
- Add `reminder_settings?: ReminderSettings` to `Goal` type
- Create comprehensive rule types:
  ```typescript
  type ContributionRule = 
    | { type: 'fixed_monthly' | 'fixed_weekly' | 'fixed_daily'; amount: number; frequency: 'daily' | 'weekly' | 'monthly' }
    | { type: 'percentage_income'; percentage: number; min_amount?: number; max_amount?: number }
    | { type: 'conditional_balance'; threshold: number; operator: 'gt' | 'gte'; amount: number }
    | { type: 'conditional_transaction'; threshold: number; operator: 'gt' | 'gte'; percentage?: number; amount?: number }
    | { type: 'payday'; dates: number[]; amount: number } // dates: [1, 15] for 1st and 15th
  
  type SourceAccountRule = {
    account_id: string
    rule: ContributionRule
  }
  
  type ContributionRulesConfig = {
    enabled: boolean
    destination_account_id?: string
    source_accounts: SourceAccountRule[]
    general_rule?: ContributionRule
  }
  
  type ReminderSettings = {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly' | 'biweekly'
    channels: ('email' | 'push')[]
    day_of_week?: number // 0-6, Sunday = 0
    time?: string // "HH:MM" format
    message_template?: string
  }
  ```
- Update `GoalCreateData` to include `destination_account_id`, `contribution_rules`, and `reminder_settings`

### 2. Goal Creation Form

**File: `frontend/src/pages/GoalsPage.tsx`**

- Add destination account selection in create goal modal:
  - Fetch accounts using `useAccounts()` hook
  - Filter to checking/savings accounts only
  - Add "Cash" option as first option (null value) with clear label
  - Display account name, type, and masked account number
  - Show account balance if available
  - When account selected, show preview: "Starting balance: $X,XXX.XX"

- Add source accounts selection:
  - Multi-select dropdown or checkbox list
  - Show all checking/savings accounts (excluding destination)
  - Allow selecting multiple source accounts
  - For each selected source account:
    - Show rule configuration UI
    - Allow setting account-specific rule OR use general rule
  - Add "General Rule" option that applies to all sources

- Add contribution rules section:
  - Toggle for "Enable automatic contributions"
  - When enabled:
    - Show source accounts selector
    - For each source account: Rule type selector + rule-specific fields
    - General rule option (applies to all sources without specific rules)
    - Rule type selector with all supported types
    - Conditional fields based on rule type:
      - Fixed rules: amount + frequency
      - Percentage: percentage + optional min/max
      - Conditional: threshold + operator + amount/percentage
      - Payday: date picker (multiple dates) + amount
    - Preview of rule logic
    - Warning if destination is "Cash" but rules require transfers

- Add reminder settings (only shown if destination is "Cash"):
  - Toggle for "Enable reminders"
  - Frequency selector (daily, weekly, monthly, biweekly)
  - Channel selector (email, push notifications)
  - Day of week selector (for weekly/biweekly)
  - Time picker
  - Preview of reminder schedule

- Update form schema (`goalSchema`) to include new fields with proper validation

- After goal creation:
  - If destination is account: Show authorization modal/flow
  - If destination is cash: Goal is immediately active

### 3. Transfer Authorization Flow

**File: `frontend/src/components/goals/TransferAuthorizationModal.tsx` (new)**

- Create new modal component for transfer authorization:
  - Display goal details
  - Explain what authorization enables
  - Show source and destination accounts
  - Integrate Plaid Transfer UI or redirect to Plaid authorization
  - Show authorization status
  - Handle authorization completion
  - Update goal status after authorization

### 4. Goal Display

**File: `frontend/src/components/goals/GoalList.tsx` or similar**

- Display destination account name (or "Cash") in goal card
- Show account type badge (Checking/Savings/Cash)
- Show activation status:
  - "Pending Authorization" if `is_activation_pending = true`
  - "Active" if goal is active
- Show contribution rules summary if enabled:
  - "Auto-contributing: $50/month from Checking" or "Auto-contributing: 10% of income"
  - Multiple rules shown as list
  - Source accounts listed
- Show reminder status for cash goals
- Add "Authorize Transfers" button if pending authorization
- Add "Sync Balance" button for account goals

### 5. Account Service Integration

**File: `frontend/src/hooks/useGoals.ts`**

- Ensure accounts are available when creating goals
- Fetch accounts in goal creation flow if not already loaded
- Filter accounts to checking/savings for goal linking
- Add function to fetch goal-compatible accounts

**File: `frontend/src/services/goalService.ts`**

- Update `createGoal` to send `destination_account_id`, `contribution_rules`, `reminder_settings`
- Update `updateGoal` to handle new fields
- Add `authorizeTransfers(goalId: string)` function
- Add `syncDestinationBalance(goalId: string)` function
- Add `getGoalCompatibleAccounts()` function

### 6. Edit Goal Modal

**File: `frontend/src/components/goals/EditGoalModal.tsx`**

- Add destination account selection field (same as create)
  - Pre-select current destination account or "Cash"
  - Show warning if changing from account to cash (may affect transfers)
  - Show warning if changing from cash to account (requires authorization)
- Add source accounts editor:
  - Load existing source accounts and rules
  - Allow adding/editing/removing source accounts
  - Allow editing rules per account
  - Allow editing general rule
- Add contribution rules editor (same UI as create form)
- Add reminder settings editor (for cash goals)
- Allow updating destination account and rules
- Show impact of changes (e.g., "This will stop automatic transfers")
- Handle re-authorization if destination account changes

### 7. Cash Reminder Management

**File: `frontend/src/components/goals/CashReminderSettings.tsx` (new)**

- Create component for managing cash goal reminders:
  - Toggle reminders on/off
  - Configure frequency, channels, schedule
  - Preview reminder schedule
  - Test reminder (send test email/notification)

## API Endpoints

### New Endpoints

**File: `backend/apps/goals/views.py`**

- `POST /api/v1/goals/:id/authorize-transfers/`:
  - Initiate transfer authorization flow
  - Validate goal has destination account
  - Return authorization link/token
  - Update goal status after authorization

- `POST /api/v1/goals/:id/sync-balance/`:
  - Manually sync destination account balance
  - Fetch latest balance from Plaid
  - Update goal `current_amount`
  - Return updated balance

- `POST /api/v1/goals/:id/execute-transfer/`:
  - Manually trigger transfer for a goal
  - Validate goal has linked account and is authorized
  - Execute transfer via Plaid
  - Return transfer status

- `GET /api/v1/goals/:id/transfer-history/`:
  - Get history of automatic transfers for a goal
  - Include transfer status, amounts, dates, source accounts

- `GET /api/v1/accounts/goal-compatible/`:
  - Get list of accounts compatible with goal linking
  - Filter to checking/savings only
  - Include account balance

### Existing Endpoints

- Existing goal CRUD endpoints will handle new fields
- Contribution endpoints will filter by source account if specified

## Plaid Transfer Setup

### Configuration

- Ensure Plaid Transfer API is enabled in Plaid dashboard
- Configure transfer webhooks in Plaid
- Set up transfer authorization flow (requires user consent via Plaid Transfer UI)
- Store Plaid transfer authorization tokens securely (encrypted)

### Transfer Authorization

- Users must authorize transfers when:
  - First creating a goal with destination account
  - Changing destination account
  - Authorization expires or is revoked
- Store authorization status per goal
- Handle authorization expiration/renewal
- Use Plaid Transfer UI for seamless authorization experience

### Transfer Execution

- Transfers execute automatically based on contribution rules
- Check source account balance before initiating transfer
- Handle insufficient funds gracefully (notify user, retry next cycle)
- Track transfer status via Plaid webhooks
- Update goal `current_amount` on successful transfer

## Notification System

### Email Notifications

- Cash goal reminders (configurable frequency)
- Transfer failure notifications
- Goal milestone notifications
- Low balance warnings for source accounts

### Push Notifications (Mobile App)

- Cash goal reminders
- Transfer completion notifications
- Goal progress updates
- Requires mobile app integration (future work)

## Migration Strategy

1. Add fields as nullable to support existing goals
2. Existing goals will have:
   - `destination_account = None` (cash)
   - `transfer_authorized = False`
   - `is_active = True` (keep existing behavior)
   - Empty `contribution_rules`
   - Empty `reminder_settings`
3. Users can update existing goals to add account linking and rules
4. Migration should be backward compatible
5. Consider data migration script to help users set up rules for existing goals
6. For existing goals with `current_amount > 0`, preserve the amount (don't overwrite with account balance)

## Testing Considerations

### Backend Tests

- Test goal creation with destination account (checking/savings)
- Test goal creation with "cash" option (null account)
- Test automatic balance sync for destination account
- Test contribution rules evaluation for all rule types
- Test multiple source accounts with different rules
- Test general rule application
- Test account validation (only checking/savings allowed)
- Test updating destination account
- Test transfer authorization flow
- Test goal activation workflow (inactive until authorized)
- Test contribution rules with different types and combinations
- Test periodic task execution for automatic contributions
- Test Plaid transfer initiation and webhook handling
- Test transfer failure scenarios
- Test filtering contributions by source account
- Test cash reminder system
- Test balance sync on goal update

### Frontend Tests

- Test destination account selection dropdown (checking/savings/cash)
- Test source accounts multi-select
- Test contribution rules UI for all rule types
- Test per-account vs general rule configuration
- Test form validation for rules
- Test goal display with account info
- Test activation pending state
- Test transfer authorization modal/flow
- Test edit goal with account/rules changes
- Test cash reminder settings UI
- Test balance sync functionality

### Integration Tests

- End-to-end: Create goal with destination account, authorize, verify automatic contributions
- End-to-end: Create goal with cash, set reminders, verify reminder delivery
- End-to-end: Test automatic transfer execution with multiple source accounts
- End-to-end: Test rule evaluation with real transaction data
- End-to-end: Test balance sync on destination account changes
- End-to-end: Test goal activation workflow

## User Flow Summary

1. **Create Goal**:
   - User fills out goal form (name, target, deadline, etc.)
   - Selects destination account (savings/checking) OR "Cash"
   - If account: System fetches balance, sets as `current_amount`
   - Selects source accounts (multiple allowed)
   - Configures contribution rules (per-account or general)
   - If cash: Configures reminder settings
   - Submits goal

2. **Goal Created (Inactive)**:
   - Goal created with `is_active = False`
   - If account: `transfer_authorized = False`
   - If cash: `is_active = True` immediately

3. **Authorization (Account Goals Only)**:
   - User sees authorization prompt
   - Completes Plaid Transfer authorization
   - Goal activated: `transfer_authorized = True`, `is_active = True`

4. **Active Goal**:
   - Automatic transfers execute per rules (for account goals)
   - Reminders sent per schedule (for cash goals)
   - User can manually contribute at any time
   - Balance synced periodically for account goals

5. **Ongoing**:
   - Transfers execute automatically based on rules
   - Goal `current_amount` updates with transfers and contributions
   - User receives notifications for milestones, failures, reminders

