from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from fastapi_cache.decorator import cache
from app.core.database import get_db
from app.core.redis import invalidate_cache, cache_key_builder
from app.models.user import User, Role
from app.schemas.user import UserResponse, UserInvite, UserUpdate, RoleResponse
from app.api.dependencies import get_current_active_user, RoleChecker
from datetime import datetime
import uuid
import logging

router = APIRouter(tags=["users"])
logger = logging.getLogger(__name__)

@router.get("/roles", response_model=List[RoleResponse])
@cache(expire=3600, key_builder=cache_key_builder, namespace="users")
async def get_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
) -> Any:
    """
    Retrieve all available roles.
    """
    roles = db.query(Role).all()
    return roles


@router.get("/users", response_model=List[UserResponse])
@cache(expire=60, key_builder=cache_key_builder, namespace="users")
async def get_users(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    role_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
) -> Any:
    """
    Retrieve users.
    """
    query = db.query(User).filter(User.deleted_at == None)
    
    if search:
        search_filter = f"%{search}%"
        query = query.filter(User.full_name.ilike(search_filter) | User.email.ilike(search_filter))
        
    if role_id:
        query = query.filter(User.role_id == role_id)
        
    users = query.offset(skip).limit(limit).all()
    return users

@router.post("/users/invite", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def invite_user(
    user_in: UserInvite,
    db: Session = Depends(get_db)
) -> Any:
    """
    Invite a new user.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )
        
    # Create user with random password/token
    # In a real app, we would generate a token and send an email
    # Here we just set a dummy password and mark as not verified
    
    # If role_id is provided, check if it exists
    if user_in.role_id:
        role = db.query(Role).filter(Role.id == user_in.role_id).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
            
    db_user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        phone=user_in.phone,
        password_hash="temp_hash_for_invite", # Should be hashed
        role_id=user_in.role_id,
        is_active=True,
        is_verified=False # Pending verification
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Invalidate user cache
    await invalidate_cache("users")
    
    # Mock sending email
    logger.info(f"Sending invitation email to {user_in.email} for user {db_user.id}")
    
    return db_user

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    user_in: UserUpdate,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update a user.
    Permissions: admin only
    """
    user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    update_data = user_in.model_dump(exclude_unset=True)
    
    # Check if role_id exists if provided
    if "role_id" in update_data and update_data["role_id"]:
        role = db.query(Role).filter(Role.id == update_data["role_id"]).first()
        if not role:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Role not found"
            )
            
    for field, value in update_data.items():
        setattr(user, field, value)
        
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Invalidate user cache
    await invalidate_cache("users")

    return user


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    current_user: User = Depends(RoleChecker(["admin"])),
    db: Session = Depends(get_db)
):
    """
    Delete a user (soft delete).
    Permissions: admin only
    """
    user = db.query(User).filter(User.id == user_id, User.deleted_at == None).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
        
    user.deleted_at = datetime.utcnow()
    user.is_active = False
    db.add(user)
    db.commit()
    
    # Invalidate user cache
    await invalidate_cache("users")
    
    return None
