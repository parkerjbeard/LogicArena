'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronRight, AlertCircle, Lock } from 'lucide-react';
import { puzzleAPI } from '@/lib/api';
import { useToast } from '@/components/Toast';
import type { PuzzleHint } from '@/types/statistics';

interface HintSystemProps {
  puzzleId: number;
  onHintUsed?: (hintLevel: number) => void;
  disabled?: boolean;
}

export const HintSystem: React.FC<HintSystemProps> = ({ 
  puzzleId, 
  onHintUsed,
  disabled = false 
}) => {
  const [hints, setHints] = useState<PuzzleHint[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewedHints, setViewedHints] = useState<Set<number>>(new Set());
  const [showHints, setShowHints] = useState(false);
  const { showToast } = useToast();

  // Load hints for the puzzle
  useEffect(() => {
    const loadHints = async () => {
      if (!puzzleId) return;
      
      setLoading(true);
      try {
        // For now, generate hints client-side
        // In a real implementation, these would come from the API
        const generatedHints: PuzzleHint[] = [
          {
            level: 1,
            content: "Think about the structure of the conclusion. What inference rules might help you derive it?",
          },
          {
            level: 2,
            content: "Consider using conditional proof (CP) or indirect proof (IP) if the conclusion is a conditional or you're having trouble with a direct proof.",
          },
          {
            level: 3,
            content: "Look at the logical connectives in your premises. Can you use elimination rules to break them down, then introduction rules to build up to the conclusion?",
          },
        ];
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        setHints(generatedHints);
      } catch (error) {
        console.error('Failed to load hints:', error);
        showToast('Failed to load hints', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadHints();
    // Reset viewed hints when puzzle changes
    setViewedHints(new Set());
    setShowHints(false);
  }, [puzzleId, showToast]);

  const viewHint = (level: number) => {
    if (disabled) {
      showToast('Complete the current proof before viewing hints', 'warning');
      return;
    }

    if (!viewedHints.has(level)) {
      setViewedHints(prev => new Set(prev).add(level));
      onHintUsed?.(level);
      
      // Save viewed hints to localStorage
      const hintKey = `puzzle_${puzzleId}_hints`;
      const existingHints = JSON.parse(localStorage.getItem(hintKey) || '[]');
      if (!existingHints.includes(level)) {
        existingHints.push(level);
        localStorage.setItem(hintKey, JSON.stringify(existingHints));
      }
    }
  };

  // Load previously viewed hints from localStorage
  useEffect(() => {
    if (puzzleId) {
      const hintKey = `puzzle_${puzzleId}_hints`;
      const savedHints = JSON.parse(localStorage.getItem(hintKey) || '[]');
      setViewedHints(new Set(savedHints));
    }
  }, [puzzleId]);

  if (loading) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-700 rounded w-24 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700/50">
      <button
        onClick={() => setShowHints(!showHints)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-700/30 transition-colors rounded-lg"
        aria-expanded={showHints}
        aria-label="Toggle hints"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" />
          <span className="font-medium text-gray-200">Hints</span>
          {viewedHints.size > 0 && (
            <span className="text-xs text-gray-400">({viewedHints.size}/3 used)</span>
          )}
        </div>
        <ChevronRight 
          className={`w-4 h-4 text-gray-400 transition-transform ${showHints ? 'rotate-90' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {showHints && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {hints.map((hint) => {
                const isViewed = viewedHints.has(hint.level);
                const isLocked = hint.level > 1 && !viewedHints.has(hint.level - 1);
                
                return (
                  <motion.div
                    key={hint.level}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: hint.level * 0.05 }}
                    className={`relative ${isLocked ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => !isLocked && viewHint(hint.level)}
                      disabled={disabled || isLocked}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isViewed
                          ? 'bg-yellow-900/20 border-yellow-600/30'
                          : isLocked
                          ? 'bg-gray-800/30 border-gray-700/50 cursor-not-allowed'
                          : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isViewed
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                        }`}>
                          {hint.level}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-200">
                              Hint {hint.level}
                            </span>
                            {isLocked && (
                              <Lock className="w-3 h-3 text-gray-500" />
                            )}
                            {!isViewed && !isLocked && (
                              <span className="text-xs text-gray-500">Click to reveal</span>
                            )}
                          </div>
                          
                          {isViewed ? (
                            <p className="text-sm text-gray-300">{hint.content}</p>
                          ) : isLocked ? (
                            <p className="text-sm text-gray-500 italic">
                              View hint {hint.level - 1} first
                            </p>
                          ) : (
                            <div className="h-4 bg-gray-700/50 rounded animate-pulse"></div>
                          )}
                        </div>
                      </div>
                    </button>
                  </motion.div>
                );
              })}

              <div className="mt-3 p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-400">
                    Using hints will be recorded in your statistics. Try to solve puzzles without hints for a perfect score!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};