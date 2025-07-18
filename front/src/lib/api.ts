import axios from 'axios';
import type { UserStatistics, PuzzleSubmissionHistory, PuzzleHint } from '@/types/statistics';

// Create an Axios instance with default configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include authorization token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if it exists
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('access_token') 
      : null;
    
    // Add token to headers if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${api.defaults.baseURL}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          if (refresh_token) {
            localStorage.setItem('refresh_token', refresh_token);
          }
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    // OAuth2PasswordRequestForm expects URL-encoded form data
    const params = new URLSearchParams();
    params.append('username', email);  // OAuth2PasswordRequestForm expects 'username'
    params.append('password', password);
    
    const response = await api.post('/api/auth/login', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  
  register: async (handle: string, email: string, password: string) => {
    const response = await api.post('/api/auth/register', { handle, email, password });
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
  
  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },
};

// Puzzle API
export const puzzleAPI = {
  getRandomPuzzle: async (difficulty?: number) => {
    const params = difficulty ? { difficulty } : {};
    const response = await api.get('/api/puzzles/random', { params });
    return response.data;
  },
  
  getPuzzle: async (id: number) => {
    const response = await api.get(`/api/puzzles/${id}`);
    return response.data;
  },
  
  submitProof: async (puzzleId: number, proof: string, hintsUsed: number = 0) => {
    const response = await api.post('/api/puzzles/submit', {
      puzzle_id: puzzleId,
      payload: proof,
      hints_used: hintsUsed,
    });
    return response.data;
  },
  
  getHints: async (puzzleId: number): Promise<PuzzleHint[]> => {
    try {
      const response = await api.get(`/api/puzzles/${puzzleId}/hints`);
      return response.data;
    } catch (error) {
      // Return empty array for now until backend is implemented
      return [];
    }
  },
};

// Duel API
export const duelAPI = {
  joinQueue: async (difficulty?: number) => {
    const payload = difficulty ? { difficulty } : {};
    const response = await api.post('/api/games/duel/queue', payload);
    return response.data;
  },
  
  leaveQueue: async () => {
    const response = await api.delete('/api/games/duel/queue');
    return response.data;
  },
  
  checkMatch: async () => {
    const response = await api.post('/api/games/duel/check-match');
    return response.data;
  },
  
  submitDuelProof: async (gameId: number, roundId: number, proof: string) => {
    const response = await api.post('/api/games/duel/submit', {
      game_id: gameId,
      round_id: roundId,
      payload: proof,
    });
    return response.data;
  },
  
  getGame: async (gameId: number) => {
    const response = await api.get(`/api/games/${gameId}`);
    return response.data;
  },
};

// User API
export const userAPI = {
  getProfile: async (userId: number) => {
    const response = await api.get(`/api/users/profile/${userId}`);
    return response.data;
  },
  
  getStats: async (userId: number) => {
    const response = await api.get(`/api/users/stats/${userId}`);
    return response.data;
  },
  
  getSubmissions: async (userId: number, limit = 10, offset = 0) => {
    const response = await api.get(`/api/users/submissions/${userId}`, {
      params: { limit, offset },
    });
    return response.data;
  },
  
  getPracticeStats: async (): Promise<UserStatistics> => {
    try {
      const response = await api.get('/api/users/practice-stats');
      return response.data;
    } catch (error) {
      // Return mock data for now until backend is implemented
      return {
        total_puzzles_solved: 0,
        total_puzzles_attempted: 0,
        success_rate: 0,
        average_solving_time: 0,
        puzzles_by_difficulty: {},
        current_streak: 0,
        longest_streak: 0,
        total_hints_used: 0,
        perfect_solutions: 0,
      };
    }
  },
  
  getPracticeHistory: async (limit = 20, offset = 0): Promise<PuzzleSubmissionHistory[]> => {
    try {
      const response = await api.get('/api/users/practice-history', {
        params: { limit, offset },
      });
      return response.data;
    } catch (error) {
      // Return empty array for now until backend is implemented
      return [];
    }
  },
};

// Leaderboard API
export const leaderboardAPI = {
  getLeaderboard: async (page = 1, size = 10) => {
    const response = await api.get('/api/users/leaderboard', {
      params: { page, size },
    });
    return response.data;
  },
};

// Progress API for saving drafts
export const progressAPI = {
  saveDraft: async (puzzleId: number, draft: string) => {
    try {
      const response = await api.post('/api/progress/save-draft', {
        puzzle_id: puzzleId,
        draft,
      });
      return response.data;
    } catch (error) {
      // Silent fail, localStorage is the backup
      return { success: false };
    }
  },
  
  getDraft: async (puzzleId: number) => {
    try {
      const response = await api.get(`/api/progress/draft/${puzzleId}`);
      return response.data;
    } catch (error) {
      // Return null if no draft found
      return { draft: null };
    }
  },
  
  clearDraft: async (puzzleId: number) => {
    try {
      const response = await api.delete(`/api/progress/draft/${puzzleId}`);
      return response.data;
    } catch (error) {
      // Silent fail
      return { success: false };
    }
  },
};

export default api; 