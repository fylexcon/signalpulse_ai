"""
Security utilities: password hashing, JWT token creation/verification,
and refresh token hashing (SHA-256).
"""
import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
import bcrypt

from app.core.config import get_settings

settings = get_settings()

# ── Password ──

def hash_password(plain: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))


# ── JWT Access Token ──

def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


# ── Refresh Token ──

def create_refresh_token() -> tuple[str, str, datetime]:
    """
    Generate a cryptographically random refresh token.

    Returns:
        (raw_token, sha256_hash, expires_at)
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = hash_token(raw_token)
    expires_at = datetime.utcnow() + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    return raw_token, token_hash, expires_at


def hash_token(raw: str) -> str:
    """SHA-256 hash for refresh token storage. Never store raw tokens in DB."""
    return hashlib.sha256(raw.encode()).hexdigest()


# ── Token Decoding ──

def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT token.
    Raises HTTP 401 on any failure.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
        if payload.get("sub") is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception


def generate_api_key() -> tuple[str, str]:
    """
    Generate a random API key.

    Returns:
        (raw_key, sha256_hash)
        Raw key format: sk_live_{random_hex}
    """
    raw_key = f"sk_live_{uuid.uuid4().hex}{secrets.token_hex(16)}"
    key_hash = hash_token(raw_key)
    return raw_key, key_hash
