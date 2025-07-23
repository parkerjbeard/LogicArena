'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface OptimizedLayoutProps {
  children: React.ReactNode;
}

// Routes that need tutorial components
const tutorialRoutes = ['/tutorials'];

export function OptimizedLayout({ children }: OptimizedLayoutProps) {
  const pathname = usePathname();

  useEffect(() => {
    // Preload tutorial components when on landing or heading to tutorials
    if (pathname === '/' || pathname === '/tutorials') {
      // Preload tutorial framework
      import('@/components/Tutorial/TutorialFramework');
    }
  }, [pathname]);

  // Prefetch likely next routes based on current page
  useEffect(() => {
    if (pathname === '/') {
      // From landing, users likely go to practice or tutorials
      const prefetchRoutes = ['/practice', '/tutorials'];
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