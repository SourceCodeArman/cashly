"""
MFA utility functions for backup codes generation and verification.
"""
import secrets
import hashlib
from typing import List, Optional, Tuple


def generate_backup_codes(count: int = 10) -> List[str]:
    """
    Generate a list of random backup codes.
    
    Each code is an 8-character alphanumeric string, formatted with a
    hyphen in the middle for readability (e.g., "ABCD-1234").
    
    Args:
        count: Number of backup codes to generate (default: 10)
    
    Returns:
        List of plain-text backup codes
    """
    codes = []
    # Use uppercase letters and digits for readability (no confusing chars like 0/O, 1/I/L)
    alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
    
    for _ in range(count):
        # Generate 8 random characters
        code_chars = ''.join(secrets.choice(alphabet) for _ in range(8))
        # Format with hyphen for readability: XXXX-XXXX
        formatted_code = f"{code_chars[:4]}-{code_chars[4:]}"
        codes.append(formatted_code)
    
    return codes


def hash_backup_code(code: str) -> str:
    """
    Hash a backup code using SHA256.
    
    The code is normalized (uppercase, hyphen removed) before hashing
    to allow flexible input format.
    
    Args:
        code: Plain-text backup code
    
    Returns:
        Hexadecimal hash of the code
    """
    # Normalize: remove hyphens and convert to uppercase
    normalized = code.replace("-", "").upper()
    return hashlib.sha256(normalized.encode()).hexdigest()


def verify_and_consume_backup_code(user, code: str) -> Tuple[bool, Optional[str]]:
    """
    Verify a backup code and consume it if valid.
    
    This function checks if the provided code matches any of the user's
    stored backup codes. If a match is found, the code is removed from
    the user's list (consumed) so it cannot be reused.
    
    Args:
        user: User model instance
        code: Plain-text backup code to verify
    
    Returns:
        Tuple of (success: bool, error_message: Optional[str])
        - (True, None) if code is valid and consumed
        - (False, "error message") if code is invalid
    """
    if not user.mfa_backup_codes:
        return False, "No backup codes available"
    
    # Hash the provided code
    code_hash = hash_backup_code(code)
    
    # Check if hash matches any stored code
    stored_codes = list(user.mfa_backup_codes)
    
    if code_hash in stored_codes:
        # Remove the used code (consume it)
        stored_codes.remove(code_hash)
        user.mfa_backup_codes = stored_codes
        user.save(update_fields=['mfa_backup_codes'])
        return True, None
    
    return False, "Invalid backup code"


def get_remaining_backup_codes_count(user) -> int:
    """
    Get the number of remaining backup codes for a user.
    
    Args:
        user: User model instance
    
    Returns:
        Number of remaining unused backup codes
    """
    if not user.mfa_backup_codes:
        return 0
    return len(user.mfa_backup_codes)
