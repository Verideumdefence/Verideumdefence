from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.core.totp import generate_totp_qr_code, generate_totp_secret, verify_totp_token
from app.db.session import get_db
from app.models import AuditAction, User
from app.services.audit import record_audit
from app.schemas.user import (LoginRequest, LoginRequestWith2FA, Token, TOTPSetup,
                              TOTPVerify, UserRead)

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


def _authenticate(db: Session, email: str, password: str) -> User:
    user = db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return user


@router.post("/login", response_model=Token)
@limiter.limit("100/minute")
def login(request: Request, payload: LoginRequest, db: Session = Depends(get_db)) -> Token:
    user = _authenticate(db, payload.email, payload.password)
    record_audit(db, user, AuditAction.login, "auth", {"method": "password"}, request)
    db.commit()
    return Token(access_token=create_access_token(str(user.id)))


@router.post("/token", response_model=Token, include_in_schema=False)
def login_form(
    form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
) -> Token:
    user = _authenticate(db, form.username, form.password)
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user)) -> User:
    return user


@router.post("/login-2fa", response_model=Token)
@limiter.limit("100/minute")
def login_with_2fa(request: Request, payload: LoginRequestWith2FA, db: Session = Depends(get_db)) -> Token:
    """Login with optional 2FA token."""
    user = _authenticate(db, payload.email, payload.password)
    
    # If user has 2FA enabled, verify the token
    if user.totp_enabled:
        if not payload.totp_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA token required"
            )
        if not user.totp_secret or not verify_totp_token(user.totp_secret, payload.totp_token):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA token"
            )
    
    record_audit(db, user, AuditAction.login, "auth", {"method": "password_2fa"}, request)
    db.commit()
    return Token(access_token=create_access_token(str(user.id)))


@router.post("/2fa/setup", response_model=TOTPSetup)
def setup_2fa(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> TOTPSetup:
    """Setup 2FA for the current user."""
    if user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is already enabled"
        )
    
    secret = generate_totp_secret()
    qr_code_url = generate_totp_qr_code(secret, user.email)
    
    # Store secret temporarily (not enabled yet)
    user.totp_secret = secret
    db.commit()
    
    return TOTPSetup(secret=secret, qr_code_url=qr_code_url)


@router.post("/2fa/verify")
def verify_2fa(payload: TOTPVerify, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    """Verify 2FA token and enable 2FA."""
    if not user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not setup. Call /2fa/setup first"
        )
    
    if verify_totp_token(user.totp_secret, payload.token):
        user.totp_enabled = True
        db.commit()
        return {"message": "2FA enabled successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA token"
        )


@router.post("/2fa/disable")
def disable_2fa(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    """Disable 2FA for the current user."""
    if not user.totp_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled"
        )
    
    user.totp_enabled = False
    user.totp_secret = None
    db.commit()
    
    return {"message": "2FA disabled successfully"}
