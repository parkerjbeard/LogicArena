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
                <p className="font-semibold mb-1 mt-3 text-yellow-400">Important:</p>
                <p className="text-sm text-yellow-300">
                  You must enter each premise in your proof using <code className="bg-gray-900/50 px-1 rounded">:PR</code> justification.
                  Premises can be at any line position.
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
                {premises && (
                  <button
                    onClick={populatePremises}
                    className="text-xs px-2 py-1 bg-blue-800/30 border border-blue-700 rounded hover:bg-blue-700/30 text-blue-300 hover:text-white transition-colors"
                  >
                    Auto-fill Premises
                  </button>
                )}
                <button
                  onClick={() => insertTemplate('Show ')}
                  className="text-xs px-2 py-1 bg-gray-800/30 border border-gray-700 rounded hover:bg-gray-700/30 text-gray-300 hover:text-white transition-colors"
                >
                  Insert Show
                </button>
                <button
                  onClick={() => insertTemplate('    :AS\n')}
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
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          className={`
            w-full resize-none font-mono text-sm
            bg-gray-900 border-0 rounded-none
            text-gray-200 placeholder-gray-500
            focus:outline-none focus:ring-0
            p-4
          `}
          style={{ height }}
          placeholder="Enter your proof here. Each line should contain a formula followed by its justification.

Example:
P→Q :PR
P :PR  
Q :MP 1,2"
          spellCheck={false}
        />
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