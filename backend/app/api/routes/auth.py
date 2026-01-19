"""
Authentication API routes.
"""
from datetime import datetime, timedelta
import logging
import time
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User, Role, RefreshToken
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    TokenResponse,
    TokenRefresh,
    APIResponse,
)
from app.api.dependencies import get_current_user


logger = logging.getLogger(__name__)

MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300
LOGIN_LOCKOUT_SECONDS = 900

_login_attempts = defaultdict(list)
_login_locked_until = {}


def _get_login_key(email, ip):
    base = email.lower()
    if ip:
        return f"{base}|{ip}"
    return base


def _is_login_rate_limited(key):
    now = time.time()
    locked_until = _login_locked_until.get(key)
    if locked_until and locked_until > now:
        return True
    attempts = _login_attempts.get(key, [])
    attempts = [ts for ts in attempts if now - ts < LOGIN_WINDOW_SECONDS]
    _login_attempts[key] = attempts
    if len(attempts) >= MAX_LOGIN_ATTEMPTS:
        _login_locked_until[key] = now + LOGIN_LOCKOUT_SECONDS
        _login_attempts[key] = []
        return True
    return False


def _record_login_attempt(key):
    now = time.time()
    attempts = _login_attempts.get(key)
    if not attempts:
        _login_attempts[key] = [now]
    else:
        attempts.append(now)
        _login_attempts[key] = attempts


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=APIResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user.
    
    - Creates a new user account with hashed password
    - Assigns default 'sales' role
    - Returns success response
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Get default role (sales)
    default_role = db.query(Role).filter(Role.name == "sales").first()
    if not default_role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Default role not found. Please run database migrations."
        )
    
    # Create new user
    new_user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
        role_id=default_role.id,
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return APIResponse(
        success=True,
        message="User registered successfully",
        data={"user_id": str(new_user.id)}
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user and return JWT tokens.
    
    - Validates email and password
    - Returns access token (15min) and refresh token (7 days)
    - Updates last login timestamp
    """
    client_ip = request.client.host if request.client else None
    login_key = _get_login_key(credentials.email, client_ip)

    if _is_login_rate_limited(login_key):
        logger.warning("Login rate limit exceeded for email=%s ip=%s", credentials.email, client_ip)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again later.",
        )

    user = db.query(User).filter(
        User.email == credentials.email,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        _record_login_attempt(login_key)
        logger.warning("Login failed - user not found for email=%s ip=%s", credentials.email, client_ip)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account does not exist",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not verify_password(credentials.password, user.password_hash):
        _record_login_attempt(login_key)
        logger.warning("Login failed - invalid password for email=%s ip=%s", credentials.email, client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password does not match",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        logger.warning("Login attempt for inactive user email=%s ip=%s", credentials.email, client_ip)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Create tokens
    token_data = {"sub": str(user.id), "email": user.email, "role": user.role.name}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Store refresh token hash in database
    refresh_token_hash = get_password_hash(refresh_token)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(db_refresh_token)
    
    user.last_login_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    logger.info("Login successful for email=%s ip=%s", credentials.email, client_ip)
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """
    Refresh access token using refresh token.
    
    - Validates refresh token
    - Issues new access and refresh tokens
    - Revokes old refresh token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode refresh token
        payload = decode_token(token_data.refresh_token)
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "refresh":
            raise credentials_exception
        
    except Exception:
        raise credentials_exception
    
    # Find user
    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise credentials_exception
    
    # Verify refresh token exists and is not revoked
    token_hash = get_password_hash(token_data.refresh_token)
    stored_token = db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None),
        RefreshToken.expires_at > datetime.utcnow()
    ).first()
    
    if not stored_token:
        raise credentials_exception
    
    # Create new tokens
    token_data_dict = {"sub": str(user.id), "email": user.email, "role": user.role.name}
    new_access_token = create_access_token(token_data_dict)
    new_refresh_token = create_refresh_token({"sub": str(user.id)})
    
    # Revoke old refresh token
    stored_token.revoked_at = datetime.utcnow()
    
    # Store new refresh token
    new_refresh_token_hash = get_password_hash(new_refresh_token)
    db_refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=new_refresh_token_hash,
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(db_refresh_token)
    db.commit()
    db.refresh(user)
    
    return TokenResponse(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        user=UserResponse.model_validate(user)
    )


@router.post("/logout")
async def logout(
    token_data: TokenRefresh,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout user by revoking refresh token.
    """
    # Revoke the refresh token
    token_hash = get_password_hash(token_data.refresh_token)
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.user_id == current_user.id,
        RefreshToken.revoked_at.is_(None)
    ).first()
    
    if refresh_token:
        refresh_token.revoked_at = datetime.utcnow()
        db.commit()
    
    return APIResponse(
        success=True,
        message="Logged out successfully"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user information.
    """
    return UserResponse.model_validate(current_user)
