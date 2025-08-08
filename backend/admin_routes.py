"""
Admin API Routes
Admin-only endpoints for user management, system monitoring, and configuration
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import structlog

from database import get_db
from models import StandardResponse, ErrorResponse
from db_models import (
    User, UserSubscription, Brand, Analysis,
    ApiUsage, ErrorLog, AdminActivityLog, UserImprovement,
    SubscriptionPlan, LLMProvider
)
from auth_oauth import OAuthManager
from utils import AuthUtils
from auth_utils import get_current_user



logger = structlog.get_logger()

router = APIRouter(prefix="/admin", tags=["Admin"])

# Dependency to verify admin role
async def verify_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Verify user has admin role"""
    if current_user.role != 'admin':
        # Log unauthorized access attempt
        log_entry = AdminActivityLog(
            admin_user_id=current_user.id,
            action="unauthorized_admin_access",
            resource_type="admin_endpoint",
            ip_address=None,  # Would get from request
            notes="Attempted to access admin endpoint without admin role"
        )
        db.add(log_entry)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return current_user

# User Management Endpoints

@router.get("/users", response_model=StandardResponse)
async def list_users(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    plan: Optional[SubscriptionPlan] = None
):
    """List all users with filtering options"""
    
    query = db.query(User)
    
    # Apply filters
    if search:
        query = query.filter(
            or_(
                User.email.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
                User.company.ilike(f"%{search}%")
            )
        )
    
    if role:
        query = query.filter(User.role == role)
    
    if status:
        if status == "active":
            query = query.filter(User.is_active == True)
        elif status == "inactive":
            query = query.filter(User.is_active == False)
    
    if plan:
        query = query.join(UserSubscription).filter(
            and_(
                UserSubscription.plan == plan,
                UserSubscription.status == "active"
            )
        )
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    users = query.offset(skip).limit(limit).all()
    
    # Format response
    user_data = []
    for user in users:
        subscription = db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user.id,
                UserSubscription.status == "active"
            )
        ).first()
        
        user_data.append({
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "company": user.company,
                            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "subscription_plan": subscription.plan.value if subscription else "none",
            "created_at": user.created_at.isoformat(),
            "last_login": user.last_login.isoformat() if user.last_login else None
        })
    
    return StandardResponse(
        success=True,
        data={
            "users": user_data,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    )

@router.post("/users/{user_id}/toggle-status", response_model=StandardResponse)
async def toggle_user_status(
    user_id: str,
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Enable or disable a user account"""
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent admins from disabling themselves
    if target_user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot disable your own account"
        )
    
    # Toggle status
    previous_status = target_user.is_active
    target_user.is_active = not target_user.is_active
    
    # Log the action
    log_entry = AdminActivityLog(
        admin_user_id=admin.id,
        action="user_status_toggled",
        resource_type="user",
        resource_id=str(target_user.id),
        previous_state={"is_active": previous_status},
        new_state={"is_active": target_user.is_active},
        notes=f"User {'enabled' if target_user.is_active else 'disabled'}"
    )
    db.add(log_entry)
    db.commit()
    
    logger.info(f"Admin {admin.email} {'enabled' if target_user.is_active else 'disabled'} user {target_user.email}")
    
    return StandardResponse(
        success=True,
        data={
            "user_id": str(target_user.id),
            "is_active": target_user.is_active,
            "message": f"User {'enabled' if target_user.is_active else 'disabled'} successfully"
        }
    )

@router.put("/users/{user_id}/role", response_model=StandardResponse)
async def update_user_role(
    user_id: str,
    new_role: str,
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Update user's role"""
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent removing last admin
    if target_user.role == 'admin' and new_role != 'admin':
        admin_count = db.query(User).filter(
            and_(
                User.role == 'admin',
                User.is_active == True
            )
        ).count()
        
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove last admin user"
            )
    
    previous_role = target_user.role
    target_user.role = new_role
    
    # Log the action
    log_entry = AdminActivityLog(
        admin_user_id=admin.id,
        action="user_role_changed",
        resource_type="user",
        resource_id=str(target_user.id),
        previous_state={"role": previous_role.value},
        new_state={"role": new_role.value}
    )
    db.add(log_entry)
    db.commit()
    
    return StandardResponse(
        success=True,
        data={
            "user_id": str(target_user.id),
            "role": new_role.value,
            "message": f"User role updated to {new_role.value}"
        }
    )

# Subscription Management

@router.get("/subscriptions", response_model=StandardResponse)
async def list_subscriptions(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    plan: Optional[SubscriptionPlan] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """List all subscriptions"""
    
    query = db.query(UserSubscription).join(User)
    
    if status:
        query = query.filter(UserSubscription.status == status)
    
    if plan:
        query = query.filter(UserSubscription.plan == plan)
    
    total = query.count()
    subscriptions = query.offset(skip).limit(limit).all()
    
    subscription_data = []
    for sub in subscriptions:
        subscription_data.append({
            "id": str(sub.id),
            "user_email": sub.user.email,
            "plan": sub.plan.value,
            "status": sub.status,
            "billing_cycle": sub.billing_cycle,
            "monthly_price": sub.monthly_price,
            "analyses_used": sub.analyses_used_this_month,
            "analyses_limit": sub.monthly_analyses_limit,
            "started_at": sub.started_at.isoformat(),
            "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None
        })
    
    return StandardResponse(
        success=True,
        data={
            "subscriptions": subscription_data,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    )

@router.put("/subscriptions/{subscription_id}", response_model=StandardResponse)
async def update_subscription(
    subscription_id: str,
    updates: Dict[str, Any],
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Update subscription details"""
    
    subscription = db.query(UserSubscription).filter(
        UserSubscription.id == subscription_id
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    # Store previous state
    previous_state = {
        "plan": subscription.plan.value,
        "status": subscription.status,
        "analyses_limit": subscription.monthly_analyses_limit
    }
    
    # Apply updates
    allowed_updates = [
        "plan", "status", "monthly_analyses_limit", 
        "user_seats", "brands_limit", "overage_allowed"
    ]
    
    for key, value in updates.items():
        if key in allowed_updates and hasattr(subscription, key):
            if key == "plan":
                setattr(subscription, key, SubscriptionPlan(value))
            else:
                setattr(subscription, key, value)
    
    # Log the action
    log_entry = AdminActivityLog(
        admin_user_id=admin.id,
        action="subscription_modified",
        resource_type="subscription",
        resource_id=str(subscription.id),
        previous_state=previous_state,
        new_state=updates,
        notes=f"Modified subscription for user {subscription.user.email}"
    )
    db.add(log_entry)
    db.commit()
    
    return StandardResponse(
        success=True,
        message="Subscription updated successfully"
    )

# System Monitoring

@router.get("/metrics/overview", response_model=StandardResponse)
async def get_system_overview(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Get system overview metrics"""
    
    # User metrics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.role == 'admin').count()
    
    # Subscription metrics
    active_subscriptions = db.query(UserSubscription).filter(
        UserSubscription.status == "active"
    ).count()
    
    subscription_breakdown = {}
    for plan in SubscriptionPlan:
        count = db.query(UserSubscription).filter(
            and_(
                UserSubscription.plan == plan,
                UserSubscription.status == "active"
            )
        ).count()
        subscription_breakdown[plan.value] = count
    
    # Analysis metrics (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    total_analyses = db.query(Analysis).filter(
        Analysis.created_at >= thirty_days_ago
    ).count()
    
    # API usage metrics
    api_calls_30d = db.query(ApiUsage).filter(
        ApiUsage.created_at >= thirty_days_ago
    ).count()
    
    api_cost_30d = db.query(func.sum(ApiUsage.estimated_cost)).filter(
        ApiUsage.created_at >= thirty_days_ago
    ).scalar() or 0
    
    # Error metrics
    errors_24h = db.query(ErrorLog).filter(
        and_(
            ErrorLog.created_at >= datetime.utcnow() - timedelta(hours=24),
            ErrorLog.severity.in_(["error", "critical"])
        )
    ).count()
    
    return StandardResponse(
        success=True,
        data={
            "users": {
                "total": total_users,
                "active": active_users,
                "admins": admin_users
            },
            "subscriptions": {
                "total_active": active_subscriptions,
                "breakdown": subscription_breakdown
            },
            "usage": {
                "analyses_30d": total_analyses,
                "api_calls_30d": api_calls_30d,
                "api_cost_30d": round(api_cost_30d, 2)
            },
            "health": {
                "errors_24h": errors_24h,
                "status": "healthy" if errors_24h < 10 else "degraded"
            }
        }
    )

@router.get("/metrics/api-usage", response_model=StandardResponse)
async def get_api_usage_metrics(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
    provider: Optional[LLMProvider] = None
):
    """Get detailed API usage metrics"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    query = db.query(ApiUsage).filter(ApiUsage.created_at >= start_date)
    
    if provider:
        query = query.filter(ApiUsage.llm_provider == provider)
    
    # Aggregate by provider and model
    usage_by_provider = {}
    total_cost = 0.0
    total_tokens = 0
    
    api_usage = query.all()
    
    for usage in api_usage:
        if usage.llm_provider:
            provider_name = usage.llm_provider.value
            if provider_name not in usage_by_provider:
                usage_by_provider[provider_name] = {
                    "calls": 0,
                    "tokens_input": 0,
                    "tokens_output": 0,
                    "cost": 0.0,
                    "models": {}
                }
            
            usage_by_provider[provider_name]["calls"] += 1
            usage_by_provider[provider_name]["tokens_input"] += usage.tokens_input
            usage_by_provider[provider_name]["tokens_output"] += usage.tokens_output
            usage_by_provider[provider_name]["cost"] += usage.estimated_cost
            
            # Track by model
            if usage.llm_model:
                if usage.llm_model not in usage_by_provider[provider_name]["models"]:
                    usage_by_provider[provider_name]["models"][usage.llm_model] = {
                        "calls": 0,
                        "tokens": 0,
                        "cost": 0.0
                    }
                
                usage_by_provider[provider_name]["models"][usage.llm_model]["calls"] += 1
                usage_by_provider[provider_name]["models"][usage.llm_model]["tokens"] += (
                    usage.tokens_input + usage.tokens_output
                )
                usage_by_provider[provider_name]["models"][usage.llm_model]["cost"] += usage.estimated_cost
            
            total_cost += usage.estimated_cost
            total_tokens += usage.tokens_input + usage.tokens_output
    
    return StandardResponse(
        success=True,
        data={
            "period_days": days,
            "total_api_calls": len(api_usage),
            "total_tokens": total_tokens,
            "total_cost": round(total_cost, 2),
            "by_provider": usage_by_provider,
            "daily_average": {
                "calls": len(api_usage) / days,
                "cost": round(total_cost / days, 2)
            }
        }
    )

@router.get("/errors", response_model=StandardResponse)
async def get_error_logs(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    severity: Optional[str] = None,
    category: Optional[str] = None,
    unresolved_only: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200)
):
    """Get system error logs"""
    
    query = db.query(ErrorLog)
    
    if severity:
        query = query.filter(ErrorLog.severity == severity)
    
    if category:
        query = query.filter(ErrorLog.category == category)
    
    if unresolved_only:
        query = query.filter(ErrorLog.is_resolved == False)
    
    # Order by most recent first
    query = query.order_by(ErrorLog.created_at.desc())
    
    total = query.count()
    errors = query.offset(skip).limit(limit).all()
    
    error_data = []
    for error in errors:
        error_data.append({
            "id": str(error.id),
            "error_type": error.error_type,
            "error_message": error.error_message,
            "severity": error.severity,
            "category": error.category,
            "user_id": str(error.user_id) if error.user_id else None,
            "endpoint": error.endpoint,
            "is_resolved": error.is_resolved,
            "created_at": error.created_at.isoformat()
        })
    
    return StandardResponse(
        success=True,
        data={
            "errors": error_data,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    )

@router.put("/errors/{error_id}/resolve", response_model=StandardResponse)
async def resolve_error(
    error_id: str,
    resolution_notes: str,
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Mark an error as resolved"""
    
    error = db.query(ErrorLog).filter(ErrorLog.id == error_id).first()
    if not error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Error not found"
        )
    
    error.is_resolved = True
    error.resolved_at = datetime.utcnow()
    error.resolution_notes = resolution_notes
    
    # Log the action
    log_entry = AdminActivityLog(
        admin_user_id=admin.id,
        action="error_resolved",
        resource_type="error_log",
        resource_id=str(error.id),
        notes=f"Resolved error: {resolution_notes}"
    )
    db.add(log_entry)
    db.commit()
    
    return StandardResponse(
        success=True,
        message="Error marked as resolved"
    )

# Activity Logs

@router.get("/activity-logs", response_model=StandardResponse)
async def get_admin_activity_logs(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    days: int = Query(7, ge=1, le=90)
):
    """Get admin activity logs"""
    
    start_date = datetime.utcnow() - timedelta(days=days)
    query = db.query(AdminActivityLog).filter(
        AdminActivityLog.created_at >= start_date
    )
    
    if admin_id:
        query = query.filter(AdminActivityLog.admin_user_id == admin_id)
    
    if action:
        query = query.filter(AdminActivityLog.action == action)
    
    # Order by most recent first
    query = query.order_by(AdminActivityLog.created_at.desc())
    
    logs = query.limit(500).all()  # Limit to 500 most recent
    
    log_data = []
    for log in logs:
        log_data.append({
            "id": str(log.id),
            "admin_email": log.admin_user.email,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "notes": log.notes,
            "created_at": log.created_at.isoformat()
        })
    
    return StandardResponse(
        success=True,
        data={
            "logs": log_data,
            "count": len(log_data),
            "period_days": days
        }
    )

# User Improvements

@router.get("/improvements", response_model=StandardResponse)
async def get_user_improvements(
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    category: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100)
):
    """Get user-submitted improvements and feature requests"""
    
    query = db.query(UserImprovement)
    
    if status:
        query = query.filter(UserImprovement.status == status)
    
    if category:
        query = query.filter(UserImprovement.category == category)
    
    # Order by upvotes and recency
    query = query.order_by(
        UserImprovement.upvotes.desc(),
        UserImprovement.created_at.desc()
    )
    
    total = query.count()
    improvements = query.offset(skip).limit(limit).all()
    
    improvement_data = []
    for improvement in improvements:
        improvement_data.append({
            "id": str(improvement.id),
            "title": improvement.title,
            "description": improvement.description,
            "category": improvement.category,
            "status": improvement.status,
            "priority": improvement.priority,
            "upvotes": improvement.upvotes,
            "downvotes": improvement.downvotes,
            "user_email": improvement.user.email,
            "created_at": improvement.created_at.isoformat(),
            "reviewed_by": improvement.reviewer.email if improvement.reviewer else None
        })
    
    return StandardResponse(
        success=True,
        data={
            "improvements": improvement_data,
            "total": total,
            "skip": skip,
            "limit": limit
        }
    )

@router.put("/improvements/{improvement_id}", response_model=StandardResponse)
async def update_improvement_status(
    improvement_id: str,
    status: str,
    priority: Optional[str] = None,
    admin_notes: Optional[str] = None,
    admin: User = Depends(verify_admin),
    db: Session = Depends(get_db)
):
    """Update improvement request status"""
    
    improvement = db.query(UserImprovement).filter(
        UserImprovement.id == improvement_id
    ).first()
    
    if not improvement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Improvement request not found"
        )
    
    improvement.status = status
    improvement.reviewed_by = admin.id
    improvement.reviewed_at = datetime.utcnow()
    
    if priority:
        improvement.priority = priority
    
    if admin_notes:
        improvement.admin_notes = admin_notes
    
    # Log the action
    log_entry = AdminActivityLog(
        admin_user_id=admin.id,
        action="improvement_reviewed",
        resource_type="user_improvement",
        resource_id=str(improvement.id),
        notes=f"Status: {status}, Priority: {priority}"
    )
    db.add(log_entry)
    db.commit()
    
    return StandardResponse(
        success=True,
        message="Improvement request updated"
    )