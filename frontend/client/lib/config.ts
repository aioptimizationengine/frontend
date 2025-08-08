// Application configuration
export const config = {
  // API base URL - can be overridden by environment variable
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  
  // API settings
  defaultTimeout: 30000, // 30 seconds
  retryAttempts: 1,
  
  // Feature flags
  enableRetry: true,
  enableLogging: import.meta.env.DEV,
} as const;

// Logging utility
export const log = {
  info: (message: string, ...args: any[]) => {
    if (config.enableLogging) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    if (config.enableLogging) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (config.enableLogging) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }
};
