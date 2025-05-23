from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging
import secrets
import urllib.parse
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature

from app.db.session import get_db
from app.models import User
from app.auth.schemas import Token, UserCreate, UserResponse, UserLogin, CompleteProfileRequest, RefreshTokenRequest
from app.auth.utils import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    get_current_active_user
)
from app.config import settings
from fastapi_limiter.depends import RateLimiter

logger = logging.getLogger(__name__)

router = APIRouter()

# Configure OAuth with enhanced security
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile',
        'prompt': 'consent',  # Force consent screen for security
        'access_type': 'offline'  # Get refresh token if needed
    }
)

# Configure temporary token serializer
temp_serializer = URLSafeTimedSerializer(settings.SECRET_KEY, salt='google-register-temp')

@router.post("/register", response_model=UserResponse, 
            dependencies=[Depends(RateLimiter(times=settings.RATE_LIMIT_ACCOUNT_CREATION, seconds=86400))])
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

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Login and get JWT token"""
    # Find user by username (which is email in our case)
    result = await db.execute(select(User).filter(User.email == form_data.username))
    user = result.scalars().first()
    
    # Validate user and password
    if not user or not verify_password(form_data.password, user.pwd_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access and refresh tokens
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    logger.info(f"User logged in: {user.handle}")
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60
    }

@router.post("/login/email", response_model=Token)
async def login_with_email(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login with email and password"""
    # Find user by email
    result = await db.execute(select(User).filter(User.email == login_data.email))
    user = result.scalars().first()
    
    # Validate user and password
    if not user or not verify_password(login_data.password, user.pwd_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access and refresh tokens
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    logger.info(f"User logged in with email: {user.handle}")
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token, 
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60
    }

@router.post("/refresh", response_model=Token)
async def refresh_access_token(refresh_data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token"""
    # Verify refresh token
    payload = verify_refresh_token(refresh_data.refresh_token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
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
    
    # Create new access token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    
    # Optionally rotate refresh token for enhanced security
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
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

@router.get('/login/google')
async def login_via_google(request: Request):
    """Initiate Google OAuth flow with CSRF protection"""
    redirect_uri = request.url_for('auth_via_google')
    
    # Generate secure state parameter for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # Store state in session or temporary storage (using serializer for now)
    # In production, consider using Redis or database with expiration
    
    return await oauth.google.authorize_redirect(
        request, 
        str(redirect_uri),
        state=state
    )

@router.get('/auth/google')
async def auth_via_google(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback with enhanced security validation"""
    try:
        # Validate state parameter for CSRF protection
        state = request.query_params.get('state')
        if not state or len(state) < 32:
            logger.warning("Invalid or missing OAuth state parameter")
            error_url = f"{settings.FRONTEND_URL}/auth/google/callback?error=invalid_state"
            return RedirectResponse(url=error_url)
        
        token = await oauth.google.authorize_access_token(request)
        
        # Validate token structure
        if not token or 'access_token' not in token:
            logger.error("Invalid token response from Google")
            error_url = f"{settings.FRONTEND_URL}/auth/google/callback?error=invalid_token"
            return RedirectResponse(url=error_url)
            
    except OAuthError as error:
        logger.error(f"Google OAuth error: {error.error}")
        error_encoded = urllib.parse.quote(str(error.error))
        error_url = f"{settings.FRONTEND_URL}/auth/google/callback?error={error_encoded}"
        return RedirectResponse(url=error_url)

    try:
        user_info = await oauth.google.parse_id_token(request, token)
    except Exception as e:
        logger.error(f"Failed to parse Google ID token: {e}")
        error_url = f"{settings.FRONTEND_URL}/auth/google/callback?error=token_parse_error"
        return RedirectResponse(url=error_url)
    
    # Validate required fields
    email = user_info.get('email')
    google_id = user_info.get('sub')
    email_verified = user_info.get('email_verified', False)
    
    if not email or not google_id or not email_verified:
        logger.warning(f"Invalid or unverified Google account: {email}")
        error_url = f"{settings.FRONTEND_URL}/auth/google/callback?error=unverified_email"
        return RedirectResponse(url=error_url)
    
    # Check email domain (remove or modify as needed)
    if not email.endswith('@pepperdine.edu'):
        logger.warning(f"Unauthorized domain for Google login: {email}")
        error_url = f"{settings.FRONTEND_URL}/auth/google/callback?error=invalid_domain"
        return RedirectResponse(url=error_url)

    # Check if user exists by email
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()

    if user:
        # User exists, log them in
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
        )
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # For OAuth flow, we'll pass just access token in URL for simplicity
        # In production, consider using a temporary code that exchanges for tokens
        token_encoded = urllib.parse.quote(access_token)
        success_url = f"{settings.FRONTEND_URL}/auth/google/callback?token={token_encoded}"
        return RedirectResponse(url=success_url)
    else:
        # New user, redirect to frontend callback with temporary signed data token
        temp_data = {
            'email': email, 
            'google_id': google_id,
            'name': user_info.get('name', ''),
            'picture': user_info.get('picture', '')
        }
        try:
            temp_token = temp_serializer.dumps(temp_data)
        except Exception as e:
            logger.error(f"Error serializing temporary data: {e}")
            error_url = f"{settings.FRONTEND_URL}/auth/google/callback?error=internal_error"
            return RedirectResponse(url=error_url)

        # Redirect to frontend callback with temporary token
        temp_token_encoded = urllib.parse.quote(temp_token)
        register_url = f"{settings.FRONTEND_URL}/auth/google/callback?temp_token={temp_token_encoded}"
        return RedirectResponse(url=register_url)

@router.post("/complete-profile", response_model=Token)
async def complete_google_registration(profile_data: CompleteProfileRequest, db: AsyncSession = Depends(get_db)):
    """Complete registration for a user logging in via Google for the first time."""
    try:
        temp_data = temp_serializer.loads(profile_data.token, max_age=3600) # 1 hour expiry
    except SignatureExpired:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired")
    except BadTimeSignature:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")
    except Exception as e:
        logger.error(f"Error loading temporary token: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token")

    email = temp_data.get('email')
    google_id = temp_data.get('google_id')
    handle = profile_data.handle

    if not email or not google_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token data")

    # Double-check if email or handle exists (race condition check)
    result = await db.execute(select(User).filter((User.email == email) | (User.handle == handle)))
    existing_user = result.scalars().first()
    if existing_user:
        detail = "Email already registered" if existing_user.email == email else "Handle already taken"
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    # Create new user
    new_user = User(
        handle=handle,
        email=email,
        google_id=google_id,
        rating=settings.ELO_INITIAL,
        is_active=True # Assume verified via Google
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    logger.info(f"New user registered via Google: {new_user.handle}")

    # Create access and refresh tokens
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    refresh_token = create_refresh_token(data={"sub": str(new_user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token, 
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60
    }

@router.post("/refresh", response_model=Token)
async def refresh_access_token(refresh_data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Refresh access token using refresh token"""
    # Verify refresh token
    payload = verify_refresh_token(refresh_data.refresh_token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
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
    
    # Create new access token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    
    # Optionally rotate refresh token for enhanced security
    new_refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    logger.info(f"Tokens refreshed for user: {user.handle}")
    
    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_MINUTES * 60
    } 