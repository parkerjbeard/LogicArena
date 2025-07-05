'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

// Type definitions for our data
interface UserProfile {
  id: number;
  handle: string;
  email: string;
  rating: number;
  created: string;
}

interface UserStats {
  total_games: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
  rating: number;
  best_rating: number | null;
  total_submissions: number;
  valid_submissions: number;
}

interface UserSubmission {
  id: number;
  puzzle_id: number | null;
  game_id: number | null;
  payload: string;
  verdict: boolean;
  processing_time: number | null;
  created: string;
}

export default function ProfilePage({ params }: { params: { userId: string } }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const userId = params.userId;

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch user profile
        const profileResponse = await api.get(`/users/profile/${userId}`);
        setProfile(profileResponse.data);
        
        // Fetch user stats
        const statsResponse = await api.get(`/users/stats/${userId}`);
        setStats(statsResponse.data);
        
        // Fetch user submissions
        const submissionsResponse = await api.get(`/users/submissions/${userId}?limit=5`);
        setSubmissions(submissionsResponse.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-2 text-gray-500">Loading profile data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex justify-between">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Back to Home
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">User Not Found</h2>
          <p className="text-gray-700 mb-6">The requested profile could not be found.</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Format date for better display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => router.push('/leaderboard')}
                className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md hover:bg-indigo-50"
              >
                Leaderboard
              </button>
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Card */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0 h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl font-bold text-indigo-700">{profile.handle.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-xl font-bold text-gray-900">{profile.handle}</h2>
                    <p className="text-sm text-gray-500">Member since {formatDate(profile.created)}</p>
                  </div>
                </div>
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">User ID</dt>
                    <dd className="mt-1 text-sm text-gray-900">#{profile.id}</dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Player Statistics</h3>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-center justify-center mb-6">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">ELO Rating</p>
                    <p className="text-3xl font-extrabold text-indigo-600">{stats.rating}</p>
                    {stats.best_rating && (
                      <p className="text-xs text-gray-500">Best: {stats.best_rating}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded text-center">
                    <p className="text-sm font-medium text-gray-500">Win Rate</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.win_rate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded text-center">
                    <p className="text-sm font-medium text-gray-500">Total Games</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_games}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-green-50 p-3 rounded text-center">
                    <p className="text-xs font-medium text-green-700">Wins</p>
                    <p className="text-lg font-bold text-green-700">{stats.wins}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded text-center">
                    <p className="text-xs font-medium text-red-700">Losses</p>
                    <p className="text-lg font-bold text-red-700">{stats.losses}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded text-center">
                    <p className="text-xs font-medium text-gray-700">Draws</p>
                    <p className="text-lg font-bold text-gray-700">{stats.draws}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submissions Card */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="px-6 py-5">
                <dl className="grid grid-cols-1 gap-x-4 gap-y-6">
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Total Submissions</dt>
                    <dd className="mt-1 text-sm text-gray-900">{stats.total_submissions}</dd>
                  </div>
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">Valid Submissions</dt>
                    <dd className="mt-1 text-sm text-gray-900">{stats.valid_submissions} ({stats.total_submissions > 0 ? ((stats.valid_submissions / stats.total_submissions) * 100).toFixed(1) : 0}%)</dd>
                  </div>
                </dl>
                {submissions.length > 0 ? (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Recent Submissions</h4>
                    <ul className="divide-y divide-gray-200">
                      {submissions.map(submission => (
                        <li key={submission.id} className="py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {submission.game_id ? `Game #${submission.game_id}` : `Puzzle #${submission.puzzle_id}`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(submission.created)}
                              </p>
                            </div>
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${submission.verdict ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {submission.verdict ? 'Valid' : 'Invalid'}
                              </span>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-6 text-center py-4">
                    <p className="text-sm text-gray-500">No recent submissions</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 