from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = Field(default=None, min_length=8, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    full_name: str | None
    is_active: bool
    is_admin: bool
    created_at: datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TOTPSetup(BaseModel):
    secret: str
    qr_code_url: str


class TOTPVerify(BaseModel):
    token: str


class LoginRequestWith2FA(BaseModel):
    email: EmailStr
    password: str
    totp_token: str | None = None
