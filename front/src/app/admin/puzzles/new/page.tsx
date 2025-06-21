'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { 
  PuzzlePieceIcon,
  ChevronLeftIcon,
  BeakerIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

interface PuzzleForm {
  gamma: string;
  phi: string;
  difficulty: number;
  best_len: number;
  machine_proof: string;
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

  if (isLoading || !currentUser?.is_admin) {
    router.push('/');
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
      // TODO: Implement proof testing endpoint
      // For now, just simulate a test
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('Proof test would be implemented here');
    } catch (error) {
      console.error('Failed to test proof:', error);
      alert('Failed to test proof');
    } finally {
      setTestingProof(false);
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
              <button
                type="button"
                onClick={testProof}
                disabled={testingProof || !form.gamma.trim() || !form.phi.trim() || !form.machine_proof.trim()}
                className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <BeakerIcon className="h-4 w-4" />
                {testingProof ? 'Testing...' : 'Test Proof'}
              </button>
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