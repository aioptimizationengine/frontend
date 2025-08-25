import express from "express";
import { createServer } from "http";
import cors from "cors";
import { config } from "dotenv";

// Import route handlers
import { handleDemo } from "./routes/demo";
// Note: Auth handlers now proxy to FastAPI backend instead of using mock data

// Load environment variables (dev-only). In Railway, variables are injected by the platform.
if (process.env.NODE_ENV !== 'production') {
  config();
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 60000; // 1 minute timeout

// Helper function to create proxy request with timeout
const createProxyRequest = async (url: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  const fullUrl = `${BACKEND_URL}${url}`;
  console.log('🌐 Making proxy request to:', fullUrl);
  console.log('🌐 Request options:', JSON.stringify({
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body ? 'Present' : 'None'
  }, null, 2));

  try {
    const response = await fetch(fullUrl, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    console.log('🌐 Response received:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    console.error('🌐 Proxy request failed:', error);
    clearTimeout(timeoutId);
    throw error;
  }
};

// Helper function to get authorization headers from request
const getAuthHeaders = (req: express.Request) => {
  const authHeader = req.headers.authorization;
  return authHeader ? { 'Authorization': authHeader } : {};
};

// Helper function to handle proxy response
const handleProxyResponse = async (res: express.Response, proxyRequest: Promise<Response>, fallbackError: string) => {
  try {
    const response = await proxyRequest;
    
    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    let errorMessage = fallbackError;
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = `Request timeout - Cannot reach backend`;
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED') || error.message.includes('ENETUNREACH')) {
        errorMessage = `Network unreachable - Backend not accessible`;
      }
    }
    
    res.status(503).json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
};

export function createApp() {
  const app = express();

  // Middleware - Fix CORS and COOP issues
  app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));
  
  // Add security headers to fix COOP issues
  app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  });
  
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ==========================================
  // BASIC HEALTH AND PING
  // ==========================================
  app.get("/api/ping", (req, res) => {
    res.json({ message: "pong", timestamp: new Date().toISOString() });
  });

  app.get("/api/health", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    await handleProxyResponse(
      res,
      createProxyRequest('/health'),
      "Backend health check failed"
    );
  });

  // ==========================================
  // AUTHENTICATION ROUTES - Proxy to FastAPI Backend
  // ==========================================
  app.post("/api/auth/login", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(req.body)
      }),
      "Login failed"
    );
  });

  app.post("/api/auth/register", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(req.body)
      }),
      "Registration failed"
    );
  });

  app.post("/api/auth/google", async (req, res) => {
    // Google OAuth is handled through the login endpoint with oauth_token
    const { credential } = req.body;
    await handleProxyResponse(
      res,
      createProxyRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          oauth_token: credential
        })
      }),
      "Google authentication failed"
    );
  });

  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    await handleProxyResponse(
      res,
      createProxyRequest('/api/auth/me', {
        method: 'GET',
        headers: {
          ...(authHeader && { 'Authorization': authHeader })
        }
      }),
      "Failed to get user info"
    );
  });

  // ==========================================
  // USER MANAGEMENT ROUTES
  // ==========================================
  app.get("/api/users", async (req, res) => {
    const { page = 1, limit = 10, search, role } = req.query;
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search: String(search) }),
      ...(role && { role: String(role) })
    });
    
    await handleProxyResponse(
      res,
      createProxyRequest(`/users?${queryParams}`, {
        headers: getAuthHeaders(req)
      }),
      "Failed to fetch users"
    );
  });

  app.post("/api/users", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/users', {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: getAuthHeaders(req)
      }),
      "Failed to create user"
    );
  });

  app.get("/api/users/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/users/${req.params.id}`),
      "Failed to fetch user"
    );
  });

  app.put("/api/users/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/users/${req.params.id}`, {
        method: 'PUT',
        body: JSON.stringify(req.body)
      }),
      "Failed to update user"
    );
  });

  app.delete("/api/users/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/users/${req.params.id}`, {
        method: 'DELETE'
      }),
      "Failed to delete user"
    );
  });

  // ==========================================
  // BRAND MANAGEMENT ROUTES
  // ==========================================
  app.get("/api/brands", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/brands', {
        headers: getAuthHeaders(req)
      }),
      "Failed to fetch brands"
    );
  });

  app.post("/api/brands", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/brands', {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: getAuthHeaders(req)
      }),
      "Failed to create brand"
    );
  });

  app.get("/api/brands/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/brands/${req.params.id}`),
      "Failed to fetch brand"
    );
  });

  app.put("/api/brands/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/brands/${req.params.id}`, {
        method: 'PUT',
        body: JSON.stringify(req.body)
      }),
      "Failed to update brand"
    );
  });

  app.delete("/api/brands/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/brands/${req.params.id}`, {
        method: 'DELETE'
      }),
      "Failed to delete brand"
    );
  });

  app.get("/api/brands/:brandName/history", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/brands/${req.params.brandName}/history`),
      "Failed to fetch brand history"
    );
  });

  // ==========================================
  // ANALYTICS ROUTES
  // ==========================================
  app.get("/api/analytics", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/analytics', {
        method: 'GET',
        headers: getAuthHeaders(req)
      }),
      "Failed to fetch analytics data"
    );
  });

  // ==========================================
  // ANALYSIS ROUTES
  // ==========================================
  app.post("/api/analyze-brand", async (req, res) => {
    console.log('🔍 analyze-brand request received');
    console.log('🔍 Authorization header:', req.headers.authorization);
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
    
    try {
      const authHeaders = getAuthHeaders(req);
      console.log('🔍 Auth headers being sent:', authHeaders);
      
      console.log('🔍 About to call handleProxyResponse...');
      await handleProxyResponse(
        res,
        createProxyRequest('/analyze-brand', {
          method: 'POST',
          body: JSON.stringify(req.body),
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        }),
        "Failed to analyze brand"
      );
      console.log('🔍 handleProxyResponse completed successfully');
    } catch (error) {
      console.error('🔍 Error in analyze-brand route:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error in analyze-brand route',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post("/api/optimization-metrics", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/optimization-metrics', {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: getAuthHeaders(req)
      }),
      "Failed to get optimization metrics"
    );
  });

  app.post("/api/analyze-queries", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/analyze-queries', {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: getAuthHeaders(req)
      }),
      "Failed to analyze queries"
    );
  });

  // ==========================================
  // API KEYS MANAGEMENT
  // ==========================================
  app.get("/api/api-keys", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/api-keys'),
      "Failed to fetch API keys"
    );
  });

  app.post("/api/api-keys", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/api-keys', {
        method: 'POST',
        body: JSON.stringify(req.body)
      }),
      "Failed to create API key"
    );
  });

  app.put("/api/api-keys/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/api-keys/${req.params.id}`, {
        method: 'PUT',
        body: JSON.stringify(req.body)
      }),
      "Failed to update API key"
    );
  });

  app.delete("/api/api-keys/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/api-keys/${req.params.id}`, {
        method: 'DELETE'
      }),
      "Failed to delete API key"
    );
  });

  // ==========================================
  // ANALYTICS ROUTES
  // ==========================================
  app.get("/api/analytics", async (req, res) => {
    const { period = '30d', brand } = req.query;
    const queryParams = new URLSearchParams({
      period: String(period),
      ...(brand && { brand: String(brand) })
    });
    
    await handleProxyResponse(
      res,
      createProxyRequest(`/analytics?${queryParams}`),
      "Failed to fetch analytics"
    );
  });

  // ==========================================
  // REPORTS ROUTES
  // ==========================================
  app.get("/api/reports", async (req, res) => {
    const { page = 1, limit = 10, type, brand } = req.query;
    const queryParams = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(type && { type: String(type) }),
      ...(brand && { brand: String(brand) })
    });
    
    await handleProxyResponse(
      res,
      createProxyRequest(`/reports?${queryParams}`),
      "Failed to fetch reports"
    );
  });

  app.post("/api/reports", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/reports', {
        method: 'POST',
        body: JSON.stringify(req.body)
      }),
      "Failed to create report"
    );
  });

  app.get("/api/reports/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/reports/${req.params.id}`),
      "Failed to fetch report"
    );
  });

  app.delete("/api/reports/:id", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest(`/reports/${req.params.id}`, {
        method: 'DELETE'
      }),
      "Failed to delete report"
    );
  });

  // ==========================================
  // BILLING ROUTES
  // ==========================================
  app.get("/api/billing", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/billing'),
      "Failed to fetch billing information"
    );
  });

  app.post("/api/billing/subscribe", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/billing/subscribe', {
        method: 'POST',
        body: JSON.stringify(req.body)
      }),
      "Failed to update subscription"
    );
  });

  app.post("/api/billing/payment-method", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/billing/payment-method', {
        method: 'POST',
        body: JSON.stringify(req.body)
      }),
      "Failed to add payment method"
    );
  });

  app.get("/api/billing/invoices", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/billing/invoices'),
      "Failed to fetch invoices"
    );
  });

  // ==========================================
  // SETTINGS ROUTES
  // ==========================================
  app.get("/api/settings", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/settings'),
      "Failed to fetch settings"
    );
  });

  app.put("/api/settings", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/settings', {
        method: 'PUT',
        body: JSON.stringify(req.body)
      }),
      "Failed to update settings"
    );
  });

  app.post("/api/settings/password", async (req, res) => {
    await handleProxyResponse(
      res,
      createProxyRequest('/settings/password', {
        method: 'POST',
        body: JSON.stringify(req.body)
      }),
      "Failed to change password"
    );
  });

  // ==========================================
  // LEGACY ROUTES
  // ==========================================
  app.get("/api/demo", handleDemo);

  // ==========================================
  // ERROR HANDLERS
  // ==========================================
  app.use("/api/*", (req, res) => {
    res.status(404).json({ 
      success: false,
      message: "API endpoint not found",
      path: req.path,
      timestamp: new Date().toISOString()
    });
  });

  return app;
}

export { createApp as createServer };

// Start server only in non-production when run directly
if (process.env.NODE_ENV !== 'production' && import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  const server = createServer(app);
  
  const port = process.env.PORT || 8080;
  
  server.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`📊 API available at http://localhost:${port}/api`);
    console.log(`🔗 Backend proxy: ${BACKEND_URL}`);
  });
}
