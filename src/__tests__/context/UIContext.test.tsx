import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { UIProvider, useUI } from '../../context/UIContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UIProvider>{children}</UIProvider>
);

describe('UIContext', () => {
  // ── Toast ─────────────────────────────────────────────────────────────────

  describe('showToast', () => {
    it('showToast sets toastMessage to the provided string', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Item added to cart'));

      expect(result.current.toastMessage).toBe('Item added to cart');
    });

    it('showToast defaults toastType to "info" when no type is given', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Hello'));

      expect(result.current.toastType).toBe('info');
    });

    it('showToast sets toastType to "success"', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Done!', 'success'));

      expect(result.current.toastType).toBe('success');
    });

    it('showToast sets toastType to "error"', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Something went wrong', 'error'));

      expect(result.current.toastType).toBe('error');
    });

    it('showToast sets toastType to "warning"', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Low stock', 'warning'));

      expect(result.current.toastType).toBe('warning');
    });
  });

  // ── Toast auto-dismiss ────────────────────────────────────────────────────

  describe('toast auto-dismiss', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('toastMessage starts as null', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      expect(result.current.toastMessage).toBeNull();
    });

    it('toast auto-dismisses after 3000 ms', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Auto-dismiss me'));
      expect(result.current.toastMessage).toBe('Auto-dismiss me');

      act(() => vi.advanceTimersByTime(3000));

      expect(result.current.toastMessage).toBeNull();
    });

    it('toast is still visible before 3000 ms elapses', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Still here'));
      act(() => vi.advanceTimersByTime(2999));

      expect(result.current.toastMessage).toBe('Still here');
    });

    it('calling showToast twice resets the dismiss timer', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('First toast'));
      // Advance almost to the dismiss point of the first toast
      act(() => vi.advanceTimersByTime(2500));

      // Show a second toast — this should reset the 3000 ms window
      act(() => result.current.showToast('Second toast'));
      expect(result.current.toastMessage).toBe('Second toast');

      // Another 2500 ms have passed (total 5000 ms from start, but only
      // 2500 ms since the second showToast): toast should still be visible
      act(() => vi.advanceTimersByTime(2500));
      expect(result.current.toastMessage).toBe('Second toast');

      // Now the full 3000 ms window of the second toast expires
      act(() => vi.advanceTimersByTime(500));
      expect(result.current.toastMessage).toBeNull();
    });
  });

  // ── hideToast (dismissToast) ──────────────────────────────────────────────

  describe('hideToast', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('hideToast clears toastMessage immediately', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Dismiss me now'));
      act(() => result.current.hideToast());

      expect(result.current.toastMessage).toBeNull();
    });

    it('hideToast cancels the auto-dismiss timer', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.showToast('Cancel timer'));
      act(() => result.current.hideToast());

      // Advance past the original timer; message should remain null and
      // there should be no state-update error from a stale timer firing.
      act(() => vi.advanceTimersByTime(3000));

      expect(result.current.toastMessage).toBeNull();
    });
  });

  // ── Cart drawer (isCartOpen) ──────────────────────────────────────────────

  describe('isCartOpen', () => {
    it('isCartOpen starts false', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      expect(result.current.isCartOpen).toBe(false);
    });

    it('setIsCartOpen(true) opens the cart drawer', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.setIsCartOpen(true));

      expect(result.current.isCartOpen).toBe(true);
    });

    it('setIsCartOpen(false) closes the cart drawer', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.setIsCartOpen(true));
      act(() => result.current.setIsCartOpen(false));

      expect(result.current.isCartOpen).toBe(false);
    });
  });

  // ── Sidebar (isSidebarOpen) ───────────────────────────────────────────────

  describe('isSidebarOpen', () => {
    it('isSidebarOpen starts false', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      expect(result.current.isSidebarOpen).toBe(false);
    });

    it('setIsSidebarOpen(true) opens the sidebar', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.setIsSidebarOpen(true));

      expect(result.current.isSidebarOpen).toBe(true);
    });

    it('setIsSidebarOpen(false) closes the sidebar', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.setIsSidebarOpen(true));
      act(() => result.current.setIsSidebarOpen(false));

      expect(result.current.isSidebarOpen).toBe(false);
    });

    it('cart drawer and sidebar states are independent', () => {
      const { result } = renderHook(() => useUI(), { wrapper });

      act(() => result.current.setIsCartOpen(true));
      act(() => result.current.setIsSidebarOpen(true));

      expect(result.current.isCartOpen).toBe(true);
      expect(result.current.isSidebarOpen).toBe(true);

      act(() => result.current.setIsCartOpen(false));

      expect(result.current.isCartOpen).toBe(false);
      expect(result.current.isSidebarOpen).toBe(true);
    });
  });

  // ── Error boundary ────────────────────────────────────────────────────────

  it('throws when used outside UIProvider', () => {
    const consoleError = console.error;
    console.error = () => {};

    expect(() => renderHook(() => useUI())).toThrow(
      'useUI must be used within UIProvider',
    );

    console.error = consoleError;
  });
});
