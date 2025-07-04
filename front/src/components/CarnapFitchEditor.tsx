'use client';

import React, { useRef, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { InfoIcon } from 'lucide-react';

const MonacoEditorWrapper = dynamic(
  () => import('./MonacoEditorWrapper'),
  { ssr: false }
);

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
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [showGuide, setShowGuide] = useState(false);
  const disposablesRef = useRef<any[]>([]);
  
  // Configure Monaco editor
  const handleEditorDidMount = (editor: any, monaco: any) => {
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
          // Rules - split into multiple patterns to avoid regex complexity
          [/\b(PR|AS|R|REIT|MP|MT|DN|DNE|DNI)\b/i, 'rule'],
          [/\b(&I|&E|ADD|MTP|CP|BC|CB|ID|IP|RAA|DD|CD|AI|AE|EI|EE|UI|UE)\b/i, 'rule'],
          [/\b(->I|->E|<->I|<->E|~I|~E|-I|-E)\b/i, 'rule'],
          [/\b(\|I|\|E|\/I|\/E|!I|!E|_\|_I|_\|_E)\b/i, 'rule'],
          
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
    
    // Set the theme based on prop
    monaco.editor.setTheme(theme === 'light' ? 'carnap-light' : 'carnap-dark');
    
    // Handle Tab key for proper indentation
    const tabDisposable = editor.addCommand(monaco.KeyCode.Tab, () => {
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
    disposablesRef.current.push(tabDisposable);
    
    // Handle Enter key for smart indentation
    const enterDisposable = editor.addCommand(monaco.KeyCode.Enter, () => {
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
    disposablesRef.current.push(enterDisposable);
    
    // Add keyboard shortcut for submission
    if (onSubmit) {
      const submitDisposable = editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onSubmit);
      disposablesRef.current.push(submitDisposable);
    }
  };
  
  // Handle editor value changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Dispose of all commands and event listeners
      disposablesRef.current.forEach(disposable => disposable.dispose());
      disposablesRef.current = [];
      
      // Dispose of editor if it exists
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);
  
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-300 mb-1">Common Rules:</p>
                  <ul className="space-y-1 text-gray-400">
                    <li><code className="bg-gray-900/50 px-1 rounded">:PR</code> - Premise</li>
                    <li><code className="bg-gray-900/50 px-1 rounded">:AS</code> - Assumption</li>
                    <li><code className="bg-gray-900/50 px-1 rounded">:MP 1,2</code> - Modus Ponens</li>
                    <li><code className="bg-gray-900/50 px-1 rounded">:&I 1,2</code> - Conjunction Intro</li>
                    <li><code className="bg-gray-900/50 px-1 rounded">:R 1</code> - Reiteration</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-300 mb-1">Subproofs:</p>
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
        <MonacoEditorWrapper
          height={height}
          language="carnap-fitch"
          value={value}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            automaticLayout: true,
          }}
          theme={theme === 'light' ? 'carnap-light' : 'carnap-dark'}
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