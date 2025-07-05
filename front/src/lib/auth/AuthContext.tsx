'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface User {
  id: number;
  handle: string;
  email: string;
  rating: number;
  is_admin?: boolean;
  is_instructor?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (handle: string, email: string, password: string) => Promise<boolean>;
  refreshAuth: () => Promise<void>;
  setAuthToken: (token: string, refreshToken?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshAuth = async () => {
    try {
      // Check for access token
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const userData = await authAPI.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Authentication check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const setAuthToken = (token: string, refreshToken?: string) => {
    // Store tokens consistently
    localStorage.setItem('access_token', token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    // Immediately refresh user data
    refreshAuth();
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await authAPI.login(email, password);
      
      if (data.access_token) {
        setAuthToken(data.access_token, data.refresh_token);
        if (data.user) {
          setUser(data.user);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call backend logout endpoint to revoke tokens
      try {
        await authAPI.logout();
      } catch (error) {
        // Even if backend logout fails, we should still log out locally
        console.error('Backend logout failed:', error);
      }
      
      // Clear tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setUser(null);
      
      // Redirect to home
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const register = async (handle: string, email: string, password: string): Promise<boolean> => {
    try {
      const data = await authAPI.register(handle, email, password);
      
      if (data.access_token) {
        setAuthToken(data.access_token, data.refresh_token);
        if (data.user) {
          setUser(data.user);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        register,
        refreshAuth,
        setAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 