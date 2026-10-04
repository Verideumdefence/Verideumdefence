from app.core.security import hash_password, verify_password

# Test the password
password = "admin123456789"
hashed = hash_password(password)
print(f"Hashed password: {hashed}")
print(f"Verification: {verify_password(password, hashed)}")
