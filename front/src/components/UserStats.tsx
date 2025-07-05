'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, Clock, Zap, TrendingUp, Award } from 'lucide-react';
import type { UserStatistics } from '@/types/statistics';

interface UserStatsProps {
  stats: UserStatistics | null;
  loading?: boolean;
}

export const UserStats: React.FC<UserStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-32"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      icon: Trophy,
      label: 'Puzzles Solved',
      value: stats.total_puzzles_solved,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-900/20',
      borderColor: 'border-yellow-600/30',
    },
    {
      icon: Target,
      label: 'Success Rate',
      value: `${Math.round(stats.success_rate * 100)}%`,
      color: 'text-green-400',
      bgColor: 'bg-green-900/20',
      borderColor: 'border-green-600/30',
    },
    {
      icon: Clock,
      label: 'Avg. Time',
      value: formatTime(stats.average_solving_time),
      color: 'text-blue-400',
      bgColor: 'bg-blue-900/20',
      borderColor: 'border-blue-600/30',
    },
    {
      icon: Zap,
      label: 'Current Streak',
      value: `${stats.current_streak} days`,
      color: 'text-purple-400',
      bgColor: 'bg-purple-900/20',
      borderColor: 'border-purple-600/30',
    },
    {
      icon: TrendingUp,
      label: 'Longest Streak',
      value: `${stats.longest_streak} days`,
      color: 'text-orange-400',
      bgColor: 'bg-orange-900/20',
      borderColor: 'border-orange-600/30',
    },
    {
      icon: Award,
      label: 'Perfect Solutions',
      value: stats.perfect_solutions,
      color: 'text-pink-400',
      bgColor: 'bg-pink-900/20',
      borderColor: 'border-pink-600/30',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50"
    >
      <h3 className="text-lg font-semibold text-white mb-4">Your Statistics</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className={`${stat.bgColor} backdrop-blur-sm border ${stat.borderColor} rounded-lg p-4`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                  <p className={`text-lg font-semibold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Difficulty Breakdown */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Performance by Difficulty</h4>
        <div className="space-y-2">
          {Object.entries(stats.puzzles_by_difficulty)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([difficulty, data]) => {
              const successRate = Math.round(data.success_rate * 100);
              return (
                <div key={difficulty} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-12">Level {difficulty}</span>
                  <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${successRate}%` }}
                      transition={{ duration: 0.5, delay: Number(difficulty) * 0.05 }}
                      className={`h-full ${
                        successRate >= 80 ? 'bg-green-500' :
                        successRate >= 60 ? 'bg-yellow-500' :
                        successRate >= 40 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-12">{successRate}%</span>
                  <span className="text-xs text-gray-500">({data.solved}/{data.attempted})</span>
                </div>
              );
            })}
        </div>
      </div>

      {stats.last_solved_date && (
        <p className="text-xs text-gray-500 mt-4">
          Last solved: {new Date(stats.last_solved_date).toLocaleDateString()}
        </p>
      )}
    </motion.div>
  );
};

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}