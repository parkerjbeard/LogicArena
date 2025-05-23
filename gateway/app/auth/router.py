from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import logging
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadTimeSignature

from app.db.session import get_db
from app.models import User
from app.auth.schemas import Token, UserCreate, UserResponse, UserLogin, CompleteProfileRequest
from app.auth.utils import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_active_user
)
from app.config import settings
from fastapi_limiter.depends import RateLimiter

logger = logging.getLogger(__name__)

router = APIRouter()

# Configure OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
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
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    
    logger.info(f"User logged in: {user.handle}")
    
    return {"access_token": access_token, "token_type": "bearer"}

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
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    
    logger.info(f"User logged in with email: {user.handle}")
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get information about the current logged-in user"""
    return current_user 

@router.get('/login/google')
async def login_via_google(request: Request):
    redirect_uri = request.url_for('auth_via_google')
    return await oauth.google.authorize_redirect(request, str(redirect_uri))

@router.get('/auth/google')
async def auth_via_google(request: Request, db: AsyncSession = Depends(get_db)):
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as error:
        logger.error(f"Google OAuth error: {error.error}")
        # Redirect to frontend callback route with error
        frontend_callback_url = f"http://localhost:3000/auth/google/callback?error={error.error}"
        return RedirectResponse(url=frontend_callback_url)

    user_info = await oauth.google.parse_id_token(request, token)
    
    # Check email domain
    email = user_info.get('email')
    if not email or not email.endswith('@pepperdine.edu'):
        logger.warning(f"Unauthorized Google login attempt: {email}")
        # Redirect to frontend callback route with error
        frontend_callback_url = f"http://localhost:3000/auth/google/callback?error=Invalid domain"
        return RedirectResponse(url=frontend_callback_url)

    # Check if user exists by email
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()

    if user:
        # User exists, log them in
        access_token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
        )
        # Redirect to frontend callback with JWT token
        frontend_callback_url = f"http://localhost:3000/auth/google/callback?token={access_token}"
        return RedirectResponse(url=frontend_callback_url)
    else:
        # New user, redirect to frontend callback with temporary signed data token
        temp_data = {'email': email, 'google_id': user_info.get('sub')}
        try:
            temp_token = temp_serializer.dumps(temp_data)
        except Exception as e:
            logger.error(f"Error serializing temporary data: {e}")
            # Redirect to frontend callback route with error
            frontend_callback_url = f"http://localhost:3000/auth/google/callback?error=Internal Server Error"
            return RedirectResponse(url=frontend_callback_url)

        # Redirect to frontend callback with temporary token
        frontend_callback_url = f"http://localhost:3000/auth/google/callback?temp_token={temp_token}"
        return RedirectResponse(url=frontend_callback_url)

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

    # Create access token
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )

    return {"access_token": access_token, "token_type": "bearer"} 