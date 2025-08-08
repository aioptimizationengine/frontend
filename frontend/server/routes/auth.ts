import { RequestHandler } from "express";
import { LoginRequest, RegisterRequest, AuthResponse, ErrorResponse } from "../../shared/api";
import { UserRole } from "../../shared/types";
import { OAuth2Client } from "google-auth-library";

// Mock user data for development
const mockUsers = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Super Admin',
    role: UserRole.SUPER_ADMIN,
    company: 'AI Optimizer Inc',
    password: 'admin123', // In production, this would be hashed
    isEmailVerified: true,
    is2FAEnabled: false,
    lastActive: new Date(),
    createdAt: new Date('2024-01-01'),
    oauthProvider: undefined,
    oauthId: undefined
  },
  {
    id: '2',
    email: 'user@example.com',
    name: 'Normal User',
    role: UserRole.USER,
    company: 'TechCorp',
    password: 'user123',
    isEmailVerified: true,
    is2FAEnabled: false,
    lastActive: new Date(),
    createdAt: new Date('2024-01-15'),
    oauthProvider: undefined,
    oauthId: undefined
  }
];

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const handleLogin: RequestHandler = (req, res) => {
  const { email, password } = req.body as LoginRequest;

  // Validate input
  if (!email || !password) {
    const error: ErrorResponse = {
      success: false,
      error: 'Email and password are required',
      message: 'Email and password are required',
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(error);
  }

  // Find user
  const user = mockUsers.find(u => u.email === email);
  if (!user || user.password !== password) {
    const error: ErrorResponse = {
      success: false,
      error: 'Invalid email or password',
      message: 'Invalid email or password',
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(error);
  }

  // Generate mock JWT token
  const token = `mock-jwt-token-${user.id}-${Date.now()}`;

  // Update last active
  user.lastActive = new Date();

  const response: AuthResponse = {
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        isEmailVerified: user.isEmailVerified,
        is2FAEnabled: user.is2FAEnabled,
        lastActive: user.lastActive.toISOString(),
        createdAt: user.createdAt.toISOString(),
        oauthProvider: user.oauthProvider,
        oauthId: user.oauthId
      },
      token
    },
    timestamp: new Date().toISOString()
  };

  res.json(response);
};

export const handleGoogleAuth: RequestHandler = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    const error: ErrorResponse = {
      success: false,
      error: 'Google credential is required',
      message: 'Google credential is required',
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(error);
  }

  try {
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload) {
      const error: ErrorResponse = {
        success: false,
        error: 'Invalid Google token',
        message: 'Invalid Google token',
        timestamp: new Date().toISOString()
      };
      return res.status(401).json(error);
    }

    const { email, name, picture, sub: googleId } = payload;

    if (!email) {
      const error: ErrorResponse = {
        success: false,
        error: 'Email is required from Google',
        message: 'Email is required from Google',
        timestamp: new Date().toISOString()
      };
      return res.status(400).json(error);
    }

    // Check if user already exists
    let user = mockUsers.find(u => u.email === email);

    if (!user) {
      // Create new user from Google OAuth (always as regular user, never admin)
      const newUser = {
        id: (mockUsers.length + 1).toString(),
        email: email,
        name: name || 'Google User',
        role: UserRole.USER, // Always create as regular user
        company: undefined,
        password: '', // OAuth users don't have passwords
        isEmailVerified: true, // Google accounts are verified
        is2FAEnabled: false,
        lastActive: new Date(),
        createdAt: new Date(),
        oauthProvider: 'google' as const,
        oauthId: googleId
      };

      mockUsers.push(newUser);
      user = newUser;
    } else {
      // If user exists, check if they're an admin
      if (user.role === UserRole.SUPER_ADMIN) {
        const error: ErrorResponse = {
          success: false,
          error: 'Google OAuth is not available for admin accounts. Please use your admin credentials.',
          message: 'Google OAuth is not available for admin accounts. Please use your admin credentials.',
          timestamp: new Date().toISOString()
        };
        return res.status(403).json(error);
      }
      
      // Update existing user's OAuth info if not set
      if (!user.oauthProvider) {
        user.oauthProvider = 'google';
        user.oauthId = googleId;
      }
      user.lastActive = new Date();
    }

    // Generate mock JWT token
    const token = `mock-jwt-token-${user.id}-${Date.now()}`;

    const response: AuthResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          company: user.company,
          isEmailVerified: user.isEmailVerified,
          is2FAEnabled: user.is2FAEnabled,
          lastActive: user.lastActive.toISOString(),
          createdAt: user.createdAt.toISOString(),
          oauthProvider: user.oauthProvider,
          oauthId: user.oauthId
        },
        token
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Google OAuth error:', error);
    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Google authentication failed',
      message: 'Google authentication failed',
      timestamp: new Date().toISOString()
    };
    res.status(401).json(errorResponse);
  }
};

