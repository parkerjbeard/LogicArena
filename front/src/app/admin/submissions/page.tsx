'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

interface Submission {
  id: number;
  user_id: number;
  user_handle?: string;
  puzzle_id?: number;
  game_id?: number;
  round_id?: number;
  payload: string;
  verdict: boolean;
  error_message?: string;
  processing_time?: number;
  created: string;
}

interface SubmissionListResponse {
  submissions: Submission[];
  total: number;
  skip: number;
  limit: number;
}

export default function AdminSubmissions() {
  const { user: currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [userId, setUserId] = useState<string>('');
  const [puzzleId, setPuzzleId] = useState<string>('');
  const [gameId, setGameId] = useState<string>('');
  const [verdict, setVerdict] = useState<string>('');
  const [sortBy, setSortBy] = useState('created');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    if (!isLoading && !currentUser?.is_admin) {
      router.push('/');
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (currentUser?.is_admin) {
      fetchSubmissions();
    }
  }, [currentUser, page, userId, puzzleId, gameId, verdict, sortBy, order]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params: any = {
        skip: (page - 1) * limit,
        limit,
        sort_by: sortBy,
        order
      };
      
      if (userId) params.user_id = parseInt(userId);
      if (puzzleId) params.puzzle_id = parseInt(puzzleId);
      if (gameId) params.game_id = parseInt(gameId);
      if (verdict !== '') params.verdict = verdict === 'true';

      const response = await api.get<SubmissionListResponse>('/admin/submissions', { params });
      setSubmissions(response.data.submissions);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatProcessingTime = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
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
                <ChartBarIcon className="h-6 w-6" />
                Submission Management
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* User Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">User ID</label>
              <input
                type="number"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="Filter by user..."
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Puzzle Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Puzzle ID</label>
              <input
                type="number"
                value={puzzleId}
                onChange={(e) => setPuzzleId(e.target.value)}
                placeholder="Filter by puzzle..."
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Game Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Game ID</label>
              <input
                type="number"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Filter by game..."
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Verdict Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Verdict</label>
              <select
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="true">Successful</option>
                <option value="false">Failed</option>
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
                  <option value="processing_time">Time</option>
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
                <p className="text-sm text-gray-400">Total</p>
                <p className="text-xl font-semibold text-white">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading submissions...</div>
          ) : submissions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No submissions found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Context</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Verdict</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Processing</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-200">#{submission.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-200">
                            {submission.user_handle || `User ${submission.user_id}`}
                          </div>
                          <div className="text-sm text-gray-500">ID: {submission.user_id}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-400">
                          {submission.puzzle_id && (
                            <div>Puzzle #{submission.puzzle_id}</div>
                          )}
                          {submission.game_id && (
                            <div>Game #{submission.game_id}</div>
                          )}
                          {submission.round_id && (
                            <div>Round #{submission.round_id}</div>
                          )}
                          {!submission.puzzle_id && !submission.game_id && (
                            <div className="text-gray-500">Practice</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {submission.verdict ? (
                            <div className="flex items-center text-green-400">
                              <CheckCircleIcon className="h-4 w-4 mr-2" />
                              <span className="text-sm font-medium">Success</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-400">
                              <XCircleIcon className="h-4 w-4 mr-2" />
                              <span className="text-sm font-medium">Failed</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-400">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {formatProcessingTime(submission.processing_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {formatDate(submission.created)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setViewingSubmission(submission)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} submissions
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

      {/* Submission Details Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg shadow-2xl p-6 max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Submission #{viewingSubmission.id} Details</h3>
            
            <div className="space-y-6">
              {/* Submission Overview */}
              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Submission Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">User</p>
                    <p className="text-gray-300 font-medium">
                      {viewingSubmission.user_handle || `User ${viewingSubmission.user_id}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Verdict</p>
                    <div className="flex items-center">
                      {viewingSubmission.verdict ? (
                        <div className="flex items-center text-green-400">
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          <span className="font-medium">Success</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-red-400">
                          <XCircleIcon className="h-4 w-4 mr-1" />
                          <span className="font-medium">Failed</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Processing Time</p>
                    <p className="text-gray-300">{formatProcessingTime(viewingSubmission.processing_time)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Created</p>
                    <p className="text-gray-300">{formatDate(viewingSubmission.created)}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    {viewingSubmission.puzzle_id && (
                      <div>
                        <p className="text-gray-500">Puzzle ID</p>
                        <p className="text-gray-300">#{viewingSubmission.puzzle_id}</p>
                      </div>
                    )}
                    {viewingSubmission.game_id && (
                      <div>
                        <p className="text-gray-500">Game ID</p>
                        <p className="text-gray-300">#{viewingSubmission.game_id}</p>
                      </div>
                    )}
                    {viewingSubmission.round_id && (
                      <div>
                        <p className="text-gray-500">Round ID</p>
                        <p className="text-gray-300">#{viewingSubmission.round_id}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {!viewingSubmission.verdict && viewingSubmission.error_message && (
                <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-red-400 mb-2">Error Message</h4>
                  <pre className="text-sm text-red-300 whitespace-pre-wrap font-mono">
                    {viewingSubmission.error_message}
                  </pre>
                </div>
              )}

              {/* Proof Payload */}
              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                  <CodeBracketIcon className="h-4 w-4" />
                  Proof Payload
                </h4>
                <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 overflow-x-auto">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                    {viewingSubmission.payload}
                  </pre>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingSubmission(null)}
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