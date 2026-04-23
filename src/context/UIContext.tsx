import { createContext, useContext, useState, useEffect } from 'react';
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

export function UIProvider({ children }: { children: ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');
  const [toastTimeout, setToastTimeout] = useState<NodeJS.Timeout | null>(null);

  // Clean up any legacy dark-mode preferences. Dark mode is intentionally
  // disabled until a complete token set is designed — see commit history.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.remove('dark');
    try { localStorage.removeItem('darkMode'); } catch {}
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);

    // Clear previous timeout if exists
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }

    // Auto-hide toast after 3 seconds
    const timeout = setTimeout(() => {
      setToastMessage(null);
    }, 3000);

    setToastTimeout(timeout);
  };

  const hideToast = () => {
    if (toastTimeout) {
      clearTimeout(toastTimeout);
    }
    setToastMessage(null);
  };

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
