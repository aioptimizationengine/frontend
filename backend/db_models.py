"""
Complete Database Models with All Missing Tables
Includes user subscriptions, API usage, error logs, admin activity, and user improvements
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, JSON, Text, 
    ForeignKey, CheckConstraint, Index, UniqueConstraint, Enum
)
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import enum

Base = declarative_base()

# Enums for better type safety
class SubscriptionPlan(enum.Enum):
    FREE = "free"
    BRING_YOUR_OWN_KEY = "bring_your_own_key"
    PLATFORM_MANAGED = "platform_managed"
    ENTERPRISE = "enterprise"

class UserRole(enum.Enum):
    CLIENT = "client"
    ADMIN = "admin"

class LLMProvider(enum.Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    PERPLEXITY = "perplexity"

# Existing models with updates...

class User(Base):
    """Enhanced User model with OAuth and subscription support"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth users
    full_name = Column(String(200), nullable=True)
    company = Column(String(200), nullable=True)
    
    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # google, etc.
    oauth_id = Column(String(255), nullable=True)
    oauth_refresh_token = Column(Text, nullable=True)
    
    # Enhanced user settings (use PostgreSQL native enum)
    role = Column(ENUM('client', 'admin', 'CLIENT', 'ADMIN', name='user_role'), default='client')
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(100), nullable=True)
    
    # Password reset
    reset_token = Column(String(100), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login = Column(DateTime, nullable=True)
    last_activity = Column(DateTime, nullable=True)
    
    # Preferences
    email_notifications = Column(Boolean, default=True)
    weekly_reports = Column(Boolean, default=True)
    timezone = Column(String(50), default="UTC")
    
    @property
    def normalized_role(self):
        """Get role in lowercase for consistency"""
        return self.role.lower() if self.role else 'client'
    
    # Relationships
    user_brands = relationship("UserBrand", back_populates="user", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("UserSubscription", back_populates="user", cascade="all, delete-orphan")
    api_usage = relationship("ApiUsage", back_populates="user", cascade="all, delete-orphan")
    user_improvements = relationship("UserImprovement", back_populates="user", foreign_keys="UserImprovement.user_id", cascade="all, delete-orphan")
    admin_logs = relationship("AdminActivityLog", foreign_keys="AdminActivityLog.admin_user_id", cascade="all, delete-orphan")

class UserSubscription(Base):
    """User subscription management"""
    __tablename__ = "user_subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Subscription details
    plan = Column(Enum(SubscriptionPlan), nullable=False)
    status = Column(String(50), default="active")  # active, cancelled, expired, trial
    
    # Stripe integration
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)
    stripe_payment_method_id = Column(String(255), nullable=True)
    
    # Pricing
    monthly_price = Column(Float, nullable=False)
    yearly_price = Column(Float, nullable=True)
    billing_cycle = Column(String(20), default="monthly")  # monthly, yearly
    
    # Limits and quotas
    monthly_analyses_limit = Column(Integer, nullable=True)  # NULL = unlimited
    analyses_used_this_month = Column(Integer, default=0)
    user_seats = Column(Integer, default=1)
    brands_limit = Column(Integer, default=1)
    competitor_analyses_limit = Column(Integer, default=0)
    server_log_gb_limit = Column(Float, default=0.0)
    
    # Features
    has_recommendations = Column(Boolean, default=True)
    has_detailed_metrics = Column(Boolean, default=True)
    has_user_intent_mapping = Column(Boolean, default=True)
    has_export_features = Column(Boolean, default=False)
    has_api_access = Column(Boolean, default=False)
    
    # Dates
    started_at = Column(DateTime, default=func.now())
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Overage handling
    overage_allowed = Column(Boolean, default=False)
    overage_rate_per_analysis = Column(Float, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    
    __table_args__ = (
        Index('ix_user_subscriptions_user_status', 'user_id', 'status'),
        Index('ix_user_subscriptions_stripe', 'stripe_customer_id', 'stripe_subscription_id'),
    )

class ApiUsage(Base):
    """Track API usage for billing and analytics"""
    __tablename__ = "api_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # API details
    endpoint = Column(String(200), nullable=False)
    method = Column(String(10), nullable=False)
    
    # LLM usage
    llm_provider = Column(Enum(LLMProvider), nullable=True)
    llm_model = Column(String(100), nullable=True)
    api_key_source = Column(String(50), nullable=True)  # user_provided, platform
    
    # Tokens and cost
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    estimated_cost = Column(Float, default=0.0)
    
    # Request details
    request_data = Column(JSON, nullable=True)
    response_status = Column(Integer, nullable=False)
    response_time_ms = Column(Integer, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_usage")
    
    __table_args__ = (
        Index('ix_api_usage_user_date', 'user_id', 'created_at'),
        Index('ix_api_usage_provider', 'llm_provider', 'created_at'),
    )

class ErrorLog(Base):
    """System error logging"""
    __tablename__ = "error_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Error details
    error_type = Column(String(100), nullable=False)
    error_message = Column(Text, nullable=False)
    error_code = Column(String(50), nullable=True)
    stack_trace = Column(Text, nullable=True)
    
    # Context
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    endpoint = Column(String(200), nullable=True)
    request_id = Column(String(100), nullable=True)
    request_data = Column(JSON, nullable=True)
    
    # Categorization
    severity = Column(String(20), default="error")  # debug, info, warning, error, critical
    category = Column(String(50), nullable=True)  # api, llm, payment, auth, etc.
    
    # Resolution
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_error_logs_severity_date', 'severity', 'created_at'),
        Index('ix_error_logs_user', 'user_id'),
        Index('ix_error_logs_unresolved', 'is_resolved', 'created_at'),
    )

class AdminActivityLog(Base):
    """Track admin actions for audit trail"""
    __tablename__ = "admin_activity_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Action details
    action = Column(String(100), nullable=False)  # user_disabled, subscription_modified, etc.
    resource_type = Column(String(50), nullable=False)  # user, subscription, brand, etc.
    resource_id = Column(String(100), nullable=True)
    
    # Changes
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    
    # Additional context
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    admin_user = relationship("User", foreign_keys=[admin_user_id], overlaps="admin_logs")
    
    __table_args__ = (
        Index('ix_admin_logs_admin_date', 'admin_user_id', 'created_at'),
        Index('ix_admin_logs_action', 'action', 'created_at'),
    )

class UserImprovement(Base):
    """Track user-suggested improvements and feature requests"""
    __tablename__ = "user_improvements"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Improvement details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=True)  # feature, bug, enhancement, etc.
    
    # Status tracking
    status = Column(String(50), default="submitted")  # submitted, reviewing, planned, completed, rejected
    priority = Column(String(20), nullable=True)  # low, medium, high, critical
    
    # Admin response
    admin_notes = Column(Text, nullable=True)
    reviewed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    
    # Voting
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="user_improvements", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by], overlaps="admin_logs")
    
    __table_args__ = (
        Index('ix_improvements_status', 'status', 'created_at'),
        Index('ix_improvements_user', 'user_id'),
    )

