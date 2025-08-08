export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  USER = 'user'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  company?: string;
  avatar?: string;
  isEmailVerified: boolean;
  is2FAEnabled: boolean;
  lastActive: Date;
  createdAt: Date;
  // OAuth fields
  oauthProvider?: 'google' | 'github' | 'microsoft';
  oauthId?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  register: (userData: RegisterData) => Promise<void>;
  isLoading: boolean;
  hasPermission: (permission: string) => boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  company?: string;
}

export interface GoogleOAuthResponse {
  user: User;
  token: string;
}

export interface Brand {
  id: string;
  name: string;
  website: string;
  industry: string;
  categories: string[];
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalysisRequest {
  brandId: string;
  content: string;
  categories: string[];
  depth: 'basic' | 'detailed' | 'comprehensive';
  platforms: string[];
  includeCompetitors: boolean;
  apiKeyType: 'own' | 'platform';
}

export interface MetricData {
  id: string;
  name: string;
  currentValue: number;
  previousValue: number;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  benchmark?: number;
  chartData: { date: string; value: number }[];
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'suspended';
  apiKeyPreference: 'own' | 'platform';
  billingCycle: 'monthly' | 'annual';
  nextBillingDate: Date;
  amount: number;
}

export interface ApiKey {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai';
  keyPreview: string;
  isActive: boolean;
  lastUsed?: Date;
  createdAt: Date;
}

export interface RolePermissions {
  canRunAnalysis: boolean;
  canViewReports: boolean;
  canExportData: boolean;
  canManageBrands: boolean;
  canUseOwnApiKeys: boolean;
  canUsePlatformApiKeys: boolean;
  canViewApiUsage: boolean;
  canUpdateBilling: boolean;
  canInviteUsers: boolean;
  canDeleteAccount: boolean;
  canViewAllUsers: boolean;
  canModifyUserAccounts: boolean;
  canViewSystemMetrics: boolean;
  canAccessLogs: boolean;
}

export interface BillingSystem {
  plans: {
    free: {
      limits: {
        analyses: 2;
        apiCalls: 100;
        brands: 1;
        users: 1;
      };
      features: string[];
      price: 0;
    };
    starter: {
      limits: {
        analyses: 50;
        apiCalls: 5000;
        brands: 5;
        users: 3;
      };
      features: string[];
      price: 49;
    };
    professional: {
      limits: {
        analyses: 'unlimited';
        apiCalls: 50000;
        brands: 'unlimited';
        users: 10;
      };
      features: string[];
      price: 199;
    };
    enterprise: {
      customLimits: true;
      customPricing: true;
      sla: true;
    };
  };
  apiPricing: {
    platformKeys: {
      anthropic: {
        inputToken: 0.005;  // per 1k tokens
        outputToken: 0.015; // per 1k tokens
        markup: 1.3;        // 30% markup
      };
      openai: {
        inputToken: 0.03;
        outputToken: 0.06;
        markup: 1.3;
      };
    };
    ownKeys: {
      platformFee: 0.001; // per request
      freeRequests: 1000; // per month
    };
  };
  invoicing: {
    frequency: 'monthly';
    autoCharge: true;
    paymentMethods: ['card', 'ach', 'wire'];
    invoiceGeneration: {
      automatic: true;
      detailed: true;
      taxCompliant: true;
    };
  };
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.USER]: {
    canRunAnalysis: true,
    canViewReports: true,
    canExportData: false,
    canManageBrands: true,
    canUseOwnApiKeys: true,
    canUsePlatformApiKeys: true,
    canViewApiUsage: false,
    canUpdateBilling: true,
    canInviteUsers: false,
    canDeleteAccount: true,
    canViewAllUsers: false,
    canModifyUserAccounts: false,
    canViewSystemMetrics: false,
    canAccessLogs: false,
  },
  [UserRole.SUPER_ADMIN]: {
    canRunAnalysis: true,
    canViewReports: true,
    canExportData: false,
    canManageBrands: true,
    canUseOwnApiKeys: true,
    canUsePlatformApiKeys: true,
    canViewApiUsage: false,
    canUpdateBilling: true,
    canInviteUsers: true,
    canDeleteAccount: true,
    canViewAllUsers: true,
    canModifyUserAccounts: true,
    canViewSystemMetrics: false,
    canAccessLogs: false,
  },
};
