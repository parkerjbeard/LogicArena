import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Home from '../page';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock useBreakpoint hook
jest.mock('@/hooks/useResponsive', () => ({
  useBreakpoint: jest.fn(() => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'lg',
  })),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileHover, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock components
jest.mock('@/components/ResponsiveNavigation', () => {
  return function MockResponsiveNavigation() {
    return <nav data-testid="responsive-navigation">Navigation</nav>;
  };
});

jest.mock('@/components/OptimizedLayout', () => ({
  OptimizedLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="optimized-layout">{children}</div>
  ),
}));

const mockPush = jest.fn();
(useRouter as jest.Mock).mockReturnValue({
  push: mockPush,
  pathname: '/',
});

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the main title correctly', () => {
    render(<Home />);
    expect(screen.getByText('Welcome to LogicArena')).toBeInTheDocument();
  });

  it('renders the subtitle correctly', () => {
    render(<Home />);
    expect(screen.getByText(/Master natural deduction through interactive tutorials/)).toBeInTheDocument();
  });

  it('renders all feature cards', () => {
    render(<Home />);
    
    expect(screen.getByText('📚 Interactive Tutorials')).toBeInTheDocument();
    expect(screen.getByText('🧩 Practice Mode')).toBeInTheDocument();
    expect(screen.getByText('🏆 Leaderboard')).toBeInTheDocument();
  });

  it('renders feature card descriptions', () => {
    render(<Home />);
    
    expect(screen.getByText(/Learn natural deduction step-by-step/)).toBeInTheDocument();
    expect(screen.getByText(/Solve puzzles at your own pace/)).toBeInTheDocument();
    expect(screen.getByText(/See the top players and track your progress/)).toBeInTheDocument();
  });

  it('renders the "What is Natural Deduction?" section', () => {
    render(<Home />);
    
    expect(screen.getByText('What is Natural Deduction?')).toBeInTheDocument();
    expect(screen.getByText(/Natural deduction is a formal proof system/)).toBeInTheDocument();
  });

  it('renders the "Start Practicing Now" button', () => {
    render(<Home />);
    
    const startButton = screen.getByText('Start Practicing Now');
    expect(startButton).toBeInTheDocument();
    expect(startButton.closest('a')).toHaveAttribute('href', '/practice');
  });

  it('renders navigation links correctly', () => {
    render(<Home />);
    
    const tutorialsLink = screen.getByText('📚 Interactive Tutorials').closest('a');
    const practiceLink = screen.getByText('🧩 Practice Mode').closest('a');
    const leaderboardLink = screen.getByText('🏆 Leaderboard').closest('a');
    
    expect(tutorialsLink).toHaveAttribute('href', '/tutorial');
    expect(practiceLink).toHaveAttribute('href', '/practice');
    expect(leaderboardLink).toHaveAttribute('href', '/leaderboard');
  });

  it('renders responsive navigation component', () => {
    render(<Home />);
    expect(screen.getByTestId('responsive-navigation')).toBeInTheDocument();
  });

  it('renders optimized layout wrapper', () => {
    render(<Home />);
    expect(screen.getByTestId('optimized-layout')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<Home />);
    
    const mainContent = screen.getByRole('main');
    expect(mainContent).toBeInTheDocument();
    
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(5); // Main title, 3 card titles, what is section
  });

  it('applies correct CSS classes for styling', () => {
    render(<Home />);
    
    const mainContent = screen.getByRole('main');
    expect(mainContent).toHaveClass('flex', 'min-h-screen', 'flex-col');
    
    const cards = screen.getAllByText(/📚|🧩|🏆/).map(el => el.closest('div'));
    cards.forEach(card => {
      expect(card).toHaveClass('surface', 'border', 'border-default');
    });
  });

  it('renders with proper responsive breakpoints', () => {
    render(<Home />);
    
    // The grid container should be a few levels up from the text
    const interactiveTutorialsCard = screen.getByText('📚 Interactive Tutorials');
    // Navigate: text -> h2 -> card div -> link -> motion.div -> grid
    const grid = interactiveTutorialsCard.closest('div')?.parentElement?.parentElement?.parentElement;
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('handles mobile breakpoint correctly', () => {
    // Mock mobile breakpoint
    const { useBreakpoint } = require('@/hooks/useResponsive');
    (useBreakpoint as jest.Mock).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: 'sm',
    });

    render(<Home />);
    
    // Should still render all content
    expect(screen.getByText('Welcome to LogicArena')).toBeInTheDocument();
    expect(screen.getByText('📚 Interactive Tutorials')).toBeInTheDocument();
  });

  it('renders gradient text styling correctly', () => {
    render(<Home />);
    
    const title = screen.getByText('Welcome to LogicArena');
    expect(title).toHaveClass('bg-gradient-to-r', 'from-blue-400', 'to-purple-600', 'bg-clip-text', 'text-transparent');
  });

  it('renders cards with hover effects', () => {
    render(<Home />);
    
    const tutorialCard = screen.getByText('📚 Interactive Tutorials').closest('div');
    expect(tutorialCard).toHaveClass('hover:opacity-95', 'transition-all', 'cursor-pointer');
  });
});