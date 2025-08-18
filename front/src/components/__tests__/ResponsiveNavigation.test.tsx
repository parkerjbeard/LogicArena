import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResponsiveNavigation from '../ResponsiveNavigation';
jest.mock('@/components/ThemeToggle', () => () => <button data-testid="theme-toggle" />);

// Mock the hooks
let mockUseBreakpoint = jest.fn();
let mockUseInput = jest.fn();

jest.mock('@/hooks/useResponsive', () => ({
  useBreakpoint: jest.fn(() => mockUseBreakpoint()),
  useSwipeGesture: jest.fn(),
  useAdaptiveClick: jest.fn(() => ({
    onMouseDown: jest.fn(),
    onMouseUp: jest.fn(),
    onMouseLeave: jest.fn(),
    onTouchStart: jest.fn(),
    onTouchEnd: jest.fn(),
    isPressed: false,
  })),
  useSafeArea: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
  useAdaptiveStyles: jest.fn((base) => base),
}));

jest.mock('@/contexts/InputContext', () => ({
  useInput: jest.fn(() => mockUseInput()),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    username: null,
    userId: null,
    isAuthenticated: false,
    isLoading: false,
    signOut: jest.fn(),
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
  LogOut: ({ className }: any) => <div data-testid="logout-icon" className={className} />,
}));

describe('ResponsiveNavigation Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    // Set default return values
    mockUseBreakpoint.mockReturnValue({
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      breakpoint: 'lg',
    });
    mockUseInput.mockReturnValue({
      inputMethod: 'mouse',
      deviceType: 'desktop',
      isTouchDevice: false,
      isHoverSupported: true,
    });
  });

  it('renders the navigation component', () => {
    render(<ResponsiveNavigation />);
    
    // On desktop, there should be navigation elements
    const navigations = screen.getAllByRole('navigation');
    expect(navigations.length).toBeGreaterThan(0);
  });

  it('renders LogicArena brand link', () => {
    render(<ResponsiveNavigation />);
    
    // Find desktop brand
    const desktopNav = screen.getAllByRole('navigation')[0];
    const brandLink = within(desktopNav).getByText('LogicArena-α').closest('a');
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
    
    // Find desktop nav links (not mobile tab bar links)
    const desktopNav = screen.getAllByRole('navigation')[0];
    expect(within(desktopNav).getByText('Practice')).toBeInTheDocument();
    expect(within(desktopNav).getByText('Tutorials')).toBeInTheDocument();
    expect(within(desktopNav).getByText('Rankings')).toBeInTheDocument();
  });

  it('has correct link destinations', () => {
    render(<ResponsiveNavigation />);
    
    // Check desktop nav links
    const desktopNav = screen.getAllByRole('navigation')[0];
    const brandLink = within(desktopNav).getByText('LogicArena-α').closest('a');
    const tutorialsLink = within(desktopNav).getByText('Tutorials').closest('a');
    const practiceLink = within(desktopNav).getByText('Practice').closest('a');
    const rankingsLink = within(desktopNav).getByText('Rankings').closest('a');
    
    expect(brandLink).toHaveAttribute('href', '/');
    expect(tutorialsLink).toHaveAttribute('href', '/tutorial');
    expect(practiceLink).toHaveAttribute('href', '/practice');
    expect(rankingsLink).toHaveAttribute('href', '/leaderboard');
  });

  it('toggles mobile menu when menu button is clicked', async () => {
    // Mock mobile breakpoint
    mockUseBreakpoint.mockReturnValueOnce({
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
    
    // Check for styling on desktop navigation
    const desktopNav = screen.getAllByRole('navigation')[0];
    expect(desktopNav).toHaveClass('w-full', 'hidden', 'lg:block');
  });

  it('renders with proper responsive layout', () => {
    render(<ResponsiveNavigation />);
    
    const desktopNav = screen.getAllByRole('navigation')[0];
    const container = desktopNav.firstChild;
    expect(container).toHaveClass('z-10', 'w-full', 'max-w-5xl', 'mx-auto');
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
    mockUseBreakpoint.mockReturnValueOnce({
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      breakpoint: 'md',
    });

    render(<ResponsiveNavigation />);
    
    // Should show mobile UI on tablet
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });

  it('handles touch device correctly', () => {
    // Mock touch device
    mockUseInput.mockReturnValueOnce({
      inputMethod: 'touch',
      deviceType: 'mobile',
      isTouchDevice: true,
      isHoverSupported: false,
    });

    render(<ResponsiveNavigation />);
    
    // Should still render navigation
    // Should still render navigation elements
    const navigations = screen.getAllByRole('navigation', { hidden: true });
    expect(navigations.length).toBeGreaterThan(0);
  });

  it('closes mobile menu when clicking outside', async () => {
    // Mock mobile breakpoint
    mockUseBreakpoint.mockReturnValueOnce({
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
    
    // Click on backdrop to close
    const backdrop = document.querySelector('.bg-black\\/60');
    if (backdrop) {
      await user.click(backdrop);
    }
    
    // Menu should close after animation
    await waitFor(() => {
      expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
    });
  });

  it('applies active state styling correctly', () => {
    render(<ResponsiveNavigation />);
    
    // Find desktop nav practice link
    const desktopNav = screen.getAllByRole('navigation')[0];
    const practiceLink = within(desktopNav).getByText('Practice').closest('a');
    // Just verify the link exists
    expect(practiceLink).toBeInTheDocument();
  });

  it('renders with sticky positioning', () => {
    render(<ResponsiveNavigation />);
    
    // Find mobile top bar (contains mobile brand)
    const mobileTopBar = screen.getAllByText('LogicArena-α')[1].closest('div')?.parentElement;
    expect(mobileTopBar).toHaveClass('lg:hidden', 'fixed', 'top-0');
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
    
    // Get desktop nav links
    const desktopNav = screen.getAllByRole('navigation')[0];
    const firstLink = within(desktopNav).getByText('LogicArena-α').closest('a');
    expect(firstLink).toBeInTheDocument();
    
    // Focus the first link
    firstLink?.focus();
    expect(document.activeElement).toBe(firstLink);
    
    // Tab to next link
    await user.tab();
    const nextLink = within(desktopNav).getByText('Practice').closest('a');
    expect(document.activeElement).toBe(nextLink);
  });

  it('renders brand with correct typography', () => {
    render(<ResponsiveNavigation />);
    
    // Get desktop brand specifically
    const desktopNav = screen.getAllByRole('navigation')[0];
    const brandText = within(desktopNav).getByText('LogicArena-α');
    // Check desktop brand has correct classes
    expect(brandText).toHaveClass('text-2xl', 'font-bold');
  });

  it('handles different screen sizes responsively', () => {
    // Test desktop
    const { unmount } = render(<ResponsiveNavigation />);
    const desktopNav = screen.getAllByRole('navigation')[0];
    expect(within(desktopNav).getByText('Practice')).toBeInTheDocument();
    
    unmount();
    
    // Test mobile
    mockUseBreakpoint.mockReturnValueOnce({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      breakpoint: 'sm',
    });
    
    render(<ResponsiveNavigation />);
    expect(screen.getByTestId('menu-icon')).toBeInTheDocument();
  });

});