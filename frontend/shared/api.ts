// ==========================================
// COMPREHENSIVE API TYPES - Updated from detailed API structure
// ==========================================

// ==========================================
// AUTHENTICATION INTERFACES
// ==========================================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  company?: string;
  password: string;
}

export interface GoogleOAuthRequest {
  credential: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      company?: string;
      avatar?: string;
      isEmailVerified: boolean;
      is2FAEnabled: boolean;
      lastActive: string;
      createdAt: string;
      oauthProvider?: 'google' | 'github' | 'microsoft';
      oauthId?: string;
    };
    token: string;
  };
  timestamp: string;
}

// ==========================================
// USER MANAGEMENT INTERFACES
// ==========================================
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'user';
  company?: string;
  avatar?: string;
  isEmailVerified: boolean;
  is2FAEnabled: boolean;
  lastActive: string;
  createdAt: string;
  subscription?: {
    plan: string;
    status: string;
    nextBillingDate: string;
  };
}

export interface CreateUserRequest {
  name: string;
  email: string;
  company?: string;
  role: 'super_admin' | 'user';
  password: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  company?: string;
  role?: 'super_admin' | 'user';
  isActive?: boolean;
}

export interface UsersResponse {
  success: boolean;
  data: {
    users: User[];
    total: number;
    page: number;
    limit: number;
  };
  timestamp: string;
}

// ==========================================
// BRAND INTERFACES
// ==========================================
export interface Brand {
  id: string;
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  categories: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandRequest {
  name: string;
  description?: string;
  website?: string;
  industry?: string;
  categories: string[];
}

export interface UpdateBrandRequest {
  name?: string;
  description?: string;
  website?: string;
  industry?: string;
  categories?: string[];
}

export interface BrandsResponse {
  success: boolean;
  data: Brand[];
  timestamp: string;
}

export interface BrandResponse {
  success: boolean;
  data: Brand;
  timestamp: string;
}

// ==========================================
// ANALYSIS INTERFACES
// ==========================================
export interface AnalyzeBrandRequest {
  brand_name: string;
  website_url: string;
  product_categories: string[];
  content_sample: string;
  competitor_names: string[];
}

export interface OptimizationMetricsRequest {
  brand_name: string;
  content_sample: string;
  website_url: string;
}

export interface AnalyzeQueriesRequest {
  brand_name: string;
  product_categories: string[];
}

export interface AnalysisResult {
  query: string;
  response: string;
  source_attribution: {
    mentioned: boolean;
    context: string;
    position: number;
    relevance_score: number;
  };
  competitor_analysis: {
    competitor: string;
    mentioned: boolean;
    position: number;
    context: string;
  }[];
  visibility_metrics: {
    brand_visibility_score: number;
    competitor_visibility_score: number;
    market_share_percentage: number;
  };
  recommendations: string[];
}

export interface OptimizationMetrics {
  chunk_retrieval_frequency: number;
  embedding_relevance_score: number;
  attribution_rate: number;
  ai_citation_count: number;
  vector_index_presence_rate: number;
  query_response_quality: number;
  brand_mention_sentiment: number;
  competitor_gap_analysis: number;
  content_optimization_score: number;
  search_visibility_index: number;
}

export interface AnalyzeBrandResponse {
  success: boolean;
  data: {
    analysis_id: string;
    brand_name: string;
    analysis_results: AnalysisResult[];
    summary: {
      total_queries: number;
      brand_mentions: number;
      avg_position: number;
      visibility_score: number;
    };
    competitors_overview: {
      competitor: string;
      mention_count: number;
      avg_position: number;
    }[];
  };
  message: string | null;
  timestamp: string;
}

export interface OptimizationMetricsResponse {
  success: boolean;
  data: {
    brand_name: string;
    metrics: OptimizationMetrics;
    benchmarks: OptimizationMetrics;
    improvement_suggestions: string[];
    time_period: string;
  };
  timestamp: string;
}

export interface AnalyzeQueriesResponse {
  success: boolean;
  data: {
    query_analysis_id: string;
    brand_name: string;
    query_results: {
      query: string;
      brand_mentioned: boolean;
      position: number;
      response_quality: number;
      optimization_suggestions: string[];
      intent?: 'informational' | 'navigational' | 'transactional' | 'commercial_investigation';
    }[];
    summary: {
      total_queries: number;
      successful_mentions: number;
      avg_position: number;
      overall_score: number;
    };
  };
  timestamp: string;
}

// ==========================================
// BRAND HISTORY INTERFACES
// ==========================================
export interface BrandHistoryItem {
  id: string;
  brand_name: string;
  analysis_type: 'full_analysis' | 'optimization_metrics' | 'query_analysis';
  timestamp: string;
  results: AnalyzeBrandResponse['data'] | OptimizationMetricsResponse['data'] | AnalyzeQueriesResponse['data'];
  status: 'completed' | 'failed' | 'in_progress';
}

export interface BrandHistoryResponse {
  success: boolean;
  data: BrandHistoryItem[];
  brand_name: string;
  timestamp: string;
}

// ==========================================
// API KEYS INTERFACES
// ==========================================
export interface ApiKey {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'perplexity';
  keyPreview: string;
  isActive: boolean;
  lastUsed?: string;
  createdAt: string;
  usage: {
    requests: number;
    tokens: number;
    cost: number;
  };
}

export interface CreateApiKeyRequest {
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'perplexity';
  key: string;
}

export interface UpdateApiKeyRequest {
  name?: string;
  isActive?: boolean;
}

export interface ApiKeysResponse {
  success: boolean;
  data: ApiKey[];
  timestamp: string;
}

// ==========================================
// ANALYTICS INTERFACES
// ==========================================
export interface AnalyticsData {
  overview: {
    total_analyses: number;
    total_brands: number;
    total_queries: number;
    avg_visibility_score: number;
  };
  trends: {
    date: string;
    analyses_count: number;
    visibility_score: number;
    brand_mentions: number;
  }[];
  top_brands: {
    brand_name: string;
    analyses_count: number;
    avg_visibility_score: number;
  }[];
  competitor_insights: {
    competitor: string;
    mention_frequency: number;
    avg_position: number;
  }[];
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  timestamp: string;
}

// ==========================================
// REPORTS INTERFACES
// ==========================================
export interface Report {
  id: string;
  name: string;
  type: 'brand_analysis' | 'competitor_analysis' | 'optimization_report';
  brand_name: string;
  status: 'generated' | 'generating' | 'failed';
  createdAt: string;
  data: any;
}

export interface CreateReportRequest {
  name: string;
  type: 'brand_analysis' | 'competitor_analysis' | 'optimization_report';
  brand_name: string;
  filters?: {
    date_range?: {
      start: string;
      end: string;
    };
    categories?: string[];
    competitors?: string[];
  };
}

export interface ReportsResponse {
  success: boolean;
  data: Report[];
  timestamp: string;
}

// ==========================================
// HEALTH CHECK INTERFACES
// ==========================================
export interface HealthService {
  database: boolean;
  redis: boolean;
  anthropic: boolean;
  openai: boolean;
}

export interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthService;
  response_time: string;
  timestamp: string;
  version: string;
}

