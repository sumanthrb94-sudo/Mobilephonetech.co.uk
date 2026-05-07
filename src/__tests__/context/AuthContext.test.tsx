import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Initial state ─────────────────────────────────────
  it('starts unauthenticated with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('throws when used outside AuthProvider', () => {
    const consoleError = console.error;
    console.error = () => {};
    expect(() => renderHook(() => useAuth())).toThrow();
    console.error = consoleError;
  });

  // ── login ─────────────────────────────────────────────
  it('sets user after login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.email).toBe('test@example.com');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('capitalises name derived from email in mock login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('john@example.com', 'pass');
    });
    expect(result.current.user!.fullName.charAt(0)).toBe('J');
  });

  it('persists user to localStorage on login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('test@example.com', 'pass');
    });
    const stored = localStorage.getItem('mt_user');
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.email).toBe('test@example.com');
  });

  // ── signup ─────────────────────────────────────────────
  it('registers and authenticates a new user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signup('newuser@example.com', 'pass', 'Jane Doe');
    });
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.email).toBe('newuser@example.com');
    expect(result.current.user!.fullName).toBe('Jane Doe');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('assigns a random id on signup', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signup('a@b.com', 'pass', 'Test');
    });
    expect(result.current.user!.id.length).toBeGreaterThan(0);
  });

  // ── logout ────────────────────────────────────────────
  it('clears user on logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('test@example.com', 'pass');
    });
    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('removes user from localStorage on logout', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.login('test@example.com', 'pass');
    });
    act(() => result.current.logout());
    expect(localStorage.getItem('mt_user')).toBeNull();
  });

  // ── continueAsGuest ───────────────────────────────────
  it('continueAsGuest sets a guest user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.continueAsGuest('guest@example.com'));
    expect(result.current.user).not.toBeNull();
    expect(result.current.user!.isGuest).toBe(true);
    expect(result.current.user!.email).toBe('guest@example.com');
  });

  it('guest user is NOT considered authenticated', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.continueAsGuest('guest@example.com'));
    expect(result.current.isAuthenticated).toBe(false);
  });

  // ── localStorage hydration ────────────────────────────
  it('restores user from localStorage on mount', async () => {
    const saved = { id: '1', email: 'saved@example.com', fullName: 'Saved User' };
    localStorage.setItem('mt_user', JSON.stringify(saved));
    const { result } = renderHook(() => useAuth(), { wrapper });
    // useEffect runs synchronously in jsdom/renderHook environment
    expect(result.current.user?.email).toBe('saved@example.com');
    expect(result.current.isAuthenticated).toBe(true);
  });
});
