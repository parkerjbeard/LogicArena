'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { 
  PuzzlePieceIcon,
  ChevronLeftIcon,
  BeakerIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import api from '@/lib/api';

interface PuzzleForm {
  gamma: string;
  phi: string;
  difficulty: number;
  best_len: number;
  machine_proof: string;
}

interface ProofTestResult {
  valid: boolean;
  error?: string;
  lines?: number;
  depth?: number;
  rules_used?: string[];
  syntax_info?: string;
  optimality?: {
    actual_length: number;
    redundant_steps: number[];
    optimality_score: number;
    efficiency_ratio?: number;
  };
  suggestions?: string[];
  counter_model?: Record<string, boolean>;
}

interface PuzzleTestResult {
  valid: boolean;
  solvable: boolean;
  machine_proof?: string;
  actual_best_len?: number;
  best_len_matches: boolean;
  counter_model?: Record<string, boolean>;
  warnings: string[];
}

export default function CreatePuzzle() {
  const { user: currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<PuzzleForm>({
    gamma: '',
    phi: '',
    difficulty: 1,
    best_len: 1,
    machine_proof: ''
  });
  const [creating, setCreating] = useState(false);
  const [testingProof, setTestingProof] = useState(false);
  const [testingPuzzle, setTestingPuzzle] = useState(false);
  const [proofTestResult, setProofTestResult] = useState<ProofTestResult | null>(null);
  const [puzzleTestResult, setPuzzleTestResult] = useState<PuzzleTestResult | null>(null);
  const [showTestResults, setShowTestResults] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!currentUser?.is_admin) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.gamma.trim() || !form.phi.trim()) {
      alert('Please fill in both premises and conclusion');
      return;
    }

    try {
      setCreating(true);
      const puzzleData = {
        gamma: form.gamma.trim(),
        phi: form.phi.trim(),
        difficulty: form.difficulty,
        best_len: form.best_len,
        machine_proof: form.machine_proof.trim() || null
      };

      await api.post('/admin/puzzles', puzzleData);
      router.push('/admin/puzzles');
    } catch (error: any) {
      console.error('Failed to create puzzle:', error);
      alert(error.response?.data?.detail || 'Failed to create puzzle');
    } finally {
      setCreating(false);
    }
  };

  const testProof = async () => {
    if (!form.gamma.trim() || !form.phi.trim() || !form.machine_proof.trim()) {
      alert('Please fill in premises, conclusion, and machine proof to test');
      return;
    }

    try {
      setTestingProof(true);
      setProofTestResult(null);
      
      const response = await api.post('/api/admin/test-proof', {
        gamma: form.gamma.trim(),
        phi: form.phi.trim(),
        proof: form.machine_proof.trim(),
        best_len: form.best_len
      });
      
      setProofTestResult(response.data);
      setShowTestResults(true);
    } catch (error: any) {
      console.error('Failed to test proof:', error);
      alert(error.response?.data?.detail || 'Failed to test proof');
    } finally {
      setTestingProof(false);
    }
  };

  const testPuzzle = async () => {
    if (!form.gamma.trim() || !form.phi.trim()) {
      alert('Please fill in premises and conclusion to test the puzzle');
      return;
    }

    try {
      setTestingPuzzle(true);
      setPuzzleTestResult(null);
      
      const response = await api.post('/api/admin/test-puzzle', {
        gamma: form.gamma.trim(),
        phi: form.phi.trim(),
        difficulty: form.difficulty,
        best_len: form.best_len,
        generate_proof: true
      });
      
      setPuzzleTestResult(response.data);
      setShowTestResults(true);
      
      // If machine proof was generated and we don't have one, suggest using it
      if (response.data.machine_proof && !form.machine_proof.trim()) {
        const useGeneratedProof = confirm('A machine proof was generated. Would you like to use it?');
        if (useGeneratedProof) {
          setForm({ ...form, machine_proof: response.data.machine_proof });
        }
      }
    } catch (error: any) {
      console.error('Failed to test puzzle:', error);
      alert(error.response?.data?.detail || 'Failed to test puzzle');
    } finally {
      setTestingPuzzle(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/puzzles')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <PuzzlePieceIcon className="h-6 w-6" />
                Create New Puzzle
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Premises */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Premises (Γ)
              <span className="text-red-400 ml-1">*</span>
            </label>
            <textarea
              value={form.gamma}
              onChange={(e) => setForm({ ...form, gamma: e.target.value })}
              rows={4}
              required
              placeholder="Enter the premises for the puzzle, one per line or separated by commas..."
              className="w-full px-3 py-3 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Example: P → Q, P ∨ R, ¬(Q ∧ R)
            </p>
          </div>

          {/* Conclusion */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              Conclusion (φ)
              <span className="text-red-400 ml-1">*</span>
            </label>
            <input
              type="text"
              value={form.phi}
              onChange={(e) => setForm({ ...form, phi: e.target.value })}
              required
              placeholder="Enter the conclusion to be proven..."
              className="w-full px-3 py-3 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Example: Q ∨ R
            </p>
          </div>

          {/* Metadata */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-white mb-4">Puzzle Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Difficulty (1-10)
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: parseInt(e.target.value) })}
                  required
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        i < form.difficulty
                          ? 'bg-yellow-400'
                          : 'bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Best Known Length (steps)
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.best_len}
                  onChange={(e) => setForm({ ...form, best_len: parseInt(e.target.value) })}
                  required
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The minimum number of steps required to solve this puzzle
                </p>
              </div>
            </div>
          </div>

          {/* Machine Proof */}
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-400">
                Machine Proof (Optional)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={testPuzzle}
                  disabled={testingPuzzle || !form.gamma.trim() || !form.phi.trim()}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <SparklesIcon className="h-4 w-4" />
                  {testingPuzzle ? 'Testing Puzzle...' : 'Test Puzzle'}
                </button>
                <button
                  type="button"
                  onClick={testProof}
                  disabled={testingProof || !form.gamma.trim() || !form.phi.trim() || !form.machine_proof.trim()}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <BeakerIcon className="h-4 w-4" />
                  {testingProof ? 'Testing Proof...' : 'Test Proof'}
                </button>
              </div>
            </div>
            <textarea
              value={form.machine_proof}
              onChange={(e) => setForm({ ...form, machine_proof: e.target.value })}
              rows={6}
              placeholder="Enter a machine-generated proof that can be used for validation..."
              className="w-full px-3 py-3 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              This can be used for automatic validation and as a reference solution
            </p>
          </div>

          {/* Test Results */}
          {showTestResults && (proofTestResult || puzzleTestResult) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Test Results</h3>
                <button
                  type="button"
                  onClick={() => setShowTestResults(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Puzzle Test Results */}
              {puzzleTestResult && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <SparklesIcon className="h-4 w-4 text-green-400" />
                    Puzzle Validation
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Valid/Solvable Status */}
                    <div className="flex items-center gap-2">
                      {puzzleTestResult.valid && puzzleTestResult.solvable ? (
                        <>
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                          <span className="text-green-400">Puzzle is valid and solvable</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-5 w-5 text-red-400" />
                          <span className="text-red-400">
                            {!puzzleTestResult.valid ? 'Invalid puzzle' : 'Puzzle is not solvable'}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Best Length Check */}
                    {puzzleTestResult.actual_best_len !== undefined && (
                      <div className="flex items-center gap-2">
                        {puzzleTestResult.best_len_matches ? (
                          <>
                            <CheckCircleIcon className="h-5 w-5 text-green-400" />
                            <span className="text-green-400">
                              Best length matches (found {puzzleTestResult.actual_best_len}-step proof)
                            </span>
                          </>
                        ) : (
                          <>
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                            <span className="text-yellow-400">
                              Found {puzzleTestResult.actual_best_len}-step proof (claimed: {form.best_len})
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Warnings */}
                    {puzzleTestResult.warnings.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-yellow-400 mb-2">Warnings:</p>
                        <ul className="space-y-1">
                          {puzzleTestResult.warnings.map((warning, i) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                              <ExclamationTriangleIcon className="h-3 w-3 text-yellow-400 mt-0.5 flex-shrink-0" />
                              {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Counter Model */}
                    {puzzleTestResult.counter_model && (
                      <div className="mt-3">
                        <p className="text-xs font-medium text-red-400 mb-2">Counter-model found:</p>
                        <div className="bg-gray-900/50 p-2 rounded text-xs font-mono text-gray-300">
                          {Object.entries(puzzleTestResult.counter_model).map(([prop, value]) => (
                            <div key={prop}>
                              {prop}: {value ? 'true' : 'false'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proof Test Results */}
              {proofTestResult && (
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <BeakerIcon className="h-4 w-4 text-purple-400" />
                    Proof Validation
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Valid Status */}
                    <div className="flex items-center gap-2">
                      {proofTestResult.valid ? (
                        <>
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                          <span className="text-green-400">Proof is valid</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-5 w-5 text-red-400" />
                          <span className="text-red-400">Invalid proof</span>
                        </>
                      )}
                    </div>

                    {/* Error Message */}
                    {proofTestResult.error && (
                      <div className="bg-red-900/20 border border-red-600/30 rounded p-3">
                        <p className="text-sm text-red-400">{proofTestResult.error}</p>
                      </div>
                    )}

                    {/* Proof Stats */}
                    {proofTestResult.valid && (
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-gray-900/30 p-3 rounded">
                          <p className="text-gray-500 text-xs">Lines</p>
                          <p className="text-gray-200 font-medium">{proofTestResult.lines || 0}</p>
                        </div>
                        <div className="bg-gray-900/30 p-3 rounded">
                          <p className="text-gray-500 text-xs">Depth</p>
                          <p className="text-gray-200 font-medium">{proofTestResult.depth || 0}</p>
                        </div>
                      </div>
                    )}

                    {/* Rules Used */}
                    {proofTestResult.rules_used && proofTestResult.rules_used.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">Inference rules used:</p>
                        <div className="flex flex-wrap gap-1">
                          {proofTestResult.rules_used.map((rule, i) => (
                            <span
                              key={i}
                              className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded"
                            >
                              {rule}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Optimality */}
                    {proofTestResult.optimality && (
                      <div className="bg-gray-900/30 p-3 rounded">
                        <p className="text-xs font-medium text-gray-400 mb-2">Optimality Analysis:</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Score:</span>
                            <span className="text-gray-300">{proofTestResult.optimality.optimality_score}%</span>
                          </div>
                          {proofTestResult.optimality.redundant_steps.length > 0 && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Redundant steps:</span>
                              <span className="text-yellow-400">{proofTestResult.optimality.redundant_steps.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Suggestions */}
                    {proofTestResult.suggestions && proofTestResult.suggestions.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 mb-2">Suggestions:</p>
                        <ul className="space-y-1">
                          {proofTestResult.suggestions.map((suggestion, i) => (
                            <li key={i} className="text-xs text-gray-400 flex items-start gap-2">
                              <InformationCircleIcon className="h-3 w-3 text-blue-400 mt-0.5 flex-shrink-0" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Preview */}
          {(form.gamma.trim() || form.phi.trim()) && (
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-white mb-4">Preview</h3>
              <div className="space-y-4">
                {form.gamma.trim() && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Premises (Γ)</p>
                    <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                      <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap">{form.gamma}</pre>
                    </div>
                  </div>
                )}
                
                {form.phi.trim() && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Conclusion (φ)</p>
                    <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                      <pre className="font-mono text-sm text-gray-300">{form.phi}</pre>
                    </div>
                  </div>
                )}
                
                <div className="text-sm text-gray-400">
                  <span>Difficulty: {form.difficulty}/10</span>
                  <span className="mx-4">•</span>
                  <span>Best Length: {form.best_len} steps</span>
                </div>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={() => router.push('/admin/puzzles')}
              className="px-6 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <motion.button
              type="submit"
              disabled={creating || !form.gamma.trim() || !form.phi.trim()}
              whileHover={{ scale: creating ? 1 : 1.02 }}
              whileTap={{ scale: creating ? 1 : 0.98 }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4" />
                  Create Puzzle
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>
    </div>
  );
}