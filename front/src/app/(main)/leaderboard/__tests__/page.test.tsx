import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LeaderboardPage from '../page';
import api from '@/lib/api';

// Mock dependencies
jest.mock('@/lib/api');

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

jest.mock('@/hooks/useResponsive', () => ({
  useBreakpoint: () => ({ isMobile: false, isTablet: false, isDesktop: true }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  ResponsiveStack: ({ children }: any) => <div>{children}</div>,
  ResponsiveCard: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ title, subtitle }: any) => (
    <div>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  ResponsiveButton: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const mockLeaderboard = {
  entries: [
    {
      rank: 1,
      user_id: 1,
      handle: 'champion',
      avatar_url: null,
      level: 10,
      experience_points: 5000,
      rating: 2000,
      puzzles_solved: 150,
      games_won: 80,
      win_rate: 75.5,
      streak_days: 30,
    },
    {
      rank: 2,
      user_id: 2,
      handle: 'challenger',
      avatar_url: 'https://example.com/avatar2.jpg',
      level: 8,
      experience_points: 4000,
      rating: 1800,
      puzzles_solved: 120,
      games_won: 60,
      win_rate: 65.0,
      streak_days: 20,
    },
    {
      rank: 3,
      user_id: 3,
      handle: 'expert',
      avatar_url: null,
      level: 6,
      experience_points: 3000,
      rating: 1600,
      puzzles_solved: 90,
      games_won: 40,
      win_rate: 55.0,
      streak_days: 15,
    },
  ],
  total_users: 100,
  page: 1,
  per_page: 50,
  sort_by: 'experience_points',
};

describe('LeaderboardPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (api.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<LeaderboardPage />);
    
    expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();
  });

  it('renders leaderboard data when loaded', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
      expect(screen.getByText('Top 100 players')).toBeInTheDocument();
      expect(screen.getByText('champion')).toBeInTheDocument();
      expect(screen.getByText('challenger')).toBeInTheDocument();
      expect(screen.getByText('expert')).toBeInTheDocument();
    });
  });

  it('displays rank badges for top 3', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('🥇')).toBeInTheDocument();
      expect(screen.getByText('🥈')).toBeInTheDocument();
      expect(screen.getByText('🥉')).toBeInTheDocument();
    });
  });

  it('renders sort buttons', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Experience')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Puzzles Solved')).toBeInTheDocument();
      expect(screen.getByText('Streak')).toBeInTheDocument();
    });
  });

  it('changes sort order when button clicked', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Rating')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Rating'));
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/leaderboard', {
        params: {
          sort_by: 'rating',
          page: 1,
          per_page: 50,
        },
      });
    });
  });

  it('displays correct values based on sort', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      // Should show experience points when sorted by XP
      expect(screen.getByText('5,000')).toBeInTheDocument();
      expect(screen.getByText('4,000')).toBeInTheDocument();
      expect(screen.getByText('3,000')).toBeInTheDocument();
    });
  });

  it('renders pagination controls', async () => {
    const multiPageData = {
      ...mockLeaderboard,
      total_users: 150,
      per_page: 50,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: multiPageData });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  it('handles pagination navigation', async () => {
    const multiPageData = {
      ...mockLeaderboard,
      total_users: 150,
      per_page: 50,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: multiPageData });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/users/leaderboard', {
        params: {
          sort_by: 'experience_points',
          page: 2,
          per_page: 50,
        },
      });
    });
  });

  it('disables pagination buttons appropriately', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      const prevButton = screen.getByText('Previous');
      const nextButton = screen.getByText('Next');
      
      expect(prevButton).toBeDisabled(); // On first page
      expect(nextButton).not.toBeDisabled(); // More pages available
    });
  });

  it('creates profile links correctly', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/profile?userId=1');
      expect(links[1]).toHaveAttribute('href', '/profile?userId=2');
      expect(links[2]).toHaveAttribute('href', '/profile?userId=3');
    });
  });

  it('displays user avatars and initials', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('C')).toBeInTheDocument(); // champion initial
      expect(screen.getByAltText('challenger')).toBeInTheDocument(); // avatar image
      expect(screen.getByText('E')).toBeInTheDocument(); // expert initial
    });
  });

  it('handles error state', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load leaderboard')).toBeInTheDocument();
    });
  });

  it('shows win rate and games won', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboard });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('75.5%')).toBeInTheDocument();
      expect(screen.getByText('80')).toBeInTheDocument();
      expect(screen.getByText('65.0%')).toBeInTheDocument();
      expect(screen.getByText('60')).toBeInTheDocument();
    });
  });

  it('resets page when changing sort', async () => {
    // Start on page 2
    const page2Data = { ...mockLeaderboard, page: 2 };
    (api.get as jest.Mock).mockResolvedValue({ data: page2Data });
    
    const { rerender } = render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzles Solved')).toBeInTheDocument();
    });

    // Change sort - should reset to page 1
    fireEvent.click(screen.getByText('Puzzles Solved'));
    
    await waitFor(() => {
      expect(api.get).toHaveBeenLastCalledWith('/users/leaderboard', {
        params: {
          sort_by: 'puzzles_solved',
          page: 1, // Reset to page 1
          per_page: 50,
        },
      });
    });
  });
});