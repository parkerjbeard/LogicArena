'use client';

import React, { useRef } from 'react';

interface FitchEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
}

const FitchEditor: React.FC<FitchEditorProps> = ({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  height = '400px',
  theme = 'dark',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit?.();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Format Fitch-style proof with proper indentation
  const formatFitchProof = () => {
    if (!textareaRef.current) return;
    
    const lines = value.split('\n');
    let indentLevel = 0;
    
    const formattedLines = lines.map((line) => {
      const trimmedLine = line.trim();
      
      // Decrease indent for closing braces
      if (trimmedLine.includes('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Calculate indent spaces
      const indent = ' '.repeat(indentLevel * 2);
      const formattedLine = indent + trimmedLine;
      
      // Increase indent for opening braces
      if (trimmedLine.includes('{')) {
        indentLevel += 1;
      }
      
      return formattedLine;
    });
    
    onChange(formattedLines.join('\n'));
  };
  
  return (
    <div className="fitch-editor-container border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        className={`
          w-full resize-none font-mono text-sm
          ${theme === 'dark' ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-900'}
          border-0 rounded-none
          focus:outline-none focus:ring-0
          p-4
        `}
        style={{ height }}
        placeholder="Enter your Fitch proof here..."
        spellCheck={false}
      />
      {!readOnly && (
        <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between">
          <button
            onClick={formatFitchProof}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Format
          </button>
          {onSubmit && (
            <button
              onClick={onSubmit}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              Submit
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FitchEditor;