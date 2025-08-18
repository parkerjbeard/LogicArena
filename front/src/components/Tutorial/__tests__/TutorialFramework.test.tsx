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
  Lightbulb: ({ className }: any) => <div data-testid="lightbulb-icon" className={className} />,
  CheckCircle: ({ className }: any) => <div data-testid="check-circle-icon" className={className} />,
  AlertCircle: ({ className }: any) => <div data-testid="alert-circle-icon" className={className} />,
}));

const mockSteps = [
  {
    id: 'intro',
    title: 'Introduction',
    description: 'Welcome to the tutorial',
    content: <div>Welcome content</div>,
  },
  {
    id: 'basic',
    title: 'Basic Concepts',
    description: 'Learn the fundamentals',
    content: <div>Basic concepts content</div>,
    hint: 'Here is a helpful hint',
  },
  {
    id: 'practice',
    title: 'Practice Exercise',
    description: 'Try this example',
    content: <div>Practice content</div>,
    validate: async () => true, // This step requires validation
  },
  {
    id: 'complete',
    title: 'Conclusion',
    description: 'Well done!',
    content: <div>Completion content</div>,
    // No validation - this is typically the last step
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

    expect(screen.getByText('Step 1 of 4: Introduction')).toBeInTheDocument();
    expect(screen.getByText('Welcome to the tutorial')).toBeInTheDocument();
    expect(screen.getByText('Welcome content')).toBeInTheDocument();
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

    expect(screen.getByText('Step 1 of 4: Introduction')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    const { container } = render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Check for progress bar div instead of role
    const progressBar = container.querySelector('.bg-blue-500');
    expect(progressBar).toBeInTheDocument();
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

    // First step should be auto-completed since it has no validation
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    expect(screen.getByText('Step 2 of 4: Basic Concepts')).toBeInTheDocument();
    expect(screen.getByText('Learn the fundamentals')).toBeInTheDocument();
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

    expect(screen.getByText('Step 1 of 4: Introduction')).toBeInTheDocument();
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
    await user.click(nextButton); // Step 3 (has validation)
    
    // Wait for step 3 to be validated
    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
    
    await user.click(screen.getByText('Next')); // Step 4

    const completeButton = screen.getByText('Complete');
    expect(completeButton).not.toBeDisabled(); // Should be enabled
    await user.click(completeButton);

    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockOnExit).toHaveBeenCalled();
  });

  it('shows hint button when available', async () => {
    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Navigate to step with hint (step 2)
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    expect(screen.getByText('Need a hint?')).toBeInTheDocument();
    
    // Click hint button
    await user.click(screen.getByText('Need a hint?'));
    
    expect(screen.getByText('Here is a helpful hint')).toBeInTheDocument();
  });

  it('displays progress dots correctly', async () => {
    const { container } = render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Check for progress dots
    const progressDots = container.querySelectorAll('.w-2.h-2.rounded-full');
    expect(progressDots).toHaveLength(4);

    // First dot should be blue (current)
    expect(progressDots[0]).toHaveClass('bg-blue-600');
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

  it('handles empty steps array gracefully', () => {
    // Should not crash with empty steps
    const { container } = render(
      <TutorialFramework
        title="Test Tutorial"
        steps={[]}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    expect(screen.getByText('Test Tutorial')).toBeInTheDocument();
  });

  it('applies correct styling to tutorial modal', () => {
    const { container } = render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Check for modal styling
    const modal = container.querySelector('.bg-gray-900.rounded-2xl.shadow-2xl');
    expect(modal).toBeInTheDocument();
  });

  it('renders modal backdrop', () => {
    const { container } = render(
      <TutorialFramework
        title="Test Tutorial"
        steps={mockSteps}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Check for backdrop styling
    const backdrop = container.querySelector('.bg-black\\/70.backdrop-blur-sm');
    expect(backdrop).toBeInTheDocument();
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

    expect(screen.getByText('Step 3 of 4: Practice Exercise')).toBeInTheDocument();

    const prevButton = screen.getByText('Previous');
    await user.click(prevButton);

    expect(screen.getByText('Step 2 of 4: Basic Concepts')).toBeInTheDocument();
  });

  it('enables Complete button on last step without validation', async () => {
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

    // Wait for validation step to complete
    await waitFor(() => {
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    await user.click(screen.getByText('Next')); // Step 4 (last step, no validation)

    // Complete button should be enabled immediately
    const completeButton = screen.getByText('Complete');
    expect(completeButton).not.toBeDisabled();
  });

  it('automatically marks steps without validation as completed', async () => {
    const stepsWithoutValidation = [
      {
        id: 'step1',
        title: 'Step 1',
        description: 'First step',
        content: <div>Content 1</div>,
      },
      {
        id: 'step2',
        title: 'Step 2',
        description: 'Second step',
        content: <div>Content 2</div>,
      },
    ];

    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={stepsWithoutValidation}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // Both steps have no validation, so Next should be enabled
    const nextButton = screen.getByText('Next');
    expect(nextButton).not.toBeDisabled();

    await user.click(nextButton);

    // On last step, Complete should be enabled
    const completeButton = screen.getByText('Complete');
    expect(completeButton).not.toBeDisabled();
  });

  it('disables Complete button only for last steps with pending validation', async () => {
    const stepsWithLastValidation = [
      {
        id: 'step1',
        title: 'Step 1',
        description: 'First step',
        content: <div>Content 1</div>,
      },
      {
        id: 'step2',
        title: 'Step 2',
        description: 'Last step with validation',
        content: <div>Content 2</div>,
        validate: async () => false, // Always fails
      },
    ];

    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={stepsWithLastValidation}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Complete button should be disabled until validation passes
    const completeButton = screen.getByText('Complete');
    expect(completeButton).toBeDisabled();
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

    // Check step title in header
    expect(screen.getByText('Step 1 of 4: Introduction')).toBeInTheDocument();

    // Check step description
    const stepDescription = screen.getByText('Welcome to the tutorial');
    expect(stepDescription).toHaveClass('text-gray-300');
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

    // Steps without validation are auto-completed, so arrow key should work
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    
    await waitFor(() => {
      expect(screen.getByText('Step 2 of 4: Basic Concepts')).toBeInTheDocument();
    });

    // Left arrow to go back
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('Step 1 of 4: Introduction')).toBeInTheDocument();
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
    expect(screen.getByText('Step 1 of 4: Introduction')).toBeInTheDocument();
  });

  it('shows validation message when step validation is called', async () => {
    const stepsWithValidation = [
      {
        id: 'validated',
        title: 'Validated Step',
        description: 'This step has validation',
        content: <button onClick={() => {}}>Validate Me</button>,
        validate: async () => true,
      },
    ];

    render(
      <TutorialFramework
        title="Test Tutorial"
        steps={stepsWithValidation}
        onComplete={mockOnComplete}
        onExit={mockOnExit}
      />
    );

    // The component should handle validation internally
    // Since our step has validation, it won't be auto-completed
    expect(screen.getByText('Complete')).toBeDisabled();
  });
});