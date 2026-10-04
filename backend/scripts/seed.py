"""Create an admin user and a demo scan for local development."""

import os
import sys

from sqlalchemy import select

from app.core.security import hash_password
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models import Scan, User
from app.services.scanner import run_scan


def main() -> int:
    production = get_settings().environment.lower() == "production"
    email = os.getenv("VERIDEUMDEFENCE_BOOTSTRAP_ADMIN_EMAIL") if production else "admin@gmail.com"
    password = os.getenv("VERIDEUMDEFENCE_BOOTSTRAP_ADMIN_PASSWORD") if production else "admin123456789"
    if not email or not password:
        raise ValueError(
            "Production seeding requires VERIDEUMDEFENCE_BOOTSTRAP_ADMIN_EMAIL and "
            "VERIDEUMDEFENCE_BOOTSTRAP_ADMIN_PASSWORD"
        )

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.scalar(select(User).where(User.email == email))
        if user is None:
            user = User(
                email=email,
                full_name="VerideumDefence Admin",
                password_hash=hash_password(password),
                is_admin=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        # Keep the demo scan inside the local app instead of probing an unrelated host.
        scan = Scan(target="127.0.0.1", scan_type="network", owner_id=user.id)
        db.add(scan)
        db.commit()
        run_scan(db, scan.id)
        print(f"Seeded admin {email} and scan #{scan.id}")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
