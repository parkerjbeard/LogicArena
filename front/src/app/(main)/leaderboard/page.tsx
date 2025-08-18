'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { userAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { ResponsiveContainer, ResponsiveStack, ResponsiveCard, CardHeader, CardContent, ResponsiveButton } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useResponsive';

interface LeaderboardEntry {
  rank: number;
  user_id: number;
  handle: string;
  avatar_url?: string;
  level: number;
  experience_points: number;
  rating: number;
  puzzles_solved: number;
  games_won: number;
  win_rate: number;
  streak_days: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total_users: number;
  page: number;
  per_page: number;
  sort_by: string;
}

type SortBy = 'experience_points' | 'rating' | 'puzzles_solved';

const sortOptions: { value: SortBy; label: string; color: string }[] = [
  { value: 'rating', label: 'Rating', color: 'text-blue-400' },
  { value: 'experience_points', label: 'Experience', color: 'text-yellow-400' },
  { value: 'puzzles_solved', label: 'Puzzles Solved', color: 'text-green-400' },
];

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortBy>('rating');
  const [page, setPage] = useState(1);
  const { isMobile } = useBreakpoint();

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const data = await userAPI.getLeaderboard(50, (page - 1) * 50, sortBy);
      setLeaderboard(data);
    } catch (err) {
      setError('Failed to load leaderboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, sortBy]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard, sortBy, page]);

  

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400 bg-yellow-900/20 border-yellow-600/50';
    if (rank === 2) return 'text-gray-300 bg-gray-700/20 border-gray-600/50';
    if (rank === 3) return 'text-orange-400 bg-orange-900/20 border-orange-600/50';
    return '';
  };

  const getSortValue = (entry: LeaderboardEntry) => {
    switch (sortBy) {
      case 'experience_points':
        return entry.experience_points.toLocaleString();
      case 'rating':
        return entry.rating.toLocaleString();
      case 'puzzles_solved':
        return entry.puzzles_solved.toLocaleString();
      default:
        return '';
    }
  };

  if (loading && !leaderboard) {
    return (
      <ResponsiveContainer maxWidth="lg">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-400">Loading leaderboard...</div>
        </div>
      </ResponsiveContainer>
    );
  }

  if (error || !leaderboard) {
    return (
      <ResponsiveContainer maxWidth="lg">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-400">{error || 'Failed to load leaderboard'}</div>
        </div>
      </ResponsiveContainer>
    );
  }

  const totalPages = Math.ceil(leaderboard.total_users / leaderboard.per_page);

  return (
    <ResponsiveContainer maxWidth="xl">
      <div className="py-8">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Leaderboard</h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">Top {leaderboard.total_users} players</p>
          
          {/* Sort Options - Cleaner design */}
          <div className="flex justify-center">
            <div className="inline-flex surface rounded-lg p-1 border border-default">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value);
                    setPage(1);
                  }}
                  className={`px-6 py-2 rounded-md transition-all ${
                    sortBy === option.value 
                      ? 'surface border border-default' 
                      : 'text-gray-600 dark:text-gray-400 hover:opacity-90'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Leaderboard List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="max-w-5xl mx-auto"
        >
          <div className="space-y-4">
            {leaderboard.entries.map((entry, index) => {
              const isTopThree = entry.rank <= 3;
              const medal = getRankBadge(entry.rank);
              
              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <Link href={`/profile?userId=${entry.user_id}`}>
                    <div className={`
                      surface border rounded-xl p-6
                      transition-all cursor-pointer hover:opacity-95
                      ${isTopThree 
                        ? medal === '🥇' ? 'border-yellow-600/50' 
                        : medal === '🥈' ? 'border-gray-400/50' 
                        : 'border-orange-600/50'
                        : 'border-default'
                      }
                    `}>
                      <div className="flex items-center justify-between gap-4">
                        {/* Left side - Rank and User Info */}
                        <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                          {/* Rank */}
                          <div className="text-center flex-shrink-0 w-12 md:w-16">
                            {medal ? (
                              <div className="text-3xl md:text-4xl">{medal}</div>
                            ) : (
                              <div className="text-xl md:text-2xl font-bold text-gray-400">#{entry.rank}</div>
                            )}
                          </div>

                          {/* Avatar and Name */}
                          <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-lg md:text-xl font-bold text-gray-200 shadow-lg flex-shrink-0">
                              {entry.avatar_url ? (
                                <img src={entry.avatar_url} alt={entry.handle} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                entry.handle.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-lg md:text-xl font-semibold truncate">{entry.handle}</div>
                              <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400 truncate">
                                {entry.level === 7 ? 'Master' : 
                                 entry.level >= 5 ? 'Expert' : 
                                 entry.level >= 3 ? 'Advanced' : 
                                 'Novice'} · Level {entry.level}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right side - Only show the current sort metric */}
                        <div className="flex items-center flex-shrink-0">
                          <div className="text-center min-w-[80px] md:min-w-[100px]">
                            <div className={`text-xl md:text-2xl font-bold ${sortOptions.find(o => o.value === sortBy)?.color}`}>
                              {getSortValue(entry)}
                            </div>
                            <div className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                              {sortOptions.find(o => o.value === sortBy)?.label}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-12">
              <ResponsiveButton
                variant="ghost"
                size="md"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                ← Previous
              </ResponsiveButton>
              
              <span className="text-gray-300 px-4">
                Page {page} of {totalPages}
              </span>
              
              <ResponsiveButton
                variant="ghost"
                size="md"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                Next →
              </ResponsiveButton>
            </div>
          )}
        </motion.div>
      </div>
    </ResponsiveContainer>
  );
}