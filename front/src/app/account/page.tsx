'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import AuthGuard from '@/components/AuthGuard';
import api from '@/lib/api';
import {
  UserCircleIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

interface LoginActivity {
  id: number;
  login_type: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  error_message: string | null;
  created: string;
}

export default function AccountManagement() {
  const { user } = useAuth();
  const router = useRouter();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState('');
  const [loginActivities, setLoginActivities] = useState<LoginActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    fetchLoginActivities();
  }, []);

  const fetchLoginActivities = async () => {
    try {
      const response = await api.get('/api/users/me/login-activity');
      setLoginActivities(response.data.activities);
    } catch (error) {
      console.error('Failed to fetch login activities:', error);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') {
      setDeleteError('Please type exactly: DELETE MY ACCOUNT');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      await api.delete('/api/users/me');
      // Clear auth tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      // Redirect to home page
      router.push('/');
    } catch (error: any) {
      setDeleteError(error.response?.data?.detail || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportError('');
    setExportSuccess(false);

    try {
      const response = await api.get('/api/users/me/export', {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `logicarena_userdata_${user?.handle}_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error: any) {
      setExportError(error.response?.data?.detail || 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserAgentInfo = (userAgent: string) => {
    // Simple parsing of user agent for display
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <UserCircleIcon className="h-6 w-6" />
                Account Management
              </h1>
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Account Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Handle</p>
                  <p className="text-lg text-white">{user?.handle}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Email</p>
                  <p className="text-lg text-white">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Rating</p>
                  <p className="text-lg text-white">{user?.rating || 1200}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Account Type</p>
                  <p className="text-lg text-white">
                    Standard Account
                    {user?.is_admin && ' (Admin)'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>


          {/* Data Export */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">Export Your Data</h2>
            <p className="text-gray-300 mb-4">
              Download all your LogicArena data in a machine-readable format (JSON). This includes your profile, game history, and submissions.
            </p>
            <button
              onClick={handleExportData}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              {isExporting ? 'Exporting...' : 'Export My Data'}
            </button>
            {exportSuccess && (
              <div className="mt-4 bg-green-900/20 backdrop-blur-sm border border-green-600/30 rounded-lg p-4">
                <p className="text-sm text-green-400">Data exported successfully!</p>
              </div>
            )}
            {exportError && (
              <div className="mt-4 bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg p-4">
                <p className="text-sm text-red-400">{exportError}</p>
              </div>
            )}
          </motion.div>

          {/* Login Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ClockIcon className="h-6 w-6" />
              Recent Login Activity
            </h2>
            {loadingActivities ? (
              <p className="text-gray-400">Loading...</p>
            ) : loginActivities.length === 0 ? (
              <p className="text-gray-400">No login activity found</p>
            ) : (
              <div className="space-y-3">
                {loginActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {activity.success ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-400" />
                          ) : (
                            <XCircleIcon className="h-4 w-4 text-red-400" />
                          )}
                          <span className="text-sm font-medium text-white">
                            {activity.login_type === 'google' ? 'Google OAuth' : 'Email/Password'}
                          </span>
                          {!activity.success && (
                            <span className="text-xs text-red-400">({activity.error_message})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          {activity.ip_address && (
                            <span className="flex items-center gap-1">
                              <GlobeAltIcon className="h-3 w-3" />
                              {activity.ip_address}
                            </span>
                          )}
                          {activity.user_agent && (
                            <span className="flex items-center gap-1">
                              <DevicePhoneMobileIcon className="h-3 w-3" />
                              {getUserAgentInfo(activity.user_agent)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDate(activity.created)}
                      </span>
                    </div>
                  </div>
                ))}
                {loginActivities.length > 5 && (
                  <p className="text-sm text-gray-500 text-center pt-2">
                    Showing 5 of {loginActivities.length} login activities
                  </p>
                )}
              </div>
            )}
          </motion.div>

          {/* Delete Account */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800/30 backdrop-blur-sm border border-red-700/30 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              Danger Zone
            </h2>
            <p className="text-gray-300 mb-4">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            {!deleteConfirmOpen ? (
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <TrashIcon className="h-5 w-5" />
                Delete My Account
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg p-4">
                  <p className="text-sm text-red-400 font-semibold mb-2">
                    This action cannot be undone!
                  </p>
                  <p className="text-sm text-gray-300">
                    All your data including your profile, game history, and submissions will be permanently deleted.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Type <span className="font-mono font-semibold">DELETE MY ACCOUNT</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent w-full"
                    placeholder="DELETE MY ACCOUNT"
                  />
                </div>
                {deleteError && (
                  <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg p-4">
                    <p className="text-sm text-red-400">{deleteError}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <TrashIcon className="h-5 w-5" />
                    {isDeleting ? 'Deleting...' : 'Delete Account'}
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirmOpen(false);
                      setDeleteConfirmText('');
                      setDeleteError('');
                    }}
                    className="px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  );
}