-- =====================================================
-- AI Optimization System Database Setup Script
-- Run this in pgAdmin4 to create all necessary tables
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE subscription_plan AS ENUM ('free', 'bring_your_own_key', 'platform_managed', 'enterprise');
CREATE TYPE user_role AS ENUM ('client', 'admin');
CREATE TYPE llm_provider AS ENUM ('openai', 'anthropic', 'google', 'perplexity');

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(200),
    company VARCHAR(200),
    
    -- OAuth fields
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    oauth_refresh_token TEXT,
    
    -- User settings
    role user_role DEFAULT 'client',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(100),
    
    -- Password reset
    reset_token VARCHAR(100),
    reset_token_expires TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    last_activity TIMESTAMP,
    
    -- Preferences
    email_notifications BOOLEAN DEFAULT TRUE,
    weekly_reports BOOLEAN DEFAULT TRUE,
    timezone VARCHAR(50) DEFAULT 'UTC'
);

-- Create indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);

-- =====================================================
-- BRANDS TABLE
-- =====================================================
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    website_url VARCHAR(500),
    industry VARCHAR(100),
    tracking_enabled BOOLEAN DEFAULT FALSE,
    tracking_script_installed BOOLEAN DEFAULT FALSE,
    api_key VARCHAR(100) UNIQUE,
    
    -- Server log configuration
    log_format VARCHAR(50),
    log_timezone VARCHAR(50) DEFAULT 'UTC',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for brands table
CREATE INDEX idx_brands_name ON brands(name);
CREATE INDEX idx_brands_api_key ON brands(api_key);

-- =====================================================
-- USER SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Subscription details
    plan subscription_plan NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    
    -- Stripe integration
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    stripe_payment_method_id VARCHAR(255),
    
    -- Pricing
    monthly_price DECIMAL(10,2) NOT NULL,
    yearly_price DECIMAL(10,2),
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    
    -- Limits and quotas
    monthly_analyses_limit INTEGER,
    analyses_used_this_month INTEGER DEFAULT 0,
    user_seats INTEGER DEFAULT 1,
    brands_limit INTEGER DEFAULT 1,
    competitor_analyses_limit INTEGER DEFAULT 0,
    server_log_gb_limit DECIMAL(10,2) DEFAULT 0.0,
    
    -- Features
    has_recommendations BOOLEAN DEFAULT TRUE,
    has_detailed_metrics BOOLEAN DEFAULT TRUE,
    has_user_intent_mapping BOOLEAN DEFAULT TRUE,
    has_export_features BOOLEAN DEFAULT FALSE,
    has_api_access BOOLEAN DEFAULT FALSE,
    
    -- Dates
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Overage handling
    overage_allowed BOOLEAN DEFAULT FALSE,
    overage_rate_per_analysis DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_subscriptions table
CREATE INDEX idx_user_subscriptions_user_status ON user_subscriptions(user_id, status);
CREATE INDEX idx_user_subscriptions_stripe ON user_subscriptions(stripe_customer_id, stripe_subscription_id);

-- =====================================================
-- USER BRANDS TABLE (Many-to-Many Relationship)
-- =====================================================
CREATE TABLE user_brands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, brand_id)
);

-- =====================================================
-- ANALYSES TABLE
-- =====================================================
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'recovery_test', 'degradation_test')),
    analysis_type VARCHAR(50) DEFAULT 'comprehensive',
    data_source VARCHAR(50) DEFAULT 'real',
    
    -- Analysis data
    metrics JSONB,
    recommendations JSONB,
    
    -- Performance metrics
    total_bot_visits_analyzed INTEGER DEFAULT 0,
    citation_frequency DECIMAL(5,4) DEFAULT 0.0,
    processing_time DECIMAL(10,2),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create indexes for analyses table
CREATE INDEX idx_analyses_brand_created ON analyses(brand_id, created_at);
CREATE INDEX idx_analyses_status ON analyses(status);

-- =====================================================
-- METRICS HISTORY TABLE
-- =====================================================
CREATE TABLE metrics_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    platform VARCHAR(50),
    data_source VARCHAR(50) DEFAULT 'real',
    
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for metrics_history table
CREATE INDEX idx_metrics_brand_name_date ON metrics_history(brand_id, metric_name, recorded_at);
CREATE INDEX idx_metrics_analysis ON metrics_history(analysis_id);

-- =====================================================
-- BOT VISITS TABLE
-- =====================================================
CREATE TABLE bot_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    
    -- Bot information
    bot_name VARCHAR(100) NOT NULL,
    platform VARCHAR(50),
    user_agent TEXT,
    
    -- Visit details
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    path VARCHAR(500) NOT NULL,
    status_code INTEGER NOT NULL,
    response_time DECIMAL(10,2),
    
    -- Analysis results
    brand_mentioned BOOLEAN DEFAULT FALSE,
    content_type VARCHAR(50)
);

-- Create indexes for bot_visits table
CREATE INDEX idx_bot_visits_brand_timestamp ON bot_visits(brand_id, timestamp);
CREATE INDEX idx_bot_visits_bot_platform ON bot_visits(bot_name, platform);
CREATE INDEX idx_bot_visits_timestamp ON bot_visits(timestamp);

