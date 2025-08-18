'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

export function LoggerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    // Set user context when user changes
    if (user) {
      logger.setUserContext(user.id, {
        email: user.email || '',
      });
      logger.info('User logged in', { userId: user.id });
    } else {
      logger.setUserContext('anonymous');
      logger.info('User logged out');
    }
  }, [user]);

  useEffect(() => {
    // Log page views
    logger.info('Page view', {
      path: window.location.pathname,
      referrer: document.referrer,
    });

    // Cleanup on unmount
    return () => {
      void logger.flush();
    };
  }, []);

  return <>{children}</>;
}