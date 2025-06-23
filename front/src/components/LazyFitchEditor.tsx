import dynamic from 'next/dynamic';
import React from 'react';

// Loading component shown while editor loads
const EditorSkeleton = () => (
  <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden animate-pulse">
    <div className="bg-gray-200 dark:bg-gray-800 h-[400px]">
      <div className="p-4 space-y-2">
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
    <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between">
      <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
      <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded"></div>
    </div>
  </div>
);

// Dynamically import the FitchEditor with no SSR
const FitchEditor = dynamic(
  () => import('./FitchEditor'),
  {
    loading: () => <EditorSkeleton />,
    ssr: false // Monaco doesn't work with SSR
  }
);

// Export with the same props interface
export default FitchEditor;