/**
 * Human readable Plaid error messages
 */
const plaidErrorMessages: Record<string, string> = {
  ITEM_LOGIN_REQUIRED:
    'Your financial institution requires you to reconnect. Please open Plaid Link to reauthenticate.',
  INSTITUTION_NOT_RESPONDING:
    'Your financial institution is temporarily unavailable. Please try again later.',
  RATE_LIMIT_EXCEEDED:
    'Plaid rate limit exceeded. Please wait a moment and try again.',
  INVALID_CREDENTIALS:
    'The credentials provided to the financial institution are invalid. Please reconnect with the correct credentials.',
  USER_SETUP_REQUIRED:
    'Your financial institution requires additional setup. Please finish the steps in Plaid Link.',
  ITEM_LOCKED:
    'This account has been locked by the financial institution. Please contact your bank for assistance.',
  NO_ACCOUNTS:
    'No accounts were returned from the financial institution. Please ensure at least one account is selected.',
}

export function getPlaidErrorMessage(code?: string, fallback?: string): string | undefined {
  if (!code) {
    return fallback
  }
  return plaidErrorMessages[code] ?? fallback
}


