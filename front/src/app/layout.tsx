import '../styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/contexts/ToastContext';
import { InputProvider } from '@/contexts/InputContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { CSRFInitializer } from '@/components/CSRFInitializer';
import { LoggerProvider } from '@/components/LoggerProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Use optional font loading for Docker environments
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  // Add fallback for when Google Fonts is unreachable
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
  adjustFontFallback: false,
  preload: false
});

export const metadata: Metadata = {
  title: 'LogicArena - Natural Deduction Duels',
  description: 'Practice and compete in natural deduction proofs',
  manifest: '/manifest.json',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Prevent theme flash by setting initial class synchronously */}
        <script
          dangerouslySetInnerHTML={{ __html: `
            (function() {
              try {
                var stored = localStorage.getItem('theme');
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                var theme = stored || (prefersDark ? 'dark' : 'light');
                if (theme === 'dark') { document.documentElement.classList.add('dark'); }
              } catch (e) {}
            })();
          ` }}
        />
      </head>
      <body className={`${inter.className} min-h-screen`}>
        <ThemeProvider>
          <AuthProvider>
            <InputProvider>
              <ToastProvider>
                <LoggerProvider>
                  <CSRFInitializer />
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </LoggerProvider>
              </ToastProvider>
            </InputProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 