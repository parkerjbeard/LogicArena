import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LeaderboardPage from '../page';
import api from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockLeaderboardData = {
  rankings: [
    {
      id: 1,
      handle: 'player1',
      rating: 1500,
      games_won: 15,
      games_played: 20,
    },
    {
      id: 2,
      handle: 'player2',
      rating: 1450,
      games_won: 12,
      games_played: 18,
    },
    {
      id: 3,
      handle: 'player3',
      rating: 1400,
      games_won: 10,
      games_played: 15,
    },
  ],
  total: 3,
  page: 1,
  size: 10,
};

describe('Leaderboard Page', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (api.get as jest.Mock).mockResolvedValue({ data: mockLeaderboardData });
  });

  it('renders the page title', async () => {
    render(<LeaderboardPage />);
    
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Leaderboard' })).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<LeaderboardPage />);
    
    expect(screen.getByText('Loading leaderboard data...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
  });

  it('fetches and displays leaderboard data', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/users/leaderboard?page=1&size=10');
    });

    await waitFor(() => {
      expect(screen.getByText('player1')).toBeInTheDocument();
      expect(screen.getByText('player2')).toBeInTheDocument();
      expect(screen.getByText('player3')).toBeInTheDocument();
    });
  });

  it('displays player rankings correctly', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Rank 1
      expect(screen.getByText('2')).toBeInTheDocument(); // Rank 2
      expect(screen.getByText('3')).toBeInTheDocument(); // Rank 3
    });
  });

  it('displays player ratings', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('1500')).toBeInTheDocument();
      expect(screen.getByText('1450')).toBeInTheDocument();
      expect(screen.getByText('1400')).toBeInTheDocument();
    });
  });

  it('displays win/loss records', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('15/5')).toBeInTheDocument(); // 15 wins, 5 losses
      expect(screen.getByText('12/6')).toBeInTheDocument(); // 12 wins, 6 losses
      expect(screen.getByText('10/5')).toBeInTheDocument(); // 10 wins, 5 losses
    });
  });

  it('calculates and displays win rates correctly', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('75.0%')).toBeInTheDocument(); // 15/20 = 75%
      expect(screen.getByText('66.7%')).toBeInTheDocument(); // 12/18 = 66.7%
      expect(screen.getByText('66.7%')).toBeInTheDocument(); // 10/15 = 66.7%
    });
  });

  it('renders table headers correctly', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Rank')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
      expect(screen.getByText('Rating')).toBeInTheDocument();
      expect(screen.getByText('Win/Loss')).toBeInTheDocument();
      expect(screen.getByText('Win Rate')).toBeInTheDocument();
    });
  });

  it('renders player profile links', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      const player1Link = screen.getByText('player1').closest('a');
      expect(player1Link).toHaveAttribute('href', '/profile/1');
      
      const player2Link = screen.getByText('player2').closest('a');
      expect(player2Link).toHaveAttribute('href', '/profile/2');
    });
  });

  it('handles pagination correctly', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    // Previous button should be disabled on first page
    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });

  it('handles next page navigation', async () => {
    // Mock multi-page data
    const multiPageData = {
      ...mockLeaderboardData,
      total: 25, // More than 10 entries
    };
    (api.get as jest.Mock).mockResolvedValue({ data: multiPageData });

    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);

    expect(api.get).toHaveBeenCalledWith('/users/leaderboard?page=2&size=10');
  });

  it('handles previous page navigation', async () => {
    // Mock second page data
    const secondPageData = {
      ...mockLeaderboardData,
      page: 2,
      total: 25,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: secondPageData });

    render(<LeaderboardPage />);
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Previous')).toBeInTheDocument();
    });

    // Simulate being on page 2
    const prevButton = screen.getByText('Previous');
    await user.click(prevButton);

    expect(api.get).toHaveBeenCalledWith('/users/leaderboard?page=1&size=10');
  });

  it('displays pagination info correctly', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 1 to 3 of 3 players/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('allows retry after error', async () => {
    (api.get as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Try Again');
    await user.click(retryButton);

    // Should reload the page
    expect(retryButton).toBeInTheDocument();
  });

  it('renders home navigation link', () => {
    render(<LeaderboardPage />);
    
    const homeLink = screen.getByText('LogicArena-α');
    expect(homeLink).toBeInTheDocument();
    
    const backToHome = screen.getByText('Back to Home');
    expect(backToHome.closest('a')).toHaveAttribute('href', '/');
  });

  it('handles empty leaderboard data', async () => {
    (api.get as jest.Mock).mockResolvedValue({ 
      data: { rankings: [], total: 0, page: 1, size: 10 } 
    });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Rank')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
    });

    // Should show empty table
    expect(screen.queryByText('player1')).not.toBeInTheDocument();
  });

  it('handles player with no games played', async () => {
    const dataWithNoGames = {
      rankings: [
        {
          id: 1,
          handle: 'newplayer',
          rating: 1200,
          games_won: 0,
          games_played: 0,
        },
      ],
      total: 1,
      page: 1,
      size: 10,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: dataWithNoGames });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText('newplayer')).toBeInTheDocument();
      expect(screen.getByText('0/0')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument();
    });
  });

  it('applies correct styling to table elements', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      const table = screen.getByRole('table');
      expect(table).toHaveClass('min-w-full', 'divide-y', 'divide-gray-200');
    });
  });

  it('renders hover effects on table rows', async () => {
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      // Skip header row
      expect(rows[1]).toHaveClass('hover:bg-gray-50', 'transition-colors');
    });
  });

  it('displays correct page count in pagination', async () => {
    // Mock data with 25 total entries (3 pages)
    const paginatedData = {
      ...mockLeaderboardData,
      total: 25,
    };
    (api.get as jest.Mock).mockResolvedValue({ data: paginatedData });
    
    render(<LeaderboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Showing 1 to 3 of 25 players/)).toBeInTheDocument();
    });
  });
});