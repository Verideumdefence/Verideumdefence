"""Password strength validation utilities."""

import re
from password_strength import PasswordPolicy


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password strength.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    if len(password) > 128:
        return False, "Password must not exceed 128 characters"
    
    # Check for at least one uppercase letter
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    # Check for at least one lowercase letter
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    # Check for at least one digit
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    # Check for at least one special character
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    # Check for common patterns
    common_patterns = [
        r'123', r'abc', r'qwerty', r'password', r'admin',
        r'letmein', r'welcome', r'login', r'secret'
    ]
    password_lower = password.lower()
    for pattern in common_patterns:
        if pattern in password_lower:
            return False, f"Password contains common pattern '{pattern}'"
    
    # Check for sequential characters
    for i in range(len(password) - 2):
        if ord(password[i]) + 1 == ord(password[i+1]) == ord(password[i+2]) - 1:
            return False, "Password contains sequential characters"
    
    return True, ""


def get_password_strength_score(password: str) -> float:
    """
    Get password strength score (0-1).
    
    Returns:
        float: Strength score between 0 (weak) and 1 (strong)
    """
    policy = PasswordPolicy.from_names(
        length=12,
        uppercase=1,
        numbers=1,
        special=1,
        nonletters=1,
    )
    
    try:
        result = policy.password(password)
        return result.strength() / 100  # Normalize to 0-1
    except Exception:
        return 0.0
