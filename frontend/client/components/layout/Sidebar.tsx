import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Building2,
  CreditCard,
  Key,
  LayoutDashboard,
  TrendingUp,
  Users,
  Shield,
  AlertCircle,
  AlertTriangle,
  FileText,
  LogOut,
  Search,
  Activity
} from 'lucide-react';
import { UserRole } from '@shared/types';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  requiredRole?: UserRole;
  requiredPermission?: string;
}

const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/analytics',
    icon: LayoutDashboard,
    requiredPermission: 'canViewReports'
  },
  {
    title: 'Brand Analysis',
    href: '/analysis',
    icon: Search,
    requiredPermission: 'canRunAnalysis'
  },
  {
    title: 'Brands',
    href: '/brands',
    icon: Building2,
    requiredPermission: 'canManageBrands'
  },
  {
    title: 'API Keys',
    href: '/api-keys',
    icon: Key,
    requiredPermission: 'canUseOwnApiKeys'
  },
  {
    title: 'Billing',
    href: '/billing',
    icon: CreditCard,
    requiredPermission: 'canUpdateBilling'
  }
];

const adminItems: NavItem[] = [
  {
    title: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    requiredPermission: 'canViewAllUsers'
  },
  {
    title: 'User Management',
    href: '/admin/users',
    icon: Users,
    requiredPermission: 'canViewAllUsers'
  },
  {
    title: 'Subscriptions',
    href: '/admin/subscriptions',
    icon: CreditCard,
    requiredPermission: 'canViewAllUsers'
  },
  {
    title: 'System Metrics',
    href: '/admin/metrics',
    icon: BarChart3,
    requiredPermission: 'canViewAllUsers'
  },
  {
    title: 'Error Logs',
    href: '/admin/errors',
    icon: AlertTriangle,
    requiredPermission: 'canViewAllUsers'
  },
  {
    title: 'Health Check',
    href: '/admin/health',
    icon: Activity,
    requiredPermission: 'canViewAllUsers'
  }
];

export const Sidebar: React.FC = () => {
  const { user, hasPermission, logout } = useAuth();
  const location = useLocation();

  const isActiveRoute = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const shouldShowItem = (item: NavItem) => {
    if (item.requiredRole && user?.role) {
      const roleHierarchy = {
        [UserRole.USER]: 1,
        [UserRole.SUPER_ADMIN]: 2
      };
      const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
      const requiredRoleLevel = roleHierarchy[item.requiredRole as keyof typeof roleHierarchy] || 0;
      
      if (userRoleLevel < requiredRoleLevel) {
        return false;
      }
    }
    if (item.requiredPermission && !hasPermission(item.requiredPermission as any)) {
      return false;
    }
    return true;
  };

  const visibleNavItems = navigationItems.filter(shouldShowItem);
  const visibleAdminItems = adminItems.filter(shouldShowItem);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo */}
      <div className="flex items-center px-6 py-5 border-b border-gray-200">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center mr-3">
          <span className="text-white font-bold text-sm">AI</span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">AI Optimizer</h1>
          <p className="text-xs text-gray-500">Brand Intelligence</p>
        </div>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'User'}
            </p>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="text-xs">
                {user?.role?.replace('_', ' ').toLowerCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className={cn(
                  'mr-3 h-5 w-5',
                  isActive ? 'text-blue-500' : 'text-gray-400'
                )} />
                {item.title}
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </div>

        {/* Admin Section */}
        {visibleAdminItems.length > 0 && (
          <>
            <Separator className="my-4 mx-4" />
            <div className="px-4 mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Administration
              </h3>
            </div>
            <div className="px-4 space-y-1">
              {visibleAdminItems.map((item) => {
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                      isActive
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <item.icon className={cn(
                      'mr-3 h-5 w-5',
                      isActive ? 'text-purple-500' : 'text-gray-400'
                    )} />
                    {item.title}
                    {item.badge && (
                      <Badge variant="destructive" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-gray-200 px-4 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          onClick={logout}
        >
          <LogOut className="mr-3 h-5 w-5 text-gray-400" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};
