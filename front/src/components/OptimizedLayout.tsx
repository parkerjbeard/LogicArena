'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { preloadMonaco } from '@/lib/monaco-loader';

interface OptimizedLayoutProps {
  children: React.ReactNode;
}

// Routes that need Monaco editor
const monacoRoutes = ['/practice', '/duel', '/admin/puzzles/new'];

// Routes that need tutorial components
const tutorialRoutes = ['/tutorials'];

export function OptimizedLayout({ children }: OptimizedLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Preload Monaco for proof-related pages
    if (monacoRoutes.some(route => pathname.startsWith(route))) {
      preloadMonaco();
    }

    // Preload tutorial components when on landing or heading to tutorials
    if (pathname === '/' || pathname === '/tutorials') {
      // Preload tutorial framework
      import('@/components/Tutorial/TutorialFramework');
    }

    // Preload authentication components for auth routes
    if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
      import('@/lib/auth/AuthContext');
    }

    // Preload admin components for admin routes
    if (pathname.startsWith('/admin')) {
      import('framer-motion');
      import('@/components/AdminGuard');
    }
  }, [pathname]);

  // Prefetch likely next routes based on current page
  useEffect(() => {
    if (pathname === '/') {
      // From landing, users likely go to practice or tutorials
      const prefetchRoutes = ['/practice', '/tutorials', '/login'];
      prefetchRoutes.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    }
  }, [pathname]);

  return <>{children}</>;
}