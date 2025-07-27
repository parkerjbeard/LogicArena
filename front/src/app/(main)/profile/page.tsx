'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { userAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import { ResponsiveContainer, ResponsiveStack, ResponsiveGrid, ResponsiveCard, CardHeader, CardContent } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useResponsive';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: number;
  handle: string;
  email: string;
  created: string;
  last_active: string;
  bio?: string;
  avatar_url?: string;
  experience_points: number;
  level: number;
  streak_days: number;
  last_streak_date?: string;
  rating: number;
  total_games: number;
  games_won: number;
  win_rate: number;
  puzzles_solved: number;
  unique_puzzles_solved: number;
  total_practice_time: number;
  recent_puzzle_progress: PuzzleProgress[];
  completed_tutorials: string[];
  achievements: Achievement[];
  next_level_xp: number;
  xp_progress: number;
  rank_title: string;
}

interface PuzzleProgress {
  puzzle_id: number;
  first_completed_at?: string;
  best_solution_length?: number;
  total_attempts: number;
  successful_attempts: number;
  average_time_seconds?: number;
  hints_used: number;
  puzzle_difficulty?: number;
  puzzle_gamma?: string;
  puzzle_phi?: string;
}

interface Achievement {
  achievement_id: string;
  earned_at: string;
  progress: number;
  target: number;
  is_completed: boolean;
  percentage: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'achievements'>('overview');
  const searchParams = useSearchParams();
  const { userId: authUserId, isLoading: authLoading } = useAuth();
  const userId = searchParams.get('userId') || authUserId?.toString() || '';
  const { isMobile } = useBreakpoint();

