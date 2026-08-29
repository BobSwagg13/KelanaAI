"""Password hashing and JWT issuing/verification."""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from dotenv import load_dotenv
from jose import JWTError, jwt

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = "HS256"
# Single long-lived token, no refresh flow (scope: core auth only).
ACCESS_TOKEN_EXPIRE_DAYS = 7

# bcrypt silently truncates anything past 72 BYTES, so "same first 72 bytes"
# would authenticate. Reject instead of letting that pass unnoticed.
MAX_PASSWORD_BYTES = 72
MIN_PASSWORD_LENGTH = 8


class AuthError(Exception):
    """Credentials could not be established. Callers map this to 401."""


def _require_secret() -> str:
    if not SECRET_KEY:
        # Failing loudly beats signing tokens with a default everyone knows.
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Add it to backend/.env before starting."
        )
    return SECRET_KEY


def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time comparison via bcrypt. Never raises on a malformed hash."""
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        # `sub` must be a string per RFC 7519; python-jose is strict about this.
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, _require_secret(), algorithm=ALGORITHM)


def decode_access_token(token: str) -> int:
    """Return the user id carried by `token`, or raise AuthError.

    Signature and expiry are both verified by `jwt.decode`.
    """
    try:
        payload = jwt.decode(token, _require_secret(), algorithms=[ALGORITHM])
    except JWTError as e:
        raise AuthError("Invalid or expired token.") from e

    subject: Optional[str] = payload.get("sub")
    if subject is None:
        raise AuthError("Token is missing a subject.")

    try:
        return int(subject)
    except (TypeError, ValueError) as e:
        raise AuthError("Token subject is not a valid user id.") from e
