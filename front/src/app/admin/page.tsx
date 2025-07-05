'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { 
  UsersIcon, 
  PuzzlePieceIcon, 
  ChartBarIcon, 
  BeakerIcon,
  ServerIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  AcademicCapIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import api from '@/lib/api';
import AdminGuard from '@/components/AdminGuard';

interface SystemStats {
  users: {
    total: number;
    active: number;
    admins: number;
    recent_signups: number;
  };
  puzzles: {
    total: number;
    avg_difficulty: number;
  };
  games: {
    total: number;
    active: number;
    completed: number;
  };
  submissions: {
    total: number;
    successful: number;
    failed: number;
    avg_processing_time_ms: number;
  };
}

interface InstructorRequest {
  id: number;
  user_id: number;
  institution_name: string;
  course_info: string;
  faculty_url: string | null;
  faculty_id: string | null;
  status: string;
  submitted_at: string;
  user?: {
    handle: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState<InstructorRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);

  // Admin check is now handled by AdminGuard wrapper

  useEffect(() => {
    if (user?.is_admin) {
      fetchStats();
      fetchPendingRequests();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await api.get('/api/instructor/requests?status=pending');
      setPendingRequests(response.data);
    } catch (error) {
      console.error('Failed to fetch instructor requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  if (isLoading || !user?.is_admin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ServerIcon className="h-6 w-6" />
              Admin Dashboard
            </h1>
            <nav className="flex space-x-4">
              <button
                onClick={() => router.push('/admin/users')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Users
              </button>
              <button
                onClick={() => router.push('/admin/puzzles')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Puzzles
              </button>
              <button
                onClick={() => router.push('/admin/games')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Games
              </button>
              <button
                onClick={() => router.push('/admin/submissions')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Submissions
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/admin/users')}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg hover:bg-gray-700/30 hover:border-gray-600/50 transition-all"
            >
              <UsersIcon className="h-8 w-8 text-blue-400 mb-2" />
              <h3 className="font-medium text-white">Manage Users</h3>
              <p className="text-sm text-gray-400 mt-1">View and edit user accounts</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/admin/puzzles/new')}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg hover:bg-gray-700/30 hover:border-gray-600/50 transition-all"
            >
              <PuzzlePieceIcon className="h-8 w-8 text-green-400 mb-2" />
              <h3 className="font-medium text-white">Create Puzzle</h3>
              <p className="text-sm text-gray-400 mt-1">Add new logic puzzles</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/admin/games')}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg hover:bg-gray-700/30 hover:border-gray-600/50 transition-all"
            >
              <BeakerIcon className="h-8 w-8 text-purple-400 mb-2" />
              <h3 className="font-medium text-white">View Games</h3>
              <p className="text-sm text-gray-400 mt-1">Monitor active matches</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/admin/submissions')}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 p-6 rounded-lg hover:bg-gray-700/30 hover:border-gray-600/50 transition-all"
            >
              <ChartBarIcon className="h-8 w-8 text-orange-400 mb-2" />
              <h3 className="font-medium text-white">Submissions</h3>
              <p className="text-sm text-gray-400 mt-1">Analyze proof attempts</p>
            </motion.button>
          </div>
        </div>

        {/* Instructor Requests */}
        {!requestsLoading && pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AcademicCapIcon className="h-5 w-5" />
              Pending Instructor Requests
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                {pendingRequests.length}
              </span>
            </h2>
            <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <BellIcon className="h-5 w-5 text-yellow-400 mt-0.5" />
                <p className="text-yellow-400">
                  There are {pendingRequests.length} instructor access requests waiting for review.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => router.push('/admin/instructor-requests')}
                className="px-4 py-2 bg-yellow-600 text-black font-medium rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Review Requests
              </motion.button>
            </div>
          </div>
        )}

        {/* System Statistics */}
        {statsLoading ? (
          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-8">
            <div className="flex items-center justify-center">
              <div className="text-gray-400">Loading statistics...</div>
            </div>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-white">System Overview</h2>
            
            {/* User Stats */}
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <UsersIcon className="h-5 w-5" />
                User Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Users</p>
                  <p className="text-2xl font-semibold text-white">{stats.users.total}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Active Users</p>
                  <p className="text-2xl font-semibold text-green-400">{stats.users.active}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Admins</p>
                  <p className="text-2xl font-semibold text-purple-400">{stats.users.admins}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Recent Signups (24h)</p>
                  <p className="text-2xl font-semibold text-blue-400">{stats.users.recent_signups}</p>
                </div>
              </div>
            </div>

            {/* Puzzle Stats */}
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <PuzzlePieceIcon className="h-5 w-5" />
                Puzzle Statistics
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Puzzles</p>
                  <p className="text-2xl font-semibold text-white">{stats.puzzles.total}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Average Difficulty</p>
                  <p className="text-2xl font-semibold text-yellow-400">{stats.puzzles.avg_difficulty}/10</p>
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <BeakerIcon className="h-5 w-5" />
                Game Statistics
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Games</p>
                  <p className="text-2xl font-semibold text-white">{stats.games.total}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Active Games</p>
                  <p className="text-2xl font-semibold text-green-400">{stats.games.active}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-2xl font-semibold text-gray-400">{stats.games.completed}</p>
                </div>
              </div>
            </div>

            {/* Submission Stats */}
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                Submission Statistics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Submissions</p>
                  <p className="text-2xl font-semibold text-white">{stats.submissions.total}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    <CheckCircleIcon className="h-4 w-4" />
                    Successful
                  </p>
                  <p className="text-2xl font-semibold text-green-400">{stats.submissions.successful}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    <XCircleIcon className="h-4 w-4" />
                    Failed
                  </p>
                  <p className="text-2xl font-semibold text-red-400">{stats.submissions.failed}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    Avg Time
                  </p>
                  <p className="text-2xl font-semibold text-blue-400">{stats.submissions.avg_processing_time_ms}ms</p>
                </div>
              </div>
              {stats.submissions.total > 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 text-sm">Success Rate</p>
                  <div className="mt-2 bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div 
                      className="bg-green-500 h-full transition-all duration-500"
                      style={{ width: `${(stats.submissions.successful / stats.submissions.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-300 mt-1">
                    {((stats.submissions.successful / stats.submissions.total) * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg p-4">
            <p className="text-sm text-red-400">Failed to load system statistics</p>
          </div>
        )}
      </div>
      </div>
    </AdminGuard>
  );
}