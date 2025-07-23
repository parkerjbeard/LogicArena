'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TutorialsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/tutorial');
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting to tutorials...</p>
      </div>
    </div>
  );
}