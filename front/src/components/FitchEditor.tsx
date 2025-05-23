'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Editor, Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';

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
  theme = 'light',
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  
  // Configure Monaco editor
  const handleEditorDidMount = (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Set up editor options
    editor.updateOptions({
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 2,
      readOnly,
    });
    
    // Add key binding for auto-indentation
    editor.addCommand(monaco.KeyCode.Tab, () => {
      const selection = editor.getSelection();
      if (selection) {
        const position = selection.getPosition();
        const lineContent = editor.getModel()?.getLineContent(position.lineNumber) || '';
        
        // If line ends with '{', add two spaces on next line
        if (lineContent.trim().endsWith('{')) {
          editor.trigger('keyboard', 'type', { text: '\n  ' });
          return;
        }
        
        // Otherwise, insert regular tab
        editor.trigger('keyboard', 'tab', {});
      }
    });
    
    // Create syntax highlighting for Fitch notation
    monaco.languages.register({ id: 'fitch' });
    monaco.languages.setMonarchTokensProvider('fitch', {
      tokenizer: {
        root: [
          [/\d+\./, 'line-number'],
          [/\[.*?\]/, 'premise'],
          [/\{|\}/, 'bracket'],
          [/[A-Z][a-zA-Z0-9]*/, 'variable'],
          [/¬|∧|∨|→|↔|⊥/, 'operator'],
          [/\(|\)/, 'parenthesis'],
        ],
      },
    });
    
    // Add theming
    monaco.editor.defineTheme('fitchLight', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'line-number', foreground: '666666', fontStyle: 'bold' },
        { token: 'premise', foreground: '008800' },
        { token: 'bracket', foreground: 'AA0000', fontStyle: 'bold' },
        { token: 'variable', foreground: '0000AA' },
        { token: 'operator', foreground: 'AA00AA' },
      ],
      colors: {},
    });
    
    monaco.editor.defineTheme('fitchDark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'line-number', foreground: 'AAAAAA', fontStyle: 'bold' },
        { token: 'premise', foreground: '88CC88' },
        { token: 'bracket', foreground: 'FF6666', fontStyle: 'bold' },
        { token: 'variable', foreground: '88AAFF' },
        { token: 'operator', foreground: 'FFAAFF' },
      ],
      colors: {},
    });
    
    // Set the theme
    monaco.editor.setTheme(theme === 'light' ? 'fitchLight' : 'fitchDark');
    
    // Add keyboard shortcut for submission
    if (onSubmit) {
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, onSubmit);
    }
  };
  
  // Format Fitch-style proof with proper indentation
  const formatFitchProof = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const model = editor.getModel();
    if (!model) return;
    
    const text = model.getValue();
    const lines = text.split('\n');
    
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
    
    // Update the editor value
    editor.setValue(formattedLines.join('\n'));
  };
  
  // Handle editor value changes
  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      onChange(value);
    }
  };
  
  return (
    <div className="fitch-editor-container border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height={height}
        language="fitch"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          automaticLayout: true,
        }}
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