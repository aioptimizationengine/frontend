"""
Subscription and Pricing Management Module
Handles subscription plans, usage tracking, and overage management
"""

import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import structlog

from db_models import (
    User, UserSubscription, ApiUsage, SubscriptionPlan, 
    LLMProvider, Brand, UserBrand
)

logger = structlog.get_logger()

class PricingPlans:
    """Define all pricing plans and their features"""
    
    PLANS = {
        SubscriptionPlan.FREE: {
            "name": "Free",
            "monthly_price": 0,
            "yearly_price": 0,
            "features": {
                "monthly_analyses_limit": 1,
                "user_seats": 1,
                "brands_limit": 1,
                "competitor_analyses_limit": 0,
                "server_log_gb_limit": 0,
                "has_recommendations": True,  # Top 3 only
                "has_detailed_metrics": False,  # Scores only, no details
                "has_user_intent_mapping": True,  # Informational & Considerational only
                "has_export_features": False,
                "has_api_access": False,
                "support_level": "email",
                "history_retention": "blurred",
                "llm_keys": "platform_only"
            }
        },
        SubscriptionPlan.BRING_YOUR_OWN_KEY: {
            "name": "Bring Your Own Key",
            "monthly_price": 149.00,
            "yearly_price": 1500.00,
            "yearly_discount": 0.16,  # ~16% discount
            "features": {
                "monthly_analyses_limit": None,  # Unlimited
                "user_seats": 1,
                "extra_seat_price": 29.00,
                "brands_limit": 1,
                "extra_brand_price": 49.00,
                "competitor_analyses_limit": 2,
                "server_log_gb_limit": 1.0,  # 1GB/day
                "has_recommendations": True,  # All
                "has_detailed_metrics": True,  # All
                "has_user_intent_mapping": True,  # All
                "has_export_features": True,  # PDF/CSV
                "has_api_access": True,
                "support_level": "standard",
                "history_retention": "unlimited",
                "llm_keys": "user_provided"
            }
        },
        SubscriptionPlan.PLATFORM_MANAGED: {
            "name": "Platform Managed",
            "monthly_price": 299.00,
            "yearly_price": 3300.00,
            "yearly_discount": 0.08,  # ~8% discount
            "features": {
                "monthly_analyses_limit": 30,
                "overage_allowed": True,
                "overage_rate_per_analysis": 15.00,
                "user_seats": 3,
                "extra_seat_price": 29.00,
                "brands_limit": 1,
                "extra_brand_price": 49.00,
                "competitor_analyses_limit": 5,
                "server_log_gb_limit": 5.0,
                "has_recommendations": True,  # All
                "has_detailed_metrics": True,  # All
                "has_user_intent_mapping": True,  # Price optimal selection
                "has_export_features": True,  # PDF/CSV
                "has_api_access": True,
                "support_level": "priority",
                "history_retention": "unlimited",
                "llm_keys": "platform_provided"
            }
        },
        SubscriptionPlan.ENTERPRISE: {
            "name": "Enterprise",
            "monthly_price": None,  # Custom
            "yearly_price": None,  # Custom
            "features": {
                "monthly_analyses_limit": None,  # Custom
                "user_seats": None,  # Custom
                "brands_limit": None,  # Custom
                "competitor_analyses_limit": None,  # Custom
                "server_log_gb_limit": None,  # Custom
                "has_recommendations": True,
                "has_detailed_metrics": True,
                "has_user_intent_mapping": True,
                "has_export_features": True,
                "has_api_access": True,
                "support_level": "enterprise",
                "history_retention": "custom",
                "llm_keys": "flexible"
            }
        }
    }
    
    @classmethod
    def get_plan_details(cls, plan: SubscriptionPlan) -> Dict[str, Any]:
        """Get details for a specific plan"""
        return cls.PLANS.get(plan, {})
    
    @classmethod
    def can_use_feature(cls, plan: SubscriptionPlan, feature: str) -> bool:
        """Check if a plan has access to a specific feature"""
        plan_details = cls.get_plan_details(plan)
        return plan_details.get("features", {}).get(feature, False)

class SubscriptionManager:
    """Manages user subscriptions and usage tracking"""
    
    def __init__(self, db: Session):
        self.db = db
    
    async def create_subscription(
        self, 
        user: User, 
        plan: SubscriptionPlan,
        billing_cycle: str = "monthly",
        stripe_data: Optional[Dict[str, Any]] = None
    ) -> UserSubscription:
        """Create a new subscription for a user"""
        
        # Cancel any existing active subscriptions
        existing = self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user.id,
                UserSubscription.status == "active"
            )
        ).first()
        
        if existing:
            await self.cancel_subscription(existing)
        
        # Get plan details
        plan_details = PricingPlans.get_plan_details(plan)
        features = plan_details["features"]
        
        # Create new subscription
        subscription = UserSubscription(
            user_id=user.id,
            plan=plan,
            status="active",
            billing_cycle=billing_cycle,
            monthly_price=plan_details["monthly_price"] or 0,
            yearly_price=plan_details["yearly_price"] or 0,
            monthly_analyses_limit=features.get("monthly_analyses_limit"),
            user_seats=features.get("user_seats", 1),
            brands_limit=features.get("brands_limit", 1),
            competitor_analyses_limit=features.get("competitor_analyses_limit", 0),
            server_log_gb_limit=features.get("server_log_gb_limit", 0),
            has_recommendations=features.get("has_recommendations", False),
            has_detailed_metrics=features.get("has_detailed_metrics", False),
            has_user_intent_mapping=features.get("has_user_intent_mapping", False),
            has_export_features=features.get("has_export_features", False),
            has_api_access=features.get("has_api_access", False),
            overage_allowed=features.get("overage_allowed", False),
            overage_rate_per_analysis=features.get("overage_rate_per_analysis")
        )
        
        # Set billing period
        subscription.current_period_start = datetime.utcnow()
        if billing_cycle == "yearly":
            subscription.current_period_end = subscription.current_period_start + timedelta(days=365)
        else:
            subscription.current_period_end = subscription.current_period_start + timedelta(days=30)
        
        # Add Stripe data if provided
        if stripe_data:
            subscription.stripe_customer_id = stripe_data.get("customer_id")
            subscription.stripe_subscription_id = stripe_data.get("subscription_id")
            subscription.stripe_payment_method_id = stripe_data.get("payment_method_id")
        
        self.db.add(subscription)
        self.db.commit()
        
        logger.info(f"Created {plan.value} subscription for user {user.id}")
        return subscription
    
    async def check_usage_limits(
        self, 
        user: User, 
        resource_type: str,
        quantity: int = 1
    ) -> Dict[str, Any]:
        """Check if user has exceeded usage limits"""
        
        subscription = self.get_active_subscription(user)
        if not subscription:
            return {
                "allowed": False,
                "reason": "No active subscription",
                "limit": 0,
                "used": 0
            }
        
        # Check different resource types
        if resource_type == "analysis":
            limit = subscription.monthly_analyses_limit
            used = subscription.analyses_used_this_month
            
            if limit is None:  # Unlimited
                return {"allowed": True, "limit": None, "used": used}
            
            if used + quantity > limit:
                if subscription.overage_allowed:
                    return {
                        "allowed": True,
                        "overage": True,
                        "overage_cost": subscription.overage_rate_per_analysis * quantity,
                        "limit": limit,
                        "used": used
                    }
                else:
                    return {
                        "allowed": False,
                        "reason": "Monthly analysis limit exceeded",
                        "limit": limit,
                        "used": used
                    }
        
        elif resource_type == "brand":
            current_brands = self.db.query(UserBrand).filter(
                UserBrand.user_id == user.id
            ).count()
            
            if current_brands >= subscription.brands_limit:
                return {
                    "allowed": False,
                    "reason": "Brand limit reached",
                    "limit": subscription.brands_limit,
                    "used": current_brands,
                    "extra_cost": PricingPlans.PLANS[subscription.plan]["features"].get("extra_brand_price", 0)
                }
        
        elif resource_type == "user_seat":
            # Count users in same organization/brands
            user_count = self._count_organization_users(user)
            
            if user_count >= subscription.user_seats:
                return {
                    "allowed": False,
                    "reason": "User seat limit reached",
                    "limit": subscription.user_seats,
                    "used": user_count,
                    "extra_cost": PricingPlans.PLANS[subscription.plan]["features"].get("extra_seat_price", 0)
                }
        
        return {"allowed": True}
    
    async def record_usage(
        self, 
        user: User,
        resource_type: str,
        quantity: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Record resource usage"""
        
        subscription = self.get_active_subscription(user)
        if not subscription:
            return
        
        if resource_type == "analysis":
            subscription.analyses_used_this_month += quantity
            self.db.commit()
            
            logger.info(f"Recorded {quantity} analysis usage for user {user.id}")
    
    async def reset_monthly_usage(self):
        """Reset monthly usage counters for all subscriptions"""
        
        # Get all active subscriptions where period has ended
        expired_periods = self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.status == "active",
                UserSubscription.current_period_end <= datetime.utcnow()
            )
        ).all()
        
        for subscription in expired_periods:
            # Reset usage
            subscription.analyses_used_this_month = 0
            
            # Update period
            subscription.current_period_start = datetime.utcnow()
            if subscription.billing_cycle == "yearly":
                subscription.current_period_end = subscription.current_period_start + timedelta(days=365)
            else:
                subscription.current_period_end = subscription.current_period_start + timedelta(days=30)
        
        self.db.commit()
        logger.info(f"Reset monthly usage for {len(expired_periods)} subscriptions")
    
    async def cancel_subscription(self, subscription: UserSubscription):
        """Cancel a subscription"""
        subscription.status = "cancelled"
        subscription.cancelled_at = datetime.utcnow()
        self.db.commit()
        
        logger.info(f"Cancelled subscription {subscription.id}")
    
    async def get_usage_summary(self, user: User) -> Dict[str, Any]:
        """Get usage summary for a user"""
        
        subscription = self.get_active_subscription(user)
        if not subscription:
            return {"error": "No active subscription"}
        
        # Calculate days remaining in period
        days_remaining = (subscription.current_period_end - datetime.utcnow()).days
        
        # Get current month's API usage
        month_start = subscription.current_period_start
        api_usage = self.db.query(ApiUsage).filter(
            and_(
                ApiUsage.user_id == user.id,
                ApiUsage.created_at >= month_start
            )
        ).all()
        
        # Calculate costs
        total_api_cost = sum(usage.estimated_cost for usage in api_usage)
        
        return {
            "subscription": {
                "plan": subscription.plan.value,
                "status": subscription.status,
                "billing_cycle": subscription.billing_cycle,
                "current_period_end": subscription.current_period_end.isoformat(),
                "days_remaining": days_remaining
            },
            "usage": {
                "analyses": {
                    "used": subscription.analyses_used_this_month,
                    "limit": subscription.monthly_analyses_limit,
                    "percentage": (subscription.analyses_used_this_month / subscription.monthly_analyses_limit * 100) 
                        if subscription.monthly_analyses_limit else 0
                },
                "brands": {
                    "used": self.db.query(UserBrand).filter(UserBrand.user_id == user.id).count(),
                    "limit": subscription.brands_limit
                },
                "api_calls": len(api_usage),
                "estimated_cost": total_api_cost
            },
            "features": {
                "recommendations": subscription.has_recommendations,
                "detailed_metrics": subscription.has_detailed_metrics,
                "export": subscription.has_export_features,
                "api_access": subscription.has_api_access
            }
        }
    
    def get_active_subscription(self, user: User) -> Optional[UserSubscription]:
        """Get user's active subscription"""
        return self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user.id,
                UserSubscription.status == "active"
            )
        ).first()
    
    def _count_organization_users(self, user: User) -> int:
        """Count users in the same organization"""
        # Get all brands the user has access to
        user_brand_ids = self.db.query(UserBrand.brand_id).filter(
            UserBrand.user_id == user.id
        ).subquery()
        
        # Count unique users with access to these brands
        return self.db.query(UserBrand.user_id).filter(
            UserBrand.brand_id.in_(user_brand_ids)
        ).distinct().count()

class LLMKeyManager:
    """Manages LLM API keys (user-provided and platform)"""
    
    def __init__(self, db: Session, encryption_key: str):
        self.db = db
        self.encryption_key = encryption_key
    
    def get_optimal_llm_provider(
        self, 
        user: User,
        query_type: str = "general"
    ) -> Dict[str, Any]:
        """Get optimal LLM provider based on cost and availability"""
        
        subscription = self.db.query(UserSubscription).filter(
            and_(
                UserSubscription.user_id == user.id,
                UserSubscription.status == "active"
            )
        ).first()
        
        if not subscription:
            return None
        
        # For BYOK plans, check user's keys
        if subscription.plan == SubscriptionPlan.BRING_YOUR_OWN_KEY:
            # Check user's available keys
            user_keys = self._get_user_api_keys(user)
            if user_keys:
                # Prefer Claude for quality, then GPT, then others
                priority = [LLMProvider.ANTHROPIC, LLMProvider.OPENAI, LLMProvider.GOOGLE, LLMProvider.PERPLEXITY]
                for provider in priority:
                    if provider in user_keys and user_keys[provider]["is_valid"]:
                        return {
                            "provider": provider,
                            "key_source": "user_provided",
                            "key": user_keys[provider]["key"]
                        }
        
        # For platform-managed plans, use cost-optimal selection
        elif subscription.plan in [SubscriptionPlan.PLATFORM_MANAGED, SubscriptionPlan.FREE]:
            # Get platform keys and their costs
            platform_keys = self._get_platform_keys()
            
            # For free tier, only use the most cost-effective
            if subscription.plan == SubscriptionPlan.FREE:
                # Use Gemini for free tier (typically cheapest)
                if LLMProvider.GOOGLE in platform_keys:
                    return {
                        "provider": LLMProvider.GOOGLE,
                        "key_source": "platform",
                        "key": platform_keys[LLMProvider.GOOGLE]["key"]
                    }
            
            # For platform-managed, select based on query type and cost
            if query_type == "informational":
                # Use cheaper models for simple queries
                priority = [LLMProvider.GOOGLE, LLMProvider.PERPLEXITY, LLMProvider.OPENAI, LLMProvider.ANTHROPIC]
            else:
                # Use better models for complex queries
                priority = [LLMProvider.ANTHROPIC, LLMProvider.OPENAI, LLMProvider.GOOGLE, LLMProvider.PERPLEXITY]
            
            for provider in priority:
                if provider in platform_keys and platform_keys[provider]["is_active"]:
                    return {
                        "provider": provider,
                        "key_source": "platform",
                        "key": platform_keys[provider]["key"]
                    }
        
        return None
    
    def _get_user_api_keys(self, user: User) -> Dict[LLMProvider, Dict[str, Any]]:
        """Get decrypted user API keys"""
        # Implementation would decrypt stored keys
        # Placeholder for now
        return {}
    
    def _get_platform_keys(self) -> Dict[LLMProvider, Dict[str, Any]]:
        """Get platform API keys"""
        # Implementation would decrypt platform keys
        # Placeholder for now
        return {}