'use client';

import { useEffect } from 'react';
import { initializeCSRFProtection } from '@/lib/api';

export function CSRFInitializer() {
  useEffect(() => {
    // Initialize CSRF protection when the app loads
    initializeCSRFProtection().catch((error) => {
      console.error('Failed to initialize CSRF protection:', error);
    });
  }, []);

  // This component doesn't render anything
  return null;
}