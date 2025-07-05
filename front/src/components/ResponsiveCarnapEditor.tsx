'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useBreakpoint } from '@/hooks/useResponsive';
import { useInput } from '@/contexts/InputContext';
import { ResponsiveButton } from '@/components/ui/ResponsiveButton';
import { 
  InformationCircleIcon, 
  XMarkIcon,
  PlusIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy load Monaco editor wrapper for desktop only
const MonacoEditorWrapper = dynamic(
  () => import('./MonacoEditorWrapper'),
  {
    ssr: false,
    loading: () => <div className="h-full flex items-center justify-center">Loading editor...</div>
  }
);

interface ResponsiveCarnapEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
  showSyntaxGuide?: boolean;
}

// Mobile-friendly proof line editor
const MobileProofEditor: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
}> = ({ value, onChange, onSubmit, readOnly }) => {
  const [lines, setLines] = useState<string[]>(value.split('\n').filter(l => l.trim()));
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    setLines(value.split('\n').filter(l => l.trim()));
  }, [value]);

  const updateLines = (newLines: string[]) => {
    setLines(newLines);
    onChange(newLines.join('\n'));
  };

  const addLine = () => {
    if (readOnly) return;
    const newLines = [...lines, ''];
    updateLines(newLines);
    setEditingLine(lines.length);
    setEditValue('');
  };

  const editLine = (index: number) => {
    if (readOnly) return;
    setEditingLine(index);
    setEditValue(lines[index] || '');
  };

  const saveLine = () => {
    if (editingLine === null) return;
    const newLines = [...lines];
    newLines[editingLine] = editValue;
    updateLines(newLines);
    setEditingLine(null);
  };

  const deleteLine = (index: number) => {
    if (readOnly) return;
    const newLines = lines.filter((_, i) => i !== index);
    updateLines(newLines);
  };

  const insertSymbol = (symbol: string) => {
    setEditValue(editValue + symbol);
  };

  const symbolButtons = [
    { symbol: '→', label: 'implies' },
    { symbol: '∧', label: 'and' },
    { symbol: '∨', label: 'or' },
    { symbol: '¬', label: 'not' },
    { symbol: '↔', label: 'iff' },
    { symbol: '⊥', label: 'false' },
  ];

  return (
    <div className="space-y-4">
      {/* Lines */}
      <div className="space-y-2">
        {lines.map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3"
          >
            {editingLine === index ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 font-mono"
                  placeholder="Enter proof line..."
                  autoFocus
                />
                <div className="flex gap-2 flex-wrap">
                  {symbolButtons.map(({ symbol, label }) => (
                    <button
                      key={symbol}
                      onClick={() => insertSymbol(symbol)}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                      title={label}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <ResponsiveButton
                    onClick={saveLine}
                    variant="primary"
                    size="sm"
                    icon={<CheckIcon className="w-4 h-4" />}
                  >
                    Save
                  </ResponsiveButton>
                  <ResponsiveButton
                    onClick={() => setEditingLine(null)}
                    variant="ghost"
                    size="sm"
                  >
                    Cancel
                  </ResponsiveButton>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="font-mono text-gray-200">{line || '(empty)'}</span>
                {!readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => editLine(index)}
                      className="p-1 text-gray-400 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteLine(index)}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Add line button */}
      {!readOnly && editingLine === null && (
        <ResponsiveButton
          onClick={addLine}
          variant="ghost"
          fullWidth
          icon={<PlusIcon className="w-5 h-5" />}
        >
          Add Line
        </ResponsiveButton>
      )}

      {/* Submit button */}
      {onSubmit && !readOnly && (
        <ResponsiveButton
          onClick={onSubmit}
          variant="primary"
          fullWidth
          size="lg"
        >
          Submit Proof
        </ResponsiveButton>
      )}
    </div>
  );
};

const ResponsiveCarnapEditor: React.FC<ResponsiveCarnapEditorProps> = ({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  height = '400px',
  theme = 'dark',
  showSyntaxGuide = true,
}) => {
  const { deviceType, inputMethod } = useInput();
  const { isMobile } = useBreakpoint();
  const [showGuide, setShowGuide] = useState(false);

  // Use mobile editor for touch devices or small screens
  const useMobileEditor = isMobile || inputMethod === 'touch';

  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    // Configure Monaco for desktop
    editor.updateOptions({
      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      tabSize: 4,
      insertSpaces: true,
      detectIndentation: false,
      readOnly,
      renderWhitespace: 'selection',
    });
    
    // Register Carnap Fitch language
    monaco.languages.register({ id: 'carnap-fitch' });
    
    // Configure language features
    monaco.languages.setLanguageConfiguration('carnap-fitch', {
      comments: { lineComment: '#' },
      brackets: [['(', ')']],
      autoClosingPairs: [{ open: '(', close: ')' }],
    });
  }, [readOnly]);

  // Syntax guide content
  const SyntaxGuide = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`${isMobile ? 'fixed inset-0 z-50 bg-gray-900' : 'absolute right-0 top-0 w-96 max-h-96'} 
        bg-gray-800 rounded-lg shadow-xl overflow-hidden`}
    >
      <div className={`p-4 ${isMobile ? 'safe-top' : ''}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Carnap Syntax Guide</h3>
          <button
            onClick={() => setShowGuide(false)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className={`space-y-4 ${isMobile ? 'h-screen-safe overflow-y-auto pb-20' : 'max-h-80 overflow-y-auto'}`}>
          <div>
            <h4 className="font-semibold mb-2">Logical Symbols</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between font-mono">
                <span>→ or -{`>`}</span>
                <span className="text-gray-400">Implication</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>∧ or /\\ or {`&`}</span>
                <span className="text-gray-400">Conjunction</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>∨ or \\/ or |</span>
                <span className="text-gray-400">Disjunction</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>¬ or ~ or -</span>
                <span className="text-gray-400">Negation</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>↔ or {`<->`}</span>
                <span className="text-gray-400">Biconditional</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Common Rules</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between font-mono">
                <span>:PR</span>
                <span className="text-gray-400">Premise</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>:AS</span>
                <span className="text-gray-400">Assumption</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>:MP 1,2</span>
                <span className="text-gray-400">Modus Ponens</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>:-{`>`}I 2-5</span>
                <span className="text-gray-400">Conditional Intro</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Example Proof</h4>
            <pre className="bg-gray-900 p-2 rounded text-xs font-mono overflow-x-auto">
{`show Q
    P → Q :PR
    P :PR
    Q :MP 1,2`}
            </pre>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="relative">
      {/* Syntax guide button */}
      {showSyntaxGuide && (
        <button
          onClick={() => setShowGuide(!showGuide)}
          className={`absolute ${isMobile ? 'top-2 right-2' : 'top-4 right-4'} z-10 
            p-2 bg-gray-800/90 hover:bg-gray-700 rounded-lg transition-colors`}
          title="Syntax Guide"
        >
          <InformationCircleIcon className="w-5 h-5" />
        </button>
      )}

      {/* Editor */}
      {useMobileEditor ? (
        <div className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4">
          <MobileProofEditor
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            readOnly={readOnly}
          />
        </div>
      ) : (
        <div style={{ height }} className="border border-gray-700/50 rounded-lg overflow-hidden">
          <MonacoEditorWrapper
            value={value}
            onChange={(val) => onChange(val || '')}
            language="carnap-fitch"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            onMount={handleEditorDidMount}
            height={height}
            options={{
              readOnly,
              minimap: { enabled: false },
            }}
          />
        </div>
      )}

      {/* Desktop submit button */}
      {onSubmit && !readOnly && !useMobileEditor && (
        <div className="mt-4">
          <ResponsiveButton
            onClick={onSubmit}
            variant="primary"
            size="lg"
          >
            Submit Proof
          </ResponsiveButton>
        </div>
      )}

      {/* Syntax guide overlay */}
      <AnimatePresence>
        {showGuide && <SyntaxGuide />}
      </AnimatePresence>
    </div>
  );
};

export default ResponsiveCarnapEditor;