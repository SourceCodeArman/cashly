# Implementation Plan: Email Change with Verification

This plan details the secure implementation of the user email update flow. We must verify ownership of the new email address before updating the user record to prevent account takeover or typos.

## 1. Backend Implementation (`apps.accounts`)

### 1.1. Model Update
*   **Status:** `EmailChangeRequest` model already exists in `apps/accounts/models.py`.
*   **Action:** Verify fields and ensure it is ready for use.
    *   Fields: `user` (FK), `new_email` (EmailField), `token` (CharField), `created_at`, `expires_at`.

### 1.2. Utility Functions (`apps/accounts/utils.py` or `services.py`)
*   `create_email_change_request(user, new_email)`:
    *   Generates a secure random token (e.g., 32 bytes hex).
    *   Sets expiration (e.g., 15 minutes).
    *   Saves `EmailChangeRequest`.
    *   Deletes any previous pending requests for this user.
*   `verify_email_change_token(token)`:
    *   Finds request by token.
    *   Checks expiration.
    *   Updates `user.email`.
    *   Deletes request.

### 1.3. API Endpoints (`apps/accounts/views.py`)
*   **Request Change (`POST /api/v1/auth/email/request-change/`)**:
    *   Input: `{"new_email": "..."}`.
    *   Logic: Calls creation utility, triggers email task.
    *   Output: 200 OK.
*   **Verify Change (`POST /api/v1/auth/email/verify-change/`)**:
    *   Input: `{"token": "..."}`.
    *   Logic: Calls verification utility.
    *   Output: 200 OK.

### 1.4. Email Notification (`apps/notifications/tasks.py`)
*   **Task:** `send_email_change_verification(email, token)`
*   **Content:** "Click here to verify your new email: `https://cashly.app/verify-email?token=...`"

## 2. Frontend Implementation (`frontend/src`)

### 2.1. Service Update (`services/authService.ts`)
*   Add `requestEmailChange(newEmail: string)`
*   Add `verifyEmailChange(token: string)`

### 2.2. Profile Settings UI (`components/settings/ProfileForm.tsx`)
*   **Current State:** Likely has a simple Input for email.
*   **Update:**
    *   Make Email input read-only or add a specific "Change Email" button next to it.
    *   **Change Flow:**
        1.  User clicks "Change".
        2.  Modal/Input appears for "New Email".
        3.  On Submit -> Call `requestEmailChange`.
        4.  Show success message: "Check your new email inbox for a verification link."

### 2.3. Verification Route (`pages/VerifyEmailChange.tsx`)
*   **Route:** `/verify-email` (Public route).
*   **Logic:**
    *   Read `token` from URL search params.
    *   Call `verifyEmailChange` immediately on mount.
    *   Show Loading -> Success/Error state.
    *   On Success: Redirect to `/settings` or `/login`.

## 3. Testing Strategy

*   **Backend:** Unit tests for token generation, expiration logic, and view permissions.
*   **Frontend:** Manual test of the flow (Request -> Copy Link -> Verify -> Check Profile).

## 4. Security Considerations
*   **Rate Limiting:** Prevent spamming change requests.
*   **Notification:** Notify the *OLD* email address that a change was requested (security alert).
*   **Password Confirmation:** Require current password to initiate the request (High Security). *We will implement this.*

---

## Execution Order
1.  Backend: Views & Serializers.
2.  Backend: Email Task integration.
3.  Frontend: Service & Verification Page.
4.  Frontend: Profile UI Update.
