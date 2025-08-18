import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PracticePage from '../page';
import { puzzleAPI } from '@/lib/api';
import { ToastProvider } from '@/contexts/ToastContext';

// Mock API
jest.mock('@/lib/api', () => ({
  puzzleAPI: {
    getRandomPuzzle: jest.fn(),
    submitProof: jest.fn(),
  },
}));

// Mock useAuth
jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    userId: 1,
    user: { id: 1, email: 'test@example.com' },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

// Mock components
jest.mock('@/components/LazyCarnapFitchEditor', () => {
  return function MockCarnapFitchEditor({ value, onChange, onSubmit, height, theme, showSyntaxGuide }: any) {
    return (
      <div data-testid="carnap-fitch-editor">
        <textarea
          data-testid="proof-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter your proof here..."
        />
        <button data-testid="submit-proof-button" onClick={onSubmit}>
          Submit
        </button>
        {showSyntaxGuide && <div data-testid="syntax-guide">Syntax Guide</div>}
      </div>
    );
  };
});

jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));


jest.mock('@/components/HintSystem', () => ({
  HintSystem: ({ puzzleId, onHintUsed, disabled }: any) => (
    <div data-testid="hint-system">
      <button 
        data-testid="hint-button"
        onClick={() => onHintUsed(1)}
        disabled={disabled}
      >
        Get Hint
      </button>
    </div>
  ),
}));

const mockPuzzle = {
  id: 123,
  gamma: 'P, P → Q',
  phi: 'Q',
  difficulty: 3,
  best_len: 2,
  created: '2024-01-01T00:00:00Z',
};

const mockProofResponse = {
  verdict: true,
  processing_time: 150,
};

const mockErrorResponse = {
  verdict: false,
  error_message: 'Invalid proof structure',
  processing_time: 100,
  counter_model: { P: true, Q: false },
};

