'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Editor, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { InfoIcon } from 'lucide-react';

interface CarnapFitchEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
  showSyntaxGuide?: boolean;
}

const CarnapFitchEditor: React.FC<CarnapFitchEditorProps> = ({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  height = '400px',
  theme = 'light',
  showSyntaxGuide = true,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  // Configure Monaco editor
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Set up editor options
    editor.updateOptions({
      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,  // Use spaces instead of tabs
      detectIndentation: false,  // Don't auto-detect, use our settings
      readOnly,
      renderWhitespace: 'selection',  // Show spaces when selected
    });
    
    // Register Carnap Fitch language
    monaco.languages.register({ id: 'carnap-fitch' });
    
    // Set language configuration
    monaco.languages.setLanguageConfiguration('carnap-fitch', {
      comments: {
        lineComment: '#',
      },
      brackets: [
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '(', close: ')' },
      ],
    });
    
    // Define Carnap syntax highlighting
    monaco.languages.setMonarchTokensProvider('carnap-fitch', {
      defaultToken: '',
      
      operators: [
        '→', '->', '↔', '<->', '∧', '/\\', '&', '∨', '\\/', '|', 
        '¬', '~', '-', '⊥', '_|_', '!?'
      ],
      
      rules: [
        'PR', 'AS', 'R', 'REIT', 'MP', 'MT', 'DN', 'DNE', 'DNI',
        '&I', '&E', '/\\I', '/\\E', '|I', '|E', '\\/I', '\\/E',
        'ADD', 'MTP', '->I', '->E', 'CP', '<->I', '<->E', 'BC', 'CB',
        '~I', '~E', '-I', '-E', '!?I', '!?E', '_|_I', '_|_E',
        'ID', 'IP', 'RAA', 'DD', 'CD', 'AI', 'AE', 'EI', 'EE',
        'UI', 'UE'
      ],
      
      tokenizer: {
        root: [
          // Show statements
          [/^(\s*)(show)\s+(.*)$/i, ['whitespace', 'keyword', 'string']],
          
          // QED lines
          [/^(\s*)(:)(DD|CD|ID|RAA)(\s+[\d,-]+)?$/i, ['whitespace', 'delimiter', 'rule', 'number']],
          
          // Regular lines with justification
          [/^([^:]+)(:)(.+)$/, ['formula', 'delimiter', 'justification']],
          
          // Comments
          [/#.*$/, 'comment'],
          
          // Operators
          [/→|->|↔|<->|∧|\/\\|&|∨|\\\||¬|~|-|⊥|_\|_|\!\?/, 'operator'],
          
          // Variables and predicates
          [/[A-Z][a-zA-Z0-9]*/, 'variable'],
          [/[a-z][a-zA-Z0-9]*/, 'predicate'],
          
          // Numbers
          [/\d+/, 'number'],
          
          // Parentheses
          [/[()]/, 'delimiter.parenthesis'],
          
          // Whitespace
          [/\s+/, 'whitespace'],
        ],
        
        justification: [
          // Rules
          [/PR|AS|R|REIT|MP|MT|DN|DNE|DNI|&I|&E|\/\\I|\/\\E|\|I|\|E|\\/I|\\/E|ADD|MTP|->I|->E|CP|<->I|<->E|BC|CB|~I|~E|-I|-E|!?I|!?E|_\|_I|_\|_E|ID|IP|RAA|DD|CD|AI|AE|EI|EE|UI|UE/i, 'rule'],
          
          // Line numbers and ranges
          [/\d+(-\d+)?/, 'number'],
          [/,/, 'delimiter'],
          
          // Default
          [/./, 'justification'],
        ],
      },
    });
    
    // Define theme for Carnap Fitch
    monaco.editor.defineTheme('carnap-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'rule', foreground: '008800', fontStyle: 'bold' },
        { token: 'variable', foreground: '0066CC' },
        { token: 'predicate', foreground: '6600CC' },
        { token: 'operator', foreground: 'CC0066', fontStyle: 'bold' },
        { token: 'number', foreground: '098658' },
        { token: 'delimiter', foreground: '000000', fontStyle: 'bold' },
        { token: 'comment', foreground: '7CA668', fontStyle: 'italic' },
        { token: 'string', foreground: 'A31515' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
      },
    });
    
    monaco.editor.defineTheme('carnap-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'rule', foreground: '4EC9B0', fontStyle: 'bold' },
        { token: 'variable', foreground: '9CDCFE' },
        { token: 'predicate', foreground: 'C586C0' },
        { token: 'operator', foreground: 'FF6B9D', fontStyle: 'bold' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'delimiter', foreground: 'D4D4D4', fontStyle: 'bold' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'string', foreground: 'CE9178' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
      },
    });
    
    // Set the theme
    monaco.editor.setTheme(theme === 'light' ? 'carnap-light' : 'carnap-dark');
    
    // Handle Tab key for proper indentation
    editor.addCommand(monaco.KeyCode.Tab, () => {
      const selection = editor.getSelection();
      if (selection) {
        const position = selection.getPosition();
        const model = editor.getModel();
        if (model) {
          const lineContent = model.getLineContent(position.lineNumber);
          const trimmed = lineContent.trim().toLowerCase();
          
          // If we just typed 'show', add proper indentation on next line
          if (trimmed.startsWith('show')) {
            // Insert newline with 4 spaces indentation
            editor.trigger('keyboard', 'type', { text: '\n    ' });
            return;
          }
          
          // Otherwise, insert 4 spaces
          editor.trigger('keyboard', 'type', { text: '    ' });
        }
      }
    });
    
    // Handle Enter key for smart indentation
    editor.addCommand(monaco.KeyCode.Enter, () => {
      const position = editor.getPosition();
      if (position) {
        const model = editor.getModel();
        if (model) {
          const lineContent = model.getLineContent(position.lineNumber);
          const currentIndent = lineContent.match(/^\s*/)?.[0] || '';
          const trimmed = lineContent.trim().toLowerCase();
          
          // If line starts with 'show', increase indent
          if (trimmed.startsWith('show')) {
            editor.trigger('keyboard', 'type', { text: '\n' + currentIndent + '    ' });
          }
          // If line starts with ':', decrease indent (QED line)
          else if (trimmed.startsWith(':')) {
            const newIndent = currentIndent.length >= 4 ? currentIndent.substring(4) : '';
            editor.trigger('keyboard', 'type', { text: '\n' + newIndent });
          }
          // Otherwise, maintain current indent
          else {
            editor.trigger('keyboard', 'type', { text: '\n' + currentIndent });
          }
        }
      }
    });
    
    // Add keyboard shortcut for submission
    if (onSubmit) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onSubmit);
    }
  };
  
  // Handle editor value changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };
  
  // Example templates
  const insertTemplate = (template: string) => {
    if (editorRef.current) {
      const position = editorRef.current.getPosition();
      if (position) {
        editorRef.current.executeEdits('', [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: template,
        }]);
        editorRef.current.focus();
      }
    }
  };
  
  return (
    <div className="carnap-fitch-editor-container">
      {showSyntaxGuide && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Carnap-Compatible Fitch Notation
              </span>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              {showGuide ? 'Hide' : 'Show'} Syntax Guide
            </button>
          </div>
          
          {showGuide && (
            <div className="mt-3 space-y-3">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="font-semibold mb-1">Basic Format:</p>
                <code className="bg-white dark:bg-gray-800 px-2 py-1 rounded">
                  formula :justification
                </code>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Common Rules:</p>
                  <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                    <li><code className="bg-white dark:bg-gray-800 px-1 rounded">:PR</code> - Premise</li>
                    <li><code className="bg-white dark:bg-gray-800 px-1 rounded">:AS</code> - Assumption</li>
                    <li><code className="bg-white dark:bg-gray-800 px-1 rounded">:MP 1,2</code> - Modus Ponens</li>
                    <li><code className="bg-white dark:bg-gray-800 px-1 rounded">:&I 1,2</code> - Conjunction Intro</li>
                    <li><code className="bg-white dark:bg-gray-800 px-1 rounded">:R 1</code> - Reiteration</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1">Subproofs:</p>
                  <pre className="bg-white dark:bg-gray-800 p-2 rounded text-xs">
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
                  className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Insert Show
                </button>
                <button
                  onClick={() => insertTemplate('    :AS\n')}
                  className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Insert Assumption
                </button>
                <button
                  onClick={() => insertTemplate(':CD ')}
                  className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Insert QED
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={`border border-gray-300 dark:border-gray-700 ${showSyntaxGuide ? 'rounded-b-lg' : 'rounded-lg'} overflow-hidden`}>
        <Editor
          height={height}
          language="carnap-fitch"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            automaticLayout: true,
          }}
        />
        {!readOnly && (
          <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">
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