'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorDisplay } from './ErrorDisplay';
import { createAppError, type AppError } from '@/lib/types/errors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: createAppError(error),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <ErrorDisplay
              error={this.state.error}
              onRetry={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
