'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { InfoIcon, ChevronDown, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';

interface CarnapFitchEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  height?: string;
  theme?: 'light' | 'dark';
  showSyntaxGuide?: boolean;
  premises?: string;
}

// Inference rules for auto-completion and syntax highlighting
const INFERENCE_RULES = {
  "PR": { name: "Premise", color: "text-green-400", description: "A given premise" },
  "AS": { name: "Assumption", color: "text-orange-400", description: "An assumption for subproof" },
  "R": { name: "Reiteration", color: "text-blue-400", description: "Repeat an earlier line" },
  "REIT": { name: "Reiteration", color: "text-blue-400", description: "Repeat an earlier line" },
  "MP": { name: "Modus Ponens", color: "text-purple-400", description: "From A→B and A, infer B" },
  "MT": { name: "Modus Tollens", color: "text-purple-400", description: "From A→B and ¬B, infer ¬A" },
  "DN": { name: "Double Negation", color: "text-indigo-400", description: "¬¬A ↔ A" },
  "DNE": { name: "Double Negation Elimination", color: "text-indigo-400", description: "From ¬¬A, infer A" },
  "DNI": { name: "Double Negation Introduction", color: "text-indigo-400", description: "From A, infer ¬¬A" },
  "&I": { name: "Conjunction Introduction", color: "text-emerald-400", description: "From A and B, infer A∧B" },
  "&E": { name: "Conjunction Elimination", color: "text-emerald-400", description: "From A∧B, infer A or B" },
  "∧I": { name: "Conjunction Introduction", color: "text-emerald-400", description: "From A and B, infer A∧B" },
  "∧E": { name: "Conjunction Elimination", color: "text-emerald-400", description: "From A∧B, infer A or B" },
  "|I": { name: "Disjunction Introduction", color: "text-yellow-400", description: "From A, infer A∨B" },
  "|E": { name: "Disjunction Elimination", color: "text-yellow-400", description: "Case analysis on A∨B" },
  "∨I": { name: "Disjunction Introduction", color: "text-yellow-400", description: "From A, infer A∨B" },
  "∨E": { name: "Disjunction Elimination", color: "text-yellow-400", description: "Case analysis on A∨B" },
  "->I": { name: "Conditional Introduction", color: "text-cyan-400", description: "Conditional proof" },
  "->E": { name: "Conditional Elimination", color: "text-cyan-400", description: "Same as Modus Ponens" },
  "→I": { name: "Conditional Introduction", color: "text-cyan-400", description: "Conditional proof" },
  "→E": { name: "Conditional Elimination", color: "text-cyan-400", description: "Same as Modus Ponens" },
  "CP": { name: "Conditional Proof", color: "text-cyan-400", description: "End conditional subproof" },
  "CD": { name: "Conditional Derivation", color: "text-cyan-400", description: "End conditional subproof" },
  "~I": { name: "Negation Introduction", color: "text-red-400", description: "Proof by contradiction" },
  "~E": { name: "Negation Elimination", color: "text-red-400", description: "From A and ¬A, infer ⊥" },
  "¬I": { name: "Negation Introduction", color: "text-red-400", description: "Proof by contradiction" },
  "¬E": { name: "Negation Elimination", color: "text-red-400", description: "From A and ¬A, infer ⊥" },
  "ID": { name: "Indirect Derivation", color: "text-red-400", description: "Proof by contradiction" },
  "IP": { name: "Indirect Proof", color: "text-red-400", description: "Proof by contradiction" },
  "RAA": { name: "Reductio Ad Absurdum", color: "text-red-400", description: "Proof by contradiction" },
};

// Parse a proof line into its components
interface ParsedLine {
  lineNumber: number;
  formula: string;
  justification: string;
  references: string[];
  indentLevel: number;
  isShow: boolean;
  isComment: boolean;
  hasError: boolean;
  errorMessage?: string;
  isCurrentLine?: boolean;
}

