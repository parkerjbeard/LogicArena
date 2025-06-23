'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Lazy load the TutorialFramework with a loading placeholder
export const TutorialFramework = dynamic(
  () => import('./TutorialFramework').then(mod => ({ default: mod.TutorialFramework })),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-lg">Loading tutorial...</p>
        </div>
      </div>
    ),
    ssr: false // Tutorial uses client-side features
  }
);