export const handleRegister: RequestHandler = (req, res) => {
  const { name, email, company, password } = req.body as RegisterRequest;

  // Validate input
  if (!name || !email || !password) {
    const error: ErrorResponse = {
      success: false,
      error: 'Name, email, and password are required',
      message: 'Name, email, and password are required',
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(error);
  }

  // Check if user already exists
  const existingUser = mockUsers.find(u => u.email === email);
  if (existingUser) {
    const error: ErrorResponse = {
      success: false,
      error: 'User with this email already exists',
      message: 'User with this email already exists',
      timestamp: new Date().toISOString()
    };
    return res.status(409).json(error);
  }

  // Validate password strength
  if (password.length < 12) {
    const error: ErrorResponse = {
      success: false,
      error: 'Password must be at least 12 characters long',
      message: 'Password must be at least 12 characters long',
      timestamp: new Date().toISOString()
    };
    return res.status(400).json(error);
  }

  // Create new user
  const newUser = {
    id: (mockUsers.length + 1).toString(),
    email,
    name,
    role: UserRole.USER,
    company,
    password, // In production, this would be hashed
    isEmailVerified: false,
    is2FAEnabled: false,
    lastActive: new Date(),
    createdAt: new Date(),
    oauthProvider: undefined,
    oauthId: undefined
  };

  mockUsers.push(newUser);

  // Generate mock JWT token
  const token = `mock-jwt-token-${newUser.id}-${Date.now()}`;

  const response: AuthResponse = {
    success: true,
    data: {
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        company: newUser.company,
        isEmailVerified: newUser.isEmailVerified,
        is2FAEnabled: newUser.is2FAEnabled,
        lastActive: newUser.lastActive.toISOString(),
        createdAt: newUser.createdAt.toISOString(),
        oauthProvider: newUser.oauthProvider,
        oauthId: newUser.oauthId
      },
      token
    },
    timestamp: new Date().toISOString()
  };

  res.status(201).json(response);
};

export const handleMe: RequestHandler = (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token || !token.startsWith('mock-jwt-token-')) {
    const error: ErrorResponse = {
      success: false,
      error: 'Invalid or missing token',
      message: 'Invalid or missing token',
      timestamp: new Date().toISOString()
    };
    return res.status(401).json(error);
  }

  // Extract user ID from mock token
  const tokenParts = token.split('-');
  const userId = tokenParts[3];

  const user = mockUsers.find(u => u.id === userId);
  if (!user) {
    const error: ErrorResponse = {
      success: false,
      error: 'User not found',
      message: 'User not found',
      timestamp: new Date().toISOString()
    };
    return res.status(404).json(error);
  }

  // Update last active
  user.lastActive = new Date();

  const response = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company,
    isEmailVerified: user.isEmailVerified,
    is2FAEnabled: user.is2FAEnabled,
    lastActive: user.lastActive.toISOString(),
    createdAt: user.createdAt.toISOString(),
    oauthProvider: user.oauthProvider,
    oauthId: user.oauthId
  };

  res.json(response);
};
