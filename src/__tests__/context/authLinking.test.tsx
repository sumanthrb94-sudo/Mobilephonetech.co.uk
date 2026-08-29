import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  signInWithPopup, signInWithEmailAndPassword, linkWithCredential,
  fetchSignInMethodsForEmail, GoogleAuthProvider,
} from 'firebase/auth';
import { AuthProvider, useAuth } from '../../context/AuthContext';

/**
 * Account linking — what stops one person owning two accounts for one email.
 *
 * Firebase's "one account per email address" setting refuses the second
 * identity, which protects the data but on its own just fails: a customer who
 * genuinely owns both a password and a Google login is told to go away and use
 * the other one. The fix holds the refused Google credential, takes the
 * existing password once as proof of ownership, and attaches the two.
 *
 * The password step is the security boundary and is the thing most worth
 * testing: without it, anyone who knew an address could bolt their own Google
 * account onto it and take the account over.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

async function renderAuth() {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

/** The shape Firebase throws when the address already has another provider. */
function conflictError(email = 'jordan@example.com') {
  return Object.assign(new Error('account exists'), {
    code: 'auth/account-exists-with-different-credential',
    customData: { email },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (GoogleAuthProvider as unknown as { credentialFromError: ReturnType<typeof vi.fn> })
    .credentialFromError.mockReturnValue({ providerId: 'google.com' });
});

describe('signInWithGoogle — conflicting account', () => {
  it('reports needs-link and remembers the address instead of throwing', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce(conflictError());
    const result = await renderAuth();

    let outcome: string | undefined;
    await act(async () => { outcome = await result.current.signInWithGoogle(); });

    expect(outcome).toBe('needs-link');
    expect(result.current.pendingLinkEmail).toBe('jordan@example.com');
  });

  it('still throws when no credential can be recovered', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce(conflictError());
    (GoogleAuthProvider as unknown as { credentialFromError: ReturnType<typeof vi.fn> })
      .credentialFromError.mockReturnValue(null);
    const result = await renderAuth();

    // Nothing to link, so the caller must fall back to its plain message
    // rather than sitting in a link mode it can never complete.
    await expect(
      act(async () => { await result.current.signInWithGoogle(); }),
    ).rejects.toThrow();
  });

  it('leaves no pending link after an ordinary cancel', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce(
      Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }),
    );
    const result = await renderAuth();

    let outcome: string | undefined;
    await act(async () => { outcome = await result.current.signInWithGoogle(); });

    expect(outcome).toBe('cancelled');
    expect(result.current.pendingLinkEmail).toBeNull();
  });
});

describe('completeGoogleLink', () => {
  async function startLink() {
    vi.mocked(signInWithPopup).mockRejectedValueOnce(conflictError());
    const result = await renderAuth();
    await act(async () => { await result.current.signInWithGoogle(); });
    return result;
  }

  it('proves the password before attaching the credential', async () => {
    const result = await startLink();

    await act(async () => { await result.current.completeGoogleLink('hunter22'); });

    // Order matters: the password is the authorisation for the link.
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'jordan@example.com', 'hunter22',
    );
    expect(linkWithCredential).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u1' }),
      expect.objectContaining({ providerId: 'google.com' }),
    );
  });

  it('clears the held credential once linked', async () => {
    const result = await startLink();
    await act(async () => { await result.current.completeGoogleLink('hunter22'); });

    expect(result.current.pendingLinkEmail).toBeNull();
    // A second attempt has nothing to link and must say so rather than
    // silently re-running the sign-in.
    await expect(result.current.completeGoogleLink('hunter22')).rejects.toThrow(/no sign-in waiting/i);
  });

  it('does not link when the password is wrong', async () => {
    const result = await startLink();
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error('bad'), { code: 'auth/wrong-password' }),
    );

    await expect(result.current.completeGoogleLink('wrong')).rejects.toThrow();
    expect(linkWithCredential).not.toHaveBeenCalled();
    // The credential survives so one typo does not force the whole flow again.
    expect(result.current.pendingLinkEmail).toBe('jordan@example.com');
  });

  it('refuses when nothing is pending', async () => {
    const result = await renderAuth();
    await expect(result.current.completeGoogleLink('hunter22')).rejects.toThrow(/no sign-in waiting/i);
    expect(linkWithCredential).not.toHaveBeenCalled();
  });
});

describe('cancelGoogleLink', () => {
  it('releases the held credential', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce(conflictError());
    const result = await renderAuth();
    await act(async () => { await result.current.signInWithGoogle(); });
    expect(result.current.pendingLinkEmail).toBe('jordan@example.com');

    act(() => { result.current.cancelGoogleLink(); });

    expect(result.current.pendingLinkEmail).toBeNull();
    await expect(result.current.completeGoogleLink('hunter22')).rejects.toThrow(/no sign-in waiting/i);
  });
});

describe('signInMethodsFor', () => {
  it('normalises the address before asking', async () => {
    vi.mocked(fetchSignInMethodsForEmail).mockResolvedValueOnce(['password']);
    const result = await renderAuth();

    let methods: string[] = [];
    await act(async () => { methods = await result.current.signInMethodsFor('  Jordan@Example.COM '); });

    expect(fetchSignInMethodsForEmail).toHaveBeenCalledWith(expect.anything(), 'jordan@example.com');
    expect(methods).toEqual(['password']);
  });

  it('returns [] rather than throwing when Firebase refuses to say', async () => {
    // Email Enumeration Protection is on by default and makes this endpoint
    // report nothing. [] means "cannot tell", never "no account exists".
    vi.mocked(fetchSignInMethodsForEmail).mockRejectedValueOnce(new Error('blocked'));
    const result = await renderAuth();

    let methods: string[] = ['stale'];
    await act(async () => { methods = await result.current.signInMethodsFor('a@b.com'); });

    expect(methods).toEqual([]);
  });
});
