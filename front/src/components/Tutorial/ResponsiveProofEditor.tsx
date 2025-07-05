'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Plus, Check, X, Sparkles, MousePointer, MoreVertical, Trash2, Copy } from 'lucide-react';
import { ProofLine } from '@/types/tutorial';
import { useBreakpoint, useAdaptiveClick, useSwipeGesture } from '@/hooks/useResponsive';
import { useInput } from '@/contexts/InputContext';
import { ResponsiveButton } from '@/components/ui/ResponsiveButton';

interface ResponsiveProofEditorProps {
  initialLines: ProofLine[];
  highlightedLines?: number[];
  allowedRules?: string[];
  onLineAdd?: (line: ProofLine) => void;
  onValidate?: (lines: ProofLine[]) => boolean;
  showHints?: boolean;
  readOnly?: boolean;
  expectedNext?: ProofLine;
}

export const ResponsiveProofEditor: React.FC<ResponsiveProofEditorProps> = ({
  initialLines,
  highlightedLines = [],
  allowedRules = [],
  onLineAdd,
  onValidate,
  showHints = true,
  readOnly = false,
  expectedNext
}) => {
  const { inputMethod, deviceType } = useInput();
  const { isMobile } = useBreakpoint();
  const [lines, setLines] = useState<ProofLine[]>(initialLines);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [newLineFormula, setNewLineFormula] = useState('');
  const [newLineJustification, setNewLineJustification] = useState('');
  const [showNextHint, setShowNextHint] = useState(false);
  const [contextMenuLine, setContextMenuLine] = useState<number | null>(null);
  const [swipedLine, setSwipedLine] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Animate new lines
  const [animatingLines, setAnimatingLines] = useState<number[]>([]);

  // Handle swipe actions on lines
  const handleSwipeAction = (lineNumber: number, direction: 'left' | 'right') => {
    if (readOnly) return;
    
    setSwipedLine(lineNumber);
    if (direction === 'left') {
      // Show delete option
      setTimeout(() => {
        if (confirm('Delete this line?')) {
          setLines(lines.filter(l => l.lineNumber !== lineNumber));
        }
        setSwipedLine(null);
      }, 300);
    } else {
      // Show duplicate option
      setTimeout(() => {
        const lineToDuplicate = lines.find(l => l.lineNumber === lineNumber);
        if (lineToDuplicate) {
          const newLine = { 
            ...lineToDuplicate, 
            lineNumber: lines.length + 1 
          };
          setLines([...lines, newLine]);
        }
        setSwipedLine(null);
      }, 300);
    }
  };

  const handleAddLine = () => {
    if (!newLineFormula.trim() || !newLineJustification.trim()) return;

    const newLine: ProofLine = {
      lineNumber: lines.length + 1,
      formula: newLineFormula.trim(),
      justification: newLineJustification.trim(),
      depth: 0,
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

  const ProofLineComponent: React.FC<{ line: ProofLine; index: number }> = ({ line, index }) => {
    const lineRef = useRef<HTMLDivElement>(null);
    const isHighlighted = highlightedLines.includes(line.lineNumber);
    const isAnimating = animatingLines.includes(line.lineNumber);
    const isSelected = selectedLine === line.lineNumber;
    const isSwiped = swipedLine === line.lineNumber;

    // Adaptive click handling with long press
    const clickHandlers = useAdaptiveClick(
      () => !readOnly && setSelectedLine(line.lineNumber),
      () => !readOnly && setContextMenuLine(line.lineNumber),
      500
    );

    // Add swipe gesture for mobile
    useSwipeGesture(lineRef, {
      onSwipeLeft: () => handleSwipeAction(line.lineNumber, 'left'),
      onSwipeRight: () => handleSwipeAction(line.lineNumber, 'right'),
      threshold: 50
    });

    const lineClassName = `
      relative rounded-lg border transition-all duration-300
      ${isHighlighted ? 'bg-blue-900/20 border-blue-600/50 shadow-md' : 'bg-gray-800/30 border-gray-700/50'}
      ${isAnimating ? 'animate-slideIn' : ''}
      ${isSelected ? 'ring-2 ring-blue-500' : ''}
      ${line.isValid === false ? 'bg-red-900/20 border-red-600/50' : ''}
      ${readOnly ? '' : 'cursor-pointer hover:bg-gray-800/50'}
      ${isSwiped ? 'transform translate-x-4' : ''}
      ${isMobile ? 'p-4' : 'p-3'}
    `;

    return (
      <motion.div
        ref={lineRef}
        key={line.lineNumber}
        initial={animatingLines.includes(line.lineNumber) ? { opacity: 0, x: -20 } : false}
        animate={{ 
          opacity: 1, 
          x: isSwiped ? (swipedLine === line.lineNumber ? 50 : 0) : 0 
        }}
        exit={{ opacity: 0, x: 20 }}
        className={lineClassName}
        style={{ marginLeft: `${line.depth * (isMobile ? 16 : 24)}px` }}
        {...clickHandlers}
      >
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
            <span className={`text-gray-400 font-mono ${isMobile ? 'text-base' : 'text-sm'} w-8`}>
              {line.lineNumber}.
            </span>
            <span className={`font-mono ${isMobile ? 'text-lg' : 'text-base'} text-gray-200`}>
              {line.formula}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {renderJustificationRule(line.justification)}
            {line.isValid === false && (
              <X className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-red-500`} />
            )}
            {line.isValid === true && animatingLines.includes(line.lineNumber) && (
              <Check className={`${isMobile ? 'w-5 h-5' : 'w-4 h-4'} text-green-500`} />
            )}
            {inputMethod === 'touch' && !readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setContextMenuLine(line.lineNumber);
                }}
                className="p-1 text-gray-500 hover:text-gray-300"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Mobile swipe indicators */}
        {isSwiped && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute right-full mr-2 top-1/2 -translate-y-1/2"
          >
            <div className="bg-red-500 text-white px-3 py-1 rounded flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              <span className="text-sm">Delete</span>
            </div>
          </motion.div>
        )}

        {/* Highlight indicator */}
        {highlightedLines.includes(line.lineNumber) && (
          <motion.div
            className="absolute -left-1 top-1/2 transform -translate-y-1/2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500 }}
          >
            <div className={`${isMobile ? 'w-3 h-3' : 'w-2 h-2'} bg-blue-500 rounded-full`} />
          </motion.div>
        )}

        {/* Error message */}
        {line.error && (
          <div className={`mt-2 ${isMobile ? 'text-base' : 'text-sm'} text-red-600`}>
            {line.error}
          </div>
        )}
      </motion.div>
    );
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
      <span className={`font-mono ${isMobile ? 'text-base' : 'text-sm'} ${colorClass}`}>
        {mainRule}
        {refs.length > 0 && <span className="text-gray-500"> {refs.join(' ')}</span>}
      </span>
    );
  };

  // Context menu for mobile
  const ContextMenu = () => {
    if (contextMenuLine === null) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setContextMenuLine(null)}
        >
          <motion.div
            className="bg-gray-900 rounded-xl shadow-xl p-4 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Line {contextMenuLine} Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  const line = lines.find(l => l.lineNumber === contextMenuLine);
                  if (line) {
                    navigator.clipboard.writeText(line.formula);
                  }
                  setContextMenuLine(null);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left"
              >
                <Copy className="w-5 h-5 text-gray-400" />
                <span>Copy Formula</span>
              </button>
              <button
                onClick={() => {
                  setLines(lines.filter(l => l.lineNumber !== contextMenuLine));
                  setContextMenuLine(null);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-800 transition-colors text-left text-red-400"
              >
                <Trash2 className="w-5 h-5" />
                <span>Delete Line</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="space-y-4" ref={editorRef}>
      {/* Proof lines */}
      <div className="space-y-2">
        <AnimatePresence>
          {lines.map((line, index) => (
            <ProofLineComponent key={line.lineNumber} line={line} index={index} />
          ))}
        </AnimatePresence>
      </div>

      {/* Add new line section */}
      {!readOnly && (
        <div className="mt-4">
          {!isAddingLine ? (
            <ResponsiveButton
              onClick={() => setIsAddingLine(true)}
              variant="ghost"
              size={isMobile ? 'lg' : 'md'}
              icon={<Plus className="w-4 h-4" />}
              iconPosition="left"
              fullWidth={isMobile}
            >
              Add line
            </ResponsiveButton>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50"
            >
              <div className="space-y-3">
                <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
                  <span className={`text-gray-400 font-mono ${isMobile ? 'text-base' : 'text-sm'} w-8`}>
                    {lines.length + 1}.
                  </span>
                  <input
                    type="text"
                    value={newLineFormula}
                    onChange={(e) => setNewLineFormula(e.target.value)}
                    placeholder="Enter formula (e.g., P → Q)"
                    className={`flex-1 ${isMobile ? 'px-4 py-3 text-base' : 'px-3 py-2'} bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono`}
                    autoFocus
                  />
                </div>
                
                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center gap-4 ml-12'}`}>
                  <input
                    type="text"
                    value={newLineJustification}
                    onChange={(e) => setNewLineJustification(e.target.value)}
                    placeholder="Justification (e.g., MP 1,2)"
                    className={`flex-1 ${isMobile ? 'px-4 py-3 text-base ml-11' : 'px-3 py-2 text-sm'} bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono`}
                  />
                  
                  <div className={`flex gap-2 ${isMobile ? 'ml-11' : ''}`}>
                    <ResponsiveButton
                      onClick={handleAddLine}
                      variant="primary"
                      size={isMobile ? 'lg' : 'md'}
                    >
                      Add
                    </ResponsiveButton>
                    <ResponsiveButton
                      onClick={() => {
                        setIsAddingLine(false);
                        setNewLineFormula('');
                        setNewLineJustification('');
                      }}
                      variant="ghost"
                      size={isMobile ? 'lg' : 'md'}
                    >
                      Cancel
                    </ResponsiveButton>
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
              className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-sm'} text-purple-600 hover:text-purple-700 transition-colors`}
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
                <div className={`${isMobile ? 'text-base' : 'text-sm'} text-purple-300`}>
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

      {/* Context menu for mobile */}
      {inputMethod === 'touch' && <ContextMenu />}
    </div>
  );
};