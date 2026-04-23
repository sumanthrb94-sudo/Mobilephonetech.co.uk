import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

/**
 * Top-level error boundary — catches render-time and lifecycle errors from
 * lazy-loaded routes so a thrown component can't produce a blank screen.
 *
 * Default fallback gives the user a readable message + "Try again" + "Go home"
 * so they always have an out; custom `fallback` lets specific sections render
 * their own recovery UI.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.state.error!, this.reset);

    return (
      <div
        role="alert"
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--grey-0)',
          padding: 'var(--spacing-48) var(--spacing-16)',
        }}
      >
        <div style={{ maxWidth: '420px', textAlign: 'center' }}>
          <h2
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--black)',
              margin: '0 0 8px 0',
            }}
          >
            Something went wrong.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--grey-60)',
              margin: '0 0 24px 0',
              lineHeight: 1.5,
            }}
          >
            This page hit an error while loading. You can try again, or head back to the homepage.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={this.reset} className="btn btn-primary btn-md">
              Try again
            </button>
            <a href="/" className="btn btn-secondary btn-md" style={{ textDecoration: 'none' }}>
              Go to homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
}
