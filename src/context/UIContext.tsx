import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';

interface UIContextType {
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info' | 'warning';
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  hideToast: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

const TOAST_DURATION_MS = 3000;

export function UIProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  // Timer lives in a ref so back-to-back showToast() calls read the
  // latest timer handle synchronously — a useState-held id is stale
  // inside the same render and can leak timeouts.
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('dark');
    try { localStorage.removeItem('darkMode'); } catch { /* ignore */ }
  }, []);

  const hideToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToastMessage(null);
  }, []);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      setToastMessage(message);
      setToastType(type);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null);
        toastTimerRef.current = null;
      }, TOAST_DURATION_MS);
    },
    [],
  );

  // Clean up any outstanding timer on unmount so a toast that fires
  // right before navigation doesn't set state on a torn-down tree.
  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);

  return (
    <UIContext.Provider
      value={{
        isCartOpen,
        setIsCartOpen,
        isSidebarOpen,
        setIsSidebarOpen,
        toastMessage,
        toastType,
        showToast,
        hideToast,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
