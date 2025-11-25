'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: { username: string } | null;
  // token is optional because server may set httpOnly cookie
  login: (username: string, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const router = useRouter();

  // Check localStorage on mount
  useEffect(() => {
    const username = localStorage.getItem('username');
    const token = localStorage.getItem('accessToken');
    if (username && token) {
      setUser({ username });
    }
  }, []);

  const login = (username: string, token?: string) => {
    // Store username in localStorage for client-side UI
    localStorage.setItem('username', username);

    // If token provided (legacy or debugging), store it in localStorage and a cookie
    if (token) {
      localStorage.setItem('accessToken', token);
      // Store in cookie (no `secure` flag so it works on localhost/http during development)
      document.cookie = `accessToken=${encodeURIComponent(token)}; path=/; max-age=86400; samesite=Lax`;
    }

    setUser({ username });
  };

  const logout = async () => {
    try {
      // Ask server to clear httpOnly cookie
      await fetch('/api/logout', { method: 'POST' });
    } catch (_) {
      // ignore
    }

    // Clear localStorage
    localStorage.removeItem('username');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('authResponse');

    // Clear client cookie if any
    document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';

    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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