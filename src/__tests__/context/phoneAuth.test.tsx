import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { signInWithPhoneNumber, linkWithPhoneNumber } from 'firebase/auth';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';

/**
 * Phone sign-in, and the branch that keeps it from creating duplicates.
 *
 * Firebase treats a phone number as an identity in its own right, not as an
 * attribute of an email account. So a customer who already has an email login
 * and then "signs in with their mobile" would get a second uid, a second
 * profile and a second order history — and the one-account-per-email setting
 * would not stop it, because no email is involved.
 *
 * The guard is simple and is the most important assertion in this file: when
 * somebody is already signed in we LINK, and only start a new account when
 * nobody is.
 */

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

async function renderAuth() {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

/**
 * Pretend somebody is already signed in.
 *
 * `auth` is bound once when lib/firebase is imported, so re-mocking getAuth
 * afterwards changes nothing — the live object has to be mutated instead.
 */
function signedInAs(user: unknown) {
  (auth as unknown as { currentUser: unknown }).currentUser = user;
}

beforeEach(() => {
  vi.clearAllMocks();
  signedInAs(null);
});

describe('startPhoneSignIn', () => {
  it('sends to the normalised E.164 number, not what was typed', async () => {
    const result = await renderAuth();

    await act(async () => { await result.current.startPhoneSignIn('07700 900123', 'recaptcha'); });

    // Firebase rejects anything that is not E.164, and a number normalised two
    // different ways would be two different accounts.
    expect(signInWithPhoneNumber).toHaveBeenCalledWith(
      expect.anything(), '+447700900123', expect.anything(),
    );
    expect(result.current.pendingPhone).toBe('+447700900123');
  });

  it('refuses an unusable number before spending an SMS', async () => {
    const result = await renderAuth();

    await expect(
      act(async () => { await result.current.startPhoneSignIn('nonsense', 'recaptcha'); }),
    ).rejects.toThrow(/valid mobile/i);

    expect(signInWithPhoneNumber).not.toHaveBeenCalled();
    expect(result.current.pendingPhone).toBeNull();
  });

  it('LINKS to the current account instead of starting a second one', async () => {
    signedInAs({ uid: 'u1', email: 'a@b.c', providerData: [{ providerId: 'password' }] });
    const result = await renderAuth();

    await act(async () => { await result.current.startPhoneSignIn('07700 900123', 'recaptcha'); });

    // The whole point: an existing customer adding their mobile must not end
    // up with a second uid and a second order history.
    expect(linkWithPhoneNumber).toHaveBeenCalled();
    expect(signInWithPhoneNumber).not.toHaveBeenCalled();
  });

  it('starts a fresh sign-in when nobody is signed in', async () => {
    const result = await renderAuth();

    await act(async () => { await result.current.startPhoneSignIn('07700 900123', 'recaptcha'); });

    expect(signInWithPhoneNumber).toHaveBeenCalled();
    expect(linkWithPhoneNumber).not.toHaveBeenCalled();
  });

  it('leaves nothing pending when the send fails', async () => {
    vi.mocked(signInWithPhoneNumber).mockRejectedValueOnce(
      Object.assign(new Error('quota'), { code: 'auth/quota-exceeded' }),
    );
    const result = await renderAuth();

    await expect(
      act(async () => { await result.current.startPhoneSignIn('07700 900123', 'recaptcha'); }),
    ).rejects.toThrow();

    // A solved-but-unused reCAPTCHA cannot be reused, so the failed attempt
    // must clear it or the retry fails for a different, confusing reason.
    expect(result.current.pendingPhone).toBeNull();
  });
});

describe('confirmPhoneCode', () => {
  it('signs the user in and records the verified number', async () => {
    const result = await renderAuth();
    await act(async () => { await result.current.startPhoneSignIn('07700 900123', 'recaptcha'); });

    await act(async () => { await result.current.confirmPhoneCode('123456'); });

    expect(result.current.user?.phoneNumber).toBe('+447700900123');
    expect(result.current.pendingPhone).toBeNull();
  });

  it('names a phone-only account by its number, since it has nothing else', async () => {
    const result = await renderAuth();
    await act(async () => { await result.current.startPhoneSignIn('07700 900123', 'recaptcha'); });
    await act(async () => { await result.current.confirmPhoneCode('123456'); });

    // No email and no display name on a phone-only account, so falling back to
    // 'User' would greet every such customer identically.
    expect(result.current.user?.fullName).toBe('07700 900123');
  });

  it('trims a code pasted with surrounding whitespace', async () => {
    const result = await renderAuth();
    let confirmation: { confirm: ReturnType<typeof vi.fn> };
    vi.mocked(signInWithPhoneNumber).mockImplementationOnce(() => {
      confirmation = { confirm: vi.fn(() => Promise.resolve({ user: { uid: 'p1', email: null, phoneNumber: '+447700900123', providerData: [] } })) };
      return Promise.resolve(confirmation as never);
    });

    await act(async () => { await result.current.startPhoneSignIn('07700 900123', 'recaptcha'); });
    await act(async () => { await result.current.confirmPhoneCode('  123456 '); });

    expect(confirmation!.confirm).toHaveBeenCalledWith('123456');
  });

  it('refuses when no code was ever requested', async () => {
    const result = await renderAuth();
    await expect(result.current.confirmPhoneCode('123456')).rejects.toThrow(/no code waiting/i);
  });
});

describe('cancelPhoneSignIn', () => {
  it('drops the pending verification', async () => {
    const result = await renderAuth();
    await act(async () => { await result.current.startPhoneSignIn('07700 900123', 'recaptcha'); });
    expect(result.current.pendingPhone).toBe('+447700900123');

    act(() => { result.current.cancelPhoneSignIn(); });

    expect(result.current.pendingPhone).toBeNull();
    await expect(result.current.confirmPhoneCode('123456')).rejects.toThrow(/no code waiting/i);
  });
});
