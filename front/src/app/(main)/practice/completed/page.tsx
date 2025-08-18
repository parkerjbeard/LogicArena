'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { userAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import Link from 'next/link';

type CompletedItem = {
  puzzle_id: number;
  difficulty: number;
  gamma: string;
  phi: string;
  first_completed_at: string | null;
  best_solution_length?: number | null;
  total_attempts: number;
  successful_attempts: number;
  hints_used: number;
  average_time_seconds?: number | null;
};

export default function CompletedPracticePage() {
  const { userId, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<CompletedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [difficultyFilter, setDifficultyFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await userAPI.getPuzzleProgress(Number(userId), { limit: 100 });
        // Only keep puzzles that have been completed at least once
        const completed = (data as CompletedItem[]).filter(
          (row) => row.successful_attempts > 0 || row.first_completed_at
        );
        setItems(completed);
      } catch (e: any) {
        setError(e?.message || 'Failed to load completed practice problems');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      fetchData();
    }
  }, [userId, authLoading]);

  const filteredItems = useMemo(() => {
    if (difficultyFilter === 'all') return items;
    return items.filter((it) => it.difficulty === difficultyFilter);
  }, [items, difficultyFilter]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Completed Practice Problems</h1>
        <Link
          href="/practice"
          className="px-3 py-1.5 text-sm font-medium text-blue-100 bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
        >
          New Practice
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <label htmlFor="difficulty" className="text-sm text-gray-400">
          Difficulty
        </label>
        <select
          id="difficulty"
          className="bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-sm"
          value={difficultyFilter}
          onChange={(e) => {
            const v = e.target.value;
            setDifficultyFilter(v === 'all' ? 'all' : Number(v));
          }}
        >
          <option value="all">All</option>
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {loading || authLoading ? (
        <div className="text-gray-400">Loading…</div>
      ) : error ? (
        <div className="text-red-400">{error}</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-gray-400">No completed practice problems yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.map((row, idx) => (
            <motion.div
              key={`${row.puzzle_id}-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.02 }}
              className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Puzzle #{row.puzzle_id}</div>
                  <div className="font-mono text-sm text-gray-200 break-words">
                    {row.gamma} ⊢ {row.phi}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-gray-400 mt-2">
                    <span>Difficulty: {row.difficulty}</span>
                    {row.best_solution_length ? (
                      <span>Best: {row.best_solution_length} lines</span>
                    ) : null}
                    {row.average_time_seconds ? (
                      <span>Avg time: {Math.round(row.average_time_seconds)}s</span>
                    ) : null}
                    <span>
                      Solved: {row.successful_attempts}/{row.total_attempts}
                    </span>
                    {row.first_completed_at ? (
                      <span>
                        First completed: {new Date(row.first_completed_at).toLocaleString()}
                      </span>
                    ) : null}
                    {row.hints_used > 0 ? <span>Hints used: {row.hints_used}</span> : null}
                  </div>
                </div>
                <Link
                  href={`/practice?puzzleId=${row.puzzle_id}`}
                  className="px-3 py-1.5 text-sm font-medium text-gray-200 bg-gray-700 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Retry
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}


