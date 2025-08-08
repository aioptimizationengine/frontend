# AI Optimization Engine

A production-ready full-stack AI brand optimization platform featuring role-based access control, comprehensive analytics, and enterprise-grade security monitoring.

## 🚀 Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd ai-optimization-engine

# Install dependencies
npm install

# Start the development server
npm run dev

# Open your browser to http://localhost:8080
```

## 📋 System Requirements

### Minimum Requirements
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space

### Supported Operating Systems
- macOS 10.15 or later
- Windows 10 or later
- Ubuntu 18.04 or later
- Any Linux distribution with Node.js support

## 🛠️ Prerequisites

Before running the project, ensure you have the following installed:

### 1. Node.js and npm
```bash
# Check if Node.js is installed
node --version  # Should be 18.0.0 or higher

# Check if npm is installed
npm --version   # Should be 8.0.0 or higher
```

**Installation:**
- **macOS**: `brew install node` or download from [nodejs.org](https://nodejs.org/)
- **Windows**: Download from [nodejs.org](https://nodejs.org/)
- **Ubuntu/Debian**: `sudo apt update && sudo apt install nodejs npm`
- **CentOS/RHEL**: `sudo yum install nodejs npm`

### 2. Git (Optional but recommended)
```bash
# Check if Git is installed
git --version
```

**Installation:**
- **macOS**: `brew install git` or use Xcode Command Line Tools
- **Windows**: Download from [git-scm.com](https://git-scm.com/)
- **Linux**: Use your package manager (e.g., `sudo apt install git`)

## 📁 Project Setup

### 1. Clone or Download the Project
```bash
# Option A: Clone with Git
git clone <repository-url>
cd ai-optimization-engine

# Option B: Download ZIP
# Extract the ZIP file and navigate to the project directory
```

### 2. Install Dependencies
```bash
# Install all project dependencies
npm install

# This will install both frontend and backend dependencies
# The process may take 2-5 minutes depending on your internet speed
```

### 3. Verify Installation
```bash
# Check if all dependencies are installed correctly
npm list --depth=0
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
# Start the development server (frontend + backend)
npm run dev

# The application will be available at:
# - Frontend: http://localhost:8080
# - API: http://localhost:8080/api
```

**Development Features:**
- ✅ Hot reload for both client and server code
- ✅ TypeScript compilation
- ✅ Automatic browser refresh
- ✅ Source maps for debugging
- ✅ Error overlay in browser

### Production Mode
```bash
# Build the application for production
npm run build

# Start the production server
npm start

# The application will be available at:
# - http://localhost:8080 (or PORT environment variable)
```

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (client + server) |
| `npm run build:client` | Build only the frontend |
| `npm run build:server` | Build only the backend |
| `npm start` | Start production server |
| `npm test` | Run test suite with Vitest |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format.fix` | Format code with Prettier |

## 🌍 Environment Configuration

### Environment Variables
Create a `.env` file in the root directory (optional):

```bash
# Server Configuration
PORT=8080
NODE_ENV=development

# Database Configuration (if using external database)
# DATABASE_URL=postgresql://user:password@localhost:5432/aioptimizer

# API Keys (for external services)
# ANTHROPIC_API_KEY=your_anthropic_key
# OPENAI_API_KEY=your_openai_key

# Security Configuration
# JWT_SECRET=your_jwt_secret_key
# SESSION_SECRET=your_session_secret
```

### Default Configuration
The application works out of the box with default settings:
- **Port**: 8080
- **Environment**: development
- **Database**: In-memory mock data
- **Authentication**: Mock JWT tokens

## 👤 Demo Accounts

The application includes pre-configured demo accounts:

### Super Admin Account
- **Email**: `admin@example.com`
- **Password**: `admin123`
- **Access**: All features including user management and admin controls

### Normal User Account
- **Email**: `user@example.com`
- **Password**: `user123`
- **Access**: Standard features (brands, analysis, reports, billing, settings)

## 🏗️ Project Structure

```
ai-optimization-engine/
├── client/                     # React frontend
│   ├── components/             # Reusable UI components
│   │   ├── ui/                # Base UI components (shadcn/ui)
│   │   └── layout/            # Layout components
│   ├── contexts/              # React contexts (Auth, etc.)
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utility functions
│   ├── pages/                 # Page components
│   │   ├── auth/              # Authentication pages
│   │   └── admin/             # Admin-only pages
│   ├── App.tsx                # Main app component with routing
│   └── global.css             # Global styles and Tailwind
├── server/                     # Express backend
│   ├── routes/                # API route handlers
│   ├── index.ts               # Main server setup
│   └── node-build.ts          # Production build entry
├── shared/                     # Shared types and utilities
│   ├── api.ts                 # API interface definitions
│   └── types.ts               # TypeScript type definitions
├── public/                     # Static assets
├── dist/                       # Built application (generated)
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── vite.config.ts             # Vite frontend build config
└── vite.config.server.ts      # Vite backend build config
```

