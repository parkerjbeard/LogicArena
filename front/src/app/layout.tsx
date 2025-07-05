import '../styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { InputProvider } from '@/contexts/InputContext';

const inter = Inter({ subsets: ['latin'] });

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
  themeColor: '#111827',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <InputProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
        </InputProvider>
      </body>
    </html>
  );
} 