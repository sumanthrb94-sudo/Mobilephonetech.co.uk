import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  fullName: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  continueAsGuest: (email: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('mt_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, _password: string) => {
    // Mock login
    const mockUser: User = {
      id: '1',
      email,
      fullName: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
    };
    setUser(mockUser);
    localStorage.setItem('mt_user', JSON.stringify(mockUser));
  };

  const signup = async (email: string, _password: string, fullName: string) => {
    // Mock signup
    const mockUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      email,
      fullName,
    };
    setUser(mockUser);
    localStorage.setItem('mt_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mt_user');
  };

  const continueAsGuest = (email: string) => {
    const guestUser: User = {
      id: 'guest_' + Math.random().toString(36).substr(2, 9),
      email,
      fullName: 'Guest User',
      isGuest: true,
    };
    setUser(guestUser);
    // We don't persist guest sessions in localStorage for this mock
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user && !user.isGuest, 
      login, 
      signup, 
      logout,
      continueAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
