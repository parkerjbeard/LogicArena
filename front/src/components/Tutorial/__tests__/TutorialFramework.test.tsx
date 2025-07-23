import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TutorialFramework } from '../TutorialFramework';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: ({ className }: any) => <div data-testid="x-icon" className={className} />,
  ChevronLeft: ({ className }: any) => <div data-testid="chevron-left-icon" className={className} />,
  ChevronRight: ({ className }: any) => <div data-testid="chevron-right-icon" className={className} />,
  Check: ({ className }: any) => <div data-testid="check-icon" className={className} />,
  Play: ({ className }: any) => <div data-testid="play-icon" className={className} />,
  RefreshCw: ({ className }: any) => <div data-testid="refresh-icon" className={className} />,
}));

const mockSteps = [
  {
    id: 1,
    title: 'Introduction',
    content: 'Welcome to the tutorial',
    type: 'lesson',
  },
  {
    id: 2,
    title: 'Basic Concepts',
    content: 'Learn the fundamentals',
    type: 'lesson',
  },
  {
    id: 3,
    title: 'Practice Exercise',
    content: 'Try this example',
    type: 'exercise',
    exercise: {
      premises: ['P'],
      conclusion: 'P',
      initialProof: '',
    },
  },
  {
    id: 4,
    title: 'Conclusion',
    content: 'Well done!',
    type: 'lesson',
  },
];

describe('TutorialFramework Component', () => {
  const user = userEvent.setup();
  const mockOnComplete = jest.fn();
  const mockOnExit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tutorial framework with title', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    expect(screen.getByText('Test Tutorial')).toBeInTheDocument();
  });

  it('renders exit button', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('calls onExit when exit button is clicked', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const exitButton = screen.getByTestId('x-icon').closest('button');
    await user.click(exitButton!);

    expect(mockOnExit).toHaveBeenCalled();
  });

  it('displays the first step initially', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the tutorial')).toBeInTheDocument();
  });

  it('displays progress indicator', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '25'); // 1/4 = 25%
  });

  it('navigates to next step when Next button is clicked', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    expect(screen.getByText('Basic Concepts')).toBeInTheDocument();
    expect(screen.getByText('Learn the fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
  });

  it('navigates to previous step when Previous button is clicked', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Go to step 2
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Go back to step 1
    const prevButton = screen.getByText('Previous');
    await user.click(prevButton);

    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('disables Previous button on first step', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const prevButton = screen.getByText('Previous');
    expect(prevButton).toBeDisabled();
  });

  it('shows Complete button on last step', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Navigate to last step
    const nextButton = screen.getByText('Next');
    await user.click(nextButton); // Step 2
    await user.click(nextButton); // Step 3
    await user.click(nextButton); // Step 4

    expect(screen.getByText('Complete')).toBeInTheDocument();
  });

  it('calls onComplete when Complete button is clicked', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Navigate to last step
    const nextButton = screen.getByText('Next');
    await user.click(nextButton); // Step 2
    await user.click(nextButton); // Step 3
    await user.click(nextButton); // Step 4

    const completeButton = screen.getByText('Complete');
    await user.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('renders exercise step differently', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Navigate to exercise step (step 3)
    const nextButton = screen.getByText('Next');
    await user.click(nextButton); // Step 2
    await user.click(nextButton); // Step 3

    expect(screen.getByText('Practice Exercise')).toBeInTheDocument();
    expect(screen.getByText('Try this example')).toBeInTheDocument();
  });

  it('updates progress bar correctly as steps progress', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '25'); // 1/4

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    expect(progressBar).toHaveAttribute('aria-valuenow', '50'); // 2/4
  });

  it('handles keyboard navigation', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Test ESC key to exit
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(mockOnExit).toHaveBeenCalled();
  });

  it('handles empty steps array', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={[]}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    expect(screen.getByText('Test Tutorial')).toBeInTheDocument();
    expect(screen.getByText('No steps available')).toBeInTheDocument();
  });

  it('applies correct styling to tutorial modal', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('bg-gray-900', 'rounded-2xl', 'shadow-2xl');
  });

  it('renders modal backdrop', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const backdrop = screen.getByTestId('tutorial-backdrop');
    expect(backdrop).toHaveClass('bg-black/70', 'backdrop-blur-sm');
  });

  it('maintains step state correctly', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Go forward and back
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);
    await user.click(nextButton);

    expect(screen.getByText('Practice Exercise')).toBeInTheDocument();

    const prevButton = screen.getByText('Previous');
    await user.click(prevButton);

    expect(screen.getByText('Basic Concepts')).toBeInTheDocument();
  });

  it('renders step content with proper styling', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const stepTitle = screen.getByText('Introduction');
    expect(stepTitle).toHaveClass('text-2xl', 'font-bold');

    const stepContent = screen.getByText('Welcome to the tutorial');
    expect(stepContent).toHaveClass('text-gray-200');
  });

  it('handles step navigation with arrow keys', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Right arrow to go forward
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('Basic Concepts')).toBeInTheDocument();

    // Left arrow to go back
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  it('prevents navigation beyond bounds', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Try to go before first step
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
  });

  it('renders with proper accessibility attributes', () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-labelledby');
    expect(modal).toHaveAttribute('aria-modal', 'true');

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });
});