  useEffect(() => {
    if (userId && !authLoading) {
      fetchProfile();
    }
  }, [userId, authLoading]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const profile = await userAPI.getUserProfile(parseInt(userId));
      setProfile(profile);
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  if (loading || authLoading) {
    return (
      <ResponsiveContainer maxWidth="lg">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-400">Loading profile...</div>
        </div>
      </ResponsiveContainer>
    );
  }

  if (error || !profile) {
    return (
      <ResponsiveContainer maxWidth="lg">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-400">{error || 'Profile not found'}</div>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer maxWidth="xl">
      <div className="py-8">
        {/* Profile Header - Clean and spacious */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="w-32 h-32 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-5xl font-bold text-gray-200 mb-6 shadow-xl">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.handle} className="w-full h-full rounded-full object-cover" />
              ) : (
                profile.handle.charAt(0).toUpperCase()
              )}
            </div>

            {/* User Info */}
            <h1 className="text-4xl font-bold text-white mb-2">{profile.handle}</h1>
            <p className="text-xl text-gray-300 mb-3">{profile.rank_title}</p>
            {profile.bio && (
              <p className="text-gray-400 max-w-md mb-6">{profile.bio}</p>
            )}

            {/* Level Progress - Wider and cleaner */}
            <div className="w-full max-w-2xl mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">Level {profile.level}</span>
                <span className="text-sm font-medium text-gray-300">Level {profile.level + 1}</span>
              </div>
              <div className="bg-gray-800 rounded-full h-4 overflow-hidden shadow-inner">
                <motion.div 
                  className="bg-gradient-to-r from-blue-500 to-blue-400 h-full relative"
                  initial={{ width: 0 }}
                  animate={{ width: `${profile.xp_progress}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </motion.div>
              </div>
              <div className="text-center mt-2">
                <span className="text-sm text-gray-400">{profile.experience_points} / {profile.next_level_xp} XP</span>
              </div>
            </div>

            {/* Primary Stats - Clean horizontal layout with rating emphasis */}
            <div className="mb-8">
              {/* Rating - Primary emphasis */}
              <div className="text-center mb-8">
                <div className="text-5xl font-bold text-blue-400 mb-2">{profile.rating}</div>
                <div className="text-lg text-gray-300">Rating</div>
              </div>
              
              {/* Secondary stats */}
              <div className="flex flex-wrap justify-center gap-16">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">{profile.puzzles_solved}</div>
                  <div className="text-sm text-gray-400">Puzzles Solved</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400 mb-1">{profile.streak_days}</div>
                  <div className="text-sm text-gray-400">Day Streak</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-400 mb-1">{formatTime(profile.total_practice_time)}</div>
                  <div className="text-sm text-gray-400">Practice Time</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-800/50 backdrop-blur-sm rounded-lg p-1">
            {['overview', 'activity', 'achievements'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-2 rounded-md transition-all ${
                  activeTab === tab 
                    ? 'bg-gray-700 text-white' 
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Puzzles Solved Card - Larger and more spacious */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-gray-600/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-300">Puzzles Solved</h3>
                    <span className="text-3xl">🧩</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-4xl font-bold text-green-400 mb-2">{profile.unique_puzzles_solved}</div>
                      <div className="text-sm text-gray-400">unique puzzles completed</div>
                    </div>
                    <div className="pt-4 border-t border-gray-700/50">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">Total attempts</span>
                        <span className="text-lg text-gray-300">{profile.puzzles_solved}</span>
                      </div>
                      <div className="flex justify-between items-baseline mt-2">
                        <span className="text-sm text-gray-500">Success rate</span>
                        <span className="text-lg text-gray-300">
                          {profile.puzzles_solved > 0 
                            ? `${((profile.unique_puzzles_solved / profile.puzzles_solved) * 100).toFixed(1)}%`
                            : '0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Tutorials Completed Card - Larger and more spacious */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8 hover:border-gray-600/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-300">Tutorials Completed</h3>
                    <span className="text-3xl">📚</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-4xl font-bold text-purple-400 mb-2">{profile.completed_tutorials.length}</div>
                      <div className="text-sm text-gray-400">tutorials mastered</div>
                    </div>
                    <div className="pt-4 border-t border-gray-700/50">
                      <div className="text-sm text-gray-500 mb-2">Recent completions:</div>
                      {profile.completed_tutorials.length > 0 ? (
                        <div className="space-y-1">
                          {profile.completed_tutorials.slice(-3).map((tutorial, idx) => (
                            <div key={idx} className="text-sm text-gray-400">
                              • {tutorial.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">Start with the basics!</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="max-w-4xl mx-auto">
              <ResponsiveCard variant="default" padding="lg">
                <CardHeader title="Recent Puzzle Activity" />
                <CardContent>
                  <div className="space-y-4">
                    {profile.recent_puzzle_progress.length > 0 ? (
                      profile.recent_puzzle_progress.map((progress, index) => (
                        <motion.div
                          key={progress.puzzle_id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="bg-gray-800/20 border border-gray-700/30 p-5 rounded-lg hover:bg-gray-800/30 transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="text-lg font-medium text-gray-200 mb-1">
                                Puzzle #{progress.puzzle_id}
                              </h4>
                              {progress.puzzle_gamma && (
                                <p className="text-sm text-gray-400 font-mono mb-2">
                                  {progress.puzzle_gamma} ⊢ {progress.puzzle_phi}
                                </p>
                              )}
                              <div className="flex gap-4 text-sm">
                                <span className="text-gray-500">
                                  Difficulty: <span className="text-gray-300">{progress.puzzle_difficulty}</span>
                                </span>
                                {progress.average_time_seconds && (
                                  <span className="text-gray-500">
                                    Avg time: <span className="text-gray-300">{formatTime(progress.average_time_seconds)}</span>
                                  </span>
                                )}
                                <span className="text-gray-500">
                                  Hints: <span className="text-gray-300">{progress.hints_used}</span>
                                </span>
                              </div>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-lg font-medium text-green-400">
                                {progress.successful_attempts}/{progress.total_attempts}
                              </div>
                              <div className="text-sm text-gray-500">solved</div>
                              {progress.best_solution_length && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Best: {progress.best_solution_length} lines
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 py-16">
                        <div className="text-6xl mb-4">🎯</div>
                        <p>No puzzle activity yet</p>
                        <p className="text-sm mt-2">Start solving puzzles to see your progress here!</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </ResponsiveCard>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="max-w-6xl mx-auto">
              {profile.achievements.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profile.achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.achievement_id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className={`bg-gray-800/30 backdrop-blur-sm border rounded-xl p-6 ${
                        achievement.is_completed 
                          ? 'border-yellow-600/50 bg-yellow-900/10' 
                          : 'border-gray-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-200 mb-1">
                            {achievement.achievement_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <p className="text-sm text-gray-400">
                            Progress: {achievement.progress} / {achievement.target}
                          </p>
                        </div>
                        {achievement.is_completed && (
                          <span className="text-3xl">🏆</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="bg-gray-700/50 rounded-full h-3 overflow-hidden">
                          <motion.div 
                            className={`h-full ${
                              achievement.is_completed 
                                ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' 
                                : 'bg-gradient-to-r from-blue-500 to-blue-400'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${achievement.percentage}%` }}
                            transition={{ duration: 1, delay: 0.5 + index * 0.05 }}
                          />
                        </div>
                        <div className="text-right text-sm text-gray-400">
                          {achievement.percentage}%
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-16">
                  <div className="text-6xl mb-4">🏅</div>
                  <p className="text-xl mb-2">No achievements yet</p>
                  <p className="text-sm">Keep playing to unlock achievements!</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </ResponsiveContainer>
  );
}