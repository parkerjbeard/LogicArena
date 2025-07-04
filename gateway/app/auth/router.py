from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging
import secrets
import urllib.parse
import jwt
import base64
import hashlib
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError

from app.db.session import get_db
from app.models import User, LoginActivity
from app.auth.schemas import Token, UserCreate, UserResponse, UserLogin, CompleteProfileRequest, RefreshTokenRequest
from app.auth.utils import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    get_current_active_user,
    create_user_session,
    invalidate_user_sessions,
    revoke_token,
    is_token_revoked,
    oauth2_scheme
)
from app.config import settings
from app.middleware.rate_limiter import RateLimiters

logger = logging.getLogger(__name__)

router = APIRouter()

# Configure OAuth client
oauth = OAuth()

# Simple Google OAuth configuration
CONF_URL = 'https://accounts.google.com/.well-known/openid-configuration'
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url=CONF_URL,
    client_kwargs={
        'scope': 'openid email profile'
    }
)

@router.post("/register", response_model=UserResponse, 
            dependencies=[Depends(RateLimiters.register)])
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    # Check if email already exists
    result = await db.execute(select(User).filter(User.email == user_data.email))
    existing_email = result.scalars().first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if handle already exists
    result = await db.execute(select(User).filter(User.handle == user_data.handle))
    existing_handle = result.scalars().first()
    if existing_handle:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Handle already taken"
        )
    
    # Create new user
    new_user = User(
        handle=user_data.handle,
        email=user_data.email,
        pwd_hash=get_password_hash(user_data.password),
        rating=settings.ELO_INITIAL
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info(f"New user registered: {new_user.handle}")
    
    return new_user

@router.post("/login", response_model=Token,
            dependencies=[Depends(RateLimiters.login)])
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Login and get JWT token"""
    # Find user by username (which is email in our case)
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    
    # Track login attempt
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # Validate user and password
    if not user or not verify_password(form_data.password, user.pwd_hash):
        # Track failed login attempt if user exists
        if user:
            login_activity = LoginActivity(
                user_id=user.id,
                login_type="standard",
                ip_address=client_ip,
                user_agent=user_agent[:255],
                success=False,
                error_message="Invalid password"
            )
            db.add(login_activity)
            await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Track successful login
    login_activity = LoginActivity(
        user_id=user.id,
        login_type="standard",
        ip_address=client_ip,
        user_agent=user_agent[:255],
        success=True
    )
    db.add(login_activity)
    await db.commit()
    
    # Create refresh token first to get JTI
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Extract JTI from refresh token for session creation
    refresh_payload = jwt.decode(
        refresh_token, 
        settings.JWT_SECRET, 
        algorithms=[settings.JWT_ALGORITHM],
        audience="logicarena-refresh",
        issuer="logicarena-api"
    )
    refresh_jti = refresh_payload.get("jti")
    
    # Create user session
    session_id = await create_user_session(
        user_id=user.id,
        refresh_token_jti=refresh_jti,
        ip_address=client_ip,
        user_agent=user_agent[:255],
        db=db
    )
    
    # Create access token with session ID
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
        session_id=session_id
    )
    
    logger.info(f"User logged in: {user.handle}")
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60
    }

@router.post("/login/email", response_model=Token,
            dependencies=[Depends(RateLimiters.login)])
async def login_with_email(request: Request, login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with email and password"""
    # Find user by email
    result = await db.execute(select(User).filter(User.email == login_data.email))
    user = result.scalars().first()
    
    # Track login attempt
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # Validate user and password
    if not user or not verify_password(login_data.password, user.pwd_hash):
        # Track failed login attempt if user exists
        if user:
            login_activity = LoginActivity(
                user_id=user.id,
                login_type="standard",
                ip_address=client_ip,
                user_agent=user_agent[:255],
                success=False,
                error_message="Invalid password"
            )
            db.add(login_activity)
            await db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Track successful login
    login_activity = LoginActivity(
        user_id=user.id,
        login_type="standard",
        ip_address=client_ip,
        user_agent=user_agent[:255],
        success=True
    )
    db.add(login_activity)
    await db.commit()
    
    # Create refresh token first to get JTI
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Extract JTI from refresh token for session creation
    refresh_payload = jwt.decode(
        refresh_token, 
        settings.JWT_SECRET, 
        algorithms=[settings.JWT_ALGORITHM],
        audience="logicarena-refresh",
        issuer="logicarena-api"
    )
    refresh_jti = refresh_payload.get("jti")
    
    # Create user session
    session_id = await create_user_session(
        user_id=user.id,
        refresh_token_jti=refresh_jti,
        ip_address=client_ip,
        user_agent=user_agent[:255],
        db=db
    )
    
    # Create access token with session ID
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
        session_id=session_id
    )
    
    logger.info(f"User logged in with email: {user.handle}")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token, 
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60
    }

@router.post("/refresh", response_model=Token,
            dependencies=[Depends(RateLimiters.refresh)])
async def refresh_access_token(request: Request, refresh_data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token"""
    # Verify refresh token
    payload = verify_refresh_token(refresh_data.refresh_token)
    user_id = payload.get("sub")
    jti = payload.get("jti")
    session_id = payload.get("sid")
    
    if not user_id or not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if refresh token is revoked
    if await is_token_revoked(jti, db):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify user still exists and is active
    result = await db.execute(select(User).filter(User.id == user_id))
    user = result.scalars().first()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get client info
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # Revoke old refresh token
    await revoke_token(
        jti=jti,
        user_id=int(user_id),
        token_type="refresh",
        expires_at=datetime.fromtimestamp(payload.get("exp"), tz=timezone.utc),
        reason="token_rotation",
        db=db
    )
    
    # Create new refresh token
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Extract JTI from new refresh token
    new_refresh_payload = jwt.decode(new_refresh_token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    new_refresh_jti = new_refresh_payload.get("jti")
    
    # Create new session
    new_session_id = await create_user_session(
        user_id=user.id,
        refresh_token_jti=new_refresh_jti,
        ip_address=client_ip,
        user_agent=user_agent[:255],
        db=db
    )
    
    # Create new access token with new session ID
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
        session_id=new_session_id
    )
    
    logger.info(f"Tokens refreshed for user: {user.handle}")
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get information about the current logged-in user"""
    return current_user

@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
):
    """Logout the current user by revoking tokens and invalidating sessions"""
    try:
        # Decode token to get JTI and session info
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM],
            audience="logicarena-client",
            issuer="logicarena-api"
        )
        jti = payload.get("jti")
        exp = payload.get("exp")
        
        # Revoke the current access token
        if jti and exp:
            await revoke_token(
                jti=jti,
                user_id=current_user.id,
                token_type="access",
                expires_at=datetime.fromtimestamp(exp, tz=timezone.utc),
                reason="logout",
                db=db
            )
        
        # Invalidate all user sessions
        await invalidate_user_sessions(current_user.id, db, reason="logout")
        
        logger.info(f"User logged out: {current_user.handle}")
        
        return {"detail": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Error during logout for user {current_user.handle}: {e}")
        # Even if there's an error, we should still try to log the user out
        await invalidate_user_sessions(current_user.id, db, reason="logout_error")
        return {"detail": "Logged out with errors"} 

# Google OAuth routes removed - see simple_router.py for OAuth implementation 