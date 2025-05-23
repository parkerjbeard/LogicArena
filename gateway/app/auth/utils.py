from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import secrets
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging

from app.config import settings
from app.db.session import get_db
from app.models import User

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_PREFIX}/auth/login")

# Initialize logger
logger = logging.getLogger(__name__)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate a password hash"""
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT token with enhanced security"""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    
    # Add security claims
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": secrets.token_urlsafe(32),  # Unique token ID for revocation
        "iss": "logicarena-api",  # Issuer
        "aud": "logicarena-client"  # Audience
    })
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET, 
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create a refresh token with longer expiration"""
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=settings.JWT_REFRESH_EXPIRATION_DAYS)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "jti": secrets.token_urlsafe(32),
        "iss": "logicarena-api",
        "aud": "logicarena-refresh",
        "type": "refresh"
    })
    
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM
    )

def verify_refresh_token(token: str) -> Dict[str, Any]:
    """Verify and decode refresh token"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            audience="logicarena-refresh",
            issuer="logicarena-api",
            options={
                "require": ["exp", "iat", "sub", "jti", "type"],
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": True,
                "verify_iss": True
            }
        )
        
        if payload.get("type") != "refresh":
            raise jwt.InvalidTokenError("Invalid token type")
            
        return payload
        
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, jwt.InvalidSignatureError) as e:
        logger.warning(f"Invalid refresh token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get the current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT token with enhanced validation
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM],
            audience="logicarena-client",
            issuer="logicarena-api",
            options={
                "require": ["exp", "iat", "sub", "jti"],
                "verify_exp": True,
                "verify_iat": True,
                "verify_aud": True,
                "verify_iss": True
            }
        )
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, jwt.InvalidSignatureError):
        raise credentials_exception
        
    # Get the user from the database
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if user is None or not user.is_active:
        raise credentials_exception
        
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get the current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user 