# Backend Feature: Authentication & User Identity

**App Component:** `apps.accounts`
**Primary Models:** `User` (Custom), `MFADevice`

## Overview
This module handles the complete lifecycle of user identity, from secure registration to session management and security hardening via Multi-Factor Authentication (MFA). It uses JWT (JSON Web Tokens) for stateless authentication.

## Detailed Feature Specifications

### 1. User Registration
*   **Endpoint:** `POST /api/v1/auth/register/`
*   **Logic:**
    *   Validates email uniqueness (case-insensitive).
    *   Enforces password complexity (min 8 chars, mixed case, numbers).
    *   Creates `User` record.
    *   Automatically logs user in (returns tokens) upon success.
*   **Data Payload:**
    ```json
    {
      "email": "user@example.com",
      "password": "SecurePass123!",
      "first_name": "John",
      "last_name": "Doe"
    }
    ```

### 2. Authentication (Login)
*   **Endpoint:** `POST /api/v1/auth/login/`
*   **Logic:**
    *   Standard email/password validation.
    *   **MFA Check:** If user has `mfa_enabled=True`, the response differs:
        *   *Standard:* Returns `access` and `refresh` tokens.
        *   *MFA Required:* Returns a temporary session token and status `mfa_required`.
*   **Response (Success):**
    ```json
    {
      "access": "eyJh...",
      "refresh": "eyJh...",
      "user": { "id": "...", "email": "..." }
    }
    ```

### 3. Multi-Factor Authentication (MFA)
*   **Setup (`POST /api/v1/auth/mfa/setup/`):**
    *   Generates a TOTP secret key (Base32).
    *   Returns an `otpauth://` URI for QR code generation.
*   **Verify (`POST /api/v1/auth/mfa/verify/`):**
    *   Accepts a 6-digit code.
    *   Validates against the secret using `pyotp`.
    *   Sets `mfa_enabled=True` on the user model.

### 4. Token Management
*   **Refresh (`POST /api/v1/auth/token/refresh/`):** Uses long-lived refresh token to get new short-lived access token.

## Rigorous Testing Steps

### Automated Testing
Run the dedicated auth test suite:
```bash
python manage.py test apps.accounts.tests.test_auth
python manage.py test apps.accounts.tests.test_mfa
```

### Manual / API Scenario Testing

#### Scenario A: Happy Path Registration
1.  **Action:** Send POST to `/register/` with valid data.
2.  **Check:** Status 201 Created.
3.  **Check:** Response contains `access` token.
4.  **Check:** Database contains new User with `is_active=True`.

#### Scenario B: Duplicate Email Prevention
1.  **Action:** Register "test@example.com".
2.  **Action:** Register "test@example.com" again.
3.  **Check:** Status 400 Bad Request.
4.  **Check:** Error message mentions "Email already exists".

#### Scenario C: Full MFA Lifecycle
1.  **Setup:**
    *   Login as normal user.
    *   Call `/mfa/setup/`.
    *   **Verify:** Response has `secret` and `otp_uri`.
2.  **Activation:**
    *   Generate code using an authenticator app (or script).
    *   Call `/mfa/verify/` with code.
    *   **Verify:** Status 200 OK.
3.  **Enforcement:**
    *   Logout.
    *   Login again.
    *   **Verify:** Response includes `mfa_required: true` (no access token yet).
    *   Call `/mfa/login/verify/` with OTP.
    *   **Verify:** Now receive `access` token.

#### Scenario D: Security Edge Cases
1.  **Weak Password:** Try registering with "123456". Expect 400 error.
2.  **Expired Token:** Try accessing protected route with old token. Expect 401 Unauthorized.
3.  **Brute Force:** Attempt login 10 times with wrong password. (Check if rate limiting middleware catches this).
