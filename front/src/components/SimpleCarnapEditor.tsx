'use client';

import React, { useState, useRef, useEffect } from 'react';

interface SimpleCarnapEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
  showSyntaxGuide?: boolean;
  premises?: string;
}

const SimpleCarnapEditor: React.FC<SimpleCarnapEditorProps> = ({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  height = '400px',
  theme = 'dark',
  showSyntaxGuide = false,
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

  const syntaxGuide = (
    <div className="mt-4 p-4 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg">
      <h3 className="font-semibold mb-2 text-gray-200">Carnap Fitch Notation Guide</h3>
      <div className="space-y-2 text-sm">
        <div>
          <strong className="text-blue-400">Logical Operators:</strong>
          <div className="ml-4 text-gray-300 font-mono">
            &amp; (and), | (or), &gt; (if-then), ~ (not), &lt;&gt; (if and only if)
          </div>
        </div>
        <div>
          <strong className="text-green-400">Inference Rules:</strong>
          <div className="ml-4 text-gray-300 font-mono">
            :MP (Modus Ponens), :MT (Modus Tollens), :&amp;I (Conjunction Introduction), :&amp;E (Conjunction Elimination)
          </div>
        </div>
        <div>
          <strong className="text-purple-400">Line References:</strong>
          <div className="ml-4 text-gray-300 font-mono">
            :MP 1,2 (apply rule to lines 1 and 2), :&amp;E 3 (apply rule to line 3)
          </div>
        </div>
        <div>
          <strong className="text-yellow-400">Premises:</strong>
          <div className="ml-4 text-gray-300 font-mono">
            P→Q :PR (premise), P :PR (premise)
          </div>
        </div>
        <div>
          <strong className="text-indigo-400">Subproofs:</strong>
          <div className="ml-4 text-gray-300 font-mono">
            Show P (start subproof for P), then indent subsequent lines
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {premises && (
            <button
              onClick={populatePremises}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Auto-fill Premises
            </button>
          )}
          {showSyntaxGuide && (
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              {showGuide ? 'Hide' : 'Show'} Syntax Guide
            </button>
          )}
        </div>
        <div className="text-xs text-gray-500">
          Ctrl+Enter to submit
        </div>
      </div>
      
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        readOnly={readOnly}
        className={`
          w-full resize-none font-mono text-sm
          bg-gray-900 border border-gray-700 rounded-lg
          text-gray-200 placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
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
      
      {showGuide && syntaxGuide}
    </div>
  );
};

export default SimpleCarnapEditor;