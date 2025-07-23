import React from 'react';
import { render, screen } from '@testing-library/react';
import Navigation from '../Navigation';

describe('Navigation Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the navigation component', () => {
    render(<Navigation />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toBeInTheDocument();
  });

  it('renders LogicArena title', () => {
    render(<Navigation />);
    
    expect(screen.getByText('LogicArena')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Navigation />);
    
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getByText('Tutorials')).toBeInTheDocument();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('has correct link destinations', () => {
    render(<Navigation />);
    
    const practiceLink = screen.getByText('Practice').closest('a');
    const tutorialsLink = screen.getByText('Tutorials').closest('a');
    const leaderboardLink = screen.getByText('Leaderboard').closest('a');
    
    expect(practiceLink).toHaveAttribute('href', '/practice');
    expect(tutorialsLink).toHaveAttribute('href', '/tutorials');
    expect(leaderboardLink).toHaveAttribute('href', '/leaderboard');
  });

  it('applies correct styling classes', () => {
    render(<Navigation />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveClass('bg-gray-800', 'text-white', 'p-4');
  });

  it('renders as a nav element for accessibility', () => {
    render(<Navigation />);
    
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('maintains proper link structure', () => {
    render(<Navigation />);
    
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(4); // Home link + 3 navigation links
  });

  it('renders home link with LogicArena text', () => {
    render(<Navigation />);
    
    const homeLink = screen.getByText('LogicArena').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
  });

  it('applies hover effects to navigation links', () => {
    render(<Navigation />);
    
    const practiceLink = screen.getByText('Practice').closest('a');
    expect(practiceLink).toHaveClass('hover:text-blue-300');
  });

  it('renders with proper layout structure', () => {
    render(<Navigation />);
    
    const navigation = screen.getByRole('navigation');
    expect(navigation).toHaveClass('flex', 'justify-between', 'items-center');
  });
});