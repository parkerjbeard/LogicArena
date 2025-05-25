'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, Sparkles, MousePointer } from 'lucide-react';
import { ProofLine } from '@/types/tutorial';

interface InteractiveProofEditorProps {
  initialLines: ProofLine[];
  highlightedLines?: number[];
  allowedRules?: string[];
  onLineAdd?: (line: ProofLine) => void;
  onValidate?: (lines: ProofLine[]) => boolean;
  showHints?: boolean;
  readOnly?: boolean;
  expectedNext?: ProofLine;
}

export const InteractiveProofEditor: React.FC<InteractiveProofEditorProps> = ({
  initialLines,
  highlightedLines = [],
  allowedRules = [],
  onLineAdd,
  onValidate,
  showHints = true,
  readOnly = false,
  expectedNext
}) => {
  const [lines, setLines] = useState<ProofLine[]>(initialLines);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLineFormula, setNewLineFormula] = useState('');
  const [newLineJustification, setNewLineJustification] = useState('');
  const [showNextHint, setShowNextHint] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Animate new lines
  const [animatingLines, setAnimatingLines] = useState<number[]>([]);

  const handleAddLine = () => {
    if (!newLineFormula.trim() || !newLineJustification.trim()) return;

    const newLine: ProofLine = {
      lineNumber: lines.length + 1,
      formula: newLineFormula.trim(),
      justification: newLineJustification.trim(),
      depth: 0, // Calculate based on context
      isValid: true
    };

    setLines([...lines, newLine]);
    setAnimatingLines([...animatingLines, newLine.lineNumber]);
    
    if (onLineAdd) {
      onLineAdd(newLine);
    }

    // Reset form
    setNewLineFormula('');
    setNewLineJustification('');
    setIsAddingLine(false);

    // Remove from animating after animation completes
    setTimeout(() => {
      setAnimatingLines(prev => prev.filter(n => n !== newLine.lineNumber));
    }, 500);
  };

  const getLineClassName = (line: ProofLine, index: number) => {
    const isHighlighted = highlightedLines.includes(line.lineNumber);
    const isAnimating = animatingLines.includes(line.lineNumber);
    const isSelected = selectedLine === line.lineNumber;

    return `
      relative p-3 rounded-lg border transition-all duration-300 cursor-pointer
      ${isHighlighted ? 'bg-blue-900/20 border-blue-600/50 shadow-md' : 'bg-gray-800/30 border-gray-700/50'}
      ${isAnimating ? 'animate-slideIn' : ''}
      ${isSelected ? 'ring-2 ring-blue-500' : ''}
      ${line.isValid === false ? 'bg-red-900/20 border-red-600/50' : ''}
      ${readOnly ? 'cursor-default' : 'hover:bg-gray-800/50'}
    `;
  };

  const renderJustificationRule = (rule: string) => {
    const ruleColors: Record<string, string> = {
      'MP': 'text-purple-400',
      'MT': 'text-purple-400',
      '∧I': 'text-green-400',
      '∧E': 'text-green-400',
      '∨I': 'text-orange-400',
      '∨E': 'text-orange-400',
      '→I': 'text-blue-400',
      '→E': 'text-blue-400',
      '¬I': 'text-red-400',
      '¬E': 'text-red-400',
      'Premise': 'text-gray-400',
      'Assumption': 'text-indigo-400'
    };

    const [mainRule, ...refs] = rule.split(' ');
    const colorClass = ruleColors[mainRule] || 'text-gray-400';

    return (
      <span className={`font-mono text-sm ${colorClass}`}>
        {mainRule}
        {refs.length > 0 && <span className="text-gray-500"> {refs.join(' ')}</span>}
      </span>
    );
  };

  return (
    <div className="space-y-4" ref={editorRef}>
      {/* Proof lines */}
      <div className="space-y-2">
        <AnimatePresence>
          {lines.map((line, index) => (
            <motion.div
              key={line.lineNumber}
              initial={animatingLines.includes(line.lineNumber) ? { opacity: 0, x: -20 } : false}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={getLineClassName(line, index)}
              onClick={() => !readOnly && setSelectedLine(line.lineNumber)}
              style={{ marginLeft: `${line.depth * 24}px` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 font-mono text-sm w-8">
                    {line.lineNumber}.
                  </span>
                  <span className="font-mono text-base text-gray-200">
                    {line.formula}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {renderJustificationRule(line.justification)}
                  {line.isValid === false && (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                  {line.isValid === true && animatingLines.includes(line.lineNumber) && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </div>
              </div>
              
              {/* Highlight indicator */}
              {highlightedLines.includes(line.lineNumber) && (
                <motion.div
                  className="absolute -left-1 top-1/2 transform -translate-y-1/2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                </motion.div>
              )}

              {/* Error message */}
              {line.error && (
                <div className="mt-2 text-sm text-red-600">
                  {line.error}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add new line section */}
      {!readOnly && (
        <div className="mt-4">
          {!isAddingLine ? (
            <button
              onClick={() => setIsAddingLine(true)}
              className="flex items-center gap-2 px-4 py-2 text-blue-400 hover:text-blue-300 hover:bg-gray-800/50 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add line
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 font-mono text-sm w-8">
                    {lines.length + 1}.
                  </span>
                  <input
                    type="text"
                    value={newLineFormula}
                    onChange={(e) => setNewLineFormula(e.target.value)}
                    placeholder="Enter formula (e.g., P → Q)"
                    className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    autoFocus
                  />
                </div>
                
                <div className="flex items-center gap-4 ml-12">
                  <input
                    type="text"
                    value={newLineJustification}
                    onChange={(e) => setNewLineJustification(e.target.value)}
                    placeholder="Justification (e.g., MP 1,2)"
                    className="flex-1 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  />
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddLine}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingLine(false);
                        setNewLineFormula('');
                        setNewLineJustification('');
                      }}
                      className="px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Next step hint */}
      {showHints && expectedNext && !readOnly && (
        <div className="mt-4">
          {!showNextHint ? (
            <button
              onClick={() => setShowNextHint(true)}
              className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Show me what to do next
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-900/20 backdrop-blur-sm border border-purple-600/30 rounded-lg p-4"
            >
              <div className="flex items-start gap-3">
                <MousePointer className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-purple-300">
                  <p className="font-semibold">Next step:</p>
                  <p className="mt-1 font-mono">
                    {expectedNext.lineNumber}. {expectedNext.formula} — {expectedNext.justification}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
};