import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BrandMark from '../../components/ui/BrandMark';
import StatusScreen from '../../components/ui/StatusScreen';
import ErrorBoundary from '../../components/ErrorBoundary';
import OfflineNotice from '../../components/OfflineNotice';

/**
 * The screens shown when there is nothing to show: waiting, offline, errored.
 *
 * The property worth pinning hardest is that a failure always leaves a way
 * out. A dead end with no action on it is how a visitor gets stuck, and it is
 * invisible in review because the screen still looks finished.
 */

let reducedMotion = false;
vi.mock('motion/react', async (orig) => {
  const actual = await orig<typeof import('motion/react')>();
  return { ...actual, useReducedMotion: () => reducedMotion };
});

const inRouter = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  reducedMotion = false;
  vi.restoreAllMocks();
});

describe('BrandMark', () => {
  it('holds still unless it is being used as a waiting state', () => {
    render(<BrandMark />);
    expect(screen.getByTestId('brand-mark').dataset.spinning).toBe('false');
  });

  it('turns while waiting', () => {
    render(<BrandMark spinning />);
    expect(screen.getByTestId('brand-mark').dataset.spinning).toBe('true');
  });

  it('does not turn for a visitor who asked for reduced motion', () => {
    reducedMotion = true;
    render(<BrandMark spinning />);
    expect(screen.getByTestId('brand-mark').dataset.spinning).toBe('false');
  });

  it('is hidden from screen readers unless given a label of its own', () => {
    const { rerender } = render(<BrandMark />);
    expect(screen.getByTestId('brand-mark').getAttribute('aria-hidden')).toBe('true');

    rerender(<BrandMark label="LeHart" />);
    expect(screen.getByRole('img', { name: 'LeHart' })).toBeTruthy();
  });
});

describe('StatusScreen', () => {
  it('announces a wait politely and a failure assertively', () => {
    const { unmount } = inRouter(<StatusScreen title="Loading" spinning />);
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    unmount();

    inRouter(<StatusScreen title="Broken" live="alert" />);
    expect(screen.getByRole('alert').getAttribute('aria-live')).toBe('assertive');
  });

  it('runs the action it was given', async () => {
    const retry = vi.fn();
    inRouter(<StatusScreen title="Broken" actions={[{ label: 'Try again', onClick: retry }]} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

/** A component that throws once, then renders normally after a reset. */
function Boom({ explode }: { explode: { current: boolean } }) {
  if (explode.current) throw new Error('kaboom: internal detail');
  return <p>Recovered</p>;
}

describe('ErrorBoundary', () => {
  it('offers a way out instead of a blank page, and never shows the error text', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const explode = { current: true };

    inRouter(<ErrorBoundary><Boom explode={explode} /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Try again/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /homepage/i })).toBeTruthy();
    // A stack trace helps nobody here and can carry internals.
    expect(screen.queryByText(/kaboom/)).toBeNull();
  });

  it('re-renders in place when the visitor retries', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const explode = { current: true };

    inRouter(<ErrorBoundary><Boom explode={explode} /></ErrorBoundary>);
    explode.current = false;
    await userEvent.click(screen.getByRole('button', { name: /Try again/i }));

    expect(screen.getByText('Recovered')).toBeTruthy();
  });
});

describe('OfflineNotice', () => {
  const setOnline = (value: boolean) =>
    Object.defineProperty(navigator, 'onLine', { value, configurable: true });

  it('says nothing while the device is connected', () => {
    setOnline(true);
    const { container } = render(<OfflineNotice />);
    expect(container.firstChild).toBeNull();
  });

  it('warns as soon as the connection drops, without waiting for an event', () => {
    // The page may be opened with the radio already off — defaulting to
    // "online" would flash a working shop before correcting itself.
    setOnline(false);
    render(<OfflineNotice />);
    expect(screen.getByRole('status').textContent).toMatch(/offline/i);
  });

  it('clears itself when the connection comes back', () => {
    setOnline(false);
    const { container } = render(<OfflineNotice />);
    expect(screen.getByRole('status')).toBeTruthy();

    setOnline(true);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(container.firstChild).toBeNull();
  });
});
