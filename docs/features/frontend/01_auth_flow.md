# Frontend Feature: Authentication UI & Security

**Components:** `Login`, `Register`, `AuthLayout`, `ProtectedLayout`
**State Management:** `useAuthStore` (Zustand)

## Overview
The user-facing security layer. It handles form rendering, client-side validation, secure token storage (handling Access/Refresh rotation), and route protection.

## Detailed Feature Specifications

### 1. Login & Registration Forms
*   **Library:** `react-hook-form` + `zod`.
*   **Validation Rules:**
    *   **Email:** Valid format required.
    *   **Password:** Min 8 chars, 1 uppercase, 1 special char.
    *   **Match:** (Register only) "Confirm Password" must match "Password".
*   **Feedback:** Real-time inline error messages (red text/borders).
*   **Submission:** Disables button + shows spinner during API call.

### 2. Protected Routes
*   **Component:** `ProtectedLayout.tsx`
*   **Logic:**
    *   Checks `useAuthStore.isAuthenticated`.
    *   If `false`: Redirects to `/login` (saving current URL in `state` for post-login redirect).
    *   If `true`: Renders child components (Dashboard, etc.).

### 3. Session Persistence
*   **Mechanism:**
    *   On Login Success: Stores `accessToken` in memory (Zustand) and `refreshToken` in `localStorage` (or HttpOnly cookie if configured).
    *   **App Initialization:** Checks for token. If found, attempts to validate/refresh before rendering.

## Rigorous Testing Steps

### Manual UI Testing

#### Scenario A: Form Validation
1.  **Navigate:** `/register`
2.  **Action:** Click "Register" with empty fields.
3.  **Verify:** All fields turn red with "Required" messages.
4.  **Action:** Enter password "123".
5.  **Verify:** Error "Password too short".

#### Scenario B: Successful Login Flow
1.  **Navigate:** `/login`
2.  **Action:** Enter valid credentials -> Submit.
3.  **Verify:** Button shows "Signing in...".
4.  **Verify:** Toast appears "Welcome back!".
5.  **Verify:** URL changes to `/dashboard`.

#### Scenario C: Redirect Logic
1.  **Action:** Clear LocalStorage.
2.  **Navigate:** Manually type `/transactions` in URL bar.
3.  **Verify:** Immediate redirect to `/login`.
4.  **Action:** Login.
5.  **Verify:** Redirects BACK to `/transactions` (not dashboard).

#### Scenario D: Logout
1.  **Action:** Click User Menu -> Logout.
2.  **Verify:** Redirect to `/login`.
3.  **Verify:** LocalStorage is cleared of tokens.
4.  **Verify:** Browser Back button does not reveal protected pages (should redirect again).
