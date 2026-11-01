'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorState } from './ErrorState';
import { errorLogger } from '@/lib/errors';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; reset: () => void }) => ReactNode);
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    errorLogger.error(error, {
      component: this.props.name || 'AnonymousErrorBoundary',
      componentStack: errorInfo.componentStack,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  reset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
    });
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback({ error: this.state.error, reset: this.reset });
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 sm:p-6 my-4 bg-slate-900/60 rounded-2xl border border-rose-500/20 backdrop-blur-sm">
          <ErrorState
            title="Component Rendering Error"
            message={this.state.error.message || 'An unexpected rendering error occurred in this view.'}
            retryLabel="Try again"
            onRetry={this.reset}
          />
        </div>
      );
    }

    return this.props.children;
  }
}
