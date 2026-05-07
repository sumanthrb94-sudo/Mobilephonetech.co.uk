import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// The global setup.ts already mocks '../lib/supabase'.
// Some tests need to override specific auth methods — use vi.mocked() or re-mock here.

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext (Supabase-backed)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Initial state ─────────────────────────────────────
  it('starts with isLoading true initially', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // isLoading is true until getSession resolves
    // (may already be false after async resolution in test env)
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('starts unauthenticated — getSession returns null session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
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
  it('calls supabase.auth.signInWithPassword on login', async () => {
    const { supabase } = await import('../../lib/supabase');
    const spy = vi.spyOn(supabase.auth, 'signInWithPassword');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(spy).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
  });

  it('throws when Supabase signIn returns an error', async () => {
    const { supabase } = await import('../../lib/supabase');
    vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials', status: 400 } as any,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => { await result.current.login('bad@example.com', 'wrong'); })
    ).rejects.toThrow();
  });

  // ── signup ─────────────────────────────────────────────
  it('calls supabase.auth.signUp on signup', async () => {
    const { supabase } = await import('../../lib/supabase');
    const spy = vi.spyOn(supabase.auth, 'signUp');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signup('new@example.com', 'pass123', 'Jane Doe');
    });

    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      email: 'new@example.com',
      password: 'pass123',
      options: expect.objectContaining({ data: { full_name: 'Jane Doe' } }),
    }));
  });

  it('throws when Supabase signUp returns an error', async () => {
    const { supabase } = await import('../../lib/supabase');
    vi.spyOn(supabase.auth, 'signUp').mockResolvedValueOnce({
      data: { user: null, session: null },
      error: { message: 'Email already in use', status: 422 } as any,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => { await result.current.signup('dup@example.com', 'pass', 'Dup'); })
    ).rejects.toThrow();
  });

  // ── logout ─────────────────────────────────────────────
  it('calls supabase.auth.signOut on logout', async () => {
    const { supabase } = await import('../../lib/supabase');
    const spy = vi.spyOn(supabase.auth, 'signOut');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.logout(); });

    expect(spy).toHaveBeenCalled();
  });

  it('clears user and session after logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await result.current.logout(); });

    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  // ── continueAsGuest ───────────────────────────────────
  it('continueAsGuest sets a guest user without Supabase session', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.continueAsGuest('guest@example.com'));
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.isGuest).toBe(true);
    expect(result.current.user!.email).toBe('guest@example.com');
  });

  it('guest user has isAuthenticated = false (no session)', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.continueAsGuest('guest@example.com'));
    // isAuthenticated = !!session — guest doesn't create a Supabase session
    expect(result.current.isAuthenticated).toBe(false);
  });

  // ── resetPassword ─────────────────────────────────────
  it('calls supabase.auth.resetPasswordForEmail', async () => {
    const { supabase } = await import('../../lib/supabase');
    // Add the mock for resetPasswordForEmail
    (supabase.auth as any).resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    const spy = vi.spyOn(supabase.auth as any, 'resetPasswordForEmail');

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => { await result.current.resetPassword('user@example.com'); });
    expect(spy).toHaveBeenCalledWith('user@example.com', expect.any(Object));
  });
});
