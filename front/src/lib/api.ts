import axios from 'axios';

// Create an Axios instance with default configuration
const api = axios.create({
  baseURL: process.env.API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include authorization token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage if it exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
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

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login/email', { email, password });
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
  
  submitProof: async (puzzleId: number, proof: string) => {
    const response = await api.post('/api/puzzles/submit', {
      puzzle_id: puzzleId,
      payload: proof,
    });
    return response.data;
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

export default api; 