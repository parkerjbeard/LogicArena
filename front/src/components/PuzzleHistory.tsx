'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, XCircle, ChevronDown, RotateCcw, Eye } from 'lucide-react';
import type { PuzzleSubmissionHistory } from '@/types/statistics';
import { DifficultyBadge } from '@/components/ui/DifficultyBadge';

interface PuzzleHistoryProps {
  history: PuzzleSubmissionHistory[];
  loading?: boolean;
  onRetryPuzzle?: (puzzleId: number) => void;
  onViewProof?: (submission: PuzzleSubmissionHistory) => void;
}

export const PuzzleHistory: React.FC<PuzzleHistoryProps> = ({ 
  history, 
  loading,
  onRetryPuzzle,
  onViewProof
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-700 rounded w-32 mb-4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <p className="text-gray-400 text-center py-8">
          No puzzles attempted yet. Start practicing to see your history!
        </p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      
      <div className="space-y-3">
        {history.map((submission, index) => {
          const isExpanded = expandedId === submission.id;
          const isOptimal = submission.proof_length === submission.puzzle.best_len;
          
          return (
            <motion.div
              key={submission.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : submission.id)}
                className="w-full p-4 hover:bg-gray-700/30 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {submission.verdict ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                    
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-200">
                          Puzzle #{submission.puzzle_id}
                        </span>
                        <DifficultyBadge
                          difficulty={submission.puzzle.difficulty}
                          chapter={submission.puzzle.chapter}
                          nestedDepth={submission.puzzle.nested_depth}
                          size="xs"
                          showDetails
                        />
                        {isOptimal && submission.verdict && (
                          <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded border border-green-600/30">
                            Optimal
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 flex items-center gap-3 mt-1">
                        <span>{formatDate(submission.submitted_at)}</span>
                        {submission.solving_time && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(submission.solving_time)}
                            </span>
                          </>
                        )}
                        {submission.hints_used > 0 && (
                          <>
                            <span>•</span>
                            <span>{submission.hints_used} hint{submission.hints_used > 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <ChevronDown 
                    className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                  />
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-700/50"
                  >
                    <div className="p-4 space-y-3">
                      <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                        <p className="text-sm text-gray-400 mb-1">Premises (Γ):</p>
                        <p className="font-mono text-sm text-gray-300">{submission.puzzle.gamma}</p>
                      </div>
                      
                      <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                        <p className="text-sm text-gray-400 mb-1">Conclusion (φ):</p>
                        <p className="font-mono text-sm text-gray-300">{submission.puzzle.phi}</p>
                      </div>

                      {submission.verdict && submission.proof_length && (
                        <div className="text-sm text-gray-400">
                          Your proof: {submission.proof_length} lines 
                          (optimal: {submission.puzzle.best_len} lines)
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {!submission.verdict && onRetryPuzzle && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRetryPuzzle(submission.puzzle_id);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Retry
                          </button>
                        )}
                        
                        {submission.verdict && onViewProof && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewProof(submission);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                          >
                            <Eye className="w-3 h-3" />
                            View Proof
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};