const parseProofLine = (line: string, lineNumber: number, showErrors: boolean = false): ParsedLine => {
  const trimmed = line.trim();
  
  // Check if it's a comment
  if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
    return {
      lineNumber,
      formula: '',
      justification: '',
      references: [],
      indentLevel: 0,
      isShow: false,
      isComment: true,
      hasError: false
    };
  }
  
  // Calculate indentation level
  const indentLevel = Math.floor((line.length - line.trimStart().length) / 4);
  
  // Check if it's a show line
  const isShow = /^show\s+/i.test(trimmed);
  if (isShow) {
    return {
      lineNumber,
      formula: trimmed,
      justification: '',
      references: [],
      indentLevel,
      isShow: true,
      isComment: false,
      hasError: false
    };
  }
  
  // Parse regular line: formula :justification references
  const colonIndex = trimmed.lastIndexOf(':');
  if (colonIndex === -1) {
    return {
      lineNumber,
      formula: trimmed,
      justification: '',
      references: [],
      indentLevel,
      isShow: false,
      isComment: false,
      // Only show errors when explicitly requested (on submission)
      hasError: showErrors && trimmed.length > 0,
      errorMessage: 'Missing justification (use :RULE format)'
    };
  }
  
  const formula = trimmed.substring(0, colonIndex).trim();
  const justificationPart = trimmed.substring(colonIndex + 1).trim();
  
  // Split justification and references
  const parts = justificationPart.split(/\s+/);
  const justification = parts[0] || '';
  const references = parts.slice(1);
  
  // Validate justification - only show errors when requested
  let hasError = false;
  let errorMessage = '';
  
  if (showErrors && justification && !INFERENCE_RULES[justification as keyof typeof INFERENCE_RULES]) {
    hasError = true;
    errorMessage = `Unknown inference rule: ${justification}`;
  }
  
  return {
    lineNumber,
    formula,
    justification,
    references,
    indentLevel,
    isShow: false,
    isComment: false,
    hasError,
    errorMessage
  };
};

