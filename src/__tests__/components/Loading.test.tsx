import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner, PageLoading, InlineLoading } from '../../components/ui/Loading';

/**
 * `useReducedMotion` reads matchMedia once and caches it in a module-level
 * listener, so flipping window.matchMedia between tests is unreliable. Mocking
 * the hook itself makes both branches deterministic.
 */
let reducedMotion = false;

vi.mock('motion/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => reducedMotion };
});

beforeEach(() => {
  reducedMotion = false;
});

describe('Spinner', () => {
  it('exposes a live status region with an accessible label', () => {
    render(<Spinner />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    // Never a bare spinning div: there is always a text alternative.
    expect(status).toHaveTextContent('Loading');
  });

  it('uses the caller-supplied label', () => {
    render(<Spinner label="Signing in" />);

    expect(screen.getByRole('status')).toHaveTextContent('Signing in');
  });

  it('renders the ring alone when decorative, leaving the label to the caller', () => {
    render(<Spinner decorative />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByTestId('spinner')).toHaveAttribute('aria-hidden', 'true');
  });

  it('animates the ring when motion is allowed', () => {
    render(<Spinner />);

    expect(screen.getByTestId('spinner')).toHaveAttribute('data-reduced-motion', 'false');
  });

  it('renders a static ring — not a slower spin — under prefers-reduced-motion', () => {
    reducedMotion = true;
    render(<Spinner />);

    const ring = screen.getByTestId('spinner');
    expect(ring).toHaveAttribute('data-reduced-motion', 'true');
    // No CSS keyframe animation is attached either — the old hand-rolled
    // `@keyframes spin` is gone.
    expect(ring.style.animation).toBe('');
    expect(ring.style.animationName).toBe('');
    // The status text still tells a screen reader what is happening.
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});

describe('PageLoading', () => {
  it('renders a polite status region with a visible label', () => {
    render(<PageLoading />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Loading');
    // One status region only — the inner ring is decorative.
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('accepts a custom label', () => {
    render(<PageLoading label="Loading your orders" />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading your orders');
  });

  it('renders without animation under prefers-reduced-motion', () => {
    reducedMotion = true;
    render(<PageLoading />);

    const ring = screen.getByTestId('spinner');
    expect(ring).toHaveAttribute('data-reduced-motion', 'true');
    expect(ring.style.animation).toBe('');
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});

describe('InlineLoading', () => {
  it('shows its label inside a polite status region', () => {
    render(<InlineLoading label="Saving changes" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Saving changes');
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('keeps the label when motion is reduced', () => {
    reducedMotion = true;
    render(<InlineLoading label="Saving changes" />);

    expect(screen.getByTestId('spinner')).toHaveAttribute('data-reduced-motion', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Saving changes');
  });
});
