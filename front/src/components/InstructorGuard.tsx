'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

interface InstructorGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function InstructorGuard({ children, redirectTo = '/account' }: InstructorGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && !user.is_instructor && !user.is_admin) {
      router.push(redirectTo);
    }
  }, [isLoading, user, router, redirectTo]);

  // Show loading state while checking auth
  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not an instructor
  if (!user.is_instructor && !user.is_admin) {
    return null;
  }

  return <>{children}</>;
}