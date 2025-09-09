import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <Card className="card-sacred max-w-2xl w-full text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-destructive to-destructive/80 rounded-3xl flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-2xl font-serif font-medium mb-4">
              Something Unexpected Happened
            </h1>
            
            <p className="text-emotion mb-8">
              We're sorry, but something went wrong while preserving your precious memories. 
              Your data is safe, and we're here to help you continue your journey.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button onClick={this.handleRetry} className="btn-hero">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              
              <Button variant="outline" onClick={this.handleGoHome} className="btn-gentle">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-muted/20 rounded-lg p-4 mt-6">
                <summary className="cursor-pointer font-medium mb-2">
                  Technical Details (Development Mode)
                </summary>
                <pre className="text-xs overflow-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Feature-specific error boundary for AI operations
export const AIErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-8">
          <Card className="card-memory text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-secondary to-secondary-glow rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium mb-2">AI Features Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              AI features are temporarily unavailable. You can still create beautiful heirlooms using our templates.
            </p>
            <Button variant="outline" className="btn-gentle" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        </div>
      }
      onError={(error) => {
        console.error('AI Error:', error);
        // Could send to error tracking service here
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

// Voice-specific error boundary
export const VoiceErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex items-center justify-center p-8">
          <Card className="card-memory text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-accent to-accent-glow rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-medium mb-2">Voice Features Unavailable</h3>
            <p className="text-muted-foreground mb-4">
              Voice features are temporarily unavailable. You can continue creating your heirloom without voice cloning.
            </p>
            <Button variant="outline" className="btn-gentle" onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </Card>
        </div>
      }
      onError={(error) => {
        console.error('Voice Error:', error);
        // Could send to error tracking service here
      }}
    >
      {children}
    </ErrorBoundary>
  );
};