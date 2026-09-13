import React from 'react';
import { AlertTriangle } from 'lucide-react';
import StatusScreen from './ui/StatusScreen';

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

    /**
     * The visitor gets a sentence, two ways out and nothing else. The error
     * text is deliberately NOT shown: a stack trace is no use to a shopper
     * and can carry internals that should not be on screen. It goes to the
     * console, where componentDidCatch already put it.
     *
     * "Try again" re-renders in place, which is the right first move for a
     * transient failure (a chunk that failed to fetch, a race on mount) and
     * costs the visitor nothing if it does not help — the homepage link is
     * still there underneath.
     */
    return (
      <StatusScreen
        live="alert"
        icon={<span className="status-screen__icon"><AlertTriangle size={30} /></span>}
        title="Something went wrong"
        body="This page hit an error while loading. Nothing you were doing has been lost."
        actions={[
          { label: 'Try again', onClick: this.reset, variant: 'primary' },
          { label: 'Go to homepage', to: '/' },
        ]}
      />
    );
  }
}
