from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from starlette.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta, datetime, timezone
import logging
import jwt
import secrets

from app.db.session import get_db
from app.models import User, LoginActivity
from app.auth.schemas import Token, UserCreate, UserResponse
from app.auth.utils import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    create_refresh_token,
    get_current_active_user,
    create_user_session,
    invalidate_user_sessions,
    oauth2_scheme
)
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Configure OAuth client
oauth = OAuth()

# Updated Google OAuth configuration with minimal required parameters
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'  # Only required scopes
    }
)

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user"""
    # Check if email or handle already exists
    result = await db.execute(
        select(User).filter((User.email == user_data.email) | (User.handle == user_data.handle))
    )
    existing_user = result.scalars().first()
    
    if existing_user:
        if existing_user.email == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    new_user = User(
        handle=user_data.handle,
        email=user_data.email,
        pwd_hash=get_password_hash(user_data.password),
        rating=settings.ELO_INITIAL,
        is_active=True
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    logger.info(f"New user registered: {new_user.handle}")
    
    return new_user

@router.post("/login", response_model=Token)
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
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
    
    # Track successful login
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    login_activity = LoginActivity(
        user_id=user.id,
        login_type="standard",
        ip_address=client_ip,
        user_agent=user_agent[:255],
        success=True
    )
    db.add(login_activity)
    await db.commit()
    
    # Create tokens
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.get('/login/google')
async def login_google(request: Request):
    """Initiate Google OAuth flow - Fixed version"""
    # Get redirect URL from query params
    redirect_after_login = request.query_params.get('redirect', '/')
    request.session['redirect_after_login'] = redirect_after_login
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    request.session['oauth_state'] = state
    
    # Build OAuth callback URL more reliably
    # Use the original scheme from headers if behind proxy
    scheme = request.headers.get('X-Forwarded-Proto', 'http')
    host = request.headers.get('Host', 'localhost:8000')
    
    # For local development, ensure we use the correct URL
    if settings.DEBUG and host in ['localhost:8000', '127.0.0.1:8000']:
        redirect_uri = f"http://{host}/api/auth/auth/google"
    else:
        # For production or when behind proxy
        redirect_uri = f"{scheme}://{host}/api/auth/auth/google"
    
    logger.info(f"OAuth redirect_uri: {redirect_uri}")
    logger.info(f"OAuth state: {state}")
    logger.info(f"Client ID: {settings.GOOGLE_CLIENT_ID[:20]}...")  # Log partial client ID for debugging
    
    # Create authorization URL with explicit parameters
    try:
        return await oauth.google.authorize_redirect(
            request, 
            redirect_uri,
            state=state
        )
    except Exception as e:
        logger.error(f"OAuth redirect error: {e}")
        raise HTTPException(status_code=500, detail=f"OAuth configuration error: {str(e)}")

@router.get('/auth/google', name='google_auth_callback')
async def google_auth_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback - Fixed version"""
    # Validate state parameter for CSRF protection
    state_from_params = request.query_params.get('state')
    state_from_session = request.session.get('oauth_state')
    
    if not state_from_params or state_from_params != state_from_session:
        logger.error(f"State mismatch: params={state_from_params}, session={state_from_session}")
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error=state_mismatch")
    
    try:
        # Get the token from Google
        token = await oauth.google.authorize_access_token(request)
        logger.info("Successfully obtained token from Google")
    except OAuthError as error:
        logger.error(f"OAuth error: {error}")
        error_desc = getattr(error, 'description', str(error))
        return RedirectResponse(url=f"{settings.FRONTEND_URL}/login?error={error_desc}")
    
    # Get user info from token
    user_info = token.get('userinfo')
    if not user_info:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?error=no_user_info")
    
    email = user_info.get('email')
    email_verified = user_info.get('email_verified', False)
    google_id = user_info.get('sub')
    name = user_info.get('name', '')
    
    # Validate email
    if not email or not email_verified:
        return RedirectResponse(url=f"{settings.FRONTEND_URL}?error=email_not_verified")
    
    # Check if user exists
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()
    
    if not user:
        # Create new user with Google info
        # Generate a unique handle from email
        base_handle = email.split('@')[0]
        handle = base_handle
        counter = 1
        
        # Check if handle exists and make it unique
        while True:
            result = await db.execute(select(User).filter(User.handle == handle))
            if not result.scalars().first():
                break
            handle = f"{base_handle}{counter}"
            counter += 1
        
        user = User(
            handle=handle,
            email=email,
            google_id=google_id,
            rating=settings.ELO_INITIAL,
            is_active=True,
            pwd_hash=""  # No password for Google users
        )
        
        db.add(user)
        await db.commit()
        await db.refresh(user)
        logger.info(f"New user created via Google: {user.handle}")
    
    # Log the user in
    client_ip = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")
    
    # Track login
    login_activity = LoginActivity(
        user_id=user.id,
        login_type="google",
        ip_address=client_ip,
        user_agent=user_agent[:255],
        success=True
    )
    db.add(login_activity)
    
    # Create tokens
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Extract JTI for session
    refresh_payload = jwt.decode(
        refresh_token, 
        settings.JWT_SECRET, 
        algorithms=[settings.JWT_ALGORITHM],
        audience="logicarena-refresh",
        issuer="logicarena-api"
    )
    refresh_jti = refresh_payload.get("jti")
    
    # Create session
    session_id = await create_user_session(
        user_id=user.id,
        refresh_token_jti=refresh_jti,
        ip_address=client_ip,
        user_agent=user_agent[:255],
        db=db
    )
    
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=settings.JWT_EXPIRATION_MINUTES),
        session_id=session_id
    )
    
    await db.commit()
    
    # Get redirect URL from session
    redirect_url = request.session.get('redirect_after_login', '/')
    
    # Redirect to frontend with token
    # In production, you might want to use a more secure method
    frontend_url = f"{settings.FRONTEND_URL}/auth/google/callback?token={access_token}&redirect={redirect_url}"
    return RedirectResponse(url=frontend_url)

@router.post("/logout", response_model=dict)
async def logout(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    """Logout user and invalidate tokens"""
    try:
        # Invalidate all user sessions
        await invalidate_user_sessions(current_user.id, db, reason="user_logout")
        
        logger.info(f"User {current_user.handle} logged out successfully")
        return {"detail": "Successfully logged out"}
        
    except Exception as e:
        logger.error(f"Error during logout for user {current_user.handle}: {e}")
        # Even if there's an error, we should still try to log the user out
        await invalidate_user_sessions(current_user.id, db, reason="logout_error")
        return {"detail": "Logged out with errors"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """Get current user information"""
    return current_user

@router.get("/debug/oauth-url")
async def debug_oauth_url(request: Request):
    """Debug endpoint to show exact OAuth URL being generated"""
    # Generate state
    state = secrets.token_urlsafe(32)
    
    # Build redirect URI
    scheme = request.headers.get('X-Forwarded-Proto', 'http')
    host = request.headers.get('Host', 'localhost:8000')
    
    if settings.DEBUG and host in ['localhost:8000', '127.0.0.1:8000']:
        redirect_uri = f"http://{host}/api/auth/auth/google"
    else:
        redirect_uri = f"{scheme}://{host}/api/auth/auth/google"
    
    # Get the authorization URL without redirecting
    auth_url = str(oauth.google.create_authorization_url(redirect_uri, state=state)[0])
    
    return {
        "redirect_uri": redirect_uri,
        "state": state,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "auth_url": auth_url,
        "debug_info": {
            "host_header": host,
            "scheme": scheme,
            "is_debug": settings.DEBUG
        }
    }