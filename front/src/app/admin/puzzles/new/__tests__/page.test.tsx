import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CreatePuzzle from '../page';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

// Mock dependencies
jest.mock('@/lib/auth/AuthContext');
jest.mock('next/navigation');
jest.mock('@/lib/api');
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockApi = api as jest.Mocked<typeof api>;

describe('CreatePuzzle', () => {
  const mockPush = jest.fn();
  const mockAdminUser = {
    id: 1,
    handle: 'admin',
    email: 'admin@test.com',
    is_admin: true,
    rating: 2000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);
    mockUseAuth.mockReturnValue({ user: mockAdminUser, isLoading: false } as any);
  });

  it('should render the create puzzle form', () => {
    render(<CreatePuzzle />);
    
    expect(screen.getByText('Create New Puzzle')).toBeInTheDocument();
    expect(screen.getByLabelText(/Premises/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Conclusion/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Difficulty/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Best Known Length/)).toBeInTheDocument();
  });

  it('should redirect non-admin users', () => {
    mockUseAuth.mockReturnValue({ 
      user: { ...mockAdminUser, is_admin: false }, 
      isLoading: false 
    } as any);
    
    render(<CreatePuzzle />);
    
    expect(mockPush).toHaveBeenCalledWith('/');
  });

  it('should test proof when test proof button is clicked', async () => {
    const mockProofTestResponse = {
      data: {
        valid: true,
        lines: 3,
        depth: 1,
        rules_used: ['PR', 'MP'],
        syntax_info: 'Carnap-compatible Fitch notation',
        optimality: {
          actual_length: 3,
          redundant_steps: [],
          optimality_score: 100,
          efficiency_ratio: 100,
        },
        suggestions: [],
      },
    };
    
    mockApi.post.mockResolvedValueOnce(mockProofTestResponse);
    
    render(<CreatePuzzle />);
    
    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText(/Enter the premises/), {
      target: { value: 'P, P -> Q' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter the conclusion/), {
      target: { value: 'Q' },
    });
    fireEvent.change(screen.getByPlaceholderText(/machine-generated proof/), {
      target: { value: 'P :PR\nP -> Q :PR\nQ :MP 1,2' },
    });
    
    // Click test proof button
    const testProofButton = screen.getByText('Test Proof');
    fireEvent.click(testProofButton);
    
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/test-proof', {
        gamma: 'P, P -> Q',
        phi: 'Q',
        proof: 'P :PR\nP -> Q :PR\nQ :MP 1,2',
        best_len: 1,
      });
    });
    
    // Check that results are displayed
    await waitFor(() => {
      expect(screen.getByText('Test Results')).toBeInTheDocument();
      expect(screen.getByText('Proof is valid')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Lines
      expect(screen.getByText('PR')).toBeInTheDocument(); // Rule
      expect(screen.getByText('MP')).toBeInTheDocument(); // Rule
    });
  });

  it('should test puzzle configuration', async () => {
    const mockPuzzleTestResponse = {
      data: {
        valid: true,
        solvable: true,
        machine_proof: 'P :PR\nP -> Q :PR\nQ :MP 1,2',
        actual_best_len: 3,
        best_len_matches: true,
        counter_model: null,
        warnings: [],
      },
    };
    
    mockApi.post.mockResolvedValueOnce(mockPuzzleTestResponse);
    window.confirm = jest.fn(() => true);
    
    render(<CreatePuzzle />);
    
    // Fill in premises and conclusion
    fireEvent.change(screen.getByPlaceholderText(/Enter the premises/), {
      target: { value: 'P, P -> Q' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter the conclusion/), {
      target: { value: 'Q' },
    });
    fireEvent.change(screen.getByLabelText(/Best Known Length/), {
      target: { value: '3' },
    });
    
    // Click test puzzle button
    const testPuzzleButton = screen.getByText('Test Puzzle');
    fireEvent.click(testPuzzleButton);
    
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/admin/test-puzzle', {
        gamma: 'P, P -> Q',
        phi: 'Q',
        difficulty: 1,
        best_len: 3,
        generate_proof: true,
      });
    });
    
    // Check that results are displayed
    await waitFor(() => {
      expect(screen.getByText('Puzzle is valid and solvable')).toBeInTheDocument();
      expect(screen.getByText(/Best length matches/)).toBeInTheDocument();
    });
    
    // Verify that confirm was called for using generated proof
    expect(window.confirm).toHaveBeenCalledWith(
      'A machine proof was generated. Would you like to use it?'
    );
  });

  it('should show warnings for invalid puzzle', async () => {
    const mockPuzzleTestResponse = {
      data: {
        valid: false,
        solvable: false,
        machine_proof: null,
        actual_best_len: null,
        best_len_matches: false,
        counter_model: { P: true, Q: false },
        warnings: ['Puzzle appears to be unsolvable - premises may not entail conclusion'],
      },
    };
    
    mockApi.post.mockResolvedValueOnce(mockPuzzleTestResponse);
    
    render(<CreatePuzzle />);
    
    // Fill in invalid puzzle
    fireEvent.change(screen.getByPlaceholderText(/Enter the premises/), {
      target: { value: 'P' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter the conclusion/), {
      target: { value: 'Q' },
    });
    
    // Click test puzzle button
    const testPuzzleButton = screen.getByText('Test Puzzle');
    fireEvent.click(testPuzzleButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid puzzle')).toBeInTheDocument();
      expect(screen.getByText(/Counter-model found/)).toBeInTheDocument();
      expect(screen.getByText('P: true')).toBeInTheDocument();
      expect(screen.getByText('Q: false')).toBeInTheDocument();
    });
  });

  it('should handle proof test errors', async () => {
    const mockErrorResponse = {
      data: {
        valid: false,
        error: 'Line 3: Invalid Modus Ponens',
        lines: 3,
        depth: 1,
      },
    };
    
    mockApi.post.mockResolvedValueOnce(mockErrorResponse);
    
    render(<CreatePuzzle />);
    
    // Fill in form with invalid proof
    fireEvent.change(screen.getByPlaceholderText(/Enter the premises/), {
      target: { value: 'P, Q -> R' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter the conclusion/), {
      target: { value: 'R' },
    });
    fireEvent.change(screen.getByPlaceholderText(/machine-generated proof/), {
      target: { value: 'P :PR\nQ -> R :PR\nR :MP 1,2' },
    });
    
    // Click test proof button
    const testProofButton = screen.getByText('Test Proof');
    fireEvent.click(testProofButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid proof')).toBeInTheDocument();
      expect(screen.getByText(/Invalid Modus Ponens/)).toBeInTheDocument();
    });
  });

  it('should close test results when X is clicked', async () => {
    const mockProofTestResponse = {
      data: {
        valid: true,
        lines: 3,
        depth: 1,
      },
    };
    
    mockApi.post.mockResolvedValueOnce(mockProofTestResponse);
    
    render(<CreatePuzzle />);
    
    // Set up and run test
    fireEvent.change(screen.getByPlaceholderText(/Enter the premises/), {
      target: { value: 'P' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter the conclusion/), {
      target: { value: 'P' },
    });
    fireEvent.change(screen.getByPlaceholderText(/machine-generated proof/), {
      target: { value: 'P :PR' },
    });
    
    fireEvent.click(screen.getByText('Test Proof'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Results')).toBeInTheDocument();
    });
    
    // Click close button
    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Test Results')).not.toBeInTheDocument();
  });

  it('should create puzzle when form is submitted', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { id: 1 } });
    
    render(<CreatePuzzle />);
    
    // Fill in form
    fireEvent.change(screen.getByPlaceholderText(/Enter the premises/), {
      target: { value: 'P, P -> Q' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter the conclusion/), {
      target: { value: 'Q' },
    });
    fireEvent.change(screen.getByLabelText(/Difficulty/), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(/Best Known Length/), {
      target: { value: '3' },
    });
    
    // Submit form
    const createButton = screen.getByText('Create Puzzle');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/admin/puzzles', {
        gamma: 'P, P -> Q',
        phi: 'Q',
        difficulty: 2,
        best_len: 3,
        machine_proof: null,
      });
      expect(mockPush).toHaveBeenCalledWith('/admin/puzzles');
    });
  });

  it('should show preview when premises or conclusion are entered', () => {
    render(<CreatePuzzle />);
    
    // Initially no preview
    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    
    // Enter premises
    fireEvent.change(screen.getByPlaceholderText(/Enter the premises/), {
      target: { value: 'P → Q, P' },
    });
    
    // Preview should appear
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('P → Q, P')).toBeInTheDocument();
    expect(screen.getByText('Difficulty: 1/10')).toBeInTheDocument();
  });
});