-- =====================================================
-- TRACKING EVENTS TABLE
-- =====================================================
CREATE TABLE tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    
    -- Event details
    event_type VARCHAR(50) NOT NULL,
    session_id VARCHAR(100),
    sequence_number INTEGER,
    
    -- Bot information
    bot_name VARCHAR(100),
    platform VARCHAR(50),
    
    -- Page details
    page_url VARCHAR(1000),
    page_title VARCHAR(500),
    
    -- Engagement metrics
    time_on_page INTEGER,
    scroll_depth INTEGER,
    
    -- Event metadata
    event_metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for tracking_events table
CREATE INDEX idx_tracking_events_brand_timestamp ON tracking_events(brand_id, timestamp);
CREATE INDEX idx_tracking_events_session ON tracking_events(session_id);
CREATE INDEX idx_tracking_events_type ON tracking_events(event_type);

-- =====================================================
-- API USAGE TABLE
-- =====================================================
CREATE TABLE api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- API details
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    
    -- LLM usage
    llm_provider llm_provider,
    llm_model VARCHAR(100),
    api_key_source VARCHAR(50),
    
    -- Tokens and cost
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    estimated_cost DECIMAL(10,4) DEFAULT 0.0,
    
    -- Request details
    request_data JSONB,
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER,
    
    -- Error tracking
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for api_usage table
CREATE INDEX idx_api_usage_user_date ON api_usage(user_id, created_at);
CREATE INDEX idx_api_usage_provider ON api_usage(llm_provider, created_at);

-- =====================================================
-- ERROR LOGS TABLE
-- =====================================================
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Error details
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_code VARCHAR(50),
    stack_trace TEXT,
    
    -- Context
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(200),
    request_id VARCHAR(100),
    request_data JSONB,
    
    -- Categorization
    severity VARCHAR(20) DEFAULT 'error',
    category VARCHAR(50),
    
    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for error_logs table
CREATE INDEX idx_error_logs_severity_date ON error_logs(severity, created_at);
CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_unresolved ON error_logs(is_resolved, created_at);

-- =====================================================
-- ADMIN ACTIVITY LOGS TABLE
-- =====================================================
CREATE TABLE admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    
    -- Changes
    previous_state JSONB,
    new_state JSONB,
    
    -- Additional context
    ip_address VARCHAR(45),
    user_agent TEXT,
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for admin_activity_logs table
CREATE INDEX idx_admin_logs_admin_date ON admin_activity_logs(admin_user_id, created_at);
CREATE INDEX idx_admin_logs_action ON admin_activity_logs(action, created_at);

-- =====================================================
-- USER IMPROVEMENTS TABLE
-- =====================================================
CREATE TABLE user_improvements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Improvement details
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50),
    
    -- Status tracking
    status VARCHAR(50) DEFAULT 'submitted',
    priority VARCHAR(20),
    
    -- Admin response
    admin_notes TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    
    -- Voting
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for user_improvements table
CREATE INDEX idx_improvements_status ON user_improvements(status, created_at);
CREATE INDEX idx_improvements_user ON user_improvements(user_id);

-- =====================================================
-- USER API KEYS TABLE
-- =====================================================
CREATE TABLE user_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Provider details
    provider llm_provider NOT NULL,
    key_name VARCHAR(100) NOT NULL,
    
    -- Encrypted key storage
    encrypted_key TEXT NOT NULL,
    key_hint VARCHAR(20),
    
    -- Validation
    is_valid BOOLEAN DEFAULT TRUE,
    last_validated TIMESTAMP,
    validation_error TEXT,
    
    -- Usage tracking
    last_used TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, provider)
);

-- Create indexes for user_api_keys table
CREATE INDEX idx_user_api_keys_user_provider ON user_api_keys(user_id, provider);

-- =====================================================
-- SERVER LOG UPLOADS TABLE
-- =====================================================
CREATE TABLE server_log_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    
    -- File details
    filename VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    file_format VARCHAR(50) NOT NULL,
    
    -- Processing status
    status VARCHAR(50) DEFAULT 'uploaded',
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    error_message TEXT,
    
    -- Analysis results
    total_requests INTEGER,
    bot_requests INTEGER,
    unique_bots INTEGER,
    date_range_start TIMESTAMP,
    date_range_end TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for server_log_uploads table
CREATE INDEX idx_log_uploads_user_date ON server_log_uploads(user_id, created_at);
CREATE INDEX idx_log_uploads_status ON server_log_uploads(status);

-- =====================================================
-- PLATFORM API KEYS TABLE
-- =====================================================
CREATE TABLE platform_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Provider details
    provider llm_provider NOT NULL UNIQUE,
    encrypted_key TEXT NOT NULL,
    
    -- Usage limits
    monthly_token_limit INTEGER,
    tokens_used_this_month INTEGER DEFAULT 0,
    
    -- Cost tracking
    cost_per_1k_input_tokens DECIMAL(10,4),
    cost_per_1k_output_tokens DECIMAL(10,4),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_validated TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- API KEYS TABLE