export interface HealthResponse {
  success: boolean;
  data: HealthData;
  error: string | null;
  timestamp: string;
}

// ==========================================
// BILLING INTERFACES
// ==========================================
export interface Subscription {
  id: string;
  userId: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'cancelled' | 'suspended' | 'past_due';
  billingCycle: 'monthly' | 'annual';
  nextBillingDate: string;
  amount: number;
  features: string[];
  usage: {
    analyses: number;
    apiCalls: number;
    brands: number;
  };
  limits: {
    analyses: number | 'unlimited';
    apiCalls: number;
    brands: number | 'unlimited';
    users: number;
  };
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export interface BillingResponse {
  success: boolean;
  data: {
    subscription: Subscription;
    invoices: Invoice[];
    paymentMethods: {
      id: string;
      type: 'card' | 'ach';
      last4: string;
      isDefault: boolean;
    }[];
  };
  timestamp: string;
}

// ==========================================
// SETTINGS INTERFACES
// ==========================================
export interface UserSettings {
  notifications: {
    email: boolean;
    sms: boolean;
    analysisComplete: boolean;
    weeklyReports: boolean;
    systemUpdates: boolean;
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    defaultBrand?: string;
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    sessionTimeout: number;
  };
}

export interface UpdateSettingsRequest {
  notifications?: Partial<UserSettings['notifications']>;
  preferences?: Partial<UserSettings['preferences']>;
  security?: Partial<UserSettings['security']>;
}

export interface SettingsResponse {
  success: boolean;
  data: UserSettings;
  timestamp: string;
}

// ==========================================
// COMMON INTERFACES
// ==========================================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}

// ==========================================
// LEGACY INTERFACES (keeping for compatibility)
// ==========================================
export interface DemoResponse {
  message: string;
}