class UserApiKey(Base):
    """Store user-provided API keys for LLM services"""
    __tablename__ = "user_api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Provider details
    provider = Column(Enum(LLMProvider), nullable=False)
    key_name = Column(String(100), nullable=False)
    
    # Encrypted key storage
    encrypted_key = Column(Text, nullable=False)
    key_hint = Column(String(20), nullable=True)  # Last 4 chars for identification
    
    # Validation
    is_valid = Column(Boolean, default=True)
    last_validated = Column(DateTime, nullable=True)
    validation_error = Column(Text, nullable=True)
    
    # Usage tracking
    last_used = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'provider', name='unique_user_provider_key'),
        Index('ix_user_api_keys_user_provider', 'user_id', 'provider'),
    )

class ServerLogUpload(Base):
    """Track server log uploads for analysis"""
    __tablename__ = "server_log_uploads"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False)
    
    # File details
    filename = Column(String(255), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_format = Column(String(50), nullable=False)  # nginx, apache, cloudflare, etc.
    
    # Processing status
    status = Column(String(50), default="uploaded")  # uploaded, processing, completed, failed
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    
    # Analysis results
    total_requests = Column(Integer, nullable=True)
    bot_requests = Column(Integer, nullable=True)
    unique_bots = Column(Integer, nullable=True)
    date_range_start = Column(DateTime, nullable=True)
    date_range_end = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_log_uploads_user_date', 'user_id', 'created_at'),
        Index('ix_log_uploads_status', 'status'),
    )

class PlatformApiKey(Base):
    """Platform-managed API keys for LLM services"""
    __tablename__ = "platform_api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Provider details
    provider = Column(Enum(LLMProvider), nullable=False, unique=True)
    encrypted_key = Column(Text, nullable=False)
    
    # Usage limits
    monthly_token_limit = Column(Integer, nullable=True)
    tokens_used_this_month = Column(Integer, default=0)
    
    # Cost tracking
    cost_per_1k_input_tokens = Column(Float, nullable=True)
    cost_per_1k_output_tokens = Column(Float, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_validated = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

# Update existing models with any missing relationships or fields...

class Brand(Base):
    """Brand model with server log support"""
    __tablename__ = "brands"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True, index=True)
    website_url = Column(String(500), nullable=True)
    industry = Column(String(100), nullable=True)
    tracking_enabled = Column(Boolean, default=False)
    tracking_script_installed = Column(Boolean, default=False)
    api_key = Column(String(100), nullable=True, unique=True)
    
    # Server log configuration
    log_format = Column(String(50), nullable=True)  # nginx, apache, cloudflare
    log_timezone = Column(String(50), default="UTC")
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    analyses = relationship("Analysis", back_populates="brand", cascade="all, delete-orphan")
    metrics_history = relationship("MetricHistory", back_populates="brand", cascade="all, delete-orphan")
    bot_visits = relationship("BotVisit", back_populates="brand", cascade="all, delete-orphan")
    tracking_events = relationship("TrackingEvent", back_populates="brand", cascade="all, delete-orphan")
    user_brands = relationship("UserBrand", back_populates="brand", cascade="all, delete-orphan")
    log_uploads = relationship("ServerLogUpload", back_populates="brand", cascade="all, delete-orphan")