-- =====================================================
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    
    -- Permissions
    permissions JSONB DEFAULT '[]',
    rate_limit INTEGER DEFAULT 1000,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP,
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- =====================================================
-- PERFORMANCE METRICS TABLE
-- =====================================================
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Metric details
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    metric_unit VARCHAR(20),
    
    -- Context
    operation VARCHAR(100),
    endpoint VARCHAR(200),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timing
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance_metrics table
CREATE INDEX idx_performance_metrics_name_date ON performance_metrics(metric_name, recorded_at);
CREATE INDEX idx_performance_metrics_operation ON performance_metrics(operation);

-- =====================================================
-- SCHEDULED ANALYSES TABLE
-- =====================================================
CREATE TABLE scheduled_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Schedule details
    frequency VARCHAR(20) NOT NULL,
    next_run TIMESTAMP NOT NULL,
    last_run TIMESTAMP,
    
    -- Configuration
    analysis_type VARCHAR(50) DEFAULT 'comprehensive',
    config JSONB,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for scheduled_analyses table
CREATE INDEX idx_scheduled_analyses_next_run ON scheduled_analyses(next_run);
CREATE INDEX idx_scheduled_analyses_brand_user ON scheduled_analyses(brand_id, user_id);

-- =====================================================
-- TRACKING ALERTS TABLE
-- =====================================================
CREATE TABLE tracking_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Alert details
    alert_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    severity VARCHAR(20) DEFAULT 'info',
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Create indexes for tracking_alerts table
CREATE INDEX idx_tracking_alerts_user_unread ON tracking_alerts(user_id, is_read);
CREATE INDEX idx_tracking_alerts_brand_created ON tracking_alerts(brand_id, created_at);

-- =====================================================
-- DATA EXPORTS TABLE
-- =====================================================
CREATE TABLE data_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    
    -- Export details
    export_type VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    date_range JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    file_path VARCHAR(500),
    file_size INTEGER,
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Create indexes for data_exports table
CREATE INDEX idx_data_exports_user_status ON data_exports(user_id, status);
CREATE INDEX idx_data_exports_created ON data_exports(created_at);

-- =====================================================
-- LLM USAGE TABLE
-- =====================================================
CREATE TABLE llm_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
    
    -- API details
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    endpoint VARCHAR(100),
    
    -- Usage metrics
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4),
    response_time DECIMAL(10,2),
    
    -- Request details
    request_type VARCHAR(50),
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    
    -- Timing
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for llm_usage table
CREATE INDEX idx_llm_usage_provider_date ON llm_usage(provider, timestamp);
CREATE INDEX idx_llm_usage_user ON llm_usage(user_id);

-- =====================================================
-- QUERY TESTS TABLE
-- =====================================================
CREATE TABLE query_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
    
    -- Query details
    query_text TEXT NOT NULL,
    query_type VARCHAR(50),
    
    -- Test results
    llm_provider VARCHAR(50) NOT NULL,
    response_text TEXT,
    brand_mentioned BOOLEAN DEFAULT FALSE,
    relevance_score DECIMAL(5,4),
    
    -- Timing
    response_time DECIMAL(10,2),
    tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for query_tests table
CREATE INDEX idx_query_tests_brand_date ON query_tests(brand_id, tested_at);
CREATE INDEX idx_query_tests_provider ON query_tests(llm_provider);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================

-- Insert a sample admin user
INSERT INTO users (email, password_hash, full_name, role, is_verified) 
VALUES ('admin@aioptimization.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3ZxQQxqKre', 'Admin User', 'admin', TRUE);

-- Insert a sample client user
INSERT INTO users (email, password_hash, full_name, role, is_verified) 
VALUES ('client@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3ZxQQxqKre', 'Test Client', 'client', TRUE);

-- Insert a sample brand
INSERT INTO brands (name, website_url, industry) 
VALUES ('TestBrand', 'https://testbrand.com', 'Technology');

-- Link the client user to the brand
INSERT INTO user_brands (user_id, brand_id, role) 
SELECT u.id, b.id, 'admin' 
FROM users u, brands b 
WHERE u.email = 'client@example.com' AND b.name = 'TestBrand';

-- Insert a sample subscription for the client
INSERT INTO user_subscriptions (user_id, plan, monthly_price, has_recommendations, has_detailed_metrics) 
SELECT u.id, 'platform_managed', 29.99, TRUE, TRUE 
FROM users u 
WHERE u.email = 'client@example.com';

-- =====================================================
-- COMMIT TRANSACTION
-- =====================================================
COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check if sample data was inserted
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Brands', COUNT(*) FROM brands
UNION ALL
SELECT 'User Subscriptions', COUNT(*) FROM user_subscriptions
UNION ALL
SELECT 'User Brands', COUNT(*) FROM user_brands;

-- Display sample data
SELECT 'Sample Users:' as info;
SELECT email, full_name, role FROM users;

SELECT 'Sample Brands:' as info;
SELECT name, website_url, industry FROM brands;

SELECT 'Sample Subscriptions:' as info;
SELECT u.email, us.plan, us.monthly_price 
FROM user_subscriptions us 
JOIN users u ON us.user_id = u.id; 