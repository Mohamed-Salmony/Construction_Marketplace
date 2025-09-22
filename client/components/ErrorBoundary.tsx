import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { errorHandler, logError } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Date.now().toString(36)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { context = 'React Component' } = this.props;
    
    // Log the error
    logError({
      message: error.message,
      stack: error.stack,
      component: context,
      action: 'component_crash'
    });

    // Store detailed error info
    this.setState({
      error,
      errorInfo,
      errorId: Date.now().toString(36)
    });

    console.group('🚨 React Error Boundary');
    console.error('Context:', context);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.groupEnd();
  }

  private handleRefresh = () => {
    // Clear the error state
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Try to refresh the page if error persists
    setTimeout(() => {
      if (this.state.hasError) {
        window.location.reload();
      }
    }, 100);
  };

  private handleGoHome = () => {
    try {
      // Clear error state
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      
      // Navigate to home
      const url = new URL(window.location.href);
      url.searchParams.set('page', 'home');
      window.location.href = url.toString();
    } catch (e) {
      // Fallback navigation
      window.location.href = '/';
    }
  };

  private copyErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    const { context } = this.props;
    
    const errorDetails = {
      id: errorId,
      context: context || 'Unknown',
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      componentStack: errorInfo?.componentStack || 'No component stack',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    try {
      navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
      alert('تم نسخ تفاصيل الخطأ إلى الحافظة');
    } catch (e) {
      console.error('Could not copy error details:', e);
    }
  };

  render() {
    if (this.state.hasError) {
      // Check if custom fallback is provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-red-600">حدث خطأ غير متوقع</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                نعتذر، حدث خطأ في التطبيق. يمكنك المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="text-left bg-red-50 p-3 rounded-md">
                  <p className="text-sm font-mono text-red-700 break-words">
                    {this.state.error.message}
                  </p>
                  {this.state.errorId && (
                    <p className="text-xs text-red-500 mt-2">
                      Error ID: {this.state.errorId}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleRefresh}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  إعادة المحاولة
                </Button>
                
                <Button 
                  onClick={this.handleGoHome}
                  className="flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  الصفحة الرئيسية
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <Button 
                  onClick={this.copyErrorDetails}
                  variant="ghost"
                  size="sm"
                  className="w-full"
                >
                  <Bug className="w-4 h-4 mr-2" />
                  نسخ تفاصيل الخطأ
                </Button>
              )}
              
              <p className="text-xs text-muted-foreground">
                إذا استمر الخطأ، يرجى التواصل مع الدعم الفني
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Higher-order component for easy wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  context?: string
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary context={context || Component.displayName || Component.name}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Safe component wrapper
export function SafeComponent({ 
  children, 
  fallback, 
  context 
}: { 
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}) {
  return (
    <ErrorBoundary fallback={fallback} context={context}>
      {children}
    </ErrorBoundary>
  );
}