const ImprovedCarnapFitchEditor: React.FC<CarnapFitchEditorProps> = ({
  value,
  onChange,
  onSubmit,
  readOnly = false,
  height = '400px',
  theme = 'dark',
  showSyntaxGuide = true,
  premises,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autoCompleteVisible, setAutoCompleteVisible] = useState(false);
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<string[]>([]);
  const [autoCompletePosition, setAutoCompletePosition] = useState({ top: 0, left: 0 });
  const [showErrors, setShowErrors] = useState(false);

  // Parse the proof into structured lines
  const parsedLines = useMemo(() => {
    const lines = value.split('\n');
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      return parseProofLine(line, lineNumber, showErrors);
    });
  }, [value, showErrors]);

  // Auto-populate premises
  const populatePremises = useCallback(() => {
    if (!premises || !textareaRef.current) return;
    
    const premiseArray = premises.split(',').map(p => p.trim());
    const premiseLines = premiseArray.map(premise => `${premise} :PR`).join('\n');
    
    const currentValue = textareaRef.current.value;
    const newValue = currentValue.trim() ? `${premiseLines}\n${currentValue}` : premiseLines;
    
    onChange(newValue);
    textareaRef.current.focus();
  }, [premises, onChange]);

  // Handle key events for auto-indentation and auto-completion
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Submit with Ctrl+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSubmit?.();
      return;
    }
    
    // Auto-indentation on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const lines = value.split('\n');
      const currentLineIndex = value.substring(0, start).split('\n').length - 1;
      const currentLine = lines[currentLineIndex] || '';
      
      // Calculate current indentation
      const currentIndent = currentLine.match(/^\s*/)?.[0] || '';
      
      // Check if current line is a "show" line
      const isShowLine = /^\s*show\s+/i.test(currentLine);
      
      // Add extra indentation for show lines
      const newIndent = isShowLine ? currentIndent + '    ' : currentIndent;
      
      const newValue = value.substring(0, start) + '\n' + newIndent + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1 + newIndent.length;
      }, 0);
      return;
    }
    
    // Tab for manual indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
      return;
    }
    
    // Auto-completion trigger
    if (e.key === ':' || (e.key === ' ' && value.substring(start - 1, start) === ':')) {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const lineText = value.substring(lineStart, start);
      
      if (lineText.includes(':')) {
        // Show rule completion
        setAutoCompleteOptions(Object.keys(INFERENCE_RULES));
        setAutoCompleteVisible(true);
        
        // Position the autocomplete dropdown
        const rect = textarea.getBoundingClientRect();
        const lines = value.substring(0, start).split('\n');
        const lineHeight = 20; // Approximate line height
        const top = rect.top + (lines.length - 1) * lineHeight;
        const left = rect.left + 20; // Approximate character width
        
        setAutoCompletePosition({ top, left });
      }
    }
    
    // Hide autocomplete on escape
    if (e.key === 'Escape') {
      setAutoCompleteVisible(false);
    }
  }, [value, onChange, onSubmit]);

  // Handle input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setCursorPosition(e.target.selectionStart);
    
    // Clear errors when user starts typing again
    if (showErrors) {
      setShowErrors(false);
    }
    
    // Hide autocomplete if not typing after colon
    const currentChar = newValue[e.target.selectionStart - 1];
    if (currentChar !== ':' && !currentChar?.match(/[a-zA-Z]/)) {
      setAutoCompleteVisible(false);
    }
  }, [onChange, showErrors]);

  // Insert template text
  const insertTemplate = useCallback((template: string) => {
    if (!textareaRef.current) return;
    
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
  }, [value, onChange]);

  // Insert auto-completion
  const insertAutoComplete = useCallback((rule: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const lineText = value.substring(lineStart, start);
    const colonIndex = lineText.lastIndexOf(':');
    
    if (colonIndex !== -1) {
      const insertPos = lineStart + colonIndex + 1;
      const newValue = value.substring(0, insertPos) + rule + ' ' + value.substring(start);
      onChange(newValue);
      
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = insertPos + rule.length + 1;
          textareaRef.current.focus();
        }
      }, 0);
    }
    
    setAutoCompleteVisible(false);
  }, [value, onChange]);

  // Render syntax-highlighted content
  const renderHighlightedContent = () => {
    return parsedLines.map((line, index) => {
      const lineNum = index + 1;
      
      return (
        <div 
          key={index} 
          className={`flex items-start font-mono text-sm min-h-[1.4rem] ${
            line.hasError ? 'bg-red-900/20' : ''
          }`}
          style={{ lineHeight: '1.4rem' }}
        >
          {/* Line number - fixed width */}
          <div className="absolute left-0 w-[40px] text-right pr-3 text-gray-500 select-none">
            {lineNum}
          </div>
          
          {/* Content area with proper indentation */}
          <div className="flex-1 min-w-0" style={{ marginLeft: '52px', paddingLeft: `${line.indentLevel * 1.5}rem` }}>
            {/* Subproof indentation guides */}
            {line.indentLevel > 0 && (
              <div className="absolute flex" style={{ left: '52px', marginLeft: `${(line.indentLevel - 1) * 1.5}rem` }}>
                {Array.from({ length: line.indentLevel }, (_, i) => (
                  <div 
                    key={i} 
                    className="w-6 border-l border-gray-600/30"
                    style={{ height: '1.4rem' }}
                  />
                ))}
              </div>
            )}
            
            {/* Line content */}
            <div className="relative z-10">
              {line.isComment ? (
                <span className="text-gray-500 italic">{line.formula}</span>
              ) : line.isShow ? (
                <span className="text-blue-400 font-semibold">{line.formula}</span>
              ) : (
                <div className="flex items-center">
                  {/* Formula */}
                  <span className="text-gray-200">{line.formula}</span>
                  
                  {/* Justification */}
                  {line.justification && (
                    <>
                      <span className="text-gray-500 mx-2">:</span>
                      <span className={`${
                        INFERENCE_RULES[line.justification as keyof typeof INFERENCE_RULES]?.color || 'text-gray-400'
                      } font-medium`}>
                        {line.justification}
                      </span>
                      
                      {/* References */}
                      {line.references.length > 0 && (
                        <span className="text-gray-400 ml-1">
                          {line.references.join(',')}
                        </span>
                      )}
                    </>
                  )}
                  
                  {/* Error indicator */}
                  {line.hasError && (
                    <div className="ml-2 flex items-center">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-xs ml-1">{line.errorMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="carnap-fitch-editor-container">
      {/* Syntax Guide Header */}
      {showSyntaxGuide && (
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <InfoIcon className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-gray-200">
                Enhanced Carnap-Compatible Fitch Notation
              </span>
              {parsedLines.some(line => line.hasError) && (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Syntax errors detected</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-sm text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
            >
              {showGuide ? 'Hide' : 'Show'} Guide
              <ChevronDown className={`w-3 h-3 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {showGuide && (
            <div className="mt-3 space-y-3">
              <div className="text-sm text-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-semibold">Enhanced Features:</span>
                </div>
                <ul className="text-xs text-gray-400 space-y-1 ml-6">
                  <li>• <strong>Syntax highlighting</strong> for formulas, rules, and errors</li>
                  <li>• <strong>Auto-indentation</strong> after "show:" lines</li>
                  <li>• <strong>Real-time validation</strong> with error highlighting</li>
                  <li>• <strong>Visual subproof guides</strong> with indentation lines</li>
                  <li>• <strong>Auto-completion</strong> for inference rules (type : to trigger)</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-300 mb-1">Basic Format:</p>
                  <div className="bg-gray-900/50 p-2 rounded border border-gray-700/50">
                    <code className="text-gray-200">formula</code>{' '}
                    <code className="text-gray-500">:</code>
                    <code className="text-purple-400">RULE</code>{' '}
                    <code className="text-gray-400">refs</code>
                  </div>
                  
                  <p className="font-semibold text-yellow-400 mt-2 mb-1">Keyboard Shortcuts:</p>
                  <ul className="space-y-1 text-xs text-gray-400">
                    <li><kbd className="bg-gray-800 px-1 rounded">Tab</kbd> - Indent line</li>
                    <li><kbd className="bg-gray-800 px-1 rounded">Enter</kbd> - Auto-indent after show:</li>
                    <li><kbd className="bg-gray-800 px-1 rounded">:</kbd> - Trigger rule completion</li>
                    <li><kbd className="bg-gray-800 px-1 rounded">Ctrl+Enter</kbd> - Submit proof</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-300 mb-1">Example with Subproof:</p>
                  <pre className="bg-gray-900/50 p-2 rounded text-xs border border-gray-700/50">
                    <span className="text-green-400">P→Q :PR</span>{'\n'}
                    <span className="text-green-400">P :PR</span>{'\n'}
                    <span className="text-blue-400">Show Q</span>{'\n'}
                    <span className="text-gray-200">    Q</span> <span className="text-gray-500">:</span><span className="text-purple-400">MP</span> <span className="text-gray-400">1,2</span>{'\n'}
                    <span className="text-cyan-400">:CD 3-4</span>
                  </pre>
                </div>
              </div>
              
              {/* Quick action buttons */}
              <div className="flex gap-2 flex-wrap">
                {premises && (
                  <button
                    onClick={populatePremises}
                    className="text-xs px-3 py-1.5 bg-green-800/30 border border-green-700 rounded hover:bg-green-700/30 text-green-300 hover:text-white transition-colors flex items-center gap-1"
                  >
                    <Lightbulb className="w-3 h-3" />
                    Auto-fill Premises
                  </button>
                )}
                <button
                  onClick={() => insertTemplate('Show ')}
                  className="text-xs px-3 py-1.5 bg-blue-800/30 border border-blue-700 rounded hover:bg-blue-700/30 text-blue-300 hover:text-white transition-colors"
                >
                  Insert Show
                </button>
                <button
                  onClick={() => insertTemplate('    ')}
                  className="text-xs px-3 py-1.5 bg-gray-800/30 border border-gray-700 rounded hover:bg-gray-700/30 text-gray-300 hover:text-white transition-colors"
                >
                  Add Indent
                </button>
                <button
                  onClick={() => insertTemplate(' :AS')}
                  className="text-xs px-3 py-1.5 bg-orange-800/30 border border-orange-700 rounded hover:bg-orange-700/30 text-orange-300 hover:text-white transition-colors"
                >
                  :AS
                </button>
                <button
                  onClick={() => insertTemplate(' :PR')}
                  className="text-xs px-3 py-1.5 bg-green-800/30 border border-green-700 rounded hover:bg-green-700/30 text-green-300 hover:text-white transition-colors"
                >
                  :PR
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Main Editor */}
      <div className={`relative ${showSyntaxGuide ? 'rounded-b-lg' : 'rounded-lg'} overflow-hidden border border-gray-700`}>
        {/* Highlighted overlay */}
        <div 
          className="absolute inset-0 pointer-events-none font-mono text-sm bg-gray-900 overflow-hidden"
          style={{ height }}
        >
          <div className="h-full overflow-auto p-4">
            {renderHighlightedContent()}
          </div>
        </div>
        
        {/* Invisible textarea for input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          readOnly={readOnly}
          className="relative w-full h-full resize-none font-mono text-sm bg-transparent text-transparent caret-gray-200 border-0 focus:outline-none selection:bg-blue-500/30"
          style={{ 
            height,
            padding: '1rem',
            paddingLeft: '52px', // Exact pixels: line number width (40px) + padding-right (12px)
            lineHeight: '1.4rem',
            letterSpacing: 'normal'
          }}
          placeholder=""
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
        
        {/* Auto-completion dropdown */}
        {autoCompleteVisible && (
          <div 
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto"
            style={{ 
              top: autoCompletePosition.top + 20, 
              left: autoCompletePosition.left,
              minWidth: '200px'
            }}
          >
            {autoCompleteOptions.map((rule) => {
              const ruleInfo = INFERENCE_RULES[rule as keyof typeof INFERENCE_RULES];
              return (
                <button
                  key={rule}
                  onClick={() => insertAutoComplete(rule)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono font-medium ${ruleInfo?.color || 'text-gray-300'}`}>
                      {rule}
                    </span>
                    <span className="text-xs text-gray-400 ml-2">{ruleInfo?.name}</span>
                  </div>
                  {ruleInfo?.description && (
                    <div className="text-xs text-gray-500 mt-1">{ruleInfo.description}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
        
        {/* Footer */}
        {!readOnly && (
          <div className="bg-gray-800 p-2 flex justify-between items-center border-t border-gray-700">
            <div className="text-xs text-gray-400">
              Enhanced editor v2.1 • Fixed cursor alignment • Auto-completion
            </div>
            {onSubmit && (
              <button
                onClick={() => {
                  // Show errors when attempting to submit
                  setShowErrors(true);
                  
                  // Check for errors by re-parsing with errors enabled
                  const lines = value.split('\n');
                  const linesWithErrors = lines.map((line, index) => 
                    parseProofLine(line, index + 1, true)
                  );
                  const hasErrors = linesWithErrors.some(line => line.hasError);
                  
                  // Only submit if no errors
                  if (!hasErrors) {
                    onSubmit();
                  }
                }}
                className="px-4 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium flex items-center gap-1"
              >
                <CheckCircle className="w-4 h-4" />
                Submit Proof
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImprovedCarnapFitchEditor;