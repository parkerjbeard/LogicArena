'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDocumentTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // Initialize from localStorage or system preference
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('theme') as Theme | null) : null;
    const initial: Theme = stored ?? (getSystemPrefersDark() ? 'dark' : 'light');
    setThemeState(initial);
    applyDocumentTheme(initial);

    // Keep in sync with system changes if user hasn't explicitly chosen
    if (!stored && typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        const next: Theme = e.matches ? 'dark' : 'light';
        setThemeState(next);
        applyDocumentTheme(next);
      };
      try {
        media.addEventListener('change', listener);
      } catch {
        // Safari
        media.addListener(listener);
      }
      return () => {
        try {
          media.removeEventListener('change', listener);
        } catch {
          media.removeListener(listener);
        }
      };
    }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', next);
    }
    applyDocumentTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    isDarkMode: theme === 'dark',
    toggleTheme,
    setTheme,
  }), [theme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;

  // Fallback for environments/tests without provider to avoid hard crashes
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  return {
    theme: isDark ? 'dark' as const : 'light' as const,
    isDarkMode: isDark,
    toggleTheme: () => {},
    setTheme: () => {},
  };
}


