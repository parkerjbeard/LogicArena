import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import DuelPage from '../page';
import { useAuth } from '@/lib/auth/AuthContext';
import { useDuelWebSocket } from '@/lib/websocket';
import { duelAPI, puzzleAPI } from '@/lib/api';

// Mock the dependencies
jest.mock('@/lib/auth/AuthContext');
jest.mock('@/lib/websocket');
jest.mock('@/lib/api');
jest.mock('@/components/LazyCarnapFitchEditor', () => {
  return {
    __esModule: true,
    default: ({ value, onChange, onSubmit }: any) => (
      <div data-testid="carnap-fitch-editor">
        <textarea
          data-testid="proof-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button data-testid="editor-submit" onClick={onSubmit}>
          Submit from Editor
        </button>
      </div>
    ),
  };
});
jest.mock('@/components/AuthGuard', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseDuelWebSocket = useDuelWebSocket as jest.MockedFunction<typeof useDuelWebSocket>;
const mockDuelAPI = duelAPI as jest.Mocked<typeof duelAPI>;
const mockPuzzleAPI = puzzleAPI as jest.Mocked<typeof puzzleAPI>;

describe('DuelPage', () => {
  const mockUser = { id: 1, handle: 'player1', rating: 1500 };
  const mockWebSocketReturn = {
    isConnected: true,
    connectionState: 'connected',
    messages: [],
    connectionError: null,
    sendMessage: jest.fn(),
    submitProof: jest.fn(),
    updateTime: jest.fn(),
    sendChatMessage: jest.fn(),
    surrender: jest.fn(),
    reconnect: jest.fn(),
    disconnect: jest.fn(),
    messageQueueSize: 0,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser } as any);
    mockUseDuelWebSocket.mockReturnValue(mockWebSocketReturn);
    
    // Mock API responses
    mockDuelAPI.joinQueue = jest.fn().mockResolvedValue({ position: 1, estimated_wait: 5 });
    mockDuelAPI.leaveQueue = jest.fn().mockResolvedValue(undefined);
    mockDuelAPI.checkMatch = jest.fn().mockResolvedValue(null);
    mockDuelAPI.getGame = jest.fn().mockResolvedValue({
      id: 1,
      player_a: 1,
      player_b: 2,
      player_a_handle: 'player1',
      player_b_handle: 'player2',
      rounds: 3,
      winner: null,
      started: new Date().toISOString(),
      game_rounds: [
        { id: 1, game_id: 1, puzzle_id: 101, round_number: 0, winner: null },
        { id: 2, game_id: 1, puzzle_id: 102, round_number: 1, winner: null },
        { id: 3, game_id: 1, puzzle_id: 103, round_number: 2, winner: null },
      ],
    });
    mockDuelAPI.submitDuelProof = jest.fn();
    mockPuzzleAPI.getPuzzle = jest.fn().mockResolvedValue({
      id: 101,
      gamma: 'P, P -> Q',
      phi: 'Q',
      difficulty: 1,
      best_len: 3,
      created: new Date().toISOString(),
    });
  });

  describe('Queue Management', () => {
    it('should join queue when button is clicked', async () => {
      render(<DuelPage />);
      
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.joinQueue).toHaveBeenCalledWith(undefined);
        expect(screen.getByText('Waiting for an opponent...')).toBeInTheDocument();
        expect(screen.getByText('Position in queue: 1')).toBeInTheDocument();
      });
    });

    it('should leave queue when button is clicked', async () => {
      render(<DuelPage />);
      
      // Join queue first
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Leave Queue')).toBeInTheDocument();
      });
      
      // Leave queue
      const leaveButton = screen.getByText('Leave Queue');
      fireEvent.click(leaveButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.leaveQueue).toHaveBeenCalled();
        expect(screen.getByText('Join Queue')).toBeInTheDocument();
      });
    });

    it('should check for matches periodically', async () => {
      jest.useFakeTimers();
      
      render(<DuelPage />);
      
      // Join queue
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Waiting for an opponent...')).toBeInTheDocument();
      });
      
      // Advance timers to trigger match check
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      
      await waitFor(() => {
        expect(mockDuelAPI.checkMatch).toHaveBeenCalled();
      });
      
      jest.useRealTimers();
    });
  });

  describe('WebSocket Message Handling', () => {
    it('should handle round_complete messages', async () => {
      const messages = [
        {
          type: 'round_complete',
          round_id: 1,
          round_winner: 1,
          round_number: 0,
          submission: {
            user_id: 1,
            verdict: true,
            timestamp: new Date().toISOString(),
          },
        },
      ];
      
      mockUseDuelWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        messages,
      });
      
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Verify round completion is handled
      await waitFor(() => {
        const roundElements = screen.getAllByText(/Round \d/);
        expect(roundElements).toHaveLength(3);
      });
    });

    it('should handle game_complete messages', async () => {
      const messages = [
        {
          type: 'game_complete',
          game_id: 1,
          game_winner: 1,
          player_a_rating_change: 15,
          player_b_rating_change: -15,
        },
      ];
      
      mockUseDuelWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        messages,
      });
      
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Verify game completion is handled
      await waitFor(() => {
        expect(screen.getByText('You Won the Duel!')).toBeInTheDocument();
        expect(screen.getByText('Rating change: +15')).toBeInTheDocument();
      });
    });

    it('should handle submission_failed messages', async () => {
      const messages = [
        {
          type: 'submission_failed',
          user_id: 1,
          game_id: 1,
          round_id: 1,
          error: 'Invalid proof',
        },
      ];
      
      mockUseDuelWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        messages,
      });
      
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Verify submission failure is handled
      await waitFor(() => {
        expect(screen.getByText('Proof Rejected')).toBeInTheDocument();
        expect(screen.getByText('Invalid proof')).toBeInTheDocument();
      });
    });

    it('should handle time_update messages from opponent', async () => {
      const messages = [
        {
          type: 'time_update',
          user_id: 2, // Opponent
          time_left: 150,
        },
      ];
      
      mockUseDuelWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        messages,
      });
      
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Verify opponent time is updated
      await waitFor(() => {
        expect(screen.getByText('02:30')).toBeInTheDocument(); // 150 seconds = 2:30
      });
    });
  });

  describe('Proof Submission', () => {
    it('should submit proof successfully', async () => {
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      mockDuelAPI.submitDuelProof.mockResolvedValue({
        verdict: true,
        processing_time: 100,
        round_winner: 1,
        game_winner: null,
        rating_change: null,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Enter proof and submit
      const proofInput = screen.getByTestId('proof-input');
      fireEvent.change(proofInput, { target: { value: '1. P (Premise)\n2. P -> Q (Premise)\n3. Q (MP 1,2)' } });
      
      const submitButton = screen.getByText('Submit Proof');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.submitDuelProof).toHaveBeenCalledWith(
          1, // game_id
          1, // round_id
          '1. P (Premise)\n2. P -> Q (Premise)\n3. Q (MP 1,2)'
        );
        expect(screen.getByText('Proof Accepted!')).toBeInTheDocument();
      });
    });

    it('should handle invalid proof submission', async () => {
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      mockDuelAPI.submitDuelProof.mockResolvedValue({
        verdict: false,
        error_message: 'Invalid inference',
        processing_time: 50,
        round_winner: null,
        game_winner: null,
        rating_change: null,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Enter proof and submit
      const proofInput = screen.getByTestId('proof-input');
      fireEvent.change(proofInput, { target: { value: 'Invalid proof' } });
      
      const submitButton = screen.getByText('Submit Proof');
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Proof Rejected')).toBeInTheDocument();
        expect(screen.getByText('Invalid inference')).toBeInTheDocument();
        expect(screen.getByText('Time penalty: -15 seconds')).toBeInTheDocument();
      });
    });

    it('should disable submit button when game is complete', async () => {
      const messages = [
        {
          type: 'game_complete',
          game_id: 1,
          game_winner: 2,
          player_a_rating_change: -15,
          player_b_rating_change: 15,
        },
      ];
      
      mockUseDuelWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        messages,
      });
      
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Verify submit button is disabled after game complete
      await waitFor(() => {
        const submitButton = screen.getByText('Submit Proof');
        expect(submitButton).toBeDisabled();
        expect(screen.getByText('You Lost the Duel')).toBeInTheDocument();
      });
    });
  });

  describe('Timer Management', () => {
    it('should count down timer during active round', async () => {
      jest.useFakeTimers();
      
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Initial time should be 3:00
      expect(screen.getByText('03:00')).toBeInTheDocument();
      
      // Advance timer by 10 seconds
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      
      // Time should be 2:50
      await waitFor(() => {
        expect(screen.getByText('02:50')).toBeInTheDocument();
      });
      
      // Verify time update is broadcast
      expect(mockWebSocketReturn.updateTime).toHaveBeenCalledWith(170);
      
      jest.useRealTimers();
    });

    it('should stop timer when round is complete', async () => {
      jest.useFakeTimers();
      
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      const { rerender } = render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Simulate round completion
      const messagesWithRoundComplete = [
        {
          type: 'round_complete',
          round_id: 1,
          round_winner: 2,
          round_number: 0,
        },
      ];
      
      mockUseDuelWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        messages: messagesWithRoundComplete,
      });
      
      rerender(<DuelPage />);
      
      // Advance timer
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      
      // Timer should not update after round is complete
      await waitFor(() => {
        expect(mockWebSocketReturn.updateTime).not.toHaveBeenCalledWith(175);
      });
      
      jest.useRealTimers();
    });
  });

  describe('Game Flow', () => {
    it('should move to next round after round completion', async () => {
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      const { rerender } = render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Verify first round is displayed
      expect(screen.getByText('Round 1')).toBeInTheDocument();
      expect(screen.getByText('P, P -> Q')).toBeInTheDocument();
      
      // Mock puzzle for round 2
      mockPuzzleAPI.getPuzzle.mockResolvedValue({
        id: 102,
        gamma: 'A, B',
        phi: 'A & B',
        difficulty: 2,
        best_len: 3,
        created: new Date().toISOString(),
      });
      
      // Simulate round completion
      const messagesWithRoundComplete = [
        {
          type: 'round_complete',
          round_id: 1,
          round_winner: 1,
          round_number: 0,
        },
      ];
      
      mockUseDuelWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        messages: messagesWithRoundComplete,
      });
      
      rerender(<DuelPage />);
      
      // Verify moved to round 2
      await waitFor(() => {
        expect(screen.getByText('Round 2')).toBeInTheDocument();
        expect(screen.getByText('A, B')).toBeInTheDocument();
        expect(screen.getByText('A & B')).toBeInTheDocument();
      });
    });

    it('should display game winner and rating changes', async () => {
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      // Mock game with winner
      mockDuelAPI.getGame.mockResolvedValue({
        id: 1,
        player_a: 1,
        player_b: 2,
        player_a_handle: 'player1',
        player_b_handle: 'player2',
        rounds: 3,
        winner: 1,
        started: new Date().toISOString(),
        ended: new Date().toISOString(),
        player_a_rating_change: 15,
        player_b_rating_change: -15,
        game_rounds: [
          { id: 1, game_id: 1, puzzle_id: 101, round_number: 0, winner: 1 },
          { id: 2, game_id: 1, puzzle_id: 102, round_number: 1, winner: 1 },
          { id: 3, game_id: 1, puzzle_id: 103, round_number: 2, winner: null },
        ],
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Verify game winner is displayed
      expect(screen.getByText('You Won the Duel!')).toBeInTheDocument();
      expect(screen.getByText('Rating change: +15')).toBeInTheDocument();
      
      // Verify proof editor is hidden
      expect(screen.queryByTestId('carnap-fitch-editor')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      mockDuelAPI.joinQueue.mockRejectedValue(new Error('Network error'));
      
      // Mock console.error to prevent test output pollution
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<DuelPage />);
      
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(screen.getByText('Join Queue')).toBeInTheDocument(); // Should remain on join screen
      });
      
      consoleError.mockRestore();
    });

    it('should handle WebSocket disconnection', async () => {
      mockUseDuelWebSocket.mockReturnValue({
        ...mockWebSocketReturn,
        isConnected: false,
        connectionState: 'disconnected',
        connectionError: 'Connection lost',
      });
      
      mockDuelAPI.checkMatch.mockResolvedValue({
        game_id: 1,
        opponent_id: 2,
        opponent_handle: 'player2',
        opponent_rating: 1450,
      });
      
      render(<DuelPage />);
      
      // Join queue and get matched
      const joinButton = screen.getByText('Join Queue');
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockDuelAPI.getGame).toHaveBeenCalled();
      });
      
      // Should still display game but WebSocket features won't work
      expect(screen.getByText('You vs. player2')).toBeInTheDocument();
    });
  });
});