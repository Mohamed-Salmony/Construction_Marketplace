// Global Error Handler Utility
// Note: Using alert as fallback since react-hot-toast may not be available

export interface ErrorInfo {
  message: string;
  stack?: string;
  component?: string;
  action?: string;
  timestamp: string;
  userAgent: string;
  url: string;
}

class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorQueue: ErrorInfo[] = [];
  private maxErrors = 50; // Keep last 50 errors
  private originalConsoleError: ((...args: any[]) => void) | null = null;

  private constructor() {
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  private setupGlobalErrorHandlers() {
    // Handle uncaught JavaScript errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.logError({
          message: event.error?.message || event.message || 'Unknown error',
          stack: event.error?.stack,
          component: 'Global',
          action: 'window.error',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          message: event.reason?.message || String(event.reason) || 'Unhandled promise rejection',
          stack: event.reason?.stack,
          component: 'Global',
          action: 'unhandledrejection',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });

        // Prevent the error from crashing the app
        event.preventDefault();
      });

      // Handle console errors
      const originalConsoleError = console.error;
      (console as any)._originalError = originalConsoleError;
      
      console.error = (...args: any[]) => {
        // Avoid infinite loop by checking if we're already in error handling
        if ((console as any)._inErrorHandler) {
          originalConsoleError.apply(console, args);
          return;
        }

        (console as any)._inErrorHandler = true;
        
        try {
          const message = args.map(arg => 
            typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2)
          ).join(' ');

          this.logError({
            message: `Console Error: ${message}`,
            component: 'Console',
            action: 'console.error',
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
          });
        } catch (e) {
          // If there's an error in error handling, just use original console
          originalConsoleError('Error in error handler:', e);
        } finally {
          (console as any)._inErrorHandler = false;
        }

        // Still call the original console.error
        if (this.originalConsoleError) {
          this.originalConsoleError.apply(console, args);
        }
      };
    }
  }

  public logError(error: ErrorInfo): void {
    // Add to error queue
    this.errorQueue.push(error);
    
    // Keep only last maxErrors
    if (this.errorQueue.length > this.maxErrors) {
      this.errorQueue = this.errorQueue.slice(-this.maxErrors);
    }
    // Log to console for development using original console methods
    if (process.env.NODE_ENV === 'development') {
      // Use original console methods to avoid infinite loop
      const originalError = (console as any)._originalError || console.log;
      originalError('🚨 Application Error:', {
        message: error.message,
        component: error.component,
        action: error.action,
        stack: error.stack,
        url: error.url,
        timestamp: error.timestamp
      });
    }

    // Store in localStorage for debugging
    try {
      const storedErrors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      storedErrors.push(error);
      
      // Keep only last 20 errors in localStorage
      const recentErrors = storedErrors.slice(-20);
      localStorage.setItem('app_errors', JSON.stringify(recentErrors));
    } catch (e) {
      if (this.originalConsoleError) {
        this.originalConsoleError('Could not save error to localStorage:', e);
      }
    }
  }

  public getRecentErrors(): ErrorInfo[] {
    return [...this.errorQueue];
  }

  public clearErrors(): void {
    this.errorQueue = [];
    try {
      localStorage.removeItem('app_errors');
    } catch (e) {
      if (this.originalConsoleError) {
        this.originalConsoleError('Could not clear errors from localStorage:', e);
      }
    }
  }

  public handleApiError(error: any, context: string = 'API'): void {
    const errorMessage = this.extractErrorMessage(error);
    
    this.logError({
      message: errorMessage,
      stack: error?.stack,
      component: context,
      action: 'api_call',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    });

    // Show user-friendly message
    this.showUserError(errorMessage, context);
  }

  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.response?.data?.error) return error.response.data.error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'حدث خطأ غير متوقع';
  }

  private showUserError(message: string, context: string): void {
    if (typeof window === 'undefined') return;

    // Don't show toast for certain non-critical errors
    const nonCriticalErrors = [
      'network error',
      'timeout',
      'cancelled',
      'aborted'
    ];

    const isNonCritical = nonCriticalErrors.some(term => 
      message.toLowerCase().includes(term)
    );

    if (!isNonCritical) {
      try {
        // Try to use toast if available, otherwise use alert
        if (typeof window !== 'undefined') {
          // Simple user notification using original console.error to prevent recursion
          if (this.originalConsoleError) {
            this.originalConsoleError(`خطأ في ${context}: ${message}`);
          }
          
          // You can integrate with your preferred toast library here
          // For now using console.error as it's always available
        }
      } catch (e) {
        if (this.originalConsoleError) {
          this.originalConsoleError('Could not show error notification:', e);
        }
      }
    }
  }
}

// Safe wrapper for async operations
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  context: string = 'Unknown'
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    GlobalErrorHandler.getInstance().handleApiError(error, context);
    return fallback;
  }
}

// Safe wrapper for sync operations
export function safeSync<T>(
  operation: () => T,
  fallback?: T,
  context: string = 'Unknown'
): T | undefined {
  try {
    return operation();
  } catch (error: any) {
    GlobalErrorHandler.getInstance().logError({
      message: error?.message || String(error),
      stack: error?.stack,
      component: context,
      action: 'sync_operation',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
    });
    return fallback;
  }
}

// Initialize global error handler
export const errorHandler = GlobalErrorHandler.getInstance();

// Export convenience functions
export const logError = (error: Partial<ErrorInfo>) => {
  errorHandler.logError({
    message: error.message || 'Unknown error',
    stack: error.stack,
    component: error.component || 'Unknown',
    action: error.action || 'unknown_action',
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
    url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
  });
};

export const handleApiError = (error: any, context: string = 'API') => {
  errorHandler.handleApiError(error, context);
};

export const getRecentErrors = () => errorHandler.getRecentErrors();
export const clearErrors = () => errorHandler.clearErrors();
