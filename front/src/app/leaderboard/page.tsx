'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface LeaderboardEntry {
  id: number;
  handle: string;
  rating: number;
  games_won: number;
  games_played: number;
}

interface LeaderboardResponse {
  rankings: LeaderboardEntry[];
  total: number;
  page: number;
  size: number;
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const router = useRouter();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/users/leaderboard?page=${currentPage}&size=${pageSize}`);
        setLeaderboard(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [currentPage]);

  const handleNextPage = () => {
    if (leaderboard && currentPage < Math.ceil(leaderboard.total / pageSize)) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Check if we should disable the next page button
  const isLastPage = !!leaderboard && currentPage >= Math.ceil(leaderboard.total / pageSize);

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex">
        <div className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <h1 className="text-2xl font-bold">LogicArena-α</h1>
        </div>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <Link
            href="/"
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
          >
            Home
          </Link>
        </div>
      </div>

      <div className="relative flex place-items-center mt-20 mb-6">
        <h1 className="text-4xl font-bold">Leaderboard</h1>
      </div>

      <div className="mb-10 w-full max-w-5xl px-4">
        <div className="group rounded-lg border border-transparent px-5 py-4 bg-white shadow-md overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading leaderboard data...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Player
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win/Loss
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard?.rankings.map((entry, index) => {
                    const rank = (currentPage - 1) * pageSize + index + 1;
                    const winRate = entry.games_played > 0 
                      ? ((entry.games_won / entry.games_played) * 100).toFixed(1) 
                      : '0.0';
                    
                    return (
                      <tr key={entry.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {rank}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link href={`/profile/${entry.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900">
                            {entry.handle}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-900">{entry.rating}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {entry.games_won}/{entry.games_played - entry.games_won}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                            {winRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between">
                  <button
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${
                      currentPage === 1 
                        ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'border-indigo-600 bg-white text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Previous
                  </button>
                  <div className="hidden md:flex items-center">
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(currentPage * pageSize, leaderboard?.total || 0)}
                      </span>{' '}
                      of <span className="font-medium">{leaderboard?.total}</span> players
                    </p>
                  </div>
                  <button
                    onClick={handleNextPage}
                    disabled={isLastPage}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors ${
                      isLastPage
                        ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'border-indigo-600 bg-white text-indigo-600 hover:bg-indigo-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="mt-4 mb-8">
        <Link
          href="/"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30 inline-block"
        >
          <h2 className={`text-xl font-semibold`}>
            Back to Home{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
        </Link>
      </div>
    </main>
  );
} 