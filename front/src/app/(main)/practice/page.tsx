'use client';

import { useState, useEffect, useRef } from 'react';
import { puzzleAPI } from '@/lib/api';
import CarnapFitchEditor from '@/components/LazyCarnapFitchEditor';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useToast } from '@/contexts/ToastContext';
import { HintSystem } from '@/components/HintSystem';

// Puzzle type
type Puzzle = {
  id: number;
  gamma: string;
  phi: string;
  difficulty: number;
  best_len: number;
  created: string;
};

// Response from the proof checker
type ProofResponse = {
  verdict: boolean;
  error_message?: string;
  processing_time: number;
  counter_model?: Record<string, boolean>;
};

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
  
  // Fetch a random puzzle on mount or when difficulty changes
  useEffect(() => {
    isMountedRef.current = true; // Ensure mounted state is true when effect runs
    fetchRandomPuzzle();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [difficulty]);
  
  // Fetch a random puzzle
  const fetchRandomPuzzle = async () => {
    if (!isMountedRef.current) return;
    
    setLoading(true);
    try {
      const parsedDifficulty = difficulty ? parseInt(difficulty, 10) : undefined;
      const data = await puzzleAPI.getRandomPuzzle(parsedDifficulty);
      
      if (isMountedRef.current) {
        setPuzzle(data);
        setProof('');
        setResponse(null);
        setHintsUsed(0);
        setStartTime(new Date());
      }
    } catch (error) {
      console.error('Error fetching puzzle:', error);
      if (isMountedRef.current) {
        showToast('Failed to fetch puzzle. Please try again.', 'error');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };
  
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
      const data = await puzzleAPI.submitProof(puzzle.id, proof, hintsUsed);
      
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
          <label htmlFor="difficulty" className="block mb-2 text-gray-200">Difficulty:</label>
          <div className="flex items-center space-x-4">
            <select
              id="difficulty"
              className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={difficulty}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              aria-label="Select puzzle difficulty"
            >
              <option value="">Any</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
            
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
              <h2 className="text-xl font-semibold mb-4 text-white">Puzzle #{puzzle.id}</h2>
              <div className="mb-4">
                <div className="text-sm text-gray-400">Difficulty: {puzzle.difficulty}</div>
                <div className="text-sm text-gray-400">Best known proof length: {puzzle.best_len} lines</div>
              </div>
              
              <div className="bg-gray-900/50 p-4 rounded-md mb-4 border border-gray-700/50">
                <div className="font-semibold mb-2 text-gray-200">Premises (Γ):</div>
                <div className="font-mono text-gray-300 mb-2">{puzzle.gamma}</div>
                <div className="text-sm text-yellow-400 bg-yellow-900/20 p-2 rounded border border-yellow-600/30 mt-2">
                  <strong>Note:</strong> You must enter each premise as a line in your proof using `:PR` justification.
                  For example: <code className="bg-gray-800/50 px-1 rounded text-yellow-300">P→Q :PR</code>
                </div>
              </div>
              
              <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700/50">
                <div className="font-semibold mb-2 text-gray-200">Conclusion (φ):</div>
                <div className="font-mono text-gray-300">{puzzle.phi}</div>
              </div>
            </div>
            
            <HintSystem 
              puzzleId={puzzle.id} 
              currentProof={proof}
              onHintUsed={handleHintUsed}
              disabled={submitting || !!response?.verdict}
            />
            
            {response && (
              <div className={`mt-4 p-4 rounded-md backdrop-blur-sm border ${
                response.verdict 
                  ? 'bg-green-900/20 border-green-600/30' 
                  : 'bg-red-900/20 border-red-600/30'
              }`}>
                <h3 className="font-semibold mb-2 text-white">
                  {response.verdict ? 'Proof Accepted!' : 'Proof Rejected'}
                </h3>
                {response.error_message && (
                  <div className="text-red-400">{response.error_message}</div>
                )}
                <div className="text-sm mt-2 text-gray-400">
                  Processing time: {response.processing_time}ms
                </div>
                
                {response.counter_model && (
                  <div className="mt-2">
                    <div className="font-semibold text-gray-300">Counter-model:</div>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {Object.entries(response.counter_model).map(([variable, value]) => (
                        <div key={variable} className="bg-gray-800/50 p-2 rounded border border-gray-700/50">
                          <span className="font-mono text-gray-300">{variable}: {value ? 'True' : 'False'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div>
            <div className="font-semibold mb-2 text-white">Your Proof:</div>
            <CarnapFitchEditor
              value={proof}
              onChange={setProof}
              onSubmit={handleSubmit}
              height="400px"
              theme="dark"
              showSyntaxGuide={true}
              premises={puzzle.gamma}
            />
            
            <div className="mt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting || !proof.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full font-medium"
                aria-label="Submit proof for validation"
              >
                {submitting ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                  </span>
                ) : 'Submit Proof'}
              </button>
            </div>
            
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            {loading ? (
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-48 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-700 rounded w-32 mx-auto"></div>
                </div>
                <p className="text-gray-400">Loading puzzle...</p>
              </div>
            ) : (
              <div>
                <div className="mb-4 text-gray-300">No puzzle loaded.</div>
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