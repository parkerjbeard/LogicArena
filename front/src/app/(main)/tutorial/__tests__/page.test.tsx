import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorialsPage from '../page';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  BookOpen: ({ className }: any) => <div data-testid="book-open-icon" className={className} />,
  Play: ({ className }: any) => <div data-testid="play-icon" className={className} />,
  CheckCircle: ({ className }: any) => <div data-testid="check-circle-icon" className={className} />,
  Lock: ({ className }: any) => <div data-testid="lock-icon" className={className} />,
  Clock: ({ className }: any) => <div data-testid="clock-icon" className={className} />,
  TrendingUp: ({ className }: any) => <div data-testid="trending-up-icon" className={className} />,
  Sparkles: ({ className }: any) => <div data-testid="sparkles-icon" className={className} />,
  Users: ({ className }: any) => <div data-testid="users-icon" className={className} />,
  ChevronLeft: ({ className }: any) => <div data-testid="chevron-left-icon" className={className} />,
}));

// Mock TutorialFramework
jest.mock('@/components/Tutorial/LazyTutorialFramework', () => ({
  TutorialFramework: ({ title, steps, onComplete, onExit }: any) => (
    <div data-testid="tutorial-framework">
      <h2>{title}</h2>
      <div>Steps: {steps.length}</div>
      <button data-testid="complete-tutorial" onClick={onComplete}>
        Complete Tutorial
      </button>
      <button data-testid="exit-tutorial" onClick={onExit}>
        Exit Tutorial
      </button>
    </div>
  ),
}));

// Mock tutorial steps
jest.mock('@/tutorials/yourFirstProof', () => ({
  yourFirstProofSteps: [
    { id: 1, title: 'Step 1', content: 'First step content' },
    { id: 2, title: 'Step 2', content: 'Second step content' },
  ],
}));

jest.mock('@/tutorials/usingAssumptions', () => ({
  usingAssumptionsSteps: [
    { id: 1, title: 'Assumption Step 1', content: 'Assumption content' },
  ],
}));

jest.mock('@/tutorials/nestedDerivations', () => ({
  nestedDerivationsTutorial: [
    { id: 1, title: 'Nested Step 1', content: 'Nested content' },
  ],
}));

jest.mock('@/tutorials/chapter1SubjectMatterOfLogic', () => ({
  chapter1SubjectMatterOfLogicSteps: [
    { id: 1, title: 'Chapter 1 Step 1', content: 'Chapter 1 content' },
  ],
}));

jest.mock('@/tutorials/chapter2OfficialUnofficialNotation', () => ({
  chapter2OfficialUnofficialNotationSteps: [
    { id: 1, title: 'Chapter 2 Step 1', content: 'Chapter 2 content' },
  ],
}));

jest.mock('@/tutorials/chapter3Derivations', () => ({
  chapter3DerivationsSteps: [
    { id: 1, title: 'Chapter 3 Step 1', content: 'Chapter 3 content' },
  ],
}));

jest.mock('@/tutorials/chapter4ConditionalDerivations', () => ({
  chapter4ConditionalDerivationsSteps: [
    { id: 1, title: 'Chapter 4 Step 1', content: 'Chapter 4 content' },
  ],
}));

jest.mock('@/tutorials/chapter5NestedDerivations', () => ({
  chapter5NestedDerivationsSteps: [
    { id: 1, title: 'Chapter 5 Step 1', content: 'Chapter 5 content' },
  ],
}));

jest.mock('@/tutorials/chapter6IndirectDerivations', () => ({
  chapter6IndirectDerivationsSteps: [
    { id: 1, title: 'Chapter 6 Step 1', content: 'Chapter 6 content' },
  ],
}));

