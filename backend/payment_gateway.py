"""
Stripe Payment Gateway Integration
Handles payment processing, subscriptions, and billing
"""

import stripe
import os
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import structlog

from db_models import User, UserSubscription, SubscriptionPlan
from subscription_manager import PricingPlans

logger = structlog.get_logger()

class StripePaymentGateway:
    """Manages Stripe payment integration"""
    
    def __init__(self, config: Dict[str, Any]):
        self.stripe_secret_key = config.get('stripe_secret_key')
        self.stripe_webhook_secret = config.get('stripe_webhook_secret')
        self.stripe_publishable_key = config.get('stripe_publishable_key')
        
        # Initialize Stripe
        stripe.api_key = self.stripe_secret_key
        
        # Price IDs for different plans (configured in Stripe Dashboard)
        self.price_ids = {
            SubscriptionPlan.BRING_YOUR_OWN_KEY: {
                "monthly": config.get('stripe_byok_monthly_price_id'),
                "yearly": config.get('stripe_byok_yearly_price_id')
            },
            SubscriptionPlan.PLATFORM_MANAGED: {
                "monthly": config.get('stripe_platform_monthly_price_id'),
                "yearly": config.get('stripe_platform_yearly_price_id')
            }
        }
        
        # Product IDs for add-ons
        self.addon_price_ids = {
            "extra_seat": config.get('stripe_extra_seat_price_id'),
            "extra_brand": config.get('stripe_extra_brand_price_id')
        }
    
    async def create_customer(self, user: User) -> str:
        """Create a Stripe customer for a user"""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.full_name,
                metadata={
                    "user_id": str(user.id),
                    "company": user.company or ""
                }
            )
            
            logger.info(f"Created Stripe customer {customer.id} for user {user.id}")
            return customer.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment setup failed: {str(e)}"
            )
    
    async def create_checkout_session(
        self,
        user: User,
        plan: SubscriptionPlan,
        billing_cycle: str = "monthly",
        success_url: str = None,
        cancel_url: str = None,
        extra_seats: int = 0,
        extra_brands: int = 0
    ) -> Dict[str, Any]:
        """Create a Stripe checkout session for subscription"""
        
        # Get or create customer
        customer_id = await self._get_or_create_customer(user)
        
        # Build line items
        line_items = []
        
        # Main subscription
        if plan != SubscriptionPlan.FREE:
            price_id = self.price_ids.get(plan, {}).get(billing_cycle)
            if not price_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid plan or billing cycle"
                )
            
            line_items.append({
                "price": price_id,
                "quantity": 1
            })
        
        # Add-on seats
        if extra_seats > 0 and self.addon_price_ids.get("extra_seat"):
            line_items.append({
                "price": self.addon_price_ids["extra_seat"],
                "quantity": extra_seats
            })
        
        # Add-on brands
        if extra_brands > 0 and self.addon_price_ids.get("extra_brand"):
            line_items.append({
                "price": self.addon_price_ids["extra_brand"],
                "quantity": extra_brands
            })
        
        try:
            # Create checkout session
            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=line_items,
                mode="subscription",
                success_url=success_url or f"{os.getenv('FRONTEND_URL')}/subscription/success",
                cancel_url=cancel_url or f"{os.getenv('FRONTEND_URL')}/subscription/cancel",
                metadata={
                    "user_id": str(user.id),
                    "plan": plan.value,
                    "extra_seats": str(extra_seats),
                    "extra_brands": str(extra_brands)
                },
                subscription_data={
                    "metadata": {
                        "user_id": str(user.id),
                        "plan": plan.value
                    }
                },
                allow_promotion_codes=True,
                billing_address_collection="required"
            )
            
            logger.info(f"Created checkout session {session.id} for user {user.id}")
            
            return {
                "checkout_url": session.url,
                "session_id": session.id,
                "publishable_key": self.stripe_publishable_key
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Checkout session creation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Checkout setup failed: {str(e)}"
            )
    
    async def create_billing_portal_session(
        self,
        user: User,
        subscription: UserSubscription,
        return_url: str = None
    ) -> str:
        """Create a Stripe billing portal session for subscription management"""
        
        if not subscription.stripe_customer_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No payment method on file"
            )
        
        try:
            session = stripe.billing_portal.Session.create(
                customer=subscription.stripe_customer_id,
                return_url=return_url or f"{os.getenv('FRONTEND_URL')}/subscription"
            )
            
            return session.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Billing portal session creation failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to access billing portal"
            )
    
    async def handle_webhook(
        self,
        payload: bytes,
        signature: str,
        db: Session
    ) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload,
                signature,
                self.stripe_webhook_secret
            )
            
            logger.info(f"Received Stripe webhook: {event['type']}")
            
            # Handle different event types
            if event['type'] == 'checkout.session.completed':
                await self._handle_checkout_completed(event['data']['object'], db)
                
            elif event['type'] == 'customer.subscription.created':
                await self._handle_subscription_created(event['data']['object'], db)
                
            elif event['type'] == 'customer.subscription.updated':
                await self._handle_subscription_updated(event['data']['object'], db)
                
            elif event['type'] == 'customer.subscription.deleted':
                await self._handle_subscription_cancelled(event['data']['object'], db)
                
            elif event['type'] == 'invoice.payment_succeeded':
                await self._handle_payment_succeeded(event['data']['object'], db)
                
            elif event['type'] == 'invoice.payment_failed':
                await self._handle_payment_failed(event['data']['object'], db)
            
            return {"status": "success"}
            
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid webhook signature")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature"
            )
        except Exception as e:
            logger.error(f"Webhook processing failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Webhook processing failed"
            )
    
    async def cancel_subscription(
        self,
        subscription: UserSubscription,
        immediately: bool = False
    ) -> bool:
        """Cancel a Stripe subscription"""
        
        if not subscription.stripe_subscription_id:
            return False
        
        try:
            if immediately:
                # Cancel immediately
                stripe_sub = stripe.Subscription.delete(
                    subscription.stripe_subscription_id
                )
            else:
                # Cancel at end of billing period
                stripe_sub = stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
            
            logger.info(f"Cancelled Stripe subscription {subscription.stripe_subscription_id}")
            return True
            
        except stripe.error.StripeError as e:
            logger.error(f"Subscription cancellation failed: {e}")
            return False
    
    async def update_subscription(
        self,
        subscription: UserSubscription,
        new_plan: SubscriptionPlan = None,
        new_billing_cycle: str = None,
        extra_seats: int = None,
        extra_brands: int = None
    ) -> bool:
        """Update a Stripe subscription"""
        
        if not subscription.stripe_subscription_id:
            return False
        
        try:
            # Get current subscription
            stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)
            
            # Build update params
            update_params = {}
            
            # Update plan if changed
            if new_plan and new_plan != subscription.plan:
                billing_cycle = new_billing_cycle or subscription.billing_cycle
                new_price_id = self.price_ids.get(new_plan, {}).get(billing_cycle)
                
                if new_price_id:
                    # Replace the subscription item
                    update_params['items'] = [{
                        'id': stripe_sub['items']['data'][0]['id'],
                        'price': new_price_id
                    }]
            
            # Update metadata
            update_params['metadata'] = {
                'plan': (new_plan or subscription.plan).value,
                'extra_seats': str(extra_seats or 0),
                'extra_brands': str(extra_brands or 0)
            }
            
            # Apply updates
            stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                **update_params
            )
            
            logger.info(f"Updated Stripe subscription {subscription.stripe_subscription_id}")
            return True
            
        except stripe.error.StripeError as e:
            logger.error(f"Subscription update failed: {e}")
            return False
    
    async def record_usage(
        self,
        subscription: UserSubscription,
        quantity: int,
        description: str = "Analysis overage"
    ):
        """Record metered usage for overage billing"""
        
        if not subscription.stripe_subscription_id or not subscription.overage_allowed:
            return
        
        try:
            # Create usage record
            stripe.SubscriptionItem.create_usage_record(
                subscription.stripe_subscription_id,
                quantity=quantity,
                timestamp=int(datetime.utcnow().timestamp()),
                action="increment"
            )
            
            logger.info(f"Recorded {quantity} usage for subscription {subscription.id}")
            
        except stripe.error.StripeError as e:
            logger.error(f"Usage recording failed: {e}")
    
    async def _get_or_create_customer(self, user: User) -> str:
        """Get existing Stripe customer or create new one"""
        
        # Check if user already has a subscription with customer ID
        existing_sub = user.subscriptions.filter(
            UserSubscription.stripe_customer_id.isnot(None)
        ).first()
        
        if existing_sub and existing_sub.stripe_customer_id:
            return existing_sub.stripe_customer_id
        
        # Create new customer
        return await self.create_customer(user)
    
    async def _handle_checkout_completed(self, session: Dict, db: Session):
        """Handle completed checkout session"""
        
        user_id = session['metadata'].get('user_id')
        if not user_id:
            logger.error("No user_id in checkout session metadata")
            return
        
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.error(f"User {user_id} not found")
            return
        
        # Update user's subscription with Stripe IDs
        subscription = db.query(UserSubscription).filter(
            UserSubscription.user_id == user_id,
            UserSubscription.status == "pending"
        ).first()
        
        if subscription:
            subscription.stripe_customer_id = session['customer']
            subscription.stripe_subscription_id = session['subscription']
            subscription.status = "active"
            db.commit()
            
            logger.info(f"Activated subscription for user {user_id}")
    
    async def _handle_subscription_created(self, stripe_sub: Dict, db: Session):
        """Handle subscription creation from Stripe"""
        
        user_id = stripe_sub['metadata'].get('user_id')
        if not user_id:
            return
        
        # Check if subscription already exists
        existing = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == stripe_sub['id']
        ).first()
        
        if existing:
            return
        
        # Create subscription record
        plan_str = stripe_sub['metadata'].get('plan', 'platform_managed')
        plan = SubscriptionPlan(plan_str)
        
        subscription = UserSubscription(
            user_id=user_id,
            plan=plan,
            status="active",
            stripe_customer_id=stripe_sub['customer'],
            stripe_subscription_id=stripe_sub['id'],
            current_period_start=datetime.fromtimestamp(stripe_sub['current_period_start']),
            current_period_end=datetime.fromtimestamp(stripe_sub['current_period_end'])
        )
        
        # Set features based on plan
        plan_details = PricingPlans.get_plan_details(plan)
        features = plan_details["features"]
        
        subscription.monthly_analyses_limit = features.get("monthly_analyses_limit")
        subscription.user_seats = features.get("user_seats", 1)
        subscription.brands_limit = features.get("brands_limit", 1)
        
        db.add(subscription)
        db.commit()
        
        logger.info(f"Created subscription record for Stripe subscription {stripe_sub['id']}")
    
    async def _handle_subscription_updated(self, stripe_sub: Dict, db: Session):
        """Handle subscription updates from Stripe"""
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == stripe_sub['id']
        ).first()
        
        if not subscription:
            logger.warning(f"Subscription {stripe_sub['id']} not found")
            return
        
        # Update subscription details
        subscription.current_period_start = datetime.fromtimestamp(stripe_sub['current_period_start'])
        subscription.current_period_end = datetime.fromtimestamp(stripe_sub['current_period_end'])
        
        # Update status
        if stripe_sub['status'] == 'active':
            subscription.status = 'active'
        elif stripe_sub['status'] in ['past_due', 'unpaid']:
            subscription.status = 'past_due'
        elif stripe_sub['status'] == 'canceled':
            subscription.status = 'cancelled'
        
        db.commit()
        
        logger.info(f"Updated subscription {subscription.id} from Stripe")
    
    async def _handle_subscription_cancelled(self, stripe_sub: Dict, db: Session):
        """Handle subscription cancellation from Stripe"""
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == stripe_sub['id']
        ).first()
        
        if not subscription:
            return
        
        subscription.status = 'cancelled'
        subscription.cancelled_at = datetime.utcnow()
        subscription.expires_at = datetime.fromtimestamp(stripe_sub['ended_at']) if stripe_sub.get('ended_at') else None
        
        db.commit()
        
        logger.info(f"Cancelled subscription {subscription.id}")
    
    async def _handle_payment_succeeded(self, invoice: Dict, db: Session):
        """Handle successful payment"""
        
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == subscription_id
        ).first()
        
        if subscription:
            # Reset monthly usage on successful payment
            subscription.analyses_used_this_month = 0
            subscription.status = 'active'
            db.commit()
            
            logger.info(f"Payment succeeded for subscription {subscription.id}")
    
    async def _handle_payment_failed(self, invoice: Dict, db: Session):
        """Handle failed payment"""
        
        subscription_id = invoice.get('subscription')
        if not subscription_id:
            return
        
        subscription = db.query(UserSubscription).filter(
            UserSubscription.stripe_subscription_id == subscription_id
        ).first()
        
        if subscription:
            subscription.status = 'past_due'
            db.commit()
            
            logger.warning(f"Payment failed for subscription {subscription.id}")
            
            # TODO: Send notification email to user

