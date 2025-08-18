'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { puzzleAPI } from '@/lib/api';
import CarnapFitchEditor from '@/components/LazyCarnapFitchEditor';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/contexts/ToastContext';
import { useTheme } from '@/contexts/ThemeContext';
import { HintSystem } from '@/components/HintSystem';
import { useAuth } from '@/hooks/useAuth';
import { DifficultyBadge, DifficultyInfo } from '@/components/ui/DifficultyBadge';

// Puzzle type
type Puzzle = {
  id: number;
  gamma: string;
  phi: string;
  difficulty: number;
  best_len: number;
  created: string;
  category?: string;
  chapter?: number;
  nested_depth?: number;
};

// Response from the proof checker
type ProofResponse = {
  verdict: boolean;
  error_message?: string;
  processing_time: number;
  counter_model?: Record<string, boolean>;
};

// Helper functions for displaying puzzle metadata
function getChapterName(chapter: number): string {
  const chapterNames: Record<number, string> = {
    1: "Subject Matter of Logic",
    2: "Official & Unofficial Notation",
    3: "Derivations",
    4: "Conditional Derivations",
    5: "Nested Derivations",
    6: "Indirect Derivations"
  };
  return chapterNames[chapter] || "Unknown Chapter";
}

function getCategoryDisplayName(category: string): string {
  const categoryNames: Record<string, string> = {
    'chapter1': 'Chapter 1 - Basic Validity',
    'chapter2': 'Chapter 2 - Notation',
    'chapter3': 'Chapter 3 - Derivations',
    'chapter4': 'Chapter 4 - Conditionals',
    'chapter5': 'Chapter 5 - Nested Proofs',
    'chapter6': 'Chapter 6 - Indirect Proofs',
    'any': 'Mixed Difficulty',
    'hard': 'Expert Challenges'
  };
  return categoryNames[category] || category;
}

function getDifficultyDisplay(difficulty: number, nestedDepth?: number): string {
  let display = `${difficulty}/10`;
  
  // Add descriptive text based on difficulty
  if (difficulty <= 2) {
    display += " (Beginner)";
  } else if (difficulty <= 4) {
    display += " (Easy)";
  } else if (difficulty <= 6) {
    display += " (Intermediate)";
  } else if (difficulty <= 8) {
    display += " (Advanced)";
  } else {
    display += " (Expert)";
  }
  
  // Add nesting indicator if applicable
  if (nestedDepth !== undefined && nestedDepth > 0) {
    if (nestedDepth === 1) {
      display += " - Simple subproofs";
    } else if (nestedDepth === 2) {
      display += " - Nested subproofs";
    } else {
      display += " - Deep nesting";
    }
  }
  
  return display;
}