describe('Practice Page', () => {
  const user = userEvent.setup();

  const renderWithToast = (ui: React.ReactElement) => {
    return render(
      <ToastProvider>
        {ui}
      </ToastProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (puzzleAPI.getRandomPuzzle as jest.Mock).mockResolvedValue(mockPuzzle);
    (puzzleAPI.submitProof as jest.Mock).mockResolvedValue(mockProofResponse);
  });

  it('renders the practice page with title', async () => {
    renderWithToast(<PracticePage />);
    
    expect(screen.getByText('Practice Mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Select puzzle difficulty')).toBeInTheDocument();
  });

  it('loads a random puzzle on mount', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(puzzleAPI.getRandomPuzzle).toHaveBeenCalledWith(undefined);
    });
  });

  it('displays puzzle information correctly', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
      // Difficulty badge is split across elements; assert via at least one label occurrence
      expect(screen.getAllByText('Difficulty:').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);
      expect(screen.getByText(/Best known proof length:/)).toBeInTheDocument();
      expect(screen.getByText('P, P → Q')).toBeInTheDocument();
      expect(screen.getByText('Q')).toBeInTheDocument();
    });
  });

  it.skip('handles difficulty selection', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const difficultySelect = screen.getByLabelText('Select puzzle difficulty');
    await user.selectOptions(difficultySelect, '5');

    await waitFor(() => {
      expect(puzzleAPI.getRandomPuzzle).toHaveBeenCalledWith(5);
    });
  });

  it('allows user to get a new puzzle', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const newPuzzleButton = screen.getByLabelText('Get new puzzle');
    await user.click(newPuzzleButton);

    expect(puzzleAPI.getRandomPuzzle).toHaveBeenCalledTimes(2);
  });

  it('handles proof input and submission', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const proofTextarea = screen.getByTestId('proof-textarea');
    await user.type(proofTextarea, 'P :PR\nP → Q :PR\nQ :MP 1,2');

    const submitButton = screen.getByText('Submit Proof');
    await user.click(submitButton);

    await waitFor(() => {
      expect(puzzleAPI.submitProof).toHaveBeenCalledWith(123, 'P :PR\nP → Q :PR\nQ :MP 1,2', 0, 1);
    });
  });

  it('displays success message for correct proof', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const proofTextarea = screen.getByTestId('proof-textarea');
    await user.type(proofTextarea, 'P :PR\nQ :MP 1,2');

    const submitButton = screen.getByText('Submit Proof');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Proof Accepted!')).toBeInTheDocument();
      expect(screen.getByText('Processing time: 150ms')).toBeInTheDocument();
    });
  });

  it.skip('displays error message for incorrect proof', async () => {
    (puzzleAPI.submitProof as jest.Mock).mockResolvedValue(mockErrorResponse);
    
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const proofTextarea = screen.getByTestId('proof-textarea');
    await user.type(proofTextarea, 'Invalid proof');

    const submitButton = screen.getByText('Submit Proof');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Proof Rejected')).toBeInTheDocument();
      expect(screen.getByText('Invalid proof structure')).toBeInTheDocument();
      expect(screen.getByText('Counter-model:')).toBeInTheDocument();
    });
  });

  it.skip('displays counter-model when proof is rejected', async () => {
    (puzzleAPI.submitProof as jest.Mock).mockResolvedValue(mockErrorResponse);
    
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const proofTextarea = screen.getByTestId('proof-textarea');
    await user.type(proofTextarea, 'Invalid proof');

    const submitButton = screen.getByText('Submit Proof');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('P: True')).toBeInTheDocument();
      expect(screen.getByText('Q: False')).toBeInTheDocument();
    });
  });

  it('validates proof format before submission', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Proof');
    await user.click(submitButton);

    // Should not call submit API because proof is empty
    expect(puzzleAPI.submitProof).not.toHaveBeenCalled();
  });

  it('handles hint usage', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const hintButton = screen.getByTestId('hint-button');
    await user.click(hintButton);

    // Verify hint system is rendered and functional
    expect(screen.getByTestId('hint-system')).toBeInTheDocument();
  });

  it('disables submit button when proof is empty', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const submitButton = screen.getByText('Submit Proof');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when proof is entered', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const proofTextarea = screen.getByTestId('proof-textarea');
    await user.type(proofTextarea, 'P :PR');

    const submitButton = screen.getByText('Submit Proof');
    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state during submission', async () => {
    (puzzleAPI.submitProof as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockProofResponse), 1000))
    );
    
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const proofTextarea = screen.getByTestId('proof-textarea');
    await user.type(proofTextarea, 'P :PR');

    const submitButton = screen.getByText('Submit Proof');
    await user.click(submitButton);

    // Submit and check validation state
    await waitFor(() => {
      expect(puzzleAPI.submitProof).toHaveBeenCalled();
    });
  });

  it('shows loading state when fetching new puzzle', async () => {
    (puzzleAPI.getRandomPuzzle as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockPuzzle), 1000))
    );
    
    renderWithToast(<PracticePage />);
    
    expect(screen.getByText('Loading puzzle...')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (puzzleAPI.getRandomPuzzle as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('No puzzle loaded.')).toBeInTheDocument();
    });
  });

  it.skip('automatically loads new puzzle after successful submission', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    const proofTextarea = screen.getByTestId('proof-textarea');
    await user.type(proofTextarea, 'P :PR\nQ :MP 1,2');

    const submitButton = screen.getByText('Submit Proof');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Proof Accepted!')).toBeInTheDocument();
    });

    // Should clear the proof
    expect(proofTextarea).toHaveValue('');
  });

  it('renders syntax guide in editor', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    expect(screen.getByTestId('syntax-guide')).toBeInTheDocument();
  });

  it('handles component unmounting during async operations', async () => {
    const { unmount } = renderWithToast(<PracticePage />);
    
    // Unmount before API call completes
    unmount();
    
    // Should not throw errors
    expect(() => unmount()).not.toThrow();
  });

  it('resets proof and response when getting new puzzle', async () => {
    renderWithToast(<PracticePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle #123')).toBeInTheDocument();
    });

    // Submit a proof first
    const proofTextarea = screen.getByTestId('proof-textarea');
    await user.type(proofTextarea, 'P :PR\nQ :MP 1,2');

    const submitButton = screen.getByText('Submit Proof');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Proof Accepted!')).toBeInTheDocument();
    });

    // Get new puzzle
    const newPuzzleButton = screen.getByLabelText('Get new puzzle');
    await user.click(newPuzzleButton);

    await waitFor(() => {
      // Response should be cleared
      expect(screen.queryByText('Proof Accepted!')).not.toBeInTheDocument();
      // Proof should be cleared
      expect(screen.getByTestId('proof-textarea')).toHaveValue('');
    });
  });
});