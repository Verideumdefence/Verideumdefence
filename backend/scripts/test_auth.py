from app.db.session import SessionLocal
from app.models import User
from app.core.security import verify_password
from sqlalchemy import select

db = SessionLocal()
user = db.scalar(select(User).where(User.email == 'admin@gmail.com'))
if user:
    print(f'User found: {user.email}')
    print(f'Password hash: {user.password_hash}')
    print(f'Verifying admin123456789: {verify_password("admin123456789", user.password_hash)}')
else:
    print('User not found')
db.close()