function PracticePageContent() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [proof, setProof] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<ProofResponse | null>(null);
  const [difficulty, setDifficulty] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const isMountedRef = useRef(true);
  const { showToast } = useToast();
  const { userId } = useAuth();
  const { isDarkMode } = useTheme();
  
  // Fetch a random puzzle on mount or when difficulty changes
  useEffect(() => {
    isMountedRef.current = true; // Ensure mounted state is true when effect runs
    
    // Only run on client side
    if (typeof window !== 'undefined' && !puzzle) { 
      fetchRandomPuzzle();
    }
    
    return () => {
      isMountedRef.current = false;
    };
  }, [difficulty, puzzle]);
  
  // Fetch a random puzzle
  const fetchRandomPuzzle = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      console.log('Fetching puzzle with difficulty:', difficulty);
      
      // Parse difficulty - could be a number or a category string
      let data;
      if (difficulty && isNaN(parseInt(difficulty))) {
        // It's a category
        data = await puzzleAPI.getRandomPuzzleByCategory(difficulty);
      } else {
        // It's a numeric difficulty or empty
        const parsedDifficulty = difficulty ? parseInt(difficulty, 10) : undefined;
        data = await puzzleAPI.getRandomPuzzle(parsedDifficulty);
      }
      
      console.log('Puzzle data received:', data);
      
      if (isMountedRef.current) {
        setPuzzle(data);
        setProof('');
        setResponse(null);
        setHintsUsed(0);
        setStartTime(new Date());
      }
    } catch (error: any) {
      console.error('Error fetching puzzle:', error);
      console.error('Error details:', error.response?.data || error.message);
      if (isMountedRef.current) {
        showToast(`Failed to fetch puzzle: ${error.response?.data?.detail || error.message}`, 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [difficulty, showToast]);
  
  // Validate proof format before submission
  const validateProof = (proofText: string): boolean => {
    if (!proofText.trim()) {
      showToast('Please enter a proof before submitting', 'warning');
      return false;
    }
    
    // Basic validation: check if proof has at least one line with justification
    const lines = proofText.trim().split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      showToast('Proof cannot be empty', 'warning');
      return false;
    }
    
    // Check if at least one line has the basic format (formula:justification)
    const hasValidLine = lines.some(line => {
      const trimmedLine = line.trim();
      return trimmedLine.includes(':') || trimmedLine.toLowerCase().startsWith('show');
    });
    
    if (!hasValidLine) {
      showToast('Proof must contain at least one valid line with justification', 'warning');
      return false;
    }
    
    return true;
  };
  
  // Handle proof submission
  const handleSubmit = async () => {
    if (!puzzle) return;
    
    if (!validateProof(proof)) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      // Normalize common shorthand before sending to backend to maximize acceptance
      const normalizeForBackend = (text: string) => {
        let s = text;
        s = s.replace(/<->|<=>|\biff\b/gi, '↔');
        s = s.replace(/->|=>|⊃/g, '→');
        s = s.replace(/\\\\/g, '∧');
        s = s.replace(/\\\//g, '∨');
        s = s.replace(/\|/g, '∨');
        s = s.replace(/\s+v\s+/gi, ' ∨ ');
        s = s.replace(/\band\b/gi, '∧');
        s = s.replace(/&/g, '∧');
        s = s.replace(/\bnot\b/gi, '¬');
        s = s.replace(/(^|[\s(])~\s*/g, '$1¬');
        s = s.replace(/(^|[\s(])-\s*/g, '$1¬');
        return s;
      };
      const normalizedProof = normalizeForBackend(proof);
      const data = await puzzleAPI.submitProof(puzzle.id, normalizedProof, hintsUsed, userId || undefined);
      
      if (isMountedRef.current) {
        setResponse(data);
        
        // Show success message if the proof is valid
        if (data.verdict) {
          showToast('Congratulations! Your proof is correct. Loading new puzzle...', 'success');
          
          setTimeout(() => {
            if (isMountedRef.current) {
              fetchRandomPuzzle();
            }
          }, 1500);
        } else {
          showToast('Proof rejected. Please check your logic and try again.', 'error');
        }
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
      if (isMountedRef.current) {
        showToast('Failed to submit proof. Please try again.', 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };
  
  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty: string) => {
    setDifficulty(newDifficulty);
  };
  
  // Handle hint usage
  const handleHintUsed = (hintLevel: number) => {
    setHintsUsed(prev => Math.max(prev, hintLevel));
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Practice Mode</h1>
      </div>
      
      <div className="mb-6 flex space-x-4">
        <div className="flex-1">
          <label htmlFor="difficulty" className="block mb-2 text-gray-900 dark:text-gray-100">Difficulty:</label>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <select
                id="difficulty"
                className="appearance-none cursor-pointer px-3 py-2 pr-10 surface border border-default rounded-lg text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                value={difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                aria-label="Select puzzle difficulty"
              >
                <option value="">Any</option>
                <optgroup label="Difficulty Levels">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Chapter Categories">
                  <option value="chapter1">Ch 1: Subject Matter (1-3)</option>
                  <option value="chapter2">Ch 2: Notation (2-4)</option>
                  <option value="chapter3">Ch 3: Derivations (3-5)</option>
                  <option value="chapter4">Ch 4: Conditional (4-6)</option>
                  <option value="chapter5">Ch 5: Nested (6-8)</option>
                  <option value="chapter6">Ch 6: Indirect (5-8)</option>
                </optgroup>
                <optgroup label="Special Categories">
                  <option value="any">Mixed Difficulty</option>
                  <option value="hard">Expert (8-10)</option>
                </optgroup>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            
            <button
              onClick={fetchRandomPuzzle}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Get new puzzle"
            >
              {loading ? 'Loading...' : 'New Puzzle'}
            </button>
          </div>
        </div>
      </div>
      
      {puzzle ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left column - Puzzle info and additional content */}
          <div className="space-y-4">
            {/* Puzzle info card */}
            <div className="surface rounded-lg p-6 border border-default" style={{marginTop: '38px'}}>
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold">Puzzle #{puzzle.id}</h2>
                <DifficultyBadge
                  difficulty={puzzle.difficulty}
                  chapter={puzzle.chapter}
                  nestedDepth={puzzle.nested_depth}
                  showDetails
                />
              </div>
              <div className="mb-4">
                <DifficultyInfo
                  difficulty={puzzle.difficulty}
                  chapter={puzzle.chapter}
                  nestedDepth={puzzle.nested_depth}
                />
                <div className="text-sm text-gray-700 dark:text-gray-400 mt-2">
                  Best known proof length: {puzzle.best_len} lines
                </div>
              </div>
              
              <div className="surface p-4 rounded-md mb-4 border border-default">
                <div className="font-semibold mb-2">Premises (Γ):</div>
                <div className="font-mono">{puzzle.gamma}</div>
                <button
                  onClick={() => {
                    const premiseArray = puzzle.gamma.split(',').map(p => p.trim());
                    const premiseLines = premiseArray.map(premise => `${premise} :PR`).join('\n');
                    const newValue = proof.trim() ? `${premiseLines}\n${proof}` : premiseLines;
                    setProof(newValue);
                  }}
                  className="w-full mt-2 px-3 py-2 surface border border-default hover:opacity-95 transition-colors text-sm font-medium"
                >
                  Auto-fill Premises
                </button>
              </div>
              
              <div className="surface p-4 rounded-md border border-default">
                <div className="font-semibold mb-2">Conclusion (φ):</div>
                <div className="font-mono">{puzzle.phi}</div>
              </div>
            </div>
            
            {/* Additional content below */}
            <HintSystem 
              puzzleId={puzzle.id} 
              currentProof={proof}
              onHintUsed={handleHintUsed}
              disabled={submitting || !!response?.verdict}
            />
            
            {response && (
              <div
                className={`mt-4 p-4 rounded-md backdrop-blur-sm border ${
                  response.verdict
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-600/30'
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-600/30'
                }`}
              >
                <h3
                  className={`font-semibold mb-2 ${
                    response.verdict ? 'text-green-800 dark:text-white' : 'text-red-800 dark:text-white'
                  }`}
                >
                  {response.verdict ? 'Proof Accepted!' : 'Proof Rejected'}
                </h3>
                {response.error_message && (
                  <div className="text-red-700 dark:text-red-400">{response.error_message}</div>
                )}
                <div className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                  Processing time: {response.processing_time}ms
                </div>

                {response.counter_model && (
                  <div className="mt-2">
                    <div className="font-semibold text-gray-800 dark:text-gray-300">Counter-model:</div>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {Object.entries(response.counter_model).map(([variable, value]) => (
                        <div
                          key={variable}
                          className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded border border-gray-200 dark:border-gray-700/50"
                        >
                          <span className="font-mono text-gray-700 dark:text-gray-300">{variable}: {value ? 'True' : 'False'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right column - Proof editor with explicit positioning */}
          <div className="flex flex-col">
            <div className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Your Proof:</div>
            <div className="surface rounded-xl p-6 border border-default shadow-inner flex-1">
              <CarnapFitchEditor
                value={proof}
                onChange={setProof}
                onSubmit={handleSubmit}
                height="400px"
                theme={isDarkMode ? 'dark' : 'light'}
                showSyntaxGuide={true}
                premises={puzzle.gamma}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            {loading ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Loading puzzle...</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 text-gray-600 dark:text-gray-300">No puzzle loaded.</div>
                <button
                  onClick={fetchRandomPuzzle}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  aria-label="Get random puzzle"
                >
                  Get Random Puzzle
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PracticePage() {
  return (
    <ErrorBoundary>
      <PracticePageContent />
    </ErrorBoundary>
  );
}