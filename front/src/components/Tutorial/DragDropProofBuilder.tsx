'use client';

import React, { useState } from 'react';
import { motion, Reorder, useDragControls } from 'framer-motion';
import { GripVertical, Check, X, Lightbulb } from 'lucide-react';
import { ProofLine } from '@/types/tutorial';

interface DragDropProofBuilderProps {
  availableLines: ProofLine[];
  targetOrder: number[]; // Correct order of line numbers
  onComplete?: (isCorrect: boolean) => void;
  hint?: string;
}

export const DragDropProofBuilder: React.FC<DragDropProofBuilderProps> = ({
  availableLines,
  targetOrder,
  onComplete,
  hint
}) => {
  const [lines, setLines] = useState<ProofLine[]>(
    [...availableLines].sort(() => Math.random() - 0.5) // Shuffle initially
  );
  const [showHint, setShowHint] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    message: string;
  } | null>(null);

  const checkOrder = () => {
    setIsChecking(true);
    
    const currentOrder = lines.map(line => line.lineNumber);
    const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(targetOrder);
    
    setFeedback({
      isCorrect,
      message: isCorrect 
        ? 'Perfect! The proof is in the correct order.' 
        : 'Not quite right. Think about which statements depend on others.'
    });

    setTimeout(() => {
      setIsChecking(false);
      if (onComplete) onComplete(isCorrect);
    }, 2000);
  };

  const resetOrder = () => {
    setLines([...availableLines].sort(() => Math.random() - 0.5));
    setFeedback(null);
    setShowHint(false);
  };

  const getLineStyle = (line: ProofLine) => {
    const baseStyle = "bg-white border-2 rounded-lg p-4 mb-3 cursor-move transition-all";
    
    if (feedback?.isCorrect) {
      return `${baseStyle} border-green-400 bg-green-50`;
    }
    
    return `${baseStyle} border-gray-200 hover:border-blue-300 hover:shadow-md`;
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">
          Arrange the Proof Steps
        </h4>
        <p className="text-sm text-blue-700">
          Drag and drop the lines below to put them in the correct logical order. 
          Remember: each line must be justified by previous lines!
        </p>
      </div>

      {/* Draggable area */}
      <div className="bg-gray-50 rounded-lg p-4 min-h-[300px]">
        <Reorder.Group
          axis="y"
          values={lines}
          onReorder={setLines}
          className="space-y-2"
        >
          {lines.map((line) => (
            <Reorder.Item
              key={line.lineNumber}
              value={line}
              className={getLineStyle(line)}
              whileDrag={{ scale: 1.02, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
            >
              <div className="flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-gray-400 cursor-grab active:cursor-grabbing" />
                
                <div className="flex-1 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-500 font-mono text-sm w-8">
                      {line.lineNumber}.
                    </span>
                    <span className="font-mono">
                      {line.formula}
                    </span>
                  </div>
                  
                  <span className="font-mono text-sm text-gray-600">
                    {line.justification}
                  </span>
                </div>
              </div>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      </div>

      {/* Hint section */}
      {hint && (
        <div>
          {!showHint ? (
            <button
              onClick={() => setShowHint(true)}
              className="flex items-center gap-2 text-purple-600 hover:text-purple-700 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              Need a hint?
            </button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-purple-50 border border-purple-200 rounded-lg p-4"
            >
              <p className="text-sm text-purple-800">{hint}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`
            rounded-lg p-4 flex items-center gap-3
            ${feedback.isCorrect 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'}
          `}
        >
          {feedback.isCorrect ? (
            <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <X className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <p className={`text-sm ${
            feedback.isCorrect ? 'text-green-800' : 'text-red-800'
          }`}>
            {feedback.message}
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={checkOrder}
          disabled={isChecking}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Check Order
        </button>
        
        <button
          onClick={resetOrder}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Shuffle Again
        </button>
      </div>
    </div>
  );
};