import dynamic from 'next/dynamic';
import React from 'react';
import { InfoIcon } from 'lucide-react';

// Loading component shown while editor loads
const EditorSkeleton = () => (
  <div className="carnap-fitch-editor-container">
    <div className="bg-gray-100/70 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-t-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Enhanced Carnap-Compatible Fitch Notation
          </span>
        </div>
        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
    
    <div className="border border-gray-300 dark:border-gray-700 rounded-b-lg overflow-hidden animate-pulse">
      <div className="bg-white dark:bg-gray-900 h-[400px] relative">
        <div className="p-4 space-y-3">
          {/* Simulate line numbers and syntax highlighting */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-gray-300 dark:bg-gray-600 rounded text-xs"></div>
            <div className="h-4 bg-green-300 dark:bg-green-700 rounded w-20"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-8"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-gray-300 dark:bg-gray-600 rounded text-xs"></div>
            <div className="h-4 bg-green-300 dark:bg-green-700 rounded w-16"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-8"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-4 bg-gray-300 dark:bg-gray-600 rounded text-xs"></div>
            <div className="h-4 bg-blue-300 dark:bg-blue-700 rounded w-24"></div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <div className="w-6 h-4 bg-gray-300 dark:bg-gray-600 rounded text-xs"></div>
            <div className="border-l border-gray-300 dark:border-gray-600 w-4 h-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            <div className="h-4 bg-purple-300 dark:bg-purple-700 rounded w-10"></div>
          </div>
        </div>
      </div>
      <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
        <div className="h-4 w-64 bg-gray-300 dark:bg-gray-700 rounded"></div>
        <div className="h-8 w-32 bg-green-300 dark:bg-green-700 rounded"></div>
      </div>
    </div>
  </div>
);

// Dynamically import the CarnapFitchEditor with no SSR
// Use the improved editor implementation for richer UX (overlay rendering, per-line feedback)
const CarnapFitchEditor = dynamic(
  () => import('./ImprovedCarnapFitchEditor'),
  {
    loading: () => <EditorSkeleton />,
    ssr: false // Client-side only component
  }
);

// Export with the same props interface
export default CarnapFitchEditor;