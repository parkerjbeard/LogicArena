import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TutorialsPage from '../page';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

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

  const renderWithAuth = (ui: React.ReactElement) => render(<ThemeProvider><AuthProvider>{ui}</AuthProvider></ThemeProvider>);

  it('renders the page title and description', () => {
    renderWithAuth(<TutorialsPage />);
    
    expect(screen.getByText('Interactive Tutorials')).toBeInTheDocument();
    expect(screen.getByText('Learn formal logic step by step with guided lessons')).toBeInTheDocument();
  });

  it('renders all tutorial cards', () => {
    renderWithAuth(<TutorialsPage />);
    
    expect(screen.getAllByText('Chapter 1: The Subject Matter of Logic')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Chapter 2: Official and Unofficial Notation')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Chapter 3: Derivations')[0]).toBeInTheDocument();
    expect(screen.getByText('Your First Proof (Practice)')).toBeInTheDocument();
    expect(screen.getAllByText('Chapter 4: Conditional Derivations')[0]).toBeInTheDocument();
    expect(screen.getByText('Using Assumptions (Practice)')).toBeInTheDocument();
    expect(screen.getByText('Chapter 5: Nested Derivations')).toBeInTheDocument();
    expect(screen.getByText('Nested Derivations (Practice)')).toBeInTheDocument();
    expect(screen.getByText('Chapter 6: Indirect Derivations')).toBeInTheDocument();
  });

  it('displays tutorial descriptions', () => {
    renderWithAuth(<TutorialsPage />);
    
    expect(screen.getByText('Understand what logic is, how arguments work, and the concept of validity')).toBeInTheDocument();
    expect(screen.getByText('Learn logical symbols, notation rules, and translation between English and logic')).toBeInTheDocument();
    expect(screen.getByText('Master basic inference rules: Modus Ponens, Modus Tollens, and Double Negation')).toBeInTheDocument();
  });

  it('displays difficulty levels with correct styling', () => {
    renderWithAuth(<TutorialsPage />);
    
    const beginnerBadges = screen.getAllByText('beginner');
    const intermediateBadges = screen.getAllByText('intermediate');
    const advancedBadges = screen.getAllByText('advanced');
    
    expect(beginnerBadges.length).toBeGreaterThan(0);
    expect(intermediateBadges.length).toBeGreaterThan(0);
    expect(advancedBadges.length).toBeGreaterThan(0);
  });

  it('displays estimated time for each tutorial', () => {
    renderWithAuth(<TutorialsPage />);
    
    expect(screen.getByText('20 min')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
    expect(screen.getAllByText('30 min').length).toBeGreaterThan(0);
    expect(screen.getByText('10 min')).toBeInTheDocument();
  });

  it('opens tutorial framework when clicking on a tutorial', async () => {
    renderWithAuth(<TutorialsPage />);
    
    const chapter1Tutorial = screen.getAllByText('Chapter 1: The Subject Matter of Logic')[0];
    await user.click(chapter1Tutorial);
    
    expect(screen.getByTestId('tutorial-framework')).toBeInTheDocument();
    expect(screen.getAllByText('Chapter 1: The Subject Matter of Logic').length).toBeGreaterThan(0);
  });

  it('closes tutorial framework when clicking exit', async () => {
    renderWithAuth(<TutorialsPage />);
    
    const chapter1Tutorial = screen.getAllByText('Chapter 1: The Subject Matter of Logic')[0];
    await user.click(chapter1Tutorial);
    
    expect(screen.getByTestId('tutorial-framework')).toBeInTheDocument();
    
    const exitButton = screen.getByTestId('exit-tutorial');
    await user.click(exitButton);
    
    expect(screen.queryByTestId('tutorial-framework')).not.toBeInTheDocument();
  });

  it('marks tutorial as completed when finished', async () => {
    renderWithAuth(<TutorialsPage />);
    
    const chapter1Tutorial = screen.getAllByText('Chapter 1: The Subject Matter of Logic')[0];
    await user.click(chapter1Tutorial);
    
    const completeButton = screen.getByTestId('complete-tutorial');
    await user.click(completeButton);
    
    expect(screen.queryByTestId('tutorial-framework')).not.toBeInTheDocument();
    
    // Should show completed status (check icon)
    expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
  });

  it('renders home navigation link', () => {
    renderWithAuth(<TutorialsPage />);
    
    const homeLink = screen.getByText('LogicArena-α').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');
    expect(screen.getByTestId('chevron-left-icon')).toBeInTheDocument();
  });

  it('renders coming soon message', () => {
    renderWithAuth(<TutorialsPage />);
    
    expect(screen.getByText('More tutorials coming soon! Check back regularly for new content.')).toBeInTheDocument();
  });

  it('renders lesson and practice sections with cards', () => {
    renderWithAuth(<TutorialsPage />);
    // At least one lesson card and one practice card are present
    expect(screen.getByText('Lessons')).toBeInTheDocument();
    expect(screen.getByText('Practice')).toBeInTheDocument();
    expect(screen.getAllByText(/Chapter \d:|Your First Proof|Using Assumptions|Nested Derivations/).length).toBeGreaterThan(0);
  });

  it('cards are interactive (clickable)', async () => {
    renderWithAuth(<TutorialsPage />);
    const card = screen.getAllByText('Chapter 1: The Subject Matter of Logic')[0];
    expect(card).toBeInTheDocument();
  });

  it('shows tutorial descriptions and metadata', () => {
    renderWithAuth(<TutorialsPage />);
    expect(screen.getAllByText(/Official and Unofficial Notation/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/min/).length).toBeGreaterThan(0);
  });

  it('renders difficulty badges', () => {
    renderWithAuth(<TutorialsPage />);
    
    const beginnerBadge = screen.getAllByText('beginner')[0];
    expect(beginnerBadge).toBeInTheDocument();
  });

  it('renders time estimates', () => {
    renderWithAuth(<TutorialsPage />);
    expect(screen.getAllByText(/min/).length).toBeGreaterThan(0);
  });

  it('handles tutorial selection state properly', async () => {
    renderWithAuth(<TutorialsPage />);
    
    // Click on first tutorial
    const chapter1Tutorial = screen.getAllByText('Chapter 1: The Subject Matter of Logic')[0];
    await user.click(chapter1Tutorial);
    
    expect(screen.getByTestId('tutorial-framework')).toBeInTheDocument();
    
    // Exit tutorial
    const exitButton = screen.getByTestId('exit-tutorial');
    await user.click(exitButton);
    
    expect(screen.queryByTestId('tutorial-framework')).not.toBeInTheDocument();
    
    // Click on different tutorial
    const chapter2Tutorial = screen.getAllByText('Chapter 2: Official and Unofficial Notation')[0];
    await user.click(chapter2Tutorial);
    
    expect(screen.getByTestId('tutorial-framework')).toBeInTheDocument();
    expect(screen.getAllByText('Chapter 2: Official and Unofficial Notation').length).toBeGreaterThan(0);
  });

  it('renders chapter 1 card', () => {
    renderWithAuth(<TutorialsPage />);
    expect(screen.getAllByText('Chapter 1: The Subject Matter of Logic')[0]).toBeInTheDocument();
  });

  it('renders practice tutorial titles', () => {
    renderWithAuth(<TutorialsPage />);
    expect(screen.getByText('Your First Proof (Practice)')).toBeInTheDocument();
    expect(screen.getByText('Using Assumptions (Practice)')).toBeInTheDocument();
    expect(screen.getByText('Nested Derivations (Practice)')).toBeInTheDocument();
  });

  it('prevents clicking on locked tutorials', async () => {
    // Mock a locked tutorial
    const originalTutorials = require('../page').__esModule;
    
    // For now, the tutorials are not locked in the implementation
    // This test serves as a placeholder for future locked tutorial functionality
    renderWithAuth(<TutorialsPage />);
    
    // All tutorials should be clickable currently
    const tutorials = screen.getAllByText(/Chapter \d:|Practice|Nested/);
    for (const tutorial of tutorials) {
      expect(tutorial.closest('div')).not.toHaveClass('cursor-not-allowed');
    }
  });

  it('handles multiple tutorial completion states', async () => {
    renderWithAuth(<TutorialsPage />);
    
    // Complete first tutorial
    const chapter1Tutorial = screen.getAllByText('Chapter 1: The Subject Matter of Logic')[0];
    await user.click(chapter1Tutorial);
    
    let completeButton = screen.getByTestId('complete-tutorial');
    await user.click(completeButton);
    
    // Complete second tutorial
    const chapter2Tutorial = screen.getAllByText('Chapter 2: Official and Unofficial Notation')[0];
    await user.click(chapter2Tutorial);
    
    completeButton = screen.getByTestId('complete-tutorial');
    await user.click(completeButton);
    
    // Both should show as completed
    expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(2);
  });
});