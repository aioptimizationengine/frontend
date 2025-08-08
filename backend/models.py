"""
Updated API Models with All New Features
Includes models for OAuth, Subscriptions, API Keys, Admin functions, etc.
"""

from pydantic import BaseModel, Field, field_validator, HttpUrl, EmailStr
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum
import uuid

# Enums
class UserRoleEnum(str, Enum):
    CLIENT = "client"
    ADMIN = "admin"

class SubscriptionPlanEnum(str, Enum):
    FREE = "free"
    BRING_YOUR_OWN_KEY = "bring_your_own_key"
    PLATFORM_MANAGED = "platform_managed"
    ENTERPRISE = "enterprise"

class LLMProviderEnum(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    PERPLEXITY = "perplexity"

class BillingCycleEnum(str, Enum):
    MONTHLY = "monthly"
    YEARLY = "yearly"

# Base Request Models
class BrandAnalysisRequest(BaseModel):
    brand_name: str = Field(min_length=2, max_length=50)
    website_url: Optional[str] = None
    product_categories: List[str] = Field(min_length=1, max_length=10)
    content_sample: Optional[str] = Field(default="", max_length=10000)
    competitor_names: Optional[List[str]] = Field(default=[], max_length=5)

    @field_validator('brand_name')
    @classmethod
    def validate_brand_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Brand name must be at least 2 characters')
        return v.strip()

    @field_validator('product_categories')
    @classmethod
    def validate_categories(cls, v):
        if not v or len(v) == 0:
            raise ValueError('At least one product category is required')
        return [cat.strip() for cat in v if cat.strip()]

    @field_validator('website_url')
    @classmethod
    def validate_url(cls, v):
        if v is None or v.strip() == "":
            return None
        v = v.strip()
        if not v.startswith(('http://', 'https://')):
            return f'https://{v}'
        return v

class OptimizationMetricsRequest(BaseModel):
    brand_name: str = Field(min_length=2, max_length=50)
    content_sample: Optional[str] = Field(default="", max_length=10000)

    @field_validator('brand_name')
    @classmethod
    def validate_brand_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Brand name must be at least 2 characters')
        return v.strip()

class QueryAnalysisRequest(BaseModel):
    brand_name: str = Field(min_length=2, max_length=50)
    product_categories: Optional[List[str]] = Field(default=[], max_length=10)

    @field_validator('brand_name')
    @classmethod
    def validate_brand_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Brand name must be at least 2 characters')
        return v.strip()

    @field_validator('product_categories')
    @classmethod
    def validate_categories(cls, v):
        if v is None:
            return []
        return [cat.strip() for cat in v if cat.strip()]

# Authentication Models
class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = Field(None, min_length=8)
    full_name: Optional[str] = Field(None, max_length=200)
    company: Optional[str] = Field(None, max_length=200)
    oauth_token: Optional[str] = None

class UserLoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    oauth_token: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    token: str = Field(min_length=32, max_length=32)
    new_password: str = Field(min_length=8)

# API Key Models
class APIKeyAddRequest(BaseModel):
    provider: LLMProviderEnum
    api_key: str = Field(min_length=10)
    key_name: Optional[str] = Field(None, max_length=100)

class APIKeyResponse(BaseModel):
    provider: str
    key_name: str
    key_hint: str
    is_valid: bool
    last_validated: Optional[datetime]
    last_used: Optional[datetime]
    usage_count: int
    created_at: datetime

# Subscription Models
class SubscriptionCheckoutRequest(BaseModel):
    plan: SubscriptionPlanEnum
    billing_cycle: BillingCycleEnum = BillingCycleEnum.MONTHLY
    extra_seats: int = Field(0, ge=0, le=100)
    extra_brands: int = Field(0, ge=0, le=100)

class SubscriptionResponse(BaseModel):
    plan: str
    status: str
    billing_cycle: str
    current_period_end: Optional[datetime]
    days_remaining: int
    usage: Dict[str, Any]
    features: Dict[str, bool]

# User Management Models
class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=200)
    company: Optional[str] = Field(None, max_length=200)
    timezone: Optional[str] = Field(None, max_length=50)
    email_notifications: Optional[bool] = None
    weekly_reports: Optional[bool] = None

