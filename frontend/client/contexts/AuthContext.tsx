import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthContextType, RegisterData, UserRole, ROLE_PERMISSIONS } from '@shared/types';

// Helper function to map backend roles to frontend enum values
const mapBackendRoleToFrontend = (backendRole: string): UserRole => {
  switch (backendRole) {
    case 'admin':
      return UserRole.SUPER_ADMIN;
    case 'client':
    default:
      return UserRole.USER;
  }
};

// Helper function to transform backend user data to frontend format
const transformUserData = (backendUser: any): User => {
  return {
    ...backendUser,
    role: mapBackendRoleToFrontend(backendUser.role),
    name: backendUser.name || backendUser.full_name || (backendUser.email ? String(backendUser.email).split('@')[0] : undefined),
    lastActive: new Date(backendUser.lastActive || backendUser.last_activity || new Date()),
    createdAt: new Date(backendUser.createdAt || backendUser.created_at || new Date())
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Check if we're in a valid environment for API calls
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(transformUserData(userData));
      } else {
        // Only remove token if it's a real auth failure, not a network error
        if (response.status === 401 || response.status === 404) {
          localStorage.removeItem('authToken');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Only remove token if this looks like an auth issue, not a network issue
      if (error instanceof Error && error.message.includes('401')) {
        localStorage.removeItem('authToken');
      }
      // Don't remove token for general network errors - let user try to log in again
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let errorMessage = 'Login failed';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const { data } = await response.json();
      localStorage.setItem('authToken', data.token);
      setUser(transformUserData(data.user));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credential }),
      });

      if (!response.ok) {
        let errorMessage = 'Google login failed';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const { data } = await response.json();
      localStorage.setItem('authToken', data.token);
      setUser(transformUserData(data.user));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          full_name: userData.name,
          company: userData?.company
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const error = await response.json();
          errorMessage = error.message || error.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Do not auto-login on email registration; just return success
      await response.json();
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const hasPermission = (permission: keyof typeof ROLE_PERMISSIONS[UserRole]) => {
    if (!user) return false;
    return ROLE_PERMISSIONS[user.role][permission];
  };

  const value: AuthContextType = {
    user,
    login,
    loginWithGoogle,
    logout,
    register,
    isLoading,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
