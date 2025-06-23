'use client';

import { useState, useEffect } from 'react';
import { puzzleAPI } from '@/lib/api';
import CarnapFitchEditor from '@/components/LazyCarnapFitchEditor';

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

export default function PracticePage() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [proof, setProof] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<ProofResponse | null>(null);
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  
  // Fetch a random puzzle on mount or when difficulty changes
  useEffect(() => {
    fetchRandomPuzzle();
  }, [difficulty]);
  
  // Fetch a random puzzle
  const fetchRandomPuzzle = async () => {
    setLoading(true);
    try {
      const data = await puzzleAPI.getRandomPuzzle(difficulty);
      setPuzzle(data);
      setProof('');
      setResponse(null);
    } catch (error) {
      console.error('Error fetching puzzle:', error);
      alert('Failed to fetch puzzle. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle proof submission
  const handleSubmit = async () => {
    if (!puzzle) return;
    
    setSubmitting(true);
    try {
      const data = await puzzleAPI.submitProof(puzzle.id, proof);
      setResponse(data);
      
      // Show success message if the proof is valid
      if (data.verdict) {
        setTimeout(() => {
          alert('Congratulations! Your proof is correct. Here\'s a new puzzle.');
          fetchRandomPuzzle();
        }, 1000);
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
      alert('Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty: number | undefined) => {
    setDifficulty(newDifficulty);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Practice Mode</h1>
      
      <div className="mb-6 flex space-x-4">
        <div className="flex-1">
          <label htmlFor="difficulty" className="block mb-2">Difficulty:</label>
          <div className="flex items-center space-x-4">
            <select
              id="difficulty"
              className="p-2 border rounded"
              value={difficulty || ''}
              onChange={(e) => handleDifficultyChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'New Puzzle'}
            </button>
          </div>
        </div>
      </div>
      
      {puzzle ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
              <h2 className="text-xl font-semibold mb-4 text-white">Puzzle #{puzzle.id}</h2>
              <div className="mb-4">
                <div className="text-sm text-gray-400">Difficulty: {puzzle.difficulty}</div>
                <div className="text-sm text-gray-400">Best known proof length: {puzzle.best_len} lines</div>
              </div>
              
              <div className="bg-gray-900/50 p-4 rounded-md mb-4 border border-gray-700/50">
                <div className="font-semibold mb-2 text-gray-200">Premises (Γ):</div>
                <div className="font-mono text-gray-300">{puzzle.gamma}</div>
              </div>
              
              <div className="bg-gray-900/50 p-4 rounded-md border border-gray-700/50">
                <div className="font-semibold mb-2 text-gray-200">Conclusion (φ):</div>
                <div className="font-mono text-gray-300">{puzzle.phi}</div>
              </div>
            </div>
            
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
            <div className="font-semibold mb-2">Your Proof:</div>
            <CarnapFitchEditor
              value={proof}
              onChange={setProof}
              onSubmit={handleSubmit}
              height="400px"
              theme="light"
              showSyntaxGuide={true}
            />
            
            <div className="mt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting || !proof.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Proof'}
              </button>
            </div>
            
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            {loading ? (
              <div>Loading puzzle...</div>
            ) : (
              <div>
                <div className="mb-4">No puzzle loaded.</div>
                <button
                  onClick={fetchRandomPuzzle}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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