# Add relationships to ServerLogUpload
ServerLogUpload.user = relationship("User")
ServerLogUpload.brand = relationship("Brand", back_populates="log_uploads")

class Analysis(Base):
    """Analysis model with FIXED status constraints"""
    __tablename__ = "analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False, index=True)
    status = Column(String(50), nullable=False)
    analysis_type = Column(String(50), default="comprehensive")
    data_source = Column(String(50), default="real")
    
    # Analysis data
    metrics = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    
    # Performance metrics
    total_bot_visits_analyzed = Column(Integer, default=0)
    citation_frequency = Column(Float, default=0.0)
    processing_time = Column(Float, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # FIXED: Updated constraint to include all test statuses
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'recovery_test', 'degradation_test')",
            name="check_analysis_status"
        ),
        Index('ix_analyses_brand_created', 'brand_id', 'created_at'),
        Index('ix_analyses_status', 'status'),
    )
    
    # Relationships
    brand = relationship("Brand", back_populates="analyses")
    metrics_history = relationship("MetricHistory", back_populates="analysis", cascade="all, delete-orphan")

class MetricHistory(Base):
    """Metric history tracking"""
    __tablename__ = "metrics_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False, index=True)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=True, index=True)
    
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    platform = Column(String(50), nullable=True)  # anthropic, openai, etc.
    data_source = Column(String(50), default="real")
    
    recorded_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_metrics_brand_name_date', 'brand_id', 'metric_name', 'recorded_at'),
        Index('ix_metrics_analysis', 'analysis_id'),
    )
    
    # Relationships
    brand = relationship("Brand", back_populates="metrics_history")
    analysis = relationship("Analysis", back_populates="metrics_history")

class UserBrand(Base):
    """User-Brand relationship"""
    __tablename__ = "user_brands"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False)
    role = Column(String(50), default="viewer")  # viewer, editor, admin
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        UniqueConstraint('user_id', 'brand_id', name='unique_user_brand'),
        CheckConstraint(
            "role IN ('viewer', 'editor', 'admin')",
            name="check_user_brand_role"
        ),
    )
    
    # Relationships
    user = relationship("User", back_populates="user_brands")
    brand = relationship("Brand", back_populates="user_brands")

class ApiKey(Base):
    """API key management"""
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    key_hash = Column(String(255), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    
    # Permissions
    permissions = Column(JSON, default=list)  # List of allowed operations
    rate_limit = Column(Integer, default=1000)  # Requests per hour
    
    # Status
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime, default=func.now())
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="api_keys")

class BotVisit(Base):
    """Bot visit tracking"""
    __tablename__ = "bot_visits"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False, index=True)
    
    # Bot information
    bot_name = Column(String(100), nullable=False)
    platform = Column(String(50), nullable=True)  # anthropic, openai, google, etc.
    user_agent = Column(Text, nullable=True)
    
    # Visit details
    timestamp = Column(DateTime, default=func.now())
    ip_address = Column(String(45), nullable=True)  # IPv6 compatible
    path = Column(String(500), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time = Column(Float, nullable=True)
    
    # Analysis results
    brand_mentioned = Column(Boolean, default=False)
    content_type = Column(String(50), nullable=True)
    
    __table_args__ = (
        Index('ix_bot_visits_brand_timestamp', 'brand_id', 'timestamp'),
        Index('ix_bot_visits_bot_platform', 'bot_name', 'platform'),
        Index('ix_bot_visits_timestamp', 'timestamp'),
    )
    
    # Relationships
    brand = relationship("Brand", back_populates="bot_visits")

class TrackingEvent(Base):
    """Real-time tracking events - FIXED metadata conflict"""
    __tablename__ = "tracking_events"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False, index=True)
    
    # Event details
    event_type = Column(String(50), nullable=False)  # pageview, engagement, etc.
    session_id = Column(String(100), nullable=True)
    sequence_number = Column(Integer, nullable=True)
    
    # Bot information
    bot_name = Column(String(100), nullable=True)
    platform = Column(String(50), nullable=True)
    
    # Page details
    page_url = Column(String(1000), nullable=True)
    page_title = Column(String(500), nullable=True)
    
    # Engagement metrics
    time_on_page = Column(Integer, nullable=True)  # seconds
    scroll_depth = Column(Integer, nullable=True)  # percentage
    
    # FIXED: Renamed from 'metadata' to 'event_metadata' to avoid SQLAlchemy conflict
    event_metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_tracking_events_brand_timestamp', 'brand_id', 'timestamp'),
        Index('ix_tracking_events_session', 'session_id'),
        Index('ix_tracking_events_type', 'event_type'),
    )
    
    # Relationships
    brand = relationship("Brand", back_populates="tracking_events")

