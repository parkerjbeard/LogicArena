'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronRight, AlertCircle, Lock, RefreshCw } from 'lucide-react';
import { puzzleAPI } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import type { PuzzleHint } from '@/types/statistics';

interface HintSystemProps {
  puzzleId: number;
  currentProof: string;
  onHintUsed?: (hintLevel: number) => void;
  disabled?: boolean;
}

export const HintSystem: React.FC<HintSystemProps> = ({ 
  puzzleId, 
  currentProof,
  onHintUsed,
  disabled = false 
}) => {
  const [hints, setHints] = useState<PuzzleHint[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewedHints, setViewedHints] = useState<Set<number>>(new Set());
  const [showHints, setShowHints] = useState(false);
  const { showToast } = useToast();

  // Load contextual hints based on current proof state
  useEffect(() => {
    const loadContextualHints = async () => {
      if (!puzzleId) return;
      
      setLoading(true);
      try {
        const response = await puzzleAPI.getContextualHints(puzzleId, currentProof || '');
        const contextualHints = response.hints.map((hint: any, index: number) => ({
          ...hint,
          level: index + 1 // Add level for backward compatibility with existing UI
        }));
        
        setHints(contextualHints);
      } catch (error) {
        console.error('Failed to load contextual hints:', error);
        // Fall back to generic hints if contextual hints fail
        const fallbackHints: PuzzleHint[] = [
          {
            type: "strategic",
            content: "Start by writing out all your premises using ':PR' justification.",
            priority: 8,
            confidence: 0.9,
            level: 1
          },
          {
            type: "strategic",
            content: "Look at the structure of your conclusion. What type of proof strategy would work best?",
            priority: 6,
            confidence: 0.7,
            level: 2
          },
          {
            type: "tactical",
            content: "Consider which inference rules apply to the formulas you have available.",
            priority: 5,
            confidence: 0.6,
            level: 3
          }
        ];
        setHints(fallbackHints);
        showToast('Using basic hints - contextual analysis unavailable', 'warning');
      } finally {
        setLoading(false);
      }
    };

    loadContextualHints();
    // Reset viewed hints when puzzle or proof changes
    setViewedHints(new Set());
    setShowHints(false);
  }, [puzzleId, currentProof, showToast]);

  const refreshHints = async () => {
    if (!puzzleId) return;
    setLoading(true);
    try {
      const response = await puzzleAPI.getContextualHints(puzzleId, currentProof || '');
      const contextualHints = response.hints.map((hint: any, index: number) => ({
        ...hint,
        level: index + 1
      }));
      setHints(contextualHints);
      setViewedHints(new Set()); // Reset viewed hints when refreshing
      showToast('Hints updated based on current proof', 'success');
    } catch (error) {
      showToast('Failed to refresh hints', 'error');
    } finally {
      setLoading(false);
    }
  };

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
          <span className="font-medium text-gray-200">Contextual Hints</span>
          {viewedHints.size > 0 && (
            <span className="text-xs text-gray-400">({viewedHints.size}/{hints.length} used)</span>
          )}
          {hints.length > 0 && (
            <span className="text-xs text-blue-400 ml-1">({hints.length} available)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              refreshHints();
            }}
            disabled={loading}
            className="p-1 hover:bg-gray-600/30 rounded transition-colors"
            title="Refresh hints based on current proof"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 hover:text-gray-200 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <ChevronRight 
            className={`w-4 h-4 text-gray-400 transition-transform ${showHints ? 'rotate-90' : ''}`} 
          />
        </div>
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
                const isViewed = viewedHints.has(hint.level!);
                const isLocked = hint.level! > 1 && !viewedHints.has(hint.level! - 1);
                
                // Get color based on hint type
                const getHintTypeColor = (type: string) => {
                  switch(type) {
                    case 'strategic': return 'border-blue-600/30 bg-blue-900/20';
                    case 'tactical': return 'border-green-600/30 bg-green-900/20';
                    case 'corrective': return 'border-red-600/30 bg-red-900/20';
                    case 'premise': return 'border-purple-600/30 bg-purple-900/20';
                    case 'progress': return 'border-yellow-600/30 bg-yellow-900/20';
                    default: return 'border-gray-600/30 bg-gray-800/30';
                  }
                };
                
                const getHintIcon = (type: string) => {
                  switch(type) {
                    case 'strategic': return '🎯';
                    case 'tactical': return '⚡';
                    case 'corrective': return '🔧';
                    case 'premise': return '📋';
                    case 'progress': return '✨';
                    default: return '💡';
                  }
                };
                
                return (
                  <motion.div
                    key={hint.level}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: hint.level! * 0.05 }}
                    className={`relative ${isLocked ? 'opacity-50' : ''}`}
                  >
                    <button
                      onClick={() => !isLocked && viewHint(hint.level!)}
                      disabled={disabled || isLocked}
                      className={`w-full text-left p-3 rounded-lg border transition-all ${
                        isViewed
                          ? getHintTypeColor(hint.type)
                          : isLocked
                          ? 'bg-gray-800/30 border-gray-700/50 cursor-not-allowed'
                          : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 hover:border-gray-600/50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 text-lg">
                          {getHintIcon(hint.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-200 capitalize">
                              {hint.type} Hint {hint.level}
                            </span>
                            {hint.confidence && (
                              <span className="text-xs text-gray-400">
                                ({Math.round(hint.confidence * 100)}% confident)
                              </span>
                            )}
                            {hint.suggested_rule && (
                              <span className="text-xs bg-gray-700/50 px-1.5 py-0.5 rounded font-mono text-blue-300">
                                {hint.suggested_rule}
                              </span>
                            )}
                            {isLocked && (
                              <Lock className="w-3 h-3 text-gray-500" />
                            )}
                            {!isViewed && !isLocked && (
                              <span className="text-xs text-gray-500">Click to reveal</span>
                            )}
                          </div>
                          
                          {isViewed ? (
                            <div>
                              <p className="text-sm text-gray-300">{hint.content}</p>
                              {hint.target_line && (
                                <p className="text-xs text-gray-400 mt-1">
                                  → Focus on line {hint.target_line}
                                </p>
                              )}
                            </div>
                          ) : isLocked ? (
                            <p className="text-sm text-gray-500 italic">
                              View hint {hint.level! - 1} first
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
                  <div className="text-xs text-blue-400">
                    <p className="mb-1">
                      <strong>Smart Hints:</strong> These hints analyze your current proof and provide contextually relevant suggestions.
                    </p>
                    <p>
                      Hints update automatically as you work, or click the refresh button. Using hints will be recorded in your statistics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};