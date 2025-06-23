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
from app.models import User, RevokedToken, UserSession

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

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None, session_id: Optional[str] = None) -> str:
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
        "aud": "logicarena-client",  # Audience
        "type": "access"
    })
    
    # Add session ID if provided
    if session_id:
        to_encode["sid"] = session_id
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET, 
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any], session_id: Optional[str] = None) -> str:
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
    
    # Add session ID if provided
    if session_id:
        to_encode["sid"] = session_id
    
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

async def is_token_revoked(jti: str, db: AsyncSession) -> bool:
    """Check if a token has been revoked"""
    result = await db.execute(
        select(RevokedToken).filter(RevokedToken.jti == jti)
    )
    return result.scalars().first() is not None

async def is_session_valid(session_id: str, db: AsyncSession) -> bool:
    """Check if a session is valid and active"""
    result = await db.execute(
        select(UserSession).filter(
            UserSession.session_id == session_id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc)
        )
    )
    session = result.scalars().first()
    
    if session:
        # Update last activity
        session.last_activity = datetime.now(timezone.utc)
        db.add(session)
        await db.commit()
        return True
    
    return False

async def revoke_token(jti: str, user_id: int, token_type: str, expires_at: datetime, reason: str, db: AsyncSession):
    """Revoke a token by adding it to the blacklist"""
    revoked_token = RevokedToken(
        jti=jti,
        user_id=user_id,
        token_type=token_type,
        expires_at=expires_at,
        reason=reason
    )
    db.add(revoked_token)
    await db.commit()

async def create_user_session(
    user_id: int, 
    refresh_token_jti: str,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    db: AsyncSession = None
) -> str:
    """Create a new user session"""
    session_id = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_EXPIRATION_DAYS)
    
    session = UserSession(
        user_id=user_id,
        session_id=session_id,
        refresh_token_jti=refresh_token_jti,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=expires_at
    )
    db.add(session)
    await db.commit()
    
    return session_id

async def invalidate_user_sessions(user_id: int, db: AsyncSession, reason: str = "logout"):
    """Invalidate all active sessions for a user"""
    result = await db.execute(
        select(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        )
    )
    sessions = result.scalars().all()
    
    for session in sessions:
        session.is_active = False
        # Also revoke the associated refresh token
        await revoke_token(
            jti=session.refresh_token_jti,
            user_id=user_id,
            token_type="refresh",
            expires_at=session.expires_at,
            reason=reason,
            db=db
        )
    
    await db.commit()

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
        jti: str = payload.get("jti")
        session_id: str = payload.get("sid")
        
        if user_id is None or jti is None:
            raise credentials_exception
        
        # Check if token is revoked
        if await is_token_revoked(jti, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Check if session is valid (if session ID is present)
        if session_id and not await is_session_valid(session_id, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
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

async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Get the current admin user"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def verify_token(token: str, db: AsyncSession) -> Optional[str]:
    """
    Verify JWT token and return user ID
    Used for WebSocket authentication where we can't use dependencies
    
    Returns:
        User ID if token is valid, None otherwise
    """
    try:
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
        jti: str = payload.get("jti")
        session_id: str = payload.get("sid")
        
        # Check if token is revoked
        if await is_token_revoked(jti, db):
            return None
            
        # Check if session is valid (if session ID is present)
        if session_id and not await is_session_valid(session_id, db):
            return None
            
        return user_id
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError, jwt.InvalidSignatureError):
        return None 