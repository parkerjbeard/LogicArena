'use client';

import React, { useRef, useState } from 'react';
import { InfoIcon } from 'lucide-react';

interface CarnapFitchEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
  showSyntaxGuide?: boolean;
  premises?: string; // Comma-separated premises for auto-population
}

const CarnapFitchEditor: React.FC<CarnapFitchEditorProps> = ({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  height = '400px',
  theme = 'dark',
  showSyntaxGuide = true,
  premises,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Auto-populate premises
  const populatePremises = () => {
    if (!premises || !textareaRef.current) return;
    
    const premiseArray = premises.split(',').map(p => p.trim());
    const premiseLines = premiseArray.map(premise => `${premise} :PR`).join('\n');
    
    // Insert at the beginning or at current position if empty
    const currentValue = textareaRef.current.value;
    const newValue = currentValue.trim() ? `${premiseLines}\n${currentValue}` : premiseLines;
    
    textareaRef.current.value = newValue;
    onChange(newValue);
    textareaRef.current.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit?.();
      return;
    }

    // Smart backspace - remove full indentation
    if (e.key === 'Backspace' && !e.shiftKey) {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Only handle if cursor is at the same position (no selection)
      if (start === end && start > 0) {
        // Get the current line start position
        const lineStart = value.lastIndexOf('\n', start - 1) + 1;
        const beforeCursor = value.substring(lineStart, start);
        
        // Check if we're at the beginning of indentation (only spaces before cursor)
        if (beforeCursor && /^  +$/.test(beforeCursor) && beforeCursor.length >= 2) {
          e.preventDefault();
          // Remove 2 spaces
          const newValue = value.substring(0, start - 2) + value.substring(end);
          onChange(newValue);
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = start - 2;
          }, 0);
          return;
        }
      }
    }

    // Auto-indentation on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Get current line
      const lines = value.substring(0, start).split('\n');
      const currentLine = lines[lines.length - 1] || '';
      
      // Calculate current indentation
      const currentIndent = currentLine.match(/^\s*/)?.[0] || '';
      
      // Check if current line starts with "show" (case-insensitive)
      const isShowLine = /^\s*show\s+/i.test(currentLine);
      
      // Add extra indentation for show lines
      const newIndent = isShowLine ? currentIndent + '  ' : currentIndent;
      
      // Insert newline with proper indentation
      const newValue = value.substring(0, start) + '\n' + newIndent + value.substring(end);
      onChange(newValue);
      
      // Set cursor position after indentation
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + newIndent.length;
      }, 0);
      
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

  // Example templates
  const insertTemplate = (template: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newValue = value.substring(0, start) + template + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + template.length;
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  return (
    <div className="carnap-fitch-editor-container">
      {showSyntaxGuide && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <InfoIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-200">
                Carnap-Compatible Fitch Notation
              </span>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
            >
              {showGuide ? 'Hide' : 'Show'} Syntax Guide
            </button>
          </div>
          
          {showGuide && (
            <div className="mt-3 space-y-3">
              <div className="text-sm text-gray-300">
                <p className="font-semibold mb-1">Basic Format:</p>
                <code className="bg-gray-900/50 px-2 py-1 rounded border border-gray-700/50">
                  formula :justification
                </code>
                <p className="font-semibold mb-1 mt-3 text-yellow-400">Note:</p>
                <p className="text-sm text-yellow-300">
                  You must enter each premise as a line in your proof using <code className="bg-gray-900/50 px-1 rounded">:PR</code> justification.
                  For example: <code className="bg-gray-900/50 px-1 rounded text-yellow-300">P→Q :PR</code>
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-300 mb-1">Common Rules:</p>
                  <ul className="space-y-1 text-gray-400">
                    <li><code className="bg-gray-900/50 px-1 rounded">:PR</code> - Premise</li>
                    <li><code className="bg-gray-900/50 px-1 rounded">:AS</code> - Assumption</li>
                    <li><code className="bg-gray-900/50 px-1 rounded">:MP 1,2</code> - Modus Ponens</li>
                    <li><code className="bg-gray-900/50 px-1 rounded">&I 1,2</code> - Conjunction Intro</li>
                    <li><code className="bg-gray-900/50 px-1 rounded">:R 1</code> - Reiteration</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-300 mb-1">Example with Premises:</p>
                  <pre className="bg-gray-900/50 p-2 rounded text-xs border border-gray-700/50 text-gray-300">
{`P→Q  :PR
P    :PR
Q    :MP 1,2`}
                  </pre>
                  <p className="font-semibold text-gray-300 mb-1 mt-2">Subproofs:</p>
                  <pre className="bg-gray-900/50 p-2 rounded text-xs border border-gray-700/50 text-gray-300">
{`Show P→Q
    P    :AS
    Q    :MP 1,2
:CD 2-3`}
                  </pre>
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => insertTemplate('Show ')}
                  className="text-xs px-2 py-1 bg-gray-800/30 border border-gray-700 rounded hover:bg-gray-700/30 text-gray-300 hover:text-white transition-colors"
                >
                  Insert Show
                </button>
                <button
                  onClick={() => insertTemplate('  :AS\n')}
                  className="text-xs px-2 py-1 bg-gray-800/30 border border-gray-700 rounded hover:bg-gray-700/30 text-gray-300 hover:text-white transition-colors"
                >
                  Insert Assumption
                </button>
                <button
                  onClick={() => insertTemplate(':CD ')}
                  className="text-xs px-2 py-1 bg-gray-800/30 border border-gray-700 rounded hover:bg-gray-700/30 text-gray-300 hover:text-white transition-colors"
                >
                  Insert QED
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={`border border-gray-700 ${showSyntaxGuide ? 'rounded-b-lg' : 'rounded-lg'} overflow-hidden`}>
        <div className="flex bg-gray-900 relative">
          {/* Line numbers column */}
          <div className="flex-shrink-0 bg-gray-900 text-gray-500 text-sm font-mono select-none pt-4 pb-4 pr-3 pl-2 text-right border-r border-gray-800" style={{ minHeight: height, minWidth: '3rem' }}>
            {value.split('\n').map((_, index) => (
              <div key={index} style={{ lineHeight: '1.5rem' }}>
                {index + 1}
              </div>
            ))}
          </div>
          
          {/* Indent guides */}
          <div className="absolute left-[3.5rem] top-0 pt-4 pointer-events-none" style={{ minHeight: height }}>
            {value.split('\n').map((line, index) => {
              const indentLevel = Math.floor((line.length - line.trimStart().length) / 2);
              return (
                <div key={index} className="flex" style={{ lineHeight: '1.5rem', height: '1.5rem' }}>
                  {Array.from({ length: indentLevel }, (_, i) => (
                    <div
                      key={i}
                      className="w-2 border-l-2 border-gray-600/50"
                      style={{ marginLeft: i === 0 ? '0.5rem' : '0' }}
                    >
                      {i === indentLevel - 1 && (
                        <span className="text-gray-500 font-bold" style={{ marginLeft: '-2px' }}>│</span>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          
          
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            className={`
              flex-1 resize-none font-mono text-sm
              bg-gray-900 border-0 rounded-none
              text-gray-200 placeholder-gray-500
              focus:outline-none focus:ring-0
              p-4 pl-4
            `}
            style={{ height, lineHeight: '1.5rem' }}
            placeholder="Enter your proof here. Each line should contain a formula followed by its justification.

Example:
P→Q :PR
P :PR  
Q :MP 1,2"
            spellCheck={false}
          />
        </div>
        
        {!readOnly && (
          <div className="bg-gray-800 p-2 flex justify-between items-center">
            <div className="text-xs text-gray-400">
              Press Tab for indentation • Ctrl+Enter to submit
            </div>
            {onSubmit && (
              <button
                onClick={onSubmit}
                className="px-4 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-medium"
              >
                Submit Proof
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarnapFitchEditor;