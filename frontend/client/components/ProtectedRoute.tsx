import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@shared/types';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requiredPermission 
}) => {
  const { user, isLoading, hasPermission } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (requiredRole) {
    const roleHierarchy = {
      [UserRole.USER]: 1,
      [UserRole.SUPER_ADMIN]: 2
    };

    if (roleHierarchy[user.role] < roleHierarchy[requiredRole]) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission as any)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
