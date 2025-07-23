import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResponsiveNavigation from '../ResponsiveNavigation';

// Mock the hooks
jest.mock('@/hooks/useResponsive', () => ({
  useBreakpoint: () => ({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    breakpoint: 'lg',
  }),
}));

jest.mock('@/contexts/InputContext', () => ({
  useInput: () => ({
    inputMethod: 'mouse',
    deviceType: 'desktop',
    isTouchDevice: false,
    isHoverSupported: true,
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Menu: ({ className }: any) => <div data-testid="menu-icon" className={className} />,
  X: ({ className }: any) => <div data-testid="x-icon" className={className} />,
  Home: ({ className }: any) => <div data-testid="home-icon" className={className} />,
  BookOpen: ({ className }: any) => <div data-testid="book-icon" className={className} />,
  Puzzle: ({ className }: any) => <div data-testid="puzzle-icon" className={className} />,
  Trophy: ({ className }: any) => <div data-testid="trophy-icon" className={className} />,
  Sword: ({ className }: any) => <div data-testid="sword-icon" className={className} />,
  User: ({ className }: any) => <div data-testid="user-icon" className={className} />,
}));

describe('ResponsiveNavigation Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the navigation component', () => {
    render(<ResponsiveNavigation />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();
  });

  it('renders LogicArena brand link', () => {
    render(<ResponsiveNavigation />);
    
    const brandLink = screen.getByText('LogicArena').closest('a');
    expect(brandLink).toHaveAttribute('href', '/');
  });

  it('renders mobile menu button on mobile', () => {
    // Mock mobile breakpoint
    jest.mocked(require('@/hooks/useResponsive').useBreakpoint).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: 'sm',
    });

    render(<ResponsiveNavigation />);
    
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });

  it('renders desktop navigation links on desktop', () => {
    render(<ResponsiveNavigation />);
    
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('has correct link destinations', () => {
    render(<ResponsiveNavigation />);
    
    const homeLink = screen.getByText('Home').closest('a');
    const tutorialsLink = screen.getByText('Tutorials').closest('a');
    const practiceLink = screen.getByText('Practice').closest('a');
    const leaderboardLink = screen.getByText('Leaderboard').closest('a');
    
    expect(homeLink).toHaveAttribute('href', '/');
    expect(tutorialsLink).toHaveAttribute('href', '/tutorial');
    expect(practiceLink).toHaveAttribute('href', '/practice');
    expect(leaderboardLink).toHaveAttribute('href', '/leaderboard');
  });

  it('toggles mobile menu when menu button is clicked', async () => {
    // Mock mobile breakpoint
    jest.mocked(require('@/hooks/useResponsive').useBreakpoint).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: 'sm',
    });

    render(<ResponsiveNavigation />);
    
    const menuButton = screen.getByTestId('menu-icon').closest('button');
    expect(menuButton).toBeInTheDocument();
    
    await user.click(menuButton!);
    
    // Should show mobile menu
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<ResponsiveNavigation />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveClass('bg-gray-800/90', 'backdrop-blur-lg', 'border-b', 'border-gray-700');
  });

  it('renders with proper responsive layout', () => {
    render(<ResponsiveNavigation />);
    
    const container = screen.getByRole('navigation').firstChild;
    expect(container).toHaveClass('max-w-7xl', 'mx-auto', 'px-4');
  });

  it('renders icons with navigation links', () => {
    render(<ResponsiveNavigation />);
    
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    expect(screen.getByTestId('book-icon')).toBeInTheDocument();
    expect(screen.getByTestId('puzzle-icon')).toBeInTheDocument();
    expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
  });

  it('handles tablet breakpoint correctly', () => {
    // Mock tablet breakpoint
    jest.mocked(require('@/hooks/useResponsive').useBreakpoint).mockReturnValue({
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      breakpoint: 'md',
    });

    render(<ResponsiveNavigation />);
    
    // Should show desktop navigation on tablet
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
  });

  it('handles touch device correctly', () => {
    // Mock touch device
    jest.mocked(require('@/contexts/InputContext').useInput).mockReturnValue({
      inputMethod: 'touch',
      deviceType: 'mobile',
      isTouchDevice: true,
      isHoverSupported: false,
    });

    render(<ResponsiveNavigation />);
    
    // Should still render navigation
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('closes mobile menu when clicking outside', async () => {
    // Mock mobile breakpoint
    jest.mocked(require('@/hooks/useResponsive').useBreakpoint).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: 'sm',
    });

    render(<ResponsiveNavigation />);
    
    const menuButton = screen.getByTestId('menu-icon').closest('button');
    await user.click(menuButton!);
    
    // Menu should be open
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    
    // Click outside (on document body)
    fireEvent.mouseDown(document.body);
    
    // Menu should close
    expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
  });

  it('applies active state styling correctly', () => {
    // Mock usePathname to return current path
    jest.mock('next/navigation', () => ({
      usePathname: () => '/practice',
    }));

    render(<ResponsiveNavigation />);
    
    const practiceLink = screen.getByText('Practice').closest('a');
    expect(practiceLink).toHaveClass('text-blue-400');
  });

  it('renders with sticky positioning', () => {
    render(<ResponsiveNavigation />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveClass('sticky', 'top-0', 'z-50');
  });

  it('maintains accessibility features', () => {
    render(<ResponsiveNavigation />);
    
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    
    // Check that all links are keyboard accessible
    links.forEach(link => {
      expect(link).toHaveAttribute('href');
    });
  });

  it('handles keyboard navigation', async () => {
    render(<ResponsiveNavigation />);
    
    const firstLink = screen.getByText('Home').closest('a');
    expect(firstLink).toBeInTheDocument();
    
    // Focus the first link
    firstLink?.focus();
    expect(document.activeElement).toBe(firstLink);
    
    // Tab to next link
    await user.tab();
    const nextLink = screen.getByText('Tutorials').closest('a');
    expect(document.activeElement).toBe(nextLink);
  });

  it('renders brand with correct typography', () => {
    render(<ResponsiveNavigation />);
    
    const brandText = screen.getByText('LogicArena');
    expect(brandText).toHaveClass('text-xl', 'font-bold');
  });

  it('handles different screen sizes responsively', () => {
    // Test desktop
    render(<ResponsiveNavigation />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    
    // Test mobile
    jest.mocked(require('@/hooks/useResponsive').useBreakpoint).mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: 'sm',
    });
    
    render(<ResponsiveNavigation />);
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });
});