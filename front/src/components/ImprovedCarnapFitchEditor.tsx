'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { InfoIcon, ChevronDown, Lightbulb, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

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

// Logical symbol normalization with cursor tracking
const normalizeFormula = (input: string): string => {
  // Map common shorthand to canonical unicode symbols used in UI
  // Order matters to avoid overlaps
  let s = input;
  // Biconditional: <->, <=>, iff
  s = s.replace(/\biff\b/gi, '↔');
  s = s.replace(/<->|<=>/g, '↔');
  // Implication: ->, =>, ⊃
  s = s.replace(/->|=>|⊃/g, '→');
  // Conjunction: /\\, &, and
  s = s.replace(/\/(\\)/g, '∧'); // safeguard, but we'll also handle /\\ below
  s = s.replace(/\/\\/g, '∧');
  s = s.replace(/\band\b/gi, '∧');
  s = s.replace(/&/g, '∧');
  // Disjunction: \/, |, v (vell)
  s = s.replace(/\\\//g, '∨');
  s = s.replace(/\|/g, '∨');
  // Accept 'v' as vell when surrounded by spaces
  s = s.replace(/\s+v\s+/gi, ' ∨ ');
  // Negation: ~, - (when unary), not
  s = s.replace(/\bnot\b/gi, '¬');
  // Replace leading or operator-adjacent hyphen as negation (avoid turning subtraction-like hyphens mid-token)
  s = s.replace(/(^|[\s(])~\s*/g, '$1¬');
  s = s.replace(/(^|[\s(])-\s*/g, '$1¬');
  return s;
};

// Enhanced normalization that tracks cursor position changes
const normalizeWithCursorTracking = (input: string, cursorPos: number): { text: string; newCursorPos: number } => {
  let text = input;
  let adjustedCursor = cursorPos;
  
  // Track replacements and their position impacts
  const replacements: Array<{ pattern: RegExp; replacement: string | ((match: string) => string) }> = [
    // Biconditional
    { pattern: /\biff\b/gi, replacement: '↔' },
    { pattern: /<->|<=>/g, replacement: '↔' },
    // Implication
    { pattern: /->|=>|⊃/g, replacement: '→' },
    // Conjunction
    { pattern: /\/\\/g, replacement: '∧' },
    { pattern: /\band\b/gi, replacement: '∧' },
    { pattern: /&/g, replacement: '∧' },
    // Disjunction
    { pattern: /\\\//g, replacement: '∨' },
    { pattern: /\|/g, replacement: '∨' },
    { pattern: /\s+v\s+/gi, replacement: ' ∨ ' },
    // Negation
    { pattern: /\bnot\b/gi, replacement: '¬' },
    { pattern: /(^|[\s(])~\s*/g, replacement: '$1¬' },
    { pattern: /(^|[\s(])-\s*/g, replacement: '$1¬' }
  ];
  
  // Apply each replacement and track cursor position
  for (const { pattern, replacement } of replacements) {
    let match;
    const matches: Array<{ index: number; length: number; newLength: number }> = [];
    
    // Reset lastIndex for global patterns
    if (pattern.global) {
      pattern.lastIndex = 0;
    }
    
    // Find all matches
    while ((match = pattern.exec(text)) !== null) {
      const matchStart = match.index;
      const matchLength = match[0].length;
      let replacementText: string;
      
      if (typeof replacement === 'function') {
        replacementText = replacement(match[0]);
      } else if (replacement.includes('$1')) {
        replacementText = replacement.replace('$1', match[1] || '');
      } else {
        replacementText = replacement;
      }
      
      matches.push({
        index: matchStart,
        length: matchLength,
        newLength: replacementText.length
      });
      
      if (!pattern.global) break;
    }
    
    // Apply replacements from end to start to maintain indices
    for (let i = matches.length - 1; i >= 0; i--) {
      const { index, length, newLength } = matches[i];
      
      // Adjust cursor if it's after this replacement
      if (cursorPos > index + length) {
        adjustedCursor += (newLength - length);
      } else if (cursorPos > index && cursorPos <= index + length) {
        // Cursor is within the replaced text, place it after the replacement
        adjustedCursor = index + newLength;
      }
    }
    
    // Apply the replacement to the text
    text = text.replace(pattern, replacement as any);
  }
  
  return { text, newCursorPos: adjustedCursor };
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
  isSyntaxValid?: boolean;
}

const parseProofLine = (line: string, lineNumber: number, showErrors: boolean = false): ParsedLine => {
  const normalizedLine = normalizeFormula(line);
  const trimmed = normalizedLine.trim();
  
  // Check if it's an empty line - return early without error
  if (trimmed.length === 0) {
    return {
      lineNumber,
      formula: '',
      justification: '',
      references: [],
      indentLevel: 0,
      isShow: false,
      isComment: false,
      hasError: false
    };
  }
  
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
  
  // Calculate indentation level (tabs count as 4 spaces)
  const leading = line.match(/^[\t ]*/)?.[0] || '';
  let indentSpaces = 0;
  for (let i = 0; i < leading.length; i += 1) {
    indentSpaces += leading[i] === '\t' ? 4 : 1;
  }
  const indentLevel = Math.floor(indentSpaces / 4);
  
  // Check if it's a show line
  const isShow = /^show\s+/i.test(trimmed);
  if (isShow) {
    const showFormula = trimmed.substring(4).trim();
    if (showErrors && !showFormula) {
      return {
        lineNumber,
        formula: trimmed,
        justification: '',
        references: [],
        indentLevel,
        isShow: true,
        isComment: false,
        hasError: true,
        errorMessage: 'Show statement needs a formula to prove'
      };
    }
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
  if (colonIndex === -1 && trimmed.length > 0) {
    return {
      lineNumber,
      formula: trimmed,
      justification: '',
      references: [],
      indentLevel,
      isShow: false,
      isComment: false,
      hasError: showErrors,
      errorMessage: showErrors ? `Line ${lineNumber}: Missing justification. Add ":RULE" (e.g., ":PR" for premise)` : undefined
    };
  }
  
  const formula = trimmed.substring(0, colonIndex).trim();
  const justificationPart = trimmed.substring(colonIndex + 1).trim();
  
  // Split justification and references
  const parts = justificationPart.split(/\s+/);
  const justification = parts[0] || '';
  const refString = parts.slice(1).join(' ');
  const references = refString ? refString.split(',').map(r => r.trim()).filter(r => r) : [];
  
  // Enhanced validation with specific error messages
  let hasError = false;
  let errorMessage = '';
  
  // Parse and validate references
  const expandedRefs: string[] = [];
  let refsOk = true;
  
  for (const ref of references) {
    if (ref.includes('-')) {
      const [start, end] = ref.split('-').map(n => parseInt(n.trim()));
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) {
          expandedRefs.push(i.toString());
        }
      } else {
        refsOk = false;
        if (showErrors) {
          hasError = true;
          errorMessage = `Line ${lineNumber}: Invalid range "${ref}". Use format "n-m" where n ≤ m`;
        }
      }
    } else if (/^\d+$/.test(ref)) {
      expandedRefs.push(ref);
    } else if (ref) {
      refsOk = false;
      if (showErrors) {
        hasError = true;
        errorMessage = `Line ${lineNumber}: Invalid reference "${ref}". Use line numbers (e.g., 1,2 or 3-5)`;
      }
    }
  }
  
  // Validate rule and provide helpful suggestions
  const ruleInfo = INFERENCE_RULES[justification as keyof typeof INFERENCE_RULES];
  const ruleOk = Boolean(ruleInfo);
  
  if (showErrors && !hasError) {
    if (!formula && !isShow) {
      hasError = true;
      errorMessage = `Line ${lineNumber}: Empty formula. Enter a logical formula before the colon`;
    } else if (justification && !ruleInfo) {
      // Suggest similar rules
      const suggestions = Object.keys(INFERENCE_RULES)
        .filter(r => r.toLowerCase().includes(justification.toLowerCase()) || 
                     justification.toLowerCase().includes(r.toLowerCase()))
        .slice(0, 3);
      
      hasError = true;
      errorMessage = suggestions.length > 0
        ? `Line ${lineNumber}: Unknown rule "${justification}". Did you mean: ${suggestions.join(', ')}?`
        : `Line ${lineNumber}: Unknown rule "${justification}". Common rules: PR, AS, MP, &I`;
    } else if (ruleInfo && expandedRefs.length === 0 && !['PR', 'AS'].includes(justification)) {
      hasError = true;
      errorMessage = `Line ${lineNumber}: Rule ${justification} (${ruleInfo.name}) typically requires line references`;
    }
  }
  
  return {
    lineNumber,
    formula,
    justification,
    references: expandedRefs,
    indentLevel,
    isShow: false,
    isComment: false,
    hasError,
    errorMessage,
    isSyntaxValid: Boolean((formula || isShow) && (!justification || (ruleOk && refsOk)) && !hasError)
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
  const overlayScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autoCompleteVisible, setAutoCompleteVisible] = useState(false);
  const [autoCompleteOptions, setAutoCompleteOptions] = useState<string[]>([]);
  const [autoCompletePosition, setAutoCompletePosition] = useState({ top: 0, left: 0 });
  const [showErrors, setShowErrors] = useState(false);
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  // Debounce the value for validation (250ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, 250);
    
    return () => clearTimeout(timer);
  }, [value]);

  // Parse the proof into structured lines with caching
  const parsedLines = useMemo(() => {
    const lines = debouncedValue.split('\n');
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      return parseProofLine(line, lineNumber, showErrors);
    });
  }, [debouncedValue, showErrors]);
  
  // Cache for immediate display (no validation delays)
  const displayLines = useMemo(() => {
    const lines = value.split('\n');
    return lines.map((line, index) => {
      const lineNumber = index + 1;
      // For display, we only need basic parsing without error checking
      return parseProofLine(line, lineNumber, false);
    });
  }, [value]);

  // Auto-populate premises
  const populatePremises = useCallback(() => {
    if (!premises || !textareaRef.current) return;
    
    const premiseArray = premises.split(',').map(p => p.trim());
    const premiseLines = premiseArray.map(premise => `${premise} :PR`).join('\n');
    
    const currentValue = textareaRef.current.value;
    const newValue = currentValue.trim() ? `${premiseLines}\n${currentValue}` : premiseLines;
    
    onChange(newValue);
    
    // Set cursor to end of inserted premises
    setTimeout(() => {
      if (textareaRef.current) {
        const position = premiseLines.length;
        textareaRef.current.setSelectionRange(position, position);
        textareaRef.current.focus();
      }
    }, 0);
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

  // Handle input changes with proper cursor tracking
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const originalCaret = e.target.selectionStart;
    
    // Normalize the text with cursor tracking
    const { text: normalized, newCursorPos } = normalizeWithCursorTracking(newValue, originalCaret);
    
    onChange(normalized);
    
    // After React updates, set the corrected caret position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
      }
    }, 0);
    setCursorPosition(newCursorPos);
    
    // Clear errors when user starts typing again
    if (showErrors) {
      setShowErrors(false);
    }
    
    // Hide autocomplete if not typing after colon
    const currentChar = newValue[originalCaret - 1];
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

  // Render syntax-highlighted content with performance optimization
  const renderHighlightedContent = () => {
    // Use displayLines for immediate feedback, parsedLines for error states
    const linesToRender = showErrors ? parsedLines : displayLines;
    return linesToRender.map((line, index) => {
      const lineNum = index + 1;
      
      return (
        <div 
          key={index} 
          className={`relative flex items-start font-mono text-sm min-h-[1.4rem] ${
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
            <div className="relative z-10 pr-8">
              {line.isComment ? (
                <span className="text-gray-500 italic">{line.formula}</span>
              ) : line.isShow ? (
                <span className="text-blue-400 font-semibold">{line.formula}</span>
              ) : (
                <div className="flex items-center">
                  {/* Formula */}
                  <span className={`text-gray-200 ${line.formula.trim().toUpperCase() === 'QED' ? 'text-green-300 font-semibold' : ''}`}>{line.formula}</span>
                  
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
                  
                </div>
              )}
            </div>
            {/* Right-side feedback icon with error tooltip */}
            <div className="absolute right-2 top-0 h-full flex items-center">
              {line.isComment || (!line.formula && !line.justification && !line.isShow) ? null : (
                line.hasError ? (
                  <div className="group relative">
                    <XCircle className="w-4 h-4 text-red-400 opacity-80" />
                    {line.errorMessage && (
                      <div className="absolute right-0 top-6 z-50 hidden group-hover:block w-64 p-2 bg-red-900/95 text-red-200 text-xs rounded-lg shadow-lg border border-red-700">
                        <div className="font-semibold mb-1">Error:</div>
                        {line.errorMessage}
                      </div>
                    )}
                  </div>
                ) : showErrors ? (
                  <CheckCircle className="w-4 h-4 text-green-400 opacity-60" />
                ) : null
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
        <div className="bg-gray-100/70 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-300 dark:border-gray-700/50 rounded-t-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Enhanced Carnap-Compatible Fitch Notation
              </span>
              {parsedLines.some(line => line.hasError) && (
                <div className="flex items-center gap-1 text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Syntax errors detected</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              {showGuide ? 'Hide' : 'Show'} Guide
              <ChevronDown className={`w-3 h-3 transition-transform ${showGuide ? 'rotate-180' : ''}`} />
            </button>
          </div>
          
          {showGuide && (
            <div className="mt-3 space-y-3">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="font-semibold">Enhanced Features:</span>
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1 ml-6">
                  <li>• <strong>Syntax highlighting</strong> for formulas, rules, and errors</li>
                  <li>• <strong>Auto-indentation</strong> after &quot;show:&quot; lines</li>
                  <li>• <strong>Real-time validation</strong> with error highlighting</li>
                  <li>• <strong>Visual subproof guides</strong> with indentation lines</li>
                  <li>• <strong>Auto-completion</strong> for inference rules (type : to trigger)</li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-300 mb-1">Basic Format:</p>
                  <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded border border-gray-200 dark:border-gray-700/50">
                    <code className="text-gray-800 dark:text-gray-200">formula</code>{' '}
                    <code className="text-gray-500">:</code>
                    <code className="text-purple-600 dark:text-purple-400">RULE</code>{' '}
                    <code className="text-gray-600 dark:text-gray-400">refs</code>
                  </div>
                  
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400 mt-2 mb-1">Keyboard Shortcuts:</p>
                  <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                    <li><kbd className="bg-gray-200 dark:bg-gray-800 px-1 rounded">Tab</kbd> - Indent line</li>
                    <li><kbd className="bg-gray-200 dark:bg-gray-800 px-1 rounded">Enter</kbd> - Auto-indent after show:</li>
                    <li><kbd className="bg-gray-200 dark:bg-gray-800 px-1 rounded">:</kbd> - Trigger rule completion</li>
                    <li><kbd className="bg-gray-200 dark:bg-gray-800 px-1 rounded">Ctrl+Enter</kbd> - Submit proof</li>
                  </ul>
                </div>
                
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-300 mb-1">Example with Subproof:</p>
                      <pre className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded text-xs border border-gray-200 dark:border-gray-700/50">
                    <span className="text-green-700 dark:text-green-400">P→Q :PR</span>{'\n'}
                    <span className="text-green-700 dark:text-green-400">P :PR</span>{'\n'}
                    <span className="text-blue-700 dark:text-blue-400">Show Q</span>{'\n'}
                    <span className="text-gray-800 dark:text-gray-200">    Q</span> <span className="text-gray-500">:</span><span className="text-purple-700 dark:text-purple-400">MP</span> <span className="text-gray-700 dark:text-gray-400">1,2</span>{'\n'}
                    <span className="text-cyan-700 dark:text-cyan-400">:CD 3-4</span>
                  </pre>
                </div>
              </div>
              
              {/* Quick action buttons */}
              <div className="flex gap-2 flex-wrap">
                {premises && (
                  <button
                    onClick={populatePremises}
                    className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-800/30 border border-green-300 dark:border-green-700 rounded hover:bg-green-200 dark:hover:bg-green-700/30 text-green-700 dark:text-green-300 transition-colors flex items-center gap-1"
                  >
                    <Lightbulb className="w-3 h-3" />
                    Auto-fill Premises
                  </button>
                )}
                <button
                  onClick={() => insertTemplate('Show ')}
                  className="text-xs px-3 py-1.5 bg-blue-100 dark:bg-blue-800/30 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-200 dark:hover:bg-blue-700/30 text-blue-700 dark:text-blue-300 transition-colors"
                >
                  Insert Show
                </button>
                <button
                  onClick={() => insertTemplate('    ')}
                  className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-800/30 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-700/30 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  Add Indent
                </button>
                <button
                  onClick={() => insertTemplate(' :AS')}
                  className="text-xs px-3 py-1.5 bg-orange-100 dark:bg-orange-800/30 border border-orange-300 dark:border-orange-700 rounded hover:bg-orange-200 dark:hover:bg-orange-700/30 text-orange-700 dark:text-orange-300 transition-colors"
                >
                  :AS
                </button>
                <button
                  onClick={() => insertTemplate(' :PR')}
                  className="text-xs px-3 py-1.5 bg-green-100 dark:bg-green-800/30 border border-green-300 dark:border-green-700 rounded hover:bg-green-200 dark:hover:bg-green-700/30 text-green-700 dark:text-green-300 transition-colors"
                >
                  :PR
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Main Editor */}
      <div className={`relative ${showSyntaxGuide ? 'rounded-b-lg' : 'rounded-lg'} overflow-hidden border border-gray-300 dark:border-gray-700`}>
        {/* Highlighted overlay */}
        <div 
          className="absolute inset-0 pointer-events-none font-mono text-sm bg-white dark:bg-gray-900 overflow-hidden"
          style={{ height }}
        >
          <div ref={overlayScrollRef} className="h-full overflow-auto pr-4 pl-0 py-4">
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
          onScroll={(e) => {
            if (overlayScrollRef.current) {
              overlayScrollRef.current.scrollTop = (e.currentTarget as HTMLTextAreaElement).scrollTop;
              overlayScrollRef.current.scrollLeft = (e.currentTarget as HTMLTextAreaElement).scrollLeft;
            }
          }}
          onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          readOnly={readOnly}
          className="relative w-full h-full resize-none font-mono text-sm bg-transparent text-transparent caret-gray-800 dark:caret-gray-200 border-0 focus:outline-none selection:bg-blue-200/60 dark:selection:bg-blue-500/30"
          style={{ 
            height,
            padding: '1rem',
            // Align caret with overlay which has p-4 (16px) padding; content overlay itself positions numbers via absolute with marginLeft inside render
            // The base left margin for content is 52px; add this to the padding
            paddingLeft: '52px',
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
            className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-auto"
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
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono font-medium ${ruleInfo?.color || 'text-gray-700 dark:text-gray-300'}`}>
                      {rule}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">{ruleInfo?.name}</span>
                  </div>
                  {ruleInfo?.description && (
                    <div className="text-xs text-gray-600 dark:text-gray-500 mt-1">{ruleInfo.description}</div>
                  )}
                </button>
              );
            })}
          </div>
        )}
        
        {/* Footer */}
        {!readOnly && (
          <div className="bg-gray-100 dark:bg-gray-800 p-2 flex justify-between items-center border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400">
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