class PaymentService:
    """High-level payment service combining Stripe and subscription management"""
    
    def __init__(self, stripe_gateway: StripePaymentGateway, db: Session):
        self.stripe = stripe_gateway
        self.db = db
    
    async def upgrade_subscription(
        self,
        user: User,
        new_plan: SubscriptionPlan,
        billing_cycle: str = "monthly"
    ) -> Dict[str, Any]:
        """Upgrade user's subscription"""
        
        current_sub = user.subscriptions.filter(
            UserSubscription.status == "active"
        ).first()
        
        if current_sub and current_sub.stripe_subscription_id:
            # Update existing subscription
            success = await self.stripe.update_subscription(
                current_sub,
                new_plan=new_plan,
                new_billing_cycle=billing_cycle
            )
            
            if success:
                current_sub.plan = new_plan
                self.db.commit()
                
                return {
                    "success": True,
                    "message": "Subscription upgraded successfully"
                }
            else:
                return {
                    "success": False,
                    "message": "Failed to upgrade subscription"
                }
        else:
            # Create new subscription
            checkout_data = await self.stripe.create_checkout_session(
                user,
                plan=new_plan,
                billing_cycle=billing_cycle
            )
            
            return {
                "success": True,
                "checkout_url": checkout_data["checkout_url"],
                "message": "Redirect to checkout"
            }
    
    async def add_extras(
        self,
        user: User,
        extra_seats: int = 0,
        extra_brands: int = 0
    ) -> Dict[str, Any]:
        """Add extra seats or brands to subscription"""
        
        subscription = user.subscriptions.filter(
            UserSubscription.status == "active"
        ).first()
        
        if not subscription:
            return {
                "success": False,
                "message": "No active subscription"
            }
        
        if subscription.stripe_subscription_id:
            # Add to existing subscription
            success = await self.stripe.update_subscription(
                subscription,
                extra_seats=extra_seats,
                extra_brands=extra_brands
            )
            
            if success:
                subscription.user_seats += extra_seats
                subscription.brands_limit += extra_brands
                self.db.commit()
                
                return {
                    "success": True,
                    "message": "Extras added successfully"
                }
        
        return {
            "success": False,
            "message": "Unable to add extras"
        }