class UserImprovementRequest(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    description: str = Field(min_length=20, max_length=5000)
    category: Optional[str] = Field(None, pattern="^(feature|bug|enhancement|other)$")

# Admin Models
class UserToggleStatusRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)

class UserRoleUpdateRequest(BaseModel):
    role: UserRoleEnum

class BulkUserActionRequest(BaseModel):
    user_ids: List[str] = Field(min_length=1, max_length=100)
    action: str = Field(pattern="^(enable|disable|delete_soft)$")

class SubscriptionUpdateRequest(BaseModel):
    plan: Optional[SubscriptionPlanEnum] = None
    status: Optional[str] = None
    monthly_analyses_limit: Optional[int] = Field(None, ge=0)
    user_seats: Optional[int] = Field(None, ge=1, le=1000)
    brands_limit: Optional[int] = Field(None, ge=1, le=1000)
    overage_allowed: Optional[bool] = None

class ImprovementUpdateRequest(BaseModel):
    status: str = Field(pattern="^(submitted|reviewing|planned|completed|rejected)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    admin_notes: Optional[str] = Field(None, max_length=2000)

# Log Analysis Models
class LogUploadRequest(BaseModel):
    brand_id: str
    log_format: str = Field(pattern="^(nginx|apache|cloudflare|aws-alb|custom)$")
    timezone: str = Field(default="UTC", max_length=50)

class LogAnalysisSampleRequest(BaseModel):
    log_sample: str = Field(max_length=10000)
    log_format: str = Field(pattern="^(nginx|apache|cloudflare|aws-alb|custom)$")

# Competitor Analysis Models
class CompetitorAnalysisRequest(BaseModel):
    brand_name: str = Field(min_length=2, max_length=50)
    competitor_urls: List[HttpUrl] = Field(min_length=1, max_length=10)

# Response Models
class HealthResponse(BaseModel):
    status: str = "healthy"
    timestamp: str
    version: str = "2.0.0"
    database: str = "connected"
    redis: str = "connected"
    services: Dict[str, Any] = Field(default_factory=dict)

class StandardResponse(BaseModel):
    success: bool = True
    data: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
    timestamp: Optional[str] = None

class ErrorResponse(BaseModel):
    success: bool = False
    error: Dict[str, Any]

    def model_dump(self, **kwargs):
        """Pydantic v2 compatible method"""
        return {
            "success": self.success,
            "error": self.error
        }

class PaginatedResponse(BaseModel):
    success: bool = True
    data: List[Any]
    total: int
    skip: int
    limit: int
    has_more: bool

# Analytics Response Models
class MetricsResponse(BaseModel):
    chunk_retrieval_frequency: float
    embedding_relevance_score: float
    attribution_rate: float
    ai_citation_count: int
    vector_index_presence_rate: float
    retrieval_confidence_score: float
    rrf_rank_contribution: float
    llm_answer_coverage: float
    ai_model_crawl_success_rate: float
    semantic_density_score: float
    zero_click_surface_presence: float
    machine_validated_authority: float
    overall_score: float
    performance_grade: str

class AnalysisResultResponse(BaseModel):
    brand_name: str
    analysis_date: datetime
    optimization_metrics: MetricsResponse
    performance_summary: Dict[str, Any]
    priority_recommendations: List[Dict[str, Any]]
    semantic_queries: List[str]
    implementation_roadmap: Dict[str, Any]
    metadata: Dict[str, Any]
    website_analysis: Optional[Dict[str, Any]] = None
    seo_recommendations: Optional[List[Dict[str, Any]]] = None

# Tracking Models
class BotVisitData(BaseModel):
    """Model for bot visit tracking"""
    platform: str
    bot_name: str
    page_url: str
    timestamp: datetime
    ip_address: Optional[str] = None
    user_agent: str
    response_code: int
    page_title: Optional[str] = None
    content_length: Optional[int] = None
    api_key: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class TrackingMetrics(BaseModel):
    """Real-time tracking metrics"""
    total_visits: int
    unique_bots: int
    platform_breakdown: Dict[str, int]
    success_rate: float
    avg_response_time: float
    top_pages: List[Dict[str, Any]]

# User Activity Models
class UserActivityResponse(BaseModel):
    user: Dict[str, Any]
    activity: Dict[str, Any]

class UserPermissionsResponse(BaseModel):
    user_id: str
    role: str
    is_active: bool
    subscription: Dict[str, Any]
    brands: List[Dict[str, Any]]
    admin_permissions: Dict[str, bool]

# Payment Models
class CheckoutSessionResponse(BaseModel):
    checkout_url: str
    session_id: str
    publishable_key: str

class BillingPortalResponse(BaseModel):
    portal_url: str

# System Metrics Models
class SystemOverviewResponse(BaseModel):
    users: Dict[str, int]
    subscriptions: Dict[str, Any]
    usage: Dict[str, Any]
    health: Dict[str, Any]

class APIUsageMetricsResponse(BaseModel):
    period_days: int
    total_api_calls: int
    total_tokens: int
    total_cost: float
    by_provider: Dict[str, Any]
    daily_average: Dict[str, float]

# Error Log Models
class ErrorLogResponse(BaseModel):
    id: str
    error_type: str
    error_message: str
    severity: str
    category: Optional[str]
    user_id: Optional[str]
    endpoint: Optional[str]
    is_resolved: bool
    created_at: datetime

# Activity Log Models
class AdminActivityLogResponse(BaseModel):
    id: str
    admin_email: str
    action: str
    resource_type: str
    resource_id: Optional[str]
    notes: Optional[str]
    created_at: datetime

# File Upload Models
class FileUploadResponse(BaseModel):
    upload_id: str
    status: str
    filename: str
    file_size_mb: float
    message: str

class LogAnalysisStatusResponse(BaseModel):
    upload_id: str
    status: str
    filename: str
    file_size_mb: float
    uploaded_at: datetime
    total_requests: Optional[int] = None
    bot_requests: Optional[int] = None
    unique_bots: Optional[int] = None
    date_range: Optional[Dict[str, Any]] = None
    processing_time: Optional[float] = None
    error: Optional[str] = None

class LogAnalysisResultResponse(BaseModel):
    brand_name: str
    analysis_period_days: int
    metrics: Dict[str, Any]
    recent_uploads: List[Dict[str, Any]]

class BotActivityResponse(BaseModel):
    period_days: int
    total_bot_visits: int
    platform_breakdown: Dict[str, Any]
    hourly_distribution: Dict[int, int]
    top_paths: List[Dict[str, Any]]

# Firecrawl Models
class WebsiteScrapingRequest(BaseModel):
    url: HttpUrl
    options: Optional[Dict[str, Any]] = None

class WebsiteCrawlRequest(BaseModel):
    url: HttpUrl
    limit: int = Field(100, ge=1, le=1000)
    max_depth: int = Field(3, ge=1, le=10)
    include_paths: Optional[List[str]] = None
    exclude_paths: Optional[List[str]] = None

class WebsiteSearchRequest(BaseModel):
    url: HttpUrl
    query: str = Field(min_length=1, max_length=500)
    limit: int = Field(10, ge=1, le=100)
    depth: int = Field(3, ge=1, le=10)

class ScrapingResultResponse(BaseModel):
    success: bool
    url: str
    title: Optional[str]
    description: Optional[str]
    content: Dict[str, Any]
    metadata: Dict[str, Any]
    scraped_at: datetime

class CrawlJobResponse(BaseModel):
    success: bool
    job_id: Optional[str]
    status: str
    url: str
    message: str

class CrawlStatusResponse(BaseModel):
    success: bool
    status: str
    current: int
    total: int
    data: List[Dict[str, Any]]
    partial_data: List[Dict[str, Any]]

class SearchResultResponse(BaseModel):
    success: bool
    query: str
    results: List[Dict[str, Any]]
    total: int

class CompetitorAnalysisResponse(BaseModel):
    competitors: Dict[str, Any]
    summary: Dict[str, Any]
    insights: List[Dict[str, str]]

# Improvement Models
class ImprovementResponse(BaseModel):
    id: str
    title: str
    description: str
    category: Optional[str]
    status: str
    priority: Optional[str]
    upvotes: int
    downvotes: int
    user_email: str
    created_at: datetime
    reviewed_by: Optional[str]

# Webhook Models
class StripeWebhookRequest(BaseModel):
    type: str
    data: Dict[str, Any]

# Batch Operation Models
class BatchOperationResponse(BaseModel):
    action: str
    total_items: int
    success_count: int
    failed_count: int
    errors: Optional[List[str]] = None

# Export Models
class DataExportRequest(BaseModel):
    export_type: str = Field(pattern="^(csv|json|pdf|xlsx)$")
    data_type: str = Field(pattern="^(metrics|visits|analyses|users)$")
    date_range: Optional[Dict[str, datetime]] = None
    filters: Optional[Dict[str, Any]] = None

class DataExportResponse(BaseModel):
    export_id: str
    status: str
    download_url: Optional[str] = None
    expires_at: Optional[datetime] = None

# Dashboard Models
class DashboardMetricsResponse(BaseModel):
    total_analyses: int
    active_users: int
    total_brands: int
    platform_usage: Dict[str, Any]
    recent_activity: List[Dict[str, Any]]
    trending_queries: List[str]
    system_health: Dict[str, Any]

# Rate Limit Models
class RateLimitResponse(BaseModel):
    limit: int
    remaining: int
    reset: int
    retry_after: int

# Feature Flag Models
class FeatureFlagResponse(BaseModel):
    feature_name: str
    enabled: bool
    rollout_percentage: Optional[float] = None
    eligible_plans: List[str]

# Notification Models
class NotificationRequest(BaseModel):
    type: str = Field(pattern="^(email|webhook|in_app)$")
    recipient: str
    subject: str
    content: str
    metadata: Optional[Dict[str, Any]] = None

class NotificationResponse(BaseModel):
    notification_id: str
    status: str
    sent_at: Optional[datetime] = None
    error: Optional[str] = None

# Report Generation Models
class ReportGenerationRequest(BaseModel):
    report_type: str = Field(pattern="^(analysis|usage|performance|competitive)$")
    brand_id: Optional[str] = None
    date_range: Dict[str, datetime]
    format: str = Field(pattern="^(pdf|html|docx)$")
    include_sections: Optional[List[str]] = None

class ReportResponse(BaseModel):
    report_id: str
    status: str
    download_url: Optional[str] = None
    generated_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

# Cache Models
class CacheStatusResponse(BaseModel):
    cache_hits: int
    cache_misses: int
    hit_rate: float
    memory_used_mb: float
    memory_limit_mb: float
    keys_count: int

# Validation helper functions
def validate_subscription_features(plan: SubscriptionPlanEnum) -> Dict[str, Any]:
    """Validate and return features for a subscription plan"""
    features_map = {
        SubscriptionPlanEnum.FREE: {
            "analyses_limit": 1,
            "api_access": False,
            "export": False,
            "custom_keys": False,
            "support": "email"
        },
        SubscriptionPlanEnum.BRING_YOUR_OWN_KEY: {
            "analyses_limit": None,
            "api_access": True,
            "export": True,
            "custom_keys": True,
            "support": "standard"
        },
        SubscriptionPlanEnum.PLATFORM_MANAGED: {
            "analyses_limit": 30,
            "api_access": True,
            "export": True,
            "custom_keys": False,
            "support": "priority"
        },
        SubscriptionPlanEnum.ENTERPRISE: {
            "analyses_limit": None,
            "api_access": True,
            "export": True,
            "custom_keys": True,
            "support": "dedicated"
        }
    }
    
    return features_map.get(plan, features_map[SubscriptionPlanEnum.FREE])

def validate_api_key_format(provider: LLMProviderEnum, api_key: str) -> bool:
    """Validate API key format for different providers"""
    patterns = {
        LLMProviderEnum.OPENAI: r"^sk-[a-zA-Z0-9]{48}$",
        LLMProviderEnum.ANTHROPIC: r"^sk-ant-api[0-9]{2}-[a-zA-Z0-9-_]{80,}$",
        LLMProviderEnum.GOOGLE: r"^AIza[a-zA-Z0-9-_]{35}$",
        LLMProviderEnum.PERPLEXITY: r"^pplx-[a-zA-Z0-9]{48}$"
    }
    
    import re
    pattern = patterns.get(provider)
    if pattern:
        return bool(re.match(pattern, api_key))
    return True  # Allow for unknown patterns