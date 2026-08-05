import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  sendPasswordResetEmail, signInWithPopup, updateProfile,
} from 'firebase/auth';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// firebase/auth and firebase/firestore are mocked globally in src/test/setup.ts.

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

/** Render the provider and wait for the initial auth check to settle. */
async function renderAuth() {
  const { result } = renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  return result;
}

describe('AuthContext (Firebase-backed)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ── Initial state ─────────────────────────────────────
  it('starts unauthenticated — onAuthStateChanged reports no user', async () => {
    const result = await renderAuth();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('throws when used outside AuthProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useAuth())).toThrow();
    console.error = consoleError;
  });

  // ── login ─────────────────────────────────────────────
  it('calls signInWithEmailAndPassword on login', async () => {
    const result = await renderAuth();

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'test@example.com', 'password123',
    );
  });

  it('propagates a rejected sign-in so the form can show the message', async () => {
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error('Invalid credentials'), { code: 'auth/invalid-credential' }),
    );
    const result = await renderAuth();

    await expect(
      act(async () => { await result.current.login('bad@example.com', 'wrong'); }),
    ).rejects.toThrow(/invalid credentials/i);
  });

  // ── signup ────────────────────────────────────────────
  it('creates the account and sets the display name', async () => {
    const result = await renderAuth();

    await act(async () => {
      await result.current.signup('new@example.com', 'pass123', 'Jane Doe');
    });

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 'new@example.com', 'pass123',
    );
    // Firebase stores no metadata at creation, so the name is a second call —
    // without it the user would show up as the email local-part everywhere.
    expect(updateProfile).toHaveBeenCalledWith(
      expect.anything(), { displayName: 'Jane Doe' },
    );
  });

  it('propagates a rejected sign-up', async () => {
    vi.mocked(createUserWithEmailAndPassword).mockRejectedValueOnce(
      Object.assign(new Error('Email already in use'), { code: 'auth/email-already-in-use' }),
    );
    const result = await renderAuth();

    await expect(
      act(async () => { await result.current.signup('dup@example.com', 'pass', 'Dup'); }),
    ).rejects.toThrow(/already in use/i);
  });

  // ── Google ────────────────────────────────────────────
  it('signs in with a Google popup', async () => {
    const result = await renderAuth();
    await act(async () => { await result.current.signInWithGoogle(); });
    expect(signInWithPopup).toHaveBeenCalled();
  });

  it('treats a closed popup as a cancel, not an error', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce(
      Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' }),
    );
    const result = await renderAuth();

    // Closing the popup is a deliberate action; surfacing it as an error would
    // show a scary message for something the user chose to do.
    await expect(
      act(async () => { await result.current.signInWithGoogle(); }),
    ).resolves.toBeUndefined();
  });

  it('rethrows a genuine Google failure', async () => {
    vi.mocked(signInWithPopup).mockRejectedValueOnce(
      Object.assign(new Error('Provider disabled'), { code: 'auth/operation-not-allowed' }),
    );
    const result = await renderAuth();

    await expect(
      act(async () => { await result.current.signInWithGoogle(); }),
    ).rejects.toThrow(/provider disabled/i);
  });

  // ── logout ────────────────────────────────────────────
  it('calls signOut on logout', async () => {
    const result = await renderAuth();
    await act(async () => { await result.current.logout(); });
    expect(signOut).toHaveBeenCalled();
  });

  it('clears user and session after logout', async () => {
    const result = await renderAuth();
    await act(async () => { await result.current.logout(); });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  // ── continueAsGuest ───────────────────────────────────
  it('continueAsGuest sets a guest user without a Firebase session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.continueAsGuest('guest@example.com'));
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.isGuest).toBe(true);
    expect(result.current.user!.email).toBe('guest@example.com');
  });

  it('guest user has isAuthenticated = false (no session)', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.continueAsGuest('guest@example.com'));
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('a guest is never an admin', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.continueAsGuest('guest@example.com'));
    expect(result.current.user!.isAdmin).toBeFalsy();
  });

  // ── resetPassword ─────────────────────────────────────
  it('calls sendPasswordResetEmail', async () => {
    const result = await renderAuth();
    await act(async () => { await result.current.resetPassword('user@example.com'); });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(), 'user@example.com', expect.any(Object),
    );
  });
});
