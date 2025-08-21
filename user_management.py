"""
Enhanced User Management Module
Implements user enable/disable features and management functions
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
import structlog

from db_models import (
    User, UserRole, UserBrand, Brand, UserSubscription,
    AdminActivityLog, ApiUsage, UserImprovement
)
from auth_oauth import OAuthManager, PasswordResetManager
from utils import AuthUtils, EnhancedPasswordValidator

logger = structlog.get_logger()

class UserManager:
    """Enhanced user management functionality"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_user(
        self,
        email: str,
        password: Optional[str] = None,
        full_name: Optional[str] = None,
        company: Optional[str] = None,
        role: str = 'client',  # Use string directly for PostgreSQL enum compatibility
        oauth_provider: Optional[str] = None,
        oauth_id: Optional[str] = None
    ) -> User:
        """Create a new user account"""
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Validate password if provided
        if password:
            is_valid, errors = EnhancedPasswordValidator.validate_password(password)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"message": "Password validation failed", "errors": errors}
                )
        
        # Create user
        user = User(
            email=email,
            password_hash=AuthUtils.hash_password(password) if password else None,
            full_name=full_name,
            company=company,
            role=role,
            oauth_provider=oauth_provider,
            oauth_id=oauth_id,
            is_active=True,
            is_verified=bool(oauth_provider)  # OAuth users are pre-verified
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        logger.info(f"Created new user: {email}")
        return user
    
    async def update_user(
        self,
        user_id: str,
        updates: Dict[str, Any],
        admin_user: Optional[User] = None
    ) -> User:
        """Update user information"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Track previous state for admin logging
        previous_state = {}
        
        # Apply updates
        allowed_fields = [
            "full_name", "company", "email_notifications",
            "weekly_reports", "timezone"
        ]
        
        # Admin-only fields
        admin_only_fields = ["role", "is_active", "is_verified"]
        
        for field, value in updates.items():
            if field in allowed_fields:
                if hasattr(user, field):
                    previous_state[field] = getattr(user, field)
                    setattr(user, field, value)
            elif field in admin_only_fields and admin_user and admin_user.role == 'admin':
                if hasattr(user, field):
                    previous_state[field] = getattr(user, field)
                    setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        # Log admin action if applicable
        if admin_user and admin_user.role == 'admin':
            log_entry = AdminActivityLog(
                admin_user_id=admin_user.id,
                action="user_updated",
                resource_type="user",
                resource_id=str(user.id),
                previous_state=previous_state,
                new_state=updates
            )
            self.db.add(log_entry)
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    async def toggle_user_status(
        self,
        user_id: str,
        admin_user: User,
        reason: Optional[str] = None
    ) -> User:
        """Enable or disable a user account"""
        
        if admin_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent self-disable
        if user.id == admin_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot disable your own account"
            )
        
        # Toggle status
        previous_status = user.is_active
        user.is_active = not user.is_active
        
        # Log the action
        log_entry = AdminActivityLog(
            admin_user_id=admin_user.id,
            action="user_status_toggled",
            resource_type="user",
            resource_id=str(user.id),
            previous_state={"is_active": previous_status},
            new_state={"is_active": user.is_active},
            notes=reason or f"User {'enabled' if user.is_active else 'disabled'}"
        )
        self.db.add(log_entry)
        
        self.db.commit()
        self.db.refresh(user)
        
        logger.info(f"User {user.email} {'enabled' if user.is_active else 'disabled'} by admin {admin_user.email}")
        
        return user
    
    async def delete_user(
        self,
        user_id: str,
        admin_user: User,
        soft_delete: bool = True
    ) -> bool:
        """Delete a user account"""
        
        if admin_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prevent self-deletion
        if user.id == admin_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )
        
        if soft_delete:
            # Soft delete - just deactivate
            user.is_active = False
            user.updated_at = datetime.utcnow()
            
            # Log the action
            log_entry = AdminActivityLog(
                admin_user_id=admin_user.id,
                action="user_soft_deleted",
                resource_type="user",
                resource_id=str(user.id),
                notes="User account deactivated (soft delete)"
            )
            self.db.add(log_entry)
            
        else:
            # Hard delete - remove from database
            # First, log the action
            log_entry = AdminActivityLog(
                admin_user_id=admin_user.id,
                action="user_hard_deleted",
                resource_type="user",
                resource_id=str(user.id),
                notes=f"User {user.email} permanently deleted"
            )
            self.db.add(log_entry)
            
            # Delete user (cascades will handle related records)
            self.db.delete(user)
        
        self.db.commit()
        
        logger.info(f"User {user_id} {'deactivated' if soft_delete else 'deleted'} by admin {admin_user.email}")
        
        return True
    
    async def get_user_activity(
        self,
        user_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get user activity summary"""
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get API usage
        api_usage = self.db.query(ApiUsage).filter(
            and_(
                ApiUsage.user_id == user_id,
                ApiUsage.created_at >= start_date
            )
        ).all()
        
        # Get user improvements
        improvements = self.db.query(UserImprovement).filter(
            UserImprovement.user_id == user_id
        ).all()
        
        # Get brands
        user_brands = self.db.query(UserBrand).filter(
            UserBrand.user_id == user_id
        ).all()
        
        # Calculate activity metrics
        total_api_calls = len(api_usage)
        total_cost = sum(usage.estimated_cost for usage in api_usage)
        
        # Group API usage by provider
        usage_by_provider = {}
        for usage in api_usage:
            if usage.llm_provider:
                provider = usage.llm_provider.value
                if provider not in usage_by_provider:
                    usage_by_provider[provider] = {
                        "calls": 0,
                        "tokens": 0,
                        "cost": 0
                    }
                usage_by_provider[provider]["calls"] += 1
                usage_by_provider[provider]["tokens"] += usage.tokens_input + usage.tokens_output
                usage_by_provider[provider]["cost"] += usage.estimated_cost
        
        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None
            },
            "activity": {
                "period_days": days,
                "api_calls": total_api_calls,
                "total_cost": round(total_cost, 2),
                "usage_by_provider": usage_by_provider,
                "improvements_submitted": len(improvements),
                "brands_accessed": len(user_brands)
            }
        }
    
    async def search_users(
        self,
        query: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        subscription_plan: Optional[str] = None,
        skip: int = 0,
        limit: int = 20
    ) -> Dict[str, Any]:
        """Search and filter users"""
        
        search_query = self.db.query(User)
        
        # Apply filters
        if query:
            search_query = search_query.filter(
                or_(
                    User.email.ilike(f"%{query}%"),
                    User.full_name.ilike(f"%{query}%"),
                    User.company.ilike(f"%{query}%")
                )
            )
        
        if role:
            search_query = search_query.filter(User.role == role)
        
        if is_active is not None:
            search_query = search_query.filter(User.is_active == is_active)
        
        if subscription_plan:
            search_query = search_query.join(UserSubscription).filter(
                and_(
                    UserSubscription.plan == subscription_plan,
                    UserSubscription.status == "active"
                )
            )
        
        # Get total count
        total = search_query.count()
        
        # Get paginated results
        users = search_query.offset(skip).limit(limit).all()
        
        # Format results
        user_list = []
        for user in users:
            # Get active subscription
            subscription = self.db.query(UserSubscription).filter(
                and_(
                    UserSubscription.user_id == user.id,
                    UserSubscription.status == "active"
                )
            ).first()
            
            user_list.append({
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "company": user.company,
                "role": user.role,
                "is_active": user.is_active,
                "subscription_plan": subscription.plan.value if subscription else "none",
                "created_at": user.created_at.isoformat()
            })
        
        return {
            "users": user_list,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    
    async def bulk_action(
        self,
        user_ids: List[str],
        action: str,
        admin_user: User
    ) -> Dict[str, Any]:
        """Perform bulk actions on multiple users"""
        
        if admin_user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Validate action
        allowed_actions = ["enable", "disable", "delete_soft"]
        if action not in allowed_actions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid action. Allowed: {allowed_actions}"
            )
        
        # Prevent self-action
        if str(admin_user.id) in user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot perform this action on your own account"
            )
        
        # Get users
        users = self.db.query(User).filter(User.id.in_(user_ids)).all()
        
        if not users:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No users found"
            )
        
        success_count = 0
        failed_count = 0
        
        for user in users:
            try:
                if action == "enable":
                    user.is_active = True
                elif action == "disable":
                    user.is_active = False
                elif action == "delete_soft":
                    user.is_active = False
                
                success_count += 1
                
            except Exception as e:
                logger.error(f"Bulk action failed for user {user.id}: {e}")
                failed_count += 1
        
        # Log bulk action
        log_entry = AdminActivityLog(
            admin_user_id=admin_user.id,
            action=f"bulk_{action}",
            resource_type="users",
            resource_id=",".join(user_ids),
            notes=f"Bulk {action} on {success_count} users"
        )
        self.db.add(log_entry)
        
        self.db.commit()
        
        return {
            "action": action,
            "total_users": len(user_ids),
            "success_count": success_count,
            "failed_count": failed_count
        }
    
    async def assign_brand_access(
        self,
        user_id: str,
        brand_id: str,
        role: str = "viewer",
        admin_user: Optional[User] = None
    ) -> UserBrand:
        """Assign brand access to a user"""
        
        # Verify user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify brand exists
        brand = self.db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand not found"
            )
        
        # Check if access already exists
        existing = self.db.query(UserBrand).filter(
            and_(
                UserBrand.user_id == user_id,
                UserBrand.brand_id == brand_id
            )
        ).first()
        
        if existing:
            # Update role if different
            if existing.role != role:
                existing.role = role
                self.db.commit()
                self.db.refresh(existing)
            return existing
        
        # Create new access
        user_brand = UserBrand(
            user_id=user_id,
            brand_id=brand_id,
            role=role
        )
        
        self.db.add(user_brand)
        
        # Log admin action if applicable
        if admin_user and admin_user.role == 'admin':
            log_entry = AdminActivityLog(
                admin_user_id=admin_user.id,
                action="brand_access_granted",
                resource_type="user_brand",
                resource_id=f"{user_id}:{brand_id}",
                notes=f"Granted {role} access to brand {brand.name} for user {user.email}"
            )
            self.db.add(log_entry)
        
        self.db.commit()
        self.db.refresh(user_brand)
        
        return user_brand
    
    async def remove_brand_access(
        self,
        user_id: str,
        brand_id: str,
        admin_user: Optional[User] = None
    ) -> bool:
        """Remove brand access from a user"""
        
        user_brand = self.db.query(UserBrand).filter(
            and_(
                UserBrand.user_id == user_id,
                UserBrand.brand_id == brand_id
            )
        ).first()
        
        if not user_brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Brand access not found"
            )
        
        # Log admin action if applicable
        if admin_user and admin_user.role == 'admin':
            log_entry = AdminActivityLog(
                admin_user_id=admin_user.id,
                action="brand_access_revoked",
                resource_type="user_brand",
                resource_id=f"{user_id}:{brand_id}",
                notes=f"Revoked brand access"
            )
            self.db.add(log_entry)
        
        self.db.delete(user_brand)
        self.db.commit()
        
        return True
    
    async def get_user_permissions(self, user: User) -> Dict[str, Any]:
        """Get comprehensive user permissions"""
        
        # Get subscription
        subscription = self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user.id,
                UserSubscription.status == "active"
            )
        ).first()
        
        # Get brand access
        user_brands = self.db.query(UserBrand).filter(
            UserBrand.user_id == user.id
        ).all()
        
        permissions = {
            "user_id": str(user.id),
            "role": user.role,
            "is_active": user.is_active,
            "subscription": {
                "plan": subscription.plan.value if subscription else "none",
                "features": {
                    "analyses_limit": subscription.monthly_analyses_limit if subscription else 0,
                    "has_api_access": subscription.has_api_access if subscription else False,
                    "has_export": subscription.has_export_features if subscription else False,
                    "can_use_own_keys": subscription.plan.value == "bring_your_own_key" if subscription else False
                }
            },
            "brands": [
                {
                    "brand_id": str(ub.brand_id),
                    "brand_name": ub.brand.name,
                    "role": ub.role
                }
                for ub in user_brands
            ],
            "admin_permissions": {
                            "can_manage_users": user.role == 'admin',
            "can_view_analytics": user.role == 'admin',
            "can_manage_subscriptions": user.role == 'admin',
            "can_view_logs": user.role == 'admin'
            }
        }
        
        return permissions