## 🔧 Development Workflow

### Making Code Changes

1. **Frontend Changes**: Edit files in `client/` directory
   - Components: `client/components/`
   - Pages: `client/pages/`
   - Styles: `client/global.css`

2. **Backend Changes**: Edit files in `server/` directory
   - API routes: `server/routes/`
   - Server logic: `server/index.ts`

3. **Shared Code**: Edit files in `shared/` directory
   - Types: `shared/types.ts`
   - API interfaces: `shared/api.ts`

### Hot Reload
- Frontend changes reload automatically
- Backend changes restart the server automatically
- TypeScript errors appear in the browser and terminal

### Adding New Dependencies
```bash
# Frontend dependencies
npm install package-name

# Development dependencies
npm install --save-dev package-name
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure
- Unit tests: `*.spec.ts` or `*.test.ts` files
- Component tests: `*.spec.tsx` or `*.test.tsx` files
- Test framework: Vitest

## 🚀 Deployment

### Building for Production
```bash
# Create production build
npm run build

# This creates:
# - dist/spa/          Frontend build
# - dist/server/       Backend build
```

### Deployment Options

#### 1. Node.js Server
```bash
npm run build
npm start
```

#### 2. Static Hosting (Frontend only)
```bash
npm run build:client
# Deploy contents of dist/spa/ to your static host
```

#### 3. Docker (if Dockerfile is available)
```bash
docker build -t ai-optimizer .
docker run -p 8080:8080 ai-optimizer
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Error: EADDRINUSE: address already in use :::8080
# Solution: Kill the process using port 8080
lsof -ti:8080 | xargs kill -9
# Or change the port
PORT=3000 npm run dev
```

#### 2. Node.js Version Issues
```bash
# Error: Unsupported Node.js version
# Solution: Update Node.js
nvm install 18    # If using nvm
nvm use 18
```

#### 3. npm Install Fails
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 4. TypeScript Errors
```bash
# Run type checking
npm run typecheck

# Common fixes:
# - Restart your IDE/editor
# - Clear TypeScript cache in your editor
```

#### 5. Build Fails
```bash
# Clear build cache
rm -rf dist/
npm run build
```

### Performance Issues

#### Slow Development Server
```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

#### Large Bundle Size
```bash
# Analyze bundle size
npm run build
# Check dist/spa/ directory size
```

## 📚 Key Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Styling**: Tailwind CSS 3 + shadcn/ui components
- **State Management**: React Context + Hooks
- **Routing**: React Router 6 (SPA mode)
- **Testing**: Vitest
- **Build Tool**: Vite
- **Type Safety**: TypeScript throughout

## 🔐 Security Features

- Role-based access control (RBAC)
- JWT authentication
- Input validation and sanitization
- CORS protection
- Rate limiting
- Session management
- Password policy enforcement

## 📈 Features Overview

### User Features
- ✅ Brand management and analysis
- ✅ AI-powered insights and recommendations
- ✅ Comprehensive reporting system (view-only)
- ✅ Usage analytics and tracking
- ✅ API key management
- ✅ Billing and subscription management with Stripe
- ✅ Comprehensive settings with password reset and preferences

### Admin Features
- ✅ User management and role assignment
- ✅ Advanced user analytics and monitoring

### Developer Features
- ✅ TypeScript for type safety
- ✅ Hot reload development
- ✅ Component library (shadcn/ui)
- ✅ Responsive design system
- ✅ Production-ready build system

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests: `npm test`
5. Check types: `npm run typecheck`
6. Format code: `npm run format.fix`
7. Commit changes: `git commit -m "Description"`
8. Push to branch: `git push origin feature-name`
9. Create a Pull Request

## ��� Support

If you encounter any issues:

1. Check this README for common solutions
2. Search existing issues in the repository
3. Create a new issue with:
   - Your operating system and Node.js version
   - Complete error message
   - Steps to reproduce the problem
   - Expected vs actual behavior

## 📄 License

This project is proprietary software. All rights reserved.

---

**Happy coding! 🚀**

For additional help, refer to the documentation of the key technologies:
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
