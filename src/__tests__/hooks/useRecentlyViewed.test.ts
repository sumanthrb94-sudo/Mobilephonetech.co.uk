import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';

const LS_KEY = 'lehart:recently-viewed';

describe('useRecentlyViewed', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('starts with an empty ids array when localStorage is empty', () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.ids).toEqual([]);
  });

  // ── track() ───────────────────────────────────────────────────────────────

  it('track(id) adds an id to the front of the list', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.track('product-1'));

    expect(result.current.ids[0]).toBe('product-1');
    expect(result.current.ids).toHaveLength(1);
  });

  it('tracking a second id prepends it before the first', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.track('product-1'));
    act(() => result.current.track('product-2'));

    expect(result.current.ids[0]).toBe('product-2');
    expect(result.current.ids[1]).toBe('product-1');
  });

  it('track(id) deduplicates — re-tracking an existing id moves it to the front', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.track('product-1'));
    act(() => result.current.track('product-2'));
    act(() => result.current.track('product-3'));
    // Re-track product-1, which is currently at the back
    act(() => result.current.track('product-1'));

    expect(result.current.ids[0]).toBe('product-1');
    // Should not duplicate — still 3 unique ids
    expect(result.current.ids).toHaveLength(3);
    expect(result.current.ids.filter(id => id === 'product-1')).toHaveLength(1);
  });

  it('track respects MAX=12 — adding a 13th id drops the oldest', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    // Add 13 distinct ids
    act(() => {
      for (let i = 1; i <= 13; i++) {
        result.current.track(`product-${i}`);
      }
    });

    expect(result.current.ids).toHaveLength(12);
    // product-13 was tracked last so it should be first
    expect(result.current.ids[0]).toBe('product-13');
    // product-1 was tracked first and should have been dropped
    expect(result.current.ids).not.toContain('product-1');
  });

  it('track respects MAX=12 — exactly 12 ids are kept when adding exactly 12', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      for (let i = 1; i <= 12; i++) {
        result.current.track(`product-${i}`);
      }
    });

    expect(result.current.ids).toHaveLength(12);
  });

  // ── localStorage persistence ───────────────────────────────────────────

  it('persists ids to localStorage after track', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.track('product-abc'));

    const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as string[];
    expect(stored).toContain('product-abc');
    expect(stored[0]).toBe('product-abc');
  });

  it('localStorage value matches the in-memory ids after multiple tracks', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.track('p1'));
    act(() => result.current.track('p2'));
    act(() => result.current.track('p3'));

    const stored = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') as string[];
    expect(stored).toEqual(result.current.ids);
  });

  // ── Loading from localStorage on mount ───────────────────────────────────

  it('loads ids from localStorage on mount', () => {
    const existing = ['product-x', 'product-y', 'product-z'];
    localStorage.setItem(LS_KEY, JSON.stringify(existing));

    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.ids).toEqual(existing);
  });

  it('prepends a new track on top of ids restored from localStorage', () => {
    const existing = ['product-x', 'product-y'];
    localStorage.setItem(LS_KEY, JSON.stringify(existing));

    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.track('product-new'));

    expect(result.current.ids[0]).toBe('product-new');
    expect(result.current.ids).toContain('product-x');
    expect(result.current.ids).toContain('product-y');
  });

  it('deduplicates when tracked id was already in localStorage', () => {
    const existing = ['product-x', 'product-y'];
    localStorage.setItem(LS_KEY, JSON.stringify(existing));

    const { result } = renderHook(() => useRecentlyViewed());
    act(() => result.current.track('product-y'));

    expect(result.current.ids[0]).toBe('product-y');
    expect(result.current.ids).toHaveLength(2);
    expect(result.current.ids.filter(id => id === 'product-y')).toHaveLength(1);
  });

  // ── clear() ───────────────────────────────────────────────────────────────

  it('clear() empties the ids list', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.track('product-1'));
    act(() => result.current.track('product-2'));
    act(() => result.current.clear());

    expect(result.current.ids).toEqual([]);
  });

  it('clear() removes the localStorage key', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.track('product-1'));
    expect(localStorage.getItem(LS_KEY)).not.toBeNull();

    act(() => result.current.clear());

    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  it('clear() works when the list is already empty', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => result.current.clear());

    expect(result.current.ids).toEqual([]);
    expect(localStorage.getItem(LS_KEY)).toBeNull();
  });

  // ── Cross-tab: storage event ──────────────────────────────────────────────

  it('dispatching a storage event with updated ids updates the state', () => {
    const { result } = renderHook(() => useRecentlyViewed());

    const newIds = ['cross-tab-1', 'cross-tab-2'];
    // Simulate another tab writing to localStorage and firing the storage event
    localStorage.setItem(LS_KEY, JSON.stringify(newIds));

    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(result.current.ids).toEqual(newIds);
  });

  it('dispatching a storage event when localStorage was cleared empties the list', () => {
    // Pre-populate so the hook loads with items
    localStorage.setItem(LS_KEY, JSON.stringify(['id-1', 'id-2']));
    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.ids).toHaveLength(2);

    // Another tab clears the key
    localStorage.removeItem(LS_KEY);

    act(() => {
      window.dispatchEvent(new Event('storage'));
    });

    expect(result.current.ids).toEqual([]);
  });

  it('removeEventListener is called on unmount — no stale storage listener', () => {
    const addSpy    = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useRecentlyViewed());
    unmount();

    // Both addEventListener and removeEventListener should have been called
    // with 'storage' during mount / unmount cycle
    expect(addSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('storage', expect.any(Function));
  });
});
