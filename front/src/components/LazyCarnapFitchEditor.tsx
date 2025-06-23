import dynamic from 'next/dynamic';
import React from 'react';
import { InfoIcon } from 'lucide-react';

// Loading component shown while editor loads
const EditorSkeleton = () => (
  <div className="carnap-fitch-editor-container">
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-t-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <InfoIcon className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-200">
            Carnap-Compatible Fitch Notation
          </span>
        </div>
        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
    
    <div className="border border-gray-700 rounded-b-lg overflow-hidden animate-pulse">
      <div className="bg-gray-800 h-[400px]">
        <div className="p-4 space-y-2">
          <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
      <div className="bg-gray-800 p-2 flex justify-between items-center">
        <div className="h-4 w-48 bg-gray-700 rounded"></div>
        <div className="h-8 w-28 bg-gray-700 rounded"></div>
      </div>
    </div>
  </div>
);

// Dynamically import the CarnapFitchEditor with no SSR
const CarnapFitchEditor = dynamic(
  () => import('./CarnapFitchEditor'),
  {
    loading: () => <EditorSkeleton />,
    ssr: false // Monaco doesn't work with SSR
  }
);

// Export with the same props interface
export default CarnapFitchEditor;