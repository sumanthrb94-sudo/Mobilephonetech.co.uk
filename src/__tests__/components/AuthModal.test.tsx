import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthModal from '../../components/AuthModal';

const signInWithGoogle = vi.fn();
const login = vi.fn();
const signup = vi.fn();

vi.mock('../../context/AuthContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../context/AuthContext')>();
  return {
    ...actual,
    useAuth: () => ({
      user: null, session: null, isAuthenticated: false, isLoading: false,
      login, signup, signInWithGoogle,
      logout: vi.fn(), resetPassword: vi.fn(), continueAsGuest: vi.fn(),
      refreshClaims: vi.fn(),
    }),
  };
});

function renderModal(onClose = vi.fn(), onSuccess = vi.fn()) {
  render(
    <MemoryRouter>
      <AuthModal isOpen onClose={onClose} onSuccess={onSuccess} />
    </MemoryRouter>,
  );
  return { onClose, onSuccess };
}

beforeEach(() => vi.clearAllMocks());

describe('AuthModal — Google sign-in', () => {
  /**
   * The regression this file exists for.
   *
   * Under Supabase, signInWithOAuth redirected the browser, so nothing after
   * the await ever ran and the modal did not need closing. Firebase's popup
   * flow resolves in place: without an explicit close the user ends up signed
   * in behind a modal that is still spinning, which is indistinguishable from
   * a failure.
   */
  it('closes the modal once Google sign-in succeeds', async () => {
    signInWithGoogle.mockResolvedValue('signed-in');
    const user = userEvent.setup();
    const { onClose, onSuccess } = renderModal();

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalled();
  });

  it('leaves the modal open and usable when the user cancels the popup', async () => {
    signInWithGoogle.mockResolvedValue('cancelled');
    const user = userEvent.setup();
    const { onClose } = renderModal();

    const button = screen.getByRole('button', { name: /continue with google/i });
    await user.click(button);

    // Cancelling is a deliberate action, not an error: no message, no close,
    // and the button has to be clickable again.
    await waitFor(() => expect(button).toBeEnabled());
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText(/could not start google/i)).not.toBeInTheDocument();
  });

  it('stays busy while redirecting, because the page is about to unload', async () => {
    signInWithGoogle.mockResolvedValue('redirecting');
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(signInWithGoogle).toHaveBeenCalled());
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    ['auth/operation-not-allowed', /not enabled for this project/i],
    ['auth/unauthorized-domain', /not an authorised domain/i],
    ['auth/account-exists-with-different-credential', /already exists with that email/i],
    ['auth/network-request-failed', /could not reach google/i],
  ])('translates %s into something actionable', async (code, expected) => {
    // Firebase wraps every failure as "Firebase: Error (auth/...)", which tells
    // the user nothing about what to do next.
    signInWithGoogle.mockRejectedValue(
      Object.assign(new Error(`Firebase: Error (${code}).`), { code }),
    );
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByText(expected)).toBeInTheDocument();
  });

  it('re-enables the button after a failure so the user can retry', async () => {
    signInWithGoogle.mockRejectedValue(
      Object.assign(new Error('boom'), { code: 'auth/internal-error' }),
    );
    const user = userEvent.setup();
    renderModal();

    const button = screen.getByRole('button', { name: /continue with google/i });
    await user.click(button);

    await waitFor(() => expect(button).toBeEnabled());
  });
});
