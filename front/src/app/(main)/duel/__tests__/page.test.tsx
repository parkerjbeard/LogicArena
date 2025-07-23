import React from 'react';
import { render, screen } from '@testing-library/react';
import DuelPage from '../page';

describe('Duel Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page title', () => {
    render(<DuelPage />);
    
    expect(screen.getByText('Duel Mode')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Duel Mode' })).toBeInTheDocument();
  });

  it('displays information about duel mode', () => {
    render(<DuelPage />);
    
    expect(screen.getByText(/Duel mode allows players to compete head-to-head/)).toBeInTheDocument();
    expect(screen.getByText(/real-time proof battles/)).toBeInTheDocument();
    expect(screen.getByText(/requires user accounts to track ratings/)).toBeInTheDocument();
  });

  it('explains authentication status', () => {
    render(<DuelPage />);
    
    expect(screen.getByText(/Currently, authentication has been disabled for testing/)).toBeInTheDocument();
    expect(screen.getByText(/To experience competitive duels, authentication will need to be re-enabled/)).toBeInTheDocument();
  });

  it('renders alternative action button', () => {
    render(<DuelPage />);
    
    const practiceButton = screen.getByText('Try Practice Mode Instead');
    expect(practiceButton).toBeInTheDocument();
    expect(practiceButton.closest('a')).toHaveAttribute('href', '/practice');
  });

  it('applies correct container styling', () => {
    render(<DuelPage />);
    
    const container = screen.getByText('Duel Mode').closest('div');
    expect(container).toHaveClass('container', 'mx-auto', 'px-4', 'py-16');
  });

  it('applies correct card styling', () => {
    render(<DuelPage />);
    
    const card = screen.getByText(/Duel mode allows players/).closest('div');
    expect(card).toHaveClass('bg-gray-800/30', 'backdrop-blur-sm', 'rounded-lg', 'p-8', 'border', 'border-gray-700/50');
  });

  it('centers content properly', () => {
    render(<DuelPage />);
    
    const contentWrapper = screen.getByText('Duel Mode').closest('div')?.parentElement;
    expect(contentWrapper).toHaveClass('max-w-2xl', 'mx-auto', 'text-center');
  });

  it('applies correct text styling', () => {
    render(<DuelPage />);
    
    const title = screen.getByText('Duel Mode');
    expect(title).toHaveClass('text-4xl', 'font-bold', 'mb-6');
    
    const description = screen.getByText(/Duel mode allows players/);
    expect(description).toHaveClass('text-gray-300', 'mb-6');
    
    const authInfo = screen.getByText(/Currently, authentication has been disabled/);
    expect(authInfo).toHaveClass('text-gray-400', 'mb-8');
  });

  it('applies correct button styling', () => {
    render(<DuelPage />);
    
    const button = screen.getByText('Try Practice Mode Instead');
    expect(button).toHaveClass('inline-block', 'px-6', 'py-3', 'bg-blue-600', 'text-white', 'rounded-lg', 'hover:bg-blue-700', 'transition-colors');
  });

  it('renders with proper semantic HTML structure', () => {
    render(<DuelPage />);
    
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try Practice Mode Instead' })).toBeInTheDocument();
  });

  it('has proper heading hierarchy', () => {
    render(<DuelPage />);
    
    const headings = screen.getAllByRole('heading');
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Duel Mode');
  });

  it('provides clear user guidance', () => {
    render(<DuelPage />);
    
    // Check that the page explains what duel mode is
    expect(screen.getByText(/head-to-head in real-time proof battles/)).toBeInTheDocument();
    
    // Check that it explains the current limitation
    expect(screen.getByText(/authentication has been disabled for testing/)).toBeInTheDocument();
    
    // Check that it provides an alternative
    expect(screen.getByText('Try Practice Mode Instead')).toBeInTheDocument();
  });

  it('renders as a complete page component', () => {
    const { container } = render(<DuelPage />);
    
    // Should have main container div
    expect(container.firstChild).toHaveClass('container');
    
    // Should contain all expected elements
    expect(container.firstChild).toContainElement(screen.getByText('Duel Mode'));
    expect(container.firstChild).toContainElement(screen.getByText('Try Practice Mode Instead'));
  });
});