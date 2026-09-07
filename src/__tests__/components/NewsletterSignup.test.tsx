import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NewsletterSignup from '../../components/NewsletterSignup';

/**
 * The confirmation must mean something.
 *
 * This form once showed "You're on the list." unconditionally: the fetch was
 * awaited with no status check and wrapped in an empty catch, so a rejected
 * address, a rate limit, a 500 and a dropped connection all rendered success.
 *
 * That matters more here than the usual dark pattern. The signup goes through
 * the API precisely to write the consent record — timestamp, source, policy
 * version — which is what makes the list lawfully mailable. A silent failure
 * leaves a person believing they opted in, absent from the list, and with no
 * record in either direction.
 */

const SUCCESS = /You're on the list/i;

function fetchReturning(res: unknown) {
  return vi.fn(async () => res);
}

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});
afterEach(() => vi.unstubAllGlobals());

async function submit(email = 'reader@example.com') {
  const user = userEvent.setup();
  render(<NewsletterSignup />);
  await user.type(screen.getByLabelText(/your email/i), email);
  await user.click(screen.getByRole('button', { name: /notify me/i }));
}

describe('NewsletterSignup', () => {
  it('confirms only once the server has accepted the subscription', async () => {
    vi.stubGlobal('fetch', fetchReturning({ ok: true, json: async () => ({ ok: true }) }));

    await submit();

    await waitFor(() => expect(screen.getByText(SUCCESS)).toBeTruthy());
  });

  it('reports the server\'s reason instead of confirming, when refused', async () => {
    vi.stubGlobal('fetch', fetchReturning({
      ok: false,
      json: async () => ({ error: 'Invalid email address' }),
    }));

    await submit();

    await waitFor(() => expect(screen.getByText('Invalid email address')).toBeTruthy());
    expect(screen.queryByText(SUCCESS)).toBeNull();
  });

  it('does not confirm when the request never reaches the server', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));

    await submit();

    await waitFor(() => expect(screen.getByText(/could not subscribe/i)).toBeTruthy());
    expect(screen.queryByText(SUCCESS)).toBeNull();
  });

  it('does not remember an address whose subscription failed', async () => {
    vi.stubGlobal('fetch', fetchReturning({ ok: false, json: async () => ({}) }));

    await submit('ghost@example.com');

    await waitFor(() => expect(screen.queryByText(SUCCESS)).toBeNull());
    // Remembering it would show every later visit a confirmation for a
    // subscription that does not exist.
    expect(window.localStorage.getItem('mt_newsletter_email')).toBeNull();
  });

  it('still refuses a malformed address before calling the server', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    await submit('not-an-address');

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
