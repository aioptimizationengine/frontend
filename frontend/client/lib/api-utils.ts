import { useRef } from 'react';
import { config, log } from './config';

// Check if we're in a network-available environment
export const isNetworkAvailable = (): boolean => {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // Assume online if we can't detect
};

// Production-ready error response
const createErrorResponse = (message: string, code?: string): any => {
  return {
    success: false,
    error: message,
    code: code || 'SERVICE_UNAVAILABLE',
    timestamp: new Date().toISOString()
  };
};

// Fallback response for when backend is unavailable
export const createFallbackResponse = (message: string = 'Service temporarily unavailable', url: string = ''): Response => {
  const errorData = createErrorResponse(message, 'NETWORK_ERROR');

  return new Response(JSON.stringify(errorData), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// Production timeout durations
export const TIMEOUT_DURATIONS = {
  SHORT: 10000,  // 10 seconds for simple requests
  MEDIUM: 30000, // 30 seconds for analysis requests
  LONG: 60000,   // 60 seconds for heavy operations
} as const;

// Enhanced AbortController wrapper with proper error handling
export class ApiController {
  private controller: AbortController;
  private timeoutId: NodeJS.Timeout | null = null;
  private isMounted: React.RefObject<boolean>;

  constructor(isMountedRef: React.RefObject<boolean>) {
    this.controller = new AbortController();
    this.isMounted = isMountedRef;
  }

  // Setup timeout with proper cleanup
  setTimeout(duration: number, reason: string = 'Request timeout'): void {
    this.timeoutId = setTimeout(() => {
      if (!this.controller.signal.aborted && this.isMounted.current) {
        this.controller.abort(reason);
      }
    }, duration);
  }

  // Get the signal for fetch requests
  get signal(): AbortSignal {
    return this.controller.signal;
  }

  // Check if request was aborted
  get isAborted(): boolean {
    return this.controller.signal.aborted;
  }

  // Manual abort with reason
  abort(reason: string = 'Request cancelled'): void {
    if (!this.controller.signal.aborted) {
      this.controller.abort(reason);
    }
  }

  // Cleanup resources
  cleanup(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (!this.controller.signal.aborted) {
      this.controller.abort('Component unmounting');
    }
  }
}

// Utility to handle API errors consistently
export const handleApiError = (error: unknown, isMounted: React.RefObject<boolean>): string | null => {
  // Only process errors if component is still mounted
  if (!isMounted.current) {
    return null;
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      // Request was aborted - this is expected behavior
      return null;
    } else if (
      error.name === 'TypeError' ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('ERR_NETWORK') ||
      error.message.includes('ERR_INTERNET_DISCONNECTED') ||
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND')
    ) {
      // Network error - API not available
      return 'Unable to connect to server. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      // Timeout specific error
      return 'Request timed out. The server may be experiencing high load.';
    } else {
      // Other errors
      return error.message;
    }
  }

  return 'An unexpected error occurred';
};

// Enhanced fetch wrapper with retry logic and standardized error handling
export const fetchWithTimeout = async (
  url: string,
  options: RequestInit & { timeout?: number, retries?: number } = {},
  isMountedRef: React.RefObject<boolean>
): Promise<Response> => {
  const { timeout = TIMEOUT_DURATIONS.SHORT, retries = config.retryAttempts, ...fetchOptions } = options;

  let lastError: Error | null = null;

  // Try the request with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    // Check if component is still mounted before each attempt
    if (!isMountedRef.current) {
      throw new Error('Component unmounted');
    }

    const controller = new ApiController(isMountedRef);
    controller.setTimeout(timeout, `Request timeout after ${timeout}ms (attempt ${attempt + 1})`);

    try {
      log.info(`Making API request to ${url} (attempt ${attempt + 1}/${retries + 1})`);

      // Get auth token from localStorage if available
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...fetchOptions.headers,
        },
      });

      controller.cleanup();
      log.info(`API request to ${url} completed with status ${response.status}`);
      return response;
    } catch (error) {
      controller.cleanup();
      lastError = error instanceof Error ? error : new Error('Unknown fetch error');

      log.error(`API request to ${url} failed on attempt ${attempt + 1}:`, lastError.message);

      // Don't retry on abort errors or if it's the last attempt
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }

      if (attempt === retries) {
        log.error(`All retry attempts exhausted for ${url}`);
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('All retry attempts failed');
};

// Hook for managing API controllers
export const useApiController = () => {
  const isMountedRef = useRef(true);
  const controllersRef = useRef<Map<string, ApiController>>(new Map());

  // Create or get controller for a specific key
  const getController = (key: string): ApiController => {
    // Cleanup existing controller if it exists
    const existing = controllersRef.current.get(key);
    if (existing) {
      existing.cleanup();
    }

    // Create new controller
    const controller = new ApiController(isMountedRef);
    controllersRef.current.set(key, controller);
    return controller;
  };

  // Cleanup specific controller
  const cleanupController = (key: string): void => {
    const controller = controllersRef.current.get(key);
    if (controller) {
      controller.cleanup();
      controllersRef.current.delete(key);
    }
  };

  // Cleanup all controllers
  const cleanupAll = (): void => {
    isMountedRef.current = false;
    controllersRef.current.forEach(controller => controller.cleanup());
    controllersRef.current.clear();
  };

  return {
    isMountedRef,
    getController,
    cleanupController,
    cleanupAll,
  };
};
