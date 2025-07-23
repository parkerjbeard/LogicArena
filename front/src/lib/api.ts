import axios from 'axios';
import type { UserStatistics, PuzzleSubmissionHistory, PuzzleHint } from '@/types/statistics';

// Create an Axios instance with default configuration
const api = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 10000,
});

// Puzzle API
export const puzzleAPI = {
  getRandomPuzzle: async (difficulty?: number) => {
    const url = difficulty ? `/api/puzzles/random?difficulty=${difficulty}` : '/api/puzzles/random';
    const response = await api.get(url);
    return response.data;
  },
  
  getPuzzle: async (puzzleId: number) => {
    const response = await api.get(`/api/puzzles/${puzzleId}`);
    return response.data;
  },
  
  submitProof: async (puzzleId: number, proof: string, hintsUsed: number = 0) => {
    const response = await api.post(`/api/puzzles/submit`, { 
      puzzle_id: puzzleId,
      payload: proof,
      hints_used: hintsUsed 
    });
    return response.data;
  },
  
  getContextualHints: async (puzzleId: number, currentProof: string) => {
    const response = await api.post(`/api/puzzles/hints`, {
      puzzle_id: puzzleId,
      current_proof: currentProof
    });
    return response.data;
  },

  getPuzzleStats: async () => {
    const response = await api.get('/api/puzzles/stats');
    return response.data;
  }
};

// User API (simplified for public access)
export const userAPI = {
  getLeaderboard: async (limit = 10, offset = 0) => {
    const response = await api.get('/api/users/leaderboard', {
      params: { limit, offset }
    });
    return response.data;
  },
  
  getUserProfile: async (userId: number) => {
    const response = await api.get(`/api/users/profile/${userId}`);
    return response.data;
  },
  
  getUserStats: async (userId: number) => {
    const response = await api.get(`/api/users/stats/${userId}`);
    return response.data;
  },
  
  // Mock methods for pages that expect these
  getPracticeStats: async (): Promise<UserStatistics> => {
    // Return mock data
    return {
      total_puzzles_solved: 0,
      total_puzzles_attempted: 0,
      success_rate: 0,
      average_solving_time: 0,
      puzzles_by_difficulty: {},
      current_streak: 0,
      longest_streak: 0,
      total_hints_used: 0,
      perfect_solutions: 0
    };
  },
  
  getPracticeHistory: async (limit: number, offset: number): Promise<PuzzleSubmissionHistory[]> => {
    // Return empty array
    return [];
  }
};

// Game API
export const gameAPI = {
  getActiveGames: async () => {
    const response = await api.get('/api/games/active/list');
    return response.data;
  },
  
  getGame: async (gameId: number) => {
    const response = await api.get(`/api/games/${gameId}`);
    return response.data;
  }
};

export default api;