'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { 
  PuzzlePieceIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  BeakerIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import api from '@/lib/api';

interface Puzzle {
  id: number;
  gamma: string;
  phi: string;
  difficulty: number;
  best_len: number;
  machine_proof: string | null;
  created: string;
  total_submissions?: number;
  success_rate?: number;
}

interface PuzzleListResponse {
  puzzles: Puzzle[];
  total: number;
  skip: number;
  limit: number;
}

export default function AdminPuzzles() {
  const { user: currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [difficulty, setDifficulty] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState('created');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [editingPuzzle, setEditingPuzzle] = useState<Puzzle | null>(null);
  const [viewingPuzzle, setViewingPuzzle] = useState<Puzzle | null>(null);

  useEffect(() => {
    if (!isLoading && !currentUser?.is_admin) {
      router.push('/');
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (currentUser?.is_admin) {
      fetchPuzzles();
    }
  }, [currentUser, page, difficulty, sortBy, order]);

  const fetchPuzzles = async () => {
    try {
      setLoading(true);
      const params: any = {
        skip: (page - 1) * limit,
        limit,
        sort_by: sortBy,
        order
      };
      
      if (difficulty !== null) params.difficulty = difficulty;

      const response = await api.get<PuzzleListResponse>('/admin/puzzles', { params });
      setPuzzles(response.data.puzzles);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch puzzles:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePuzzle = async (puzzleId: number, updates: Partial<Puzzle>) => {
    try {
      await api.patch(`/admin/puzzles/${puzzleId}`, updates);
      fetchPuzzles();
      setEditingPuzzle(null);
    } catch (error) {
      console.error('Failed to update puzzle:', error);
      alert('Failed to update puzzle');
    }
  };

  const deletePuzzle = async (puzzleId: number) => {
    if (!confirm('Are you sure you want to delete this puzzle? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/admin/puzzles/${puzzleId}`);
      fetchPuzzles();
    } catch (error: any) {
      console.error('Failed to delete puzzle:', error);
      alert(error.response?.data?.detail || 'Failed to delete puzzle');
    }
  };

  const totalPages = Math.ceil(total / limit);

  if (isLoading || !currentUser?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <PuzzlePieceIcon className="h-6 w-6" />
                Puzzle Management
              </h1>
            </div>
            <button
              onClick={() => router.push('/admin/puzzles/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              Create Puzzle
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Difficulty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Difficulty</label>
              <select
                value={difficulty === null ? '' : difficulty.toString()}
                onChange={(e) => setDifficulty(e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Difficulties</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="created">Created</option>
                  <option value="difficulty">Difficulty</option>
                  <option value="best_len">Best Length</option>
                  <option value="id">ID</option>
                </select>
                <button
                  onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 hover:bg-gray-700/50 transition-colors"
                >
                  {order === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* Stats Summary */}
            <div className="flex items-end">
              <div className="bg-gray-900/50 px-4 py-2 rounded-lg border border-gray-700/50 w-full">
                <p className="text-sm text-gray-400">Total Puzzles</p>
                <p className="text-xl font-semibold text-white">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Puzzles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-8 text-center text-gray-400">Loading puzzles...</div>
          ) : puzzles.length === 0 ? (
            <div className="col-span-full p-8 text-center text-gray-400">No puzzles found</div>
          ) : (
            puzzles.map((puzzle) => (
              <motion.div
                key={puzzle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 hover:bg-gray-700/30 hover:border-gray-600/50 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Puzzle #{puzzle.id}</h3>
                    <p className="text-sm text-gray-400">
                      Created {new Date(puzzle.created).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewingPuzzle(puzzle)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="View"
                    >
                      <BeakerIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingPuzzle(puzzle)}
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deletePuzzle(puzzle.id)}
                      className="text-red-400 hover:text-red-300 transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Premises (Γ)</p>
                    <p className="font-mono text-sm text-gray-300 bg-gray-900/50 p-2 rounded border border-gray-700/50">
                      {puzzle.gamma}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Conclusion (φ)</p>
                    <p className="font-mono text-sm text-gray-300 bg-gray-900/50 p-2 rounded border border-gray-700/50">
                      {puzzle.phi}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-xs text-gray-500">Difficulty</p>
                      <div className="flex items-center gap-1 mt-1">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 w-2 rounded-full ${
                              i < puzzle.difficulty
                                ? 'bg-yellow-400'
                                : 'bg-gray-700'
                            }`}
                          />
                        ))}
                        <span className="text-sm text-gray-400 ml-2">{puzzle.difficulty}/10</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Best Length</p>
                      <p className="text-sm text-gray-300">{puzzle.best_len} steps</p>
                    </div>
                  </div>

                  {(puzzle.total_submissions !== undefined && puzzle.total_submissions > 0) && (
                    <div className="pt-2 border-t border-gray-700/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Submissions:</span>
                        <span className="text-gray-300">{puzzle.total_submissions}</span>
                      </div>
                      {puzzle.success_rate !== undefined && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Success Rate:</span>
                          <span className={`${
                            puzzle.success_rate > 50 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {puzzle.success_rate}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} puzzles
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-800/50 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <span className="text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-800/50 border border-gray-700 rounded-md text-gray-300 hover:bg-gray-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Puzzle Modal */}
      {editingPuzzle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg shadow-2xl p-6 max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Edit Puzzle #{editingPuzzle.id}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Premises (Γ)</label>
                <textarea
                  value={editingPuzzle.gamma}
                  onChange={(e) => setEditingPuzzle({ ...editingPuzzle, gamma: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Conclusion (φ)</label>
                <input
                  type="text"
                  value={editingPuzzle.phi}
                  onChange={(e) => setEditingPuzzle({ ...editingPuzzle, phi: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Difficulty (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={editingPuzzle.difficulty}
                    onChange={(e) => setEditingPuzzle({ ...editingPuzzle, difficulty: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Best Length</label>
                  <input
                    type="number"
                    min="1"
                    value={editingPuzzle.best_len}
                    onChange={(e) => setEditingPuzzle({ ...editingPuzzle, best_len: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Machine Proof (Optional)</label>
                <textarea
                  value={editingPuzzle.machine_proof || ''}
                  onChange={(e) => setEditingPuzzle({ ...editingPuzzle, machine_proof: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter the machine-generated proof..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setEditingPuzzle(null)}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => updatePuzzle(editingPuzzle.id, {
                  gamma: editingPuzzle.gamma,
                  phi: editingPuzzle.phi,
                  difficulty: editingPuzzle.difficulty,
                  best_len: editingPuzzle.best_len,
                  machine_proof: editingPuzzle.machine_proof
                })}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Puzzle Modal */}
      {viewingPuzzle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg shadow-2xl p-6 max-w-3xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Puzzle #{viewingPuzzle.id} Details</h3>
            
            <div className="space-y-6">
              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Premises (Γ)</h4>
                <pre className="font-mono text-gray-200 whitespace-pre-wrap">{viewingPuzzle.gamma}</pre>
              </div>
              
              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Conclusion (φ)</h4>
                <pre className="font-mono text-gray-200">{viewingPuzzle.phi}</pre>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Metadata</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Difficulty:</dt>
                      <dd className="text-gray-300">{viewingPuzzle.difficulty}/10</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Best Length:</dt>
                      <dd className="text-gray-300">{viewingPuzzle.best_len} steps</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Created:</dt>
                      <dd className="text-gray-300">{new Date(viewingPuzzle.created).toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
                
                {viewingPuzzle.total_submissions !== undefined && (
                  <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Statistics</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-gray-500">Submissions:</dt>
                        <dd className="text-gray-300">{viewingPuzzle.total_submissions}</dd>
                      </div>
                      {viewingPuzzle.success_rate !== undefined && (
                        <div className="flex justify-between">
                          <dt className="text-gray-500">Success Rate:</dt>
                          <dd className={`${
                            viewingPuzzle.success_rate > 50 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {viewingPuzzle.success_rate}%
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}
              </div>
              
              {viewingPuzzle.machine_proof && (
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Machine Proof</h4>
                  <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap overflow-x-auto">
                    {viewingPuzzle.machine_proof}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingPuzzle(null)}
                className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}