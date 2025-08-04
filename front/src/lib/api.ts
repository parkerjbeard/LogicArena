import axios from 'axios';
import type { UserStatistics, PuzzleSubmissionHistory, PuzzleHint } from '@/types/statistics';

// Create an Axios instance with default configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
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
  
  submitProof: async (puzzleId: number, proof: string, hintsUsed: number = 0, userId?: number | string) => {
    // Handle both numeric IDs and Supabase UUIDs
    let actualUserId = 1; // Default anonymous
    
    if (userId) {
      // If it's a UUID (Supabase), we'll need to get the numeric ID from backend
      if (typeof userId === 'string' && userId.includes('-')) {
        // This is a Supabase UUID, backend will handle mapping
        actualUserId = userId as any;
      } else {
        actualUserId = Number(userId);
      }
    }
    
    const response = await api.post(`/api/puzzles/submit`, { 
      puzzle_id: puzzleId,
      payload: proof,
      user_id: actualUserId,
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
  },

  // New methods for category-based puzzles
  getCategories: async () => {
    const response = await api.get('/api/puzzles/categories');
    return response.data;
  },

  filterPuzzles: async (params: {
    category?: string;
    chapter?: number;
    difficulty_min?: number;
    difficulty_max?: number;
    nested_depth_min?: number;
    rules_required?: string[];
  }, page: number = 1, size: number = 10) => {
    const response = await api.post('/api/puzzles/filter', params, {
      params: { page, size }
    });
    return response.data;
  },

  generatePuzzle: async (category: string, difficulty?: number) => {
    const url = difficulty 
      ? `/api/puzzles/generate/${category}?difficulty=${difficulty}` 
      : `/api/puzzles/generate/${category}`;
    const response = await api.post(url);
    return response.data;
  },

  getRandomPuzzleByCategory: async (category: string, difficulty?: number) => {
    // First filter puzzles by category
    const filterParams = {
      category,
      ...(difficulty && { difficulty_min: difficulty, difficulty_max: difficulty })
    };
    
    const filterResult = await api.post('/api/puzzles/filter', filterParams, {
      params: { page: 1, size: 100 }
    });
    
    const puzzles = filterResult.data.puzzles;
    if (puzzles.length === 0) {
      // If no puzzles exist, generate one
      return await api.post(`/api/puzzles/generate/${category}`, null, {
        params: difficulty ? { difficulty } : {}
      }).then(res => res.data);
    }
    
    // Return a random puzzle from the results
    const randomIndex = Math.floor(Math.random() * puzzles.length);
    return puzzles[randomIndex];
  }
};

// User API (simplified for public access)
export const userAPI = {
  createOrUpdateProfile: async (data: { supabase_id: string; email: string; handle: string }) => {
    const response = await api.post('/api/users/supabase-profile', data);
    return response.data;
  },
  
  getProfileBySupabaseId: async (supabaseId: string) => {
    const response = await api.get(`/api/users/supabase-profile/${supabaseId}`);
    return response.data;
  },
  getLeaderboard: async (limit = 10, offset = 0, sortBy = 'experience_points') => {
    const response = await api.get('/api/users/leaderboard', {
      params: { limit, offset, sort_by: sortBy }
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