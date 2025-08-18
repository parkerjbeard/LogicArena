import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import type { UserStatistics, PuzzleSubmissionHistory, PuzzleHint } from '@/types/statistics';
import { logger } from '@/lib/logger';

// CSRF token storage
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

// Create an Axios instance with default configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 10000,
  withCredentials: true, // Enable cookies for CSRF
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  }
});

// Function to fetch CSRF token
async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await api.get('/api/csrf/token');
    const token = response.data.csrf_token;
    csrfToken = token;
    return token;
  } catch (error) {
    console.error('Failed to fetch CSRF token:', error);
    throw error;
  }
}

// Function to ensure CSRF token is available
async function ensureCSRFToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  
  // If a fetch is already in progress, wait for it
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }
  
  // Start fetching the token
  csrfTokenPromise = fetchCSRFToken();
  try {
    const token = await csrfTokenPromise;
    return token;
  } finally {
    csrfTokenPromise = null;
  }
}

// Request interceptor to add CSRF token to state-changing requests and log
api.interceptors.request.use(
  async (config) => {
    // Log the outgoing request
    logger.debug('API Request', {
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data ? 'present' : 'none', // Don't log sensitive data
    });

    // Only add CSRF token for state-changing methods
    if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      try {
        const token = await ensureCSRFToken();
        config.headers['X-CSRF-Token'] = token;
      } catch (error) {
        logger.error('Failed to get CSRF token for request', { error });
        // Continue without CSRF token in development
        if (process.env.NODE_ENV === 'development') {
          logger.warning('Continuing without CSRF token in development mode');
        } else {
          throw error;
        }
      }
    }
    return config;
  },
  (error) => {
    logger.error('Request interceptor error', { error });
    return Promise.reject(error);
  }
);

// Response interceptor to handle CSRF token errors and log
api.interceptors.response.use(
  (response) => {
    // Log successful responses
    logger.debug('API Response', {
      status: response.status,
      url: response.config.url,
      method: response.config.method,
    });
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    
    // Log error responses
    logger.error('API Error', {
      status: error.response?.status,
      url: originalRequest?.url,
      method: originalRequest?.method,
      error: error.response?.data || error.message,
    });
    
    // If CSRF token is invalid or missing, refresh it and retry
    if (error.response?.status === 403 && 
        error.response?.data && 
        typeof error.response.data === 'object' &&
        (('error' in error.response.data &&
          ((error.response.data as any).error === 'csrf_token_invalid' || 
           (error.response.data as any).error === 'csrf_token_missing')) ||
         ('detail' in error.response.data &&
          typeof (error.response.data as any).detail === 'string' &&
          ((error.response.data as any).detail.toLowerCase().includes('csrf'))) ) &&
        !originalRequest._retry) {
      
      logger.info('CSRF token invalid or missing, refreshing...');
      originalRequest._retry = true;
      csrfToken = null; // Clear the invalid token
      csrfTokenPromise = null; // Clear any pending promise
      
      try {
        // Use refresh endpoint to get a NEW token, not the same one
        const response = await api.post('/api/csrf/refresh');
        const newToken = response.data.csrf_token;
        csrfToken = newToken;
        logger.info('CSRF token refreshed, retrying request');
        
        // Update the header with the new token
        if (originalRequest.headers) {
          originalRequest.headers['X-CSRF-Token'] = newToken;
        }
        
        return api(originalRequest);
      } catch (refreshError) {
        logger.error('Failed to refresh CSRF token', { error: refreshError });
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

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
    // Ensure we have a CSRF token (but don't force refresh)
    await ensureCSRFToken();
    
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
  
  // Fetch detailed puzzle progress rows (optionally filter by difficulty and limit)
  getPuzzleProgress: async (
    userId: number,
    params?: { difficulty?: number; limit?: number }
  ) => {
    const response = await api.get(`/api/users/puzzle-progress/${userId}`, {
      params: {
        ...(params?.difficulty !== undefined ? { difficulty: params.difficulty } : {}),
        ...(params?.limit !== undefined ? { limit: params.limit } : {})
      }
    });
    return response.data;
  },

  // Fetch raw user submissions (useful for detailed history views)
  getUserSubmissions: async (userId: number, limit: number = 20, offset: number = 0) => {
    const response = await api.get(`/api/users/submissions/${userId}`, {
      params: { limit, offset }
    });
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

// CSRF API
export const csrfAPI = {
  getToken: async () => {
    const token = await ensureCSRFToken();
    return token;
  },
  
  refreshToken: async () => {
    csrfToken = null;
    const response = await api.post('/api/csrf/refresh');
    csrfToken = response.data.csrf_token;
    return csrfToken;
  },
  
  clearToken: () => {
    csrfToken = null;
  }
};

// Export a function to initialize CSRF protection
export async function initializeCSRFProtection() {
  try {
    await ensureCSRFToken();
    console.log('CSRF protection initialized');
    
    // Refresh CSRF token periodically (every 30 minutes)
    setInterval(async () => {
      try {
        csrfToken = null; // Clear current token
        csrfTokenPromise = null;
        await ensureCSRFToken();
        console.log('CSRF token refreshed automatically');
      } catch (error) {
        console.error('Failed to refresh CSRF token automatically:', error);
      }
    }, 30 * 60 * 1000); // 30 minutes
  } catch (error) {
    console.error('Failed to initialize CSRF protection:', error);
  }
}

export default api;
export const apiClient = api;