class UserService:
    """High-level user service combining various managers"""
    
    def __init__(
        self,
        user_manager: UserManager,
        oauth_manager: OAuthManager,
        password_reset_manager: PasswordResetManager
    ):
        self.user_manager = user_manager
        self.oauth_manager = oauth_manager
        self.password_reset_manager = password_reset_manager
    
    async def register_user(
        self,
        email: str,
        password: Optional[str] = None,
        full_name: Optional[str] = None,
        company: Optional[str] = None,
        oauth_token: Optional[str] = None
    ) -> Dict[str, Any]:
        """Register a new user via email/password or OAuth"""
        
        if oauth_token:
            # OAuth registration
            google_user_info = await self.oauth_manager.verify_google_token(oauth_token)
            
            user = await self.user_manager.create_user(
                email=google_user_info["email"],
                full_name=google_user_info.get("full_name"),
                oauth_provider="google",
                oauth_id=google_user_info["oauth_id"]
            )
            
            # Create access token
            access_token = self.oauth_manager.create_access_token(user)
            
            return {
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role
                },
                "access_token": access_token,
                "token_type": "bearer"
            }
        
        else:
            # Email/password registration
            if not password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Password required for email registration"
                )
            
            user = await self.user_manager.create_user(
                email=email,
                password=password,
                full_name=full_name,
                company=company
            )
            
            # Send verification email
            # TODO: Implement email verification
            
            return {
                "user": {
                    "id": str(user.id),
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": user.role
                },
                "message": "Registration successful. Please check your email to verify your account."
            }
    
    async def login_user(
        self,
        email: Optional[str] = None,
        password: Optional[str] = None,
        oauth_token: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """Authenticate user via email/password or OAuth"""
        
        if oauth_token:
            # OAuth login
            google_user_info = await self.oauth_manager.verify_google_token(oauth_token)
            user = await self.oauth_manager.authenticate_or_create_user(google_user_info, db)
            
        else:
            # Email/password login
            if not email or not password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email and password required"
                )
            
            user = db.query(User).filter(User.email == email).first()
            
            if not user or not user.password_hash:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            if not AuthUtils.verify_password(password, user.password_hash):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid credentials"
                )
            
            if not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Account is disabled"
                )
            
            # Update last login
            user.last_login = datetime.utcnow()
            db.commit()
        
        # Create access token
        access_token = self.oauth_manager.create_access_token(user)
        
        # Get user permissions
        permissions = await self.user_manager.get_user_permissions(user)
        
        return {
            "user": {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "role": user.role
            },
            "access_token": access_token,
            "token_type": "bearer",
            "permissions": permissions
        }