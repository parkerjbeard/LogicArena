'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { motion } from 'framer-motion';
import { 
  BeakerIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  ClockIcon,
  TrophyIcon,
  PlayIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

interface Game {
  id: number;
  player_a: number;
  player_a_handle?: string;
  player_b: number;
  player_b_handle?: string;
  rounds: number;
  winner?: number;
  winner_handle?: string;
  started: string;
  ended?: string;
  player_a_rating_change?: number;
  player_b_rating_change?: number;
  game_rounds?: Array<{
    id: number;
    round_number: number;
    puzzle_id: number;
    winner?: number;
    started: string;
    ended?: string;
  }>;
}

interface GameListResponse {
  games: Game[];
  total: number;
  skip: number;
  limit: number;
}

export default function AdminGames() {
  const { user: currentUser, isLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [playerId, setPlayerId] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [sortBy, setSortBy] = useState('started');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [viewingGame, setViewingGame] = useState<Game | null>(null);

  useEffect(() => {
    if (!isLoading && !currentUser?.is_admin) {
      router.push('/');
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (currentUser?.is_admin) {
      fetchGames();
    }
  }, [currentUser, page, playerId, status, sortBy, order]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const params: any = {
        skip: (page - 1) * limit,
        limit,
        sort_by: sortBy,
        order
      };
      
      if (playerId) params.player_id = parseInt(playerId);
      if (status) params.status = status;

      const response = await api.get<GameListResponse>('/admin/games', { params });
      setGames(response.data.games);
      setTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameDetails = async (gameId: number) => {
    try {
      const response = await api.get<Game>(`/admin/games/${gameId}`);
      setViewingGame(response.data);
    } catch (error) {
      console.error('Failed to fetch game details:', error);
      alert('Failed to load game details');
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getGameStatus = (game: Game) => {
    if (game.ended) {
      return {
        text: 'Completed',
        className: 'bg-gray-900/20 text-gray-400 border border-gray-600/30'
      };
    }
    return {
      text: 'Active',
      className: 'bg-green-900/20 text-green-400 border border-green-600/30'
    };
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
                <BeakerIcon className="h-6 w-6" />
                Game Management
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Player Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Player ID</label>
              <input
                type="number"
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                placeholder="Filter by player..."
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Games</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
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
                  <option value="started">Started</option>
                  <option value="ended">Ended</option>
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
                <p className="text-sm text-gray-400">Total Games</p>
                <p className="text-xl font-semibold text-white">{total}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Games Table */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading games...</div>
          ) : games.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No games found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Game</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Players</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Winner</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Rating Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {games.map((game) => {
                    const gameStatus = getGameStatus(game);
                    return (
                      <tr key={game.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-200">Game #{game.id}</div>
                            <div className="text-sm text-gray-500">{game.rounds} rounds</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-300">
                              <span className="font-medium">{game.player_a_handle || `User ${game.player_a}`}</span>
                              <span className="text-gray-500 mx-2">vs</span>
                              <span className="font-medium">{game.player_b_handle || `User ${game.player_b}`}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {game.player_a} vs {game.player_b}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${gameStatus.className}`}>
                            {gameStatus.text === 'Active' ? (
                              <PlayIcon className="h-3 w-3 mr-1" />
                            ) : (
                              <StopIcon className="h-3 w-3 mr-1" />
                            )}
                            {gameStatus.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-400">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {formatDuration(game.started, game.ended)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {game.winner ? (
                            <div className="flex items-center text-sm text-green-400">
                              <TrophyIcon className="h-4 w-4 mr-1" />
                              {game.winner_handle || `User ${game.winner}`}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {game.player_a_rating_change !== undefined && game.player_b_rating_change !== undefined ? (
                            <div className="text-sm">
                              <div className={`${game.player_a_rating_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {game.player_a_rating_change >= 0 ? '+' : ''}{game.player_a_rating_change}
                              </div>
                              <div className={`${game.player_b_rating_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {game.player_b_rating_change >= 0 ? '+' : ''}{game.player_b_rating_change}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => fetchGameDetails(game.id)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} games
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

      {/* Game Details Modal */}
      {viewingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg shadow-2xl p-6 max-w-4xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-lg font-semibold text-white mb-4">Game #{viewingGame.id} Details</h3>
            
            <div className="space-y-6">
              {/* Game Overview */}
              <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Game Overview</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Player A</p>
                    <p className="text-gray-300 font-medium">{viewingGame.player_a_handle || `User ${viewingGame.player_a}`}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Player B</p>
                    <p className="text-gray-300 font-medium">{viewingGame.player_b_handle || `User ${viewingGame.player_b}`}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Started</p>
                    <p className="text-gray-300">{new Date(viewingGame.started).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className={`font-medium ${viewingGame.ended ? 'text-gray-400' : 'text-green-400'}`}>
                      {viewingGame.ended ? 'Completed' : 'Active'}
                    </p>
                  </div>
                </div>
                
                {viewingGame.ended && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Ended</p>
                        <p className="text-gray-300">{new Date(viewingGame.ended).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="text-gray-300">{formatDuration(viewingGame.started, viewingGame.ended)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Winner</p>
                        <p className="text-green-400 font-medium">
                          {viewingGame.winner_handle || `User ${viewingGame.winner}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Rating Changes */}
              {(viewingGame.player_a_rating_change !== undefined && viewingGame.player_b_rating_change !== undefined) && (
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Rating Changes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{viewingGame.player_a_handle || `User ${viewingGame.player_a}`}</p>
                      <p className={`text-lg font-semibold ${viewingGame.player_a_rating_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {viewingGame.player_a_rating_change >= 0 ? '+' : ''}{viewingGame.player_a_rating_change}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{viewingGame.player_b_handle || `User ${viewingGame.player_b}`}</p>
                      <p className={`text-lg font-semibold ${viewingGame.player_b_rating_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {viewingGame.player_b_rating_change >= 0 ? '+' : ''}{viewingGame.player_b_rating_change}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rounds */}
              {viewingGame.game_rounds && viewingGame.game_rounds.length > 0 && (
                <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700/50">
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Rounds</h4>
                  <div className="space-y-3">
                    {viewingGame.game_rounds.map((round) => (
                      <div key={round.id} className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-300">Round {round.round_number}</p>
                            <p className="text-xs text-gray-500">Puzzle #{round.puzzle_id}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-400">
                              {round.ended ? 'Completed' : 'In Progress'}
                            </p>
                            {round.winner && (
                              <p className="text-sm text-green-400">Winner: User {round.winner}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingGame(null)}
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