"""TOTP (Time-based One-Time Password) utilities for 2FA."""

import pyotp
import qrcode
from io import BytesIO
from base64 import b64encode


def generate_totp_secret() -> str:
    """Generate a new TOTP secret."""
    return pyotp.random_base32()


def generate_totp_qr_code(secret: str, email: str, issuer: str = "VerideumDefence") -> str:
    """Generate a QR code for TOTP setup and return as base64 data URL."""
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(
        name=email,
        issuer_name=issuer
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    img_str = b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"


def verify_totp_token(secret: str, token: str) -> bool:
    """Verify a TOTP token against the secret."""
    totp = pyotp.TOTP(secret)
    return totp.verify(token, valid_window=1)