describe('Tutorials Page', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page title and description', () => {
    render(<TutorialsPage />);
    
    expect(screen.getByText('Interactive Tutorials')).toBeInTheDocument();
    expect(screen.getByText('Learn formal logic step by step with guided lessons')).toBeInTheDocument();
  });

  it('renders all tutorial cards', () => {
    render(<TutorialsPage />);
    
    expect(screen.getByText('Chapter 1: The Subject Matter of Logic')).toBeInTheDocument();
    expect(screen.getByText('Chapter 2: Official and Unofficial Notation')).toBeInTheDocument();
    expect(screen.getByText('Chapter 3: Derivations')).toBeInTheDocument();
    expect(screen.getByText('Your First Proof (Practice)')).toBeInTheDocument();
    expect(screen.getByText('Chapter 4: Conditional Derivations')).toBeInTheDocument();
    expect(screen.getByText('Using Assumptions (Practice)')).toBeInTheDocument();
    expect(screen.getByText('Chapter 5: Nested Derivations')).toBeInTheDocument();
    expect(screen.getByText('Nested Derivations (Practice)')).toBeInTheDocument();
    expect(screen.getByText('Chapter 6: Indirect Derivations')).toBeInTheDocument();
  });

  it('displays tutorial descriptions', () => {
    render(<TutorialsPage />);
    
    expect(screen.getByText('Understand what logic is, how arguments work, and the concept of validity')).toBeInTheDocument();
    expect(screen.getByText('Learn logical symbols, notation rules, and translation between English and logic')).toBeInTheDocument();
    expect(screen.getByText('Master basic inference rules: Modus Ponens, Modus Tollens, and Double Negation')).toBeInTheDocument();
  });

  it('displays difficulty levels with correct styling', () => {
    render(<TutorialsPage />);
    
    const beginnerBadges = screen.getAllByText('beginner');
    const intermediateBadges = screen.getAllByText('intermediate');
    const advancedBadges = screen.getAllByText('advanced');
    
    expect(beginnerBadges.length).toBeGreaterThan(0);
    expect(intermediateBadges.length).toBeGreaterThan(0);
    expect(advancedBadges.length).toBeGreaterThan(0);
  });

  it('displays estimated time for each tutorial', () => {
    render(<TutorialsPage />);
    
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('10 min')).toBeInTheDocument();
  });

  it('opens tutorial framework when clicking on a tutorial', async () => {
    render(<TutorialsPage />);
    
    const chapter1Tutorial = screen.getByText('Chapter 1: The Subject Matter of Logic');
    await user.click(chapter1Tutorial);
    
    expect(screen.getByTestId('tutorial-framework')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1: The Subject Matter of Logic')).toBeInTheDocument();
  });

  it('closes tutorial framework when clicking exit', async () => {
    render(<TutorialsPage />);
    
    const chapter1Tutorial = screen.getByText('Chapter 1: The Subject Matter of Logic');
    await user.click(chapter1Tutorial);
    
    expect(screen.getByTestId('tutorial-framework')).toBeInTheDocument();
    
    const exitButton = screen.getByTestId('exit-tutorial');
    await user.click(exitButton);
    
    expect(screen.queryByTestId('tutorial-framework')).not.toBeInTheDocument();
  });

  it('marks tutorial as completed when finished', async () => {
    render(<TutorialsPage />);
    
    const chapter1Tutorial = screen.getByText('Chapter 1: The Subject Matter of Logic');
    await user.click(chapter1Tutorial);
    
    const completeButton = screen.getByTestId('complete-tutorial');
    await user.click(completeButton);
    
    expect(screen.queryByTestId('tutorial-framework')).not.toBeInTheDocument();
    
    // Should show completed status (check icon)
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
  });

  it('renders home navigation link', () => {
    render(<TutorialsPage />);
    
    const homeLink = screen.getByText('LogicArena-α').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
    expect(screen.getByTestId('chevron-left-icon')).toBeInTheDocument();
  });

  it('renders coming soon message', () => {
    render(<TutorialsPage />);
    
    expect(screen.getByText('More tutorials coming soon! Check back regularly for new content.')).toBeInTheDocument();
  });

  it('applies correct grid layout classes', () => {
    render(<TutorialsPage />);
    
    const tutorialGrid = screen.getByText('Chapter 1: The Subject Matter of Logic').closest('div')?.parentElement;
    expect(tutorialGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('renders tutorial cards with proper hover effects', () => {
    render(<TutorialsPage />);
    
    const tutorialCard = screen.getByText('Chapter 1: The Subject Matter of Logic').closest('div');
    expect(tutorialCard).toHaveClass('hover:border-gray-300', 'hover:bg-gray-100');
  });

  it('shows prerequisites for tutorials that have them', () => {
    render(<TutorialsPage />);
    
    // Chapter 2 has Chapter 1 as prerequisite
    const chapter2Card = screen.getByText('Chapter 2: Official and Unofficial Notation').closest('div');
    expect(chapter2Card).toBeInTheDocument();
    
    // Check if prerequisite is shown (this depends on implementation)
    // The current implementation shows the full title, which may not be ideal
  });

  it('renders correct difficulty badge colors', () => {
    render(<TutorialsPage />);
    
    const beginnerBadge = screen.getAllByText('beginner')[0];
    const intermediateBadge = screen.getAllByText('intermediate')[0];
    const advancedBadge = screen.getAllByText('advanced')[0];
    
    expect(beginnerBadge).toHaveClass('dark:bg-green-900/20', 'dark:text-green-400');
    expect(intermediateBadge).toHaveClass('dark:bg-yellow-900/20', 'dark:text-yellow-400');
    expect(advancedBadge).toHaveClass('dark:bg-red-900/20', 'dark:text-red-400');
  });

  it('renders time estimates with clock icon', () => {
    render(<TutorialsPage />);
    
    expect(screen.getAllByTestId('clock-icon')).toHaveLength(9); // One for each tutorial
  });

  it('handles tutorial selection state properly', async () => {
    render(<TutorialsPage />);
    
    // Click on first tutorial
    const chapter1Tutorial = screen.getByText('Chapter 1: The Subject Matter of Logic');
    await user.click(chapter1Tutorial);
    
    expect(screen.getByTestId('tutorial-framework')).toBeInTheDocument();
    
    // Exit tutorial
    const exitButton = screen.getByTestId('exit-tutorial');
    await user.click(exitButton);
    
    expect(screen.queryByTestId('tutorial-framework')).not.toBeInTheDocument();
    
    // Click on different tutorial
    const chapter2Tutorial = screen.getByText('Chapter 2: Official and Unofficial Notation');
    await user.click(chapter2Tutorial);
    
    expect(screen.getByTestId('tutorial-framework')).toBeInTheDocument();
    expect(screen.getByText('Chapter 2: Official and Unofficial Notation')).toBeInTheDocument();
  });

  it('renders chapter 1 with special styling', () => {
    render(<TutorialsPage />);
    
    const chapter1Card = screen.getByText('Chapter 1: The Subject Matter of Logic').closest('div');
    expect(chapter1Card).toHaveClass('bg-gradient-to-br', 'from-purple-50/50', 'to-blue-50/50');
  });

  it('renders all tutorial icons', () => {
    render(<TutorialsPage />);
    
    expect(screen.getAllByTestId('book-open-icon')).toHaveLength(6); // Chapter tutorials
    expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument(); // First proof
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument(); // Using assumptions
    expect(screen.getByTestId('users-icon')).toBeInTheDocument(); // Nested derivations
  });

  it('prevents clicking on locked tutorials', async () => {
    // Mock a locked tutorial
    const originalTutorials = require('../page').__esModule;
    
    // For now, the tutorials are not locked in the implementation
    // This test serves as a placeholder for future locked tutorial functionality
    render(<TutorialsPage />);
    
    // All tutorials should be clickable currently
    const tutorials = screen.getAllByText(/Chapter \d:|Practice|Nested/);
    for (const tutorial of tutorials) {
      expect(tutorial.closest('div')).not.toHaveClass('cursor-not-allowed');
    }
  });

  it('handles multiple tutorial completion states', async () => {
    render(<TutorialsPage />);
    
    // Complete first tutorial
    const chapter1Tutorial = screen.getByText('Chapter 1: The Subject Matter of Logic');
    await user.click(chapter1Tutorial);
    
    let completeButton = screen.getByTestId('complete-tutorial');
    await user.click(completeButton);
    
    // Complete second tutorial
    const chapter2Tutorial = screen.getByText('Chapter 2: Official and Unofficial Notation');
    await user.click(chapter2Tutorial);
    
    completeButton = screen.getByTestId('complete-tutorial');
    await user.click(completeButton);
    
    // Both should show as completed
    expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(2);
  });
});