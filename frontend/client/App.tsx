import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Auth
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Layout
import { Layout } from "@/components/layout/Layout";

// Pages
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ApiKeys from "./pages/ApiKeys";
import Brands from "./pages/Brands";
import UserManagement from "./pages/admin/UserManagement";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SubscriptionManagement from "./pages/admin/SubscriptionManagement";
import SystemMetrics from "./pages/admin/SystemMetrics";
import ErrorLogs from "./pages/admin/ErrorLogs";
import HealthCheck from "./pages/admin/HealthCheck";
import Billing from "./pages/Billing";
import Analytics from "./pages/Analytics";
import BrandAnalysis from "./pages/BrandAnalysis";

import NotFound from "./pages/NotFound";

// Placeholder pages
import PlaceholderPage from "./pages/PlaceholderPage";

import { UserRole } from "@shared/types";

const queryClient = new QueryClient();

// Google OAuth Client ID - you'll need to replace this with your actual client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id-here';

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Layout>
              <Routes>
                {/* Public routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                
                {/* Protected routes */}
                <Route path="/" element={<Navigate to="/analytics" replace />} />
                
                {/* User routes */}
                <Route
                  path="/analysis"
                  element={
                    <ProtectedRoute requiredPermission="canRunAnalysis">
                      <BrandAnalysis />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/brands"
                  element={
                    <ProtectedRoute requiredPermission="canManageBrands">
                      <Brands />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute requiredPermission="canViewReports">
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/api-keys"
                  element={
                    <ProtectedRoute requiredPermission="canUseOwnApiKeys">
                      <ApiKeys />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/billing"
                  element={
                    <ProtectedRoute requiredPermission="canUpdateBilling">
                      <Billing />
                    </ProtectedRoute>
                  }
                />
                
                {/* Admin routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute requiredPermission="canViewAllUsers">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredPermission="canViewAllUsers">
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/subscriptions"
                  element={
                    <ProtectedRoute requiredPermission="canViewAllUsers">
                      <SubscriptionManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/metrics"
                  element={
                    <ProtectedRoute requiredPermission="canViewAllUsers">
                      <SystemMetrics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/errors"
                  element={
                    <ProtectedRoute requiredPermission="canViewAllUsers">
                      <ErrorLogs />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/health"
                  element={
                    <ProtectedRoute requiredPermission="canViewAllUsers">
                      <HealthCheck />
                    </ProtectedRoute>
                  }
                />

                
                {/* Unauthorized */}
                <Route 
                  path="/unauthorized" 
                  element={
                    <PlaceholderPage 
                      title="Access Denied" 
                      description="You don't have permission to access this page"
                      icon="Shield"
                    />
                  } 
                />
                
                {/* Catch all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </GoogleOAuthProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
