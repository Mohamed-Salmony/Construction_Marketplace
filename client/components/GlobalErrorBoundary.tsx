import React from 'react';

/**
 * GlobalErrorBoundary catches render-time errors anywhere in the React tree
 * and renders a fallback UI without breaking the whole app/server.
 */
export class GlobalErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Log to console, or send to your backend logging endpoint
    // fetch('/api/logs', { method: 'POST', body: JSON.stringify({ error, errorInfo }) });
    // eslint-disable-next-line no-console
    console.error('[GlobalErrorBoundary] Caught error:', error, errorInfo);
  }

  handleRetry = () => {
    // Reset error state and try re-rendering children
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md w-full border rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mb-4">
              An unexpected error occurred. Please try again. If the problem persists, contact support.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center justify-center rounded-md bg-primary text-white px-4 py-2 text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default GlobalErrorBoundary;
