'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, authApi } from './api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('foodsave_token');
    const savedUser = localStorage.getItem('foodsave_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with backend
        authApi.getProfile()
          .then((res) => {
            setUser(res.user);
            localStorage.setItem('foodsave_user', JSON.stringify(res.user));
          })
          .catch(() => {
            // Token expired or invalid
            localStorage.removeItem('foodsave_token');
            localStorage.removeItem('foodsave_user');
            setUser(null);
            setToken(null);
          })
          .finally(() => setIsLoading(false));
        return;
      } catch (e) {
        console.error('Failed to parse saved user', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: UserProfile) => {
    localStorage.setItem('foodsave_token', newToken);
    localStorage.setItem('foodsave_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('foodsave_token');
    localStorage.removeItem('foodsave_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
