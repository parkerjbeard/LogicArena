import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams } from 'next/navigation';
import ProfilePage from '../page';
import api from '@/lib/api';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
}));

jest.mock('@/lib/api');

jest.mock('@/hooks/useResponsive', () => ({
  useBreakpoint: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock UI components
jest.mock('@/components/ui', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ResponsiveStack: ({ children }: any) => <div>{children}</div>,
  ResponsiveGrid: ({ children }: any) => <div>{children}</div>,
  ResponsiveCard: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ title }: any) => <h2>{title}</h2>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

const mockProfile = {
  id: 1,
  handle: 'testuser',
  email: 'test@example.com',
  created: '2024-01-01T00:00:00Z',
  last_active: '2024-01-15T00:00:00Z',
  bio: 'Test bio',
  avatar_url: null,
  experience_points: 500,
  level: 2,
  streak_days: 5,
  last_streak_date: '2024-01-15',
  rating: 1200,
  total_games: 10,
  games_won: 6,
  win_rate: 60.0,
  puzzles_solved: 25,
  unique_puzzles_solved: 20,
  total_practice_time: 3600,
  recent_puzzle_progress: [
    {
      puzzle_id: 1,
      first_completed_at: '2024-01-10T00:00:00Z',
      best_solution_length: 5,
      total_attempts: 3,
      successful_attempts: 2,
      average_time_seconds: 120,
      hints_used: 1,
      puzzle_difficulty: 3,
      puzzle_gamma: 'P, Q',
      puzzle_phi: 'P ∧ Q',
    },
  ],
  completed_tutorials: ['intro_to_logic', 'basic_rules'],
  achievements: [
    {
      achievement_id: 'first_solve',
      earned_at: '2024-01-05T00:00:00Z',
      progress: 1,
      target: 1,
      is_completed: true,
      percentage: 100,
    },
  ],
  next_level_xp: 900,
  xp_progress: 55.56,
  rank_title: 'Apprentice',
};

describe('ProfilePage', () => {
  const mockSearchParams = {
    get: jest.fn().mockReturnValue('1'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  it('renders loading state initially', () => {
    (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<ProfilePage />);
    
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('renders profile data when loaded', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('Apprentice · Level 2')).toBeInTheDocument();
      expect(screen.getByText('Test bio')).toBeInTheDocument();
      expect(screen.getByText('1200')).toBeInTheDocument(); // Rating
      expect(screen.getByText('25')).toBeInTheDocument(); // Puzzles solved
      expect(screen.getByText('5')).toBeInTheDocument(); // Streak days
    });
  });

  it('displays XP progress correctly', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('500 / 900 XP')).toBeInTheDocument();
      expect(screen.getByText('56% to Level 3')).toBeInTheDocument();
    });
  });

  it('renders recent activity section', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText(/Puzzle #1 · Difficulty 3/)).toBeInTheDocument();
      expect(screen.getByText('P, Q ⊢ P ∧ Q')).toBeInTheDocument();
      expect(screen.getByText('2/3 solved')).toBeInTheDocument();
      expect(screen.getByText('Best: 5 lines')).toBeInTheDocument();
    });
  });

  it('renders achievements section', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Achievements')).toBeInTheDocument();
      expect(screen.getByText('first_solve')).toBeInTheDocument();
      expect(screen.getByText('1/1')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });
  });

  it('handles error state', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load profile')).toBeInTheDocument();
    });
  });

  it('handles missing profile data', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: null });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Profile not found')).toBeInTheDocument();
    });
  });

  it('uses userId from search params', async () => {
    mockSearchParams.get.mockReturnValue('123');
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/profile/123');
    });
  });

  it('defaults to userId 1 when no param provided', async () => {
    mockSearchParams.get.mockReturnValue(null);
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/profile/1');
    });
  });

  it('formats time correctly', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('1h 0m')).toBeInTheDocument(); // 3600 seconds = 1 hour
      expect(screen.getByText(/Avg time: 2m/)).toBeInTheDocument(); // 120 seconds = 2 minutes
    });
  });

  it('displays avatar initial when no avatar URL', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('T')).toBeInTheDocument(); // First letter of 'testuser'
    });
  });

  it('displays stats grid with correct values', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockProfile });
    
    render(<ProfilePage />);
    
    await waitFor(() => {
      expect(screen.getByText('20')).toBeInTheDocument(); // Unique puzzles
      expect(screen.getByText('25 total solves')).toBeInTheDocument();
      expect(screen.getByText('60.0%')).toBeInTheDocument(); // Win rate
      expect(screen.getByText('6/10 games')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Completed tutorials count
    });
  });
});