class PerformanceMetrics(Base):
    """System performance metrics"""
    __tablename__ = "performance_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Metric details
    metric_name = Column(String(100), nullable=False)
    metric_value = Column(Float, nullable=False)
    metric_unit = Column(String(20), nullable=True)  # ms, %, count, etc.
    
    # Context
    operation = Column(String(100), nullable=True)
    endpoint = Column(String(200), nullable=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    
    # Timing
    recorded_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_performance_metrics_name_date', 'metric_name', 'recorded_at'),
        Index('ix_performance_metrics_operation', 'operation'),
    )

class ScheduledAnalysis(Base):
    """Scheduled analysis jobs"""
    __tablename__ = "scheduled_analyses"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Schedule details
    frequency = Column(String(20), nullable=False)  # daily, weekly, monthly
    next_run = Column(DateTime, nullable=False)
    last_run = Column(DateTime, nullable=True)
    
    # Configuration
    analysis_type = Column(String(50), default="comprehensive")
    config = Column(JSON, nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_scheduled_analyses_next_run', 'next_run'),
        Index('ix_scheduled_analyses_brand_user', 'brand_id', 'user_id'),
    )

class TrackingAlert(Base):
    """Tracking alerts and notifications"""
    __tablename__ = "tracking_alerts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Alert details
    alert_type = Column(String(50), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=True)
    severity = Column(String(20), default="info")
    
    # Status
    is_read = Column(Boolean, default=False)
    is_resolved = Column(Boolean, default=False)
    
    # Timing
    created_at = Column(DateTime, default=func.now())
    resolved_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('ix_tracking_alerts_user_unread', 'user_id', 'is_read'),
        Index('ix_tracking_alerts_brand_created', 'brand_id', 'created_at'),
    )

class DataExport(Base):
    """Data export jobs"""
    __tablename__ = "data_exports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True)
    
    # Export details
    export_type = Column(String(50), nullable=False)  # csv, json, pdf
    data_type = Column(String(50), nullable=False)    # metrics, visits, analyses
    date_range = Column(JSON, nullable=True)
    
    # Status
    status = Column(String(20), default="pending")
    file_path = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)
    
    # Timing
    created_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    __table_args__ = (
        Index('ix_data_exports_user_status', 'user_id', 'status'),
        Index('ix_data_exports_created', 'created_at'),
    )

class LlmUsage(Base):
    """LLM API usage tracking"""
    __tablename__ = "llm_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=True)
    
    # API details
    provider = Column(String(50), nullable=False)  # anthropic, openai
    model = Column(String(100), nullable=False)
    endpoint = Column(String(100), nullable=True)
    
    # Usage metrics
    tokens_input = Column(Integer, default=0)
    tokens_output = Column(Integer, default=0)
    cost_usd = Column(Float, nullable=True)
    response_time = Column(Float, nullable=True)
    
    # Request details
    request_type = Column(String(50), nullable=True)  # analysis, query_test, etc.
    success = Column(Boolean, default=True)
    error_message = Column(Text, nullable=True)
    
    # Timing
    timestamp = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_llm_usage_provider_date', 'provider', 'timestamp'),
        Index('ix_llm_usage_user', 'user_id'),
    )

class QueryTest(Base):
    """Query testing results"""
    __tablename__ = "query_tests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(UUID(as_uuid=True), ForeignKey("brands.id"), nullable=False)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id"), nullable=True)
    
    # Query details
    query_text = Column(Text, nullable=False)
    query_type = Column(String(50), nullable=True)
    
    # Test results
    llm_provider = Column(String(50), nullable=False)
    response_text = Column(Text, nullable=True)
    brand_mentioned = Column(Boolean, default=False)
    relevance_score = Column(Float, nullable=True)
    
    # Timing
    response_time = Column(Float, nullable=True)
    tested_at = Column(DateTime, default=func.now())
    
    __table_args__ = (
        Index('ix_query_tests_brand_date', 'brand_id', 'tested_at'),
        Index('ix_query_tests_provider', 'llm_provider'),
    )