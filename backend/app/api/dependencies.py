"""
API dependencies for authentication and authorization.
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from jose import JWTError
from fastapi_cache.decorator import cache
from app.core.database import get_db
from app.core.redis import cache_key_builder
from app.core.security import decode_token
from app.models.user import User
from app.schemas.user import UserResponse
import uuid

# HTTP Bearer token security
security = HTTPBearer()


@cache(expire=300, key_builder=cache_key_builder, namespace="users")
async def get_cached_user(user_id: str, db: Session) -> Optional[User]:
    """
    Fetch user from DB with caching.
    Eager loads 'role' to avoid detached instance errors.
    """
    return db.query(User).options(joinedload(User.role)).filter(
        User.id == uuid.UUID(user_id),
        User.is_active == True,
        User.deleted_at.is_(None)
    ).first()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode JWT token
        token = credentials.credentials
        payload = decode_token(token)
        
        # Extract user ID from token
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if user_id is None or token_type != "access":
            raise credentials_exception
        
    except JWTError:
        raise credentials_exception
    
    # Fetch user from cache or database
    try:
        # Pass db as kwarg to ensure it's ignored by cache_key_builder if needed,
        # but cache_key_builder ignores 'db' in kwargs. 
        # Here we pass it as positional but my key_builder logic for args might catch it.
        # Let's check cache_key_builder again. 
        # It iterates args. Session string repr changes.
        # So we MUST pass db as kwarg or rely on the builder ignoring it if I updated it.
        # I didn't update builder to ignore args.
        # So I must pass db as kwarg.
        user = await get_cached_user(user_id, db=db)
    except ValueError:
        raise credentials_exception
    
    if user is None:
        raise credentials_exception
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure user is active.
    
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


class RoleChecker:
    """
    Dependency class to check if user has required role.
    
    Example:
        @app.get("/admin", dependencies=[Depends(RoleChecker(["admin"]))])
    """
    
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles
    
    def __call__(self, current_user: User = Depends(get_current_active_user)):
        if current_user.role.name not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User must have one of these roles: {', '.join(self.allowed_roles)}"
            )
        return current_user
