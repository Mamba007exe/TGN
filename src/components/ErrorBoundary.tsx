import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#E9ECEF] flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white border-2 border-[#CED4DA] p-6 shadow-lg text-[#212529]">
            <div className="flex items-center gap-3 pb-4 border-b border-[#CED4DA]">
              <div className="w-10 h-10 bg-[#dc3545]/10 border border-[#dc3545] flex items-center justify-center text-[#dc3545]">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-base font-black text-[#004182] uppercase tracking-wide">
                  System Exception Recovered
                </h1>
                <p className="text-xs text-[#6C757D]">
                  The Goodwill Network encountered an unexpected UI rendering error.
                </p>
              </div>
            </div>

            <div className="my-4 p-3 bg-[#F8F9FA] border border-[#CED4DA] text-xs font-mono text-[#495057] overflow-x-auto">
              <p className="font-bold text-[#dc3545] mb-1">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'Unknown error'}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[10px] text-[#6C757D] whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {this.state.errorInfo.componentStack.trim()}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-2.5 px-4 bg-[#004182] hover:bg-[#003366] text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4" />
                Try Re-rendering
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto py-2.5 px-4 bg-white hover:bg-[#E9ECEF] border border-[#CED4DA] text-xs font-bold text-[#495057] uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Home className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
