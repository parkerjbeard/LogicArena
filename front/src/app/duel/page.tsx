'use client';

import { useState, useEffect, useCallback } from 'react';
import { duelAPI, puzzleAPI } from '@/lib/api';
import { useDuelWebSocket } from '@/lib/websocket';
import CarnapFitchEditor from '@/components/LazyCarnapFitchEditor';
import { useAuth } from '@/lib/auth/AuthContext';
import AuthGuard from '@/components/AuthGuard';

// Game type
type Game = {
  id: number;
  player_a: number;
  player_b: number;
  player_a_handle: string;
  player_b_handle: string;
  rounds: number;
  winner?: number;
  started: string;
  ended?: string;
  player_a_rating_change?: number;
  player_b_rating_change?: number;
  game_rounds: Round[];
};

// Round type
type Round = {
  id: number;
  game_id: number;
  puzzle_id: number;
  round_number: number;
  winner?: number;
  started: string;
  ended?: string;
};

// Puzzle type
type Puzzle = {
  id: number;
  gamma: string;
  phi: string;
  difficulty: number;
  best_len: number;
  created: string;
};

// Duel submission response
type DuelResponse = {
  verdict: boolean;
  error_message?: string;
  processing_time: number;
  counter_model?: Record<string, boolean>;
  round_winner?: number;
  game_winner?: number;
  rating_change?: number;
};

export default function DuelPage() {
  const { user } = useAuth();
  const userId = user?.id;
  
  // Match state
  const [inQueue, setInQueue] = useState(false);
  const [queuePosition, setQueuePosition] = useState(0);
  const [estimatedWait, setEstimatedWait] = useState(0);
  const [gameId, setGameId] = useState<number | null>(null);
  const [opponentId, setOpponentId] = useState<number | null>(null);
  const [opponentHandle, setOpponentHandle] = useState<string>('');
  const [opponentRating, setOpponentRating] = useState<number>(0);
  
  // Game state
  const [game, setGame] = useState<Game | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [proof, setProof] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<DuelResponse | null>(null);
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes in seconds
  const [playerTime, setPlayerTime] = useState(180);
  const [opponentTime, setOpponentTime] = useState(180);
  const [winner, setWinner] = useState<number | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  
  // Difficulty selection
  const [difficulty, setDifficulty] = useState<number | undefined>(undefined);
  
  // WebSocket for duel
  const { 
    isConnected, 
    messages, 
    sendMessage, 
    submitProof: submitProofWS, 
    updateTime, 
    sendChatMessage, 
    surrender,
    connectionError 
  } = useDuelWebSocket(gameId || 0, userId || 0);
  
  // Check for matches periodically
  useEffect(() => {
    if (!inQueue || gameId) return;
    
    const interval = setInterval(async () => {
      try {
        const response = await duelAPI.checkMatch();
        if (response && response.game_id) {
          setInQueue(false);
          setGameId(response.game_id);
          setOpponentId(response.opponent_id);
          setOpponentHandle(response.opponent_handle);
          setOpponentRating(response.opponent_rating);
          
          // Fetch the game details
          fetchGame(response.game_id);
        }
      } catch (error) {
        console.error('Error checking for match:', error);
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [inQueue, gameId]);
  
  // Process WebSocket messages for game state updates
  useEffect(() => {
    if (messages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      // Handle submission_failed messages for invalid proofs
      if (latestMessage.type === 'submission_failed' && latestMessage.user_id === userId) {
        // Apply time penalty
        setPlayerTime(prevTime => Math.max(0, prevTime - 15));
        setResponse({
          verdict: false,
          error_message: latestMessage.error || 'Invalid proof',
          processing_time: 0,
          round_winner: null,
          game_winner: null,
          rating_change: null
        });
      }
    }
  }, [messages, userId]);
  
  // Timer countdown
  useEffect(() => {
    if (!gameId || !currentRound || currentRound.winner || gameComplete) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prevTime - 1;
      });
      
      setPlayerTime((prevTime) => Math.max(0, prevTime - 1));
      
      // Broadcast time to opponent using the enhanced method
      if (isConnected && userId) {
        updateTime(playerTime - 1);
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameId, currentRound, isConnected, sendMessage, playerTime, userId, updateTime, gameComplete]);
  
  // Handle WebSocket messages
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (!latestMessage) return;
    
    switch (latestMessage.type) {
      case 'round_complete':
        // Handle round completion
        if (latestMessage.round_winner && game && currentRound) {
          // Update the current round
          const updatedRound = { ...currentRound, winner: latestMessage.round_winner };
          setCurrentRound(updatedRound);
          
          // Update the game rounds
          const updatedGame = { ...game };
          const roundIndex = updatedGame.game_rounds.findIndex((r: Round) => r.id === latestMessage.round_id);
          
          if (roundIndex !== -1) {
            updatedGame.game_rounds[roundIndex] = updatedRound;
            setGame(updatedGame);
          }
          
          // Move to next round if available
          const nextRoundIndex = currentRound.round_number + 1;
          if (nextRoundIndex < updatedGame.game_rounds.length && !latestMessage.game_winner) {
            const nextRound = updatedGame.game_rounds[nextRoundIndex];
            setCurrentRound(nextRound);
            fetchPuzzle(nextRound.puzzle_id);
            setProof('');
            setResponse(null);
            setTimeLeft(180);
            setPlayerTime(180);
            setOpponentTime(180);
          }
        }
        break;
      case 'game_complete':
        // Handle game completion
        if (latestMessage.game_winner !== undefined && game) {
          setWinner(latestMessage.game_winner);
          setGameComplete(true);
          
          // Update game with final state
          const updatedGame = {
            ...game,
            winner: latestMessage.game_winner,
            ended: new Date().toISOString(),
            player_a_rating_change: latestMessage.player_a_rating_change,
            player_b_rating_change: latestMessage.player_b_rating_change
          };
          setGame(updatedGame);
        }
        break;
      case 'time_update':
        // Handle opponent's time update
        if (latestMessage.user_id !== userId && latestMessage.time_left !== undefined) {
          setOpponentTime(latestMessage.time_left);
        }
        break;
      case 'user_joined':
        console.log(`User ${latestMessage.user_id} joined the game`);
        break;
      case 'user_left':
        console.log(`User ${latestMessage.user_id} left the game`);
        break;
      case 'chat_message':
        // Handle chat messages (could add chat UI later)
        console.log('Chat message:', latestMessage.message);
        break;
      case 'error':
        console.error('WebSocket error:', latestMessage);
        break;
    }
  }, [messages, userId]);
  
  // Join the matchmaking queue
  const joinQueue = async () => {
    try {
      const response = await duelAPI.joinQueue(difficulty);
      setInQueue(true);
      setQueuePosition(response.position);
      setEstimatedWait(response.estimated_wait);
    } catch (error) {
      console.error('Error joining queue:', error);
      alert('Failed to join queue. Please try again.');
    }
  };
  
  // Leave the matchmaking queue
  const leaveQueue = async () => {
    try {
      await duelAPI.leaveQueue();
      setInQueue(false);
      setQueuePosition(0);
      setEstimatedWait(0);
    } catch (error) {
      console.error('Error leaving queue:', error);
      alert('Failed to leave queue. Please try again.');
    }
  };
  
  // Fetch game details
  const fetchGame = async (id: number) => {
    try {
      const gameData = await duelAPI.getGame(id);
      setGame(gameData);
      
      // Set the current round (first round or first incomplete round)
      const incompleteRound = gameData.game_rounds.find((round: Round) => !round.winner);
      const firstRound = gameData.game_rounds[0];
      const roundToUse = incompleteRound || firstRound;
      
      if (roundToUse) {
        setCurrentRound(roundToUse);
        fetchPuzzle(roundToUse.puzzle_id);
      }
    } catch (error) {
      console.error('Error fetching game:', error);
      alert('Failed to fetch game details. Please try again.');
    }
  };
  
  // Fetch puzzle details
  const fetchPuzzle = useCallback(async (id: number) => {
    try {
      const puzzleData = await puzzleAPI.getPuzzle(id);
      setPuzzle(puzzleData);
    } catch (error) {
      console.error('Error fetching puzzle:', error);
      alert('Failed to fetch puzzle details. Please try again.');
    }
  }, []);
  
  // Submit proof for duel
  const submitProof = async () => {
    if (!gameId || !currentRound || !proof.trim()) return;
    
    setSubmitting(true);
    try {
      const data = await duelAPI.submitDuelProof(gameId, currentRound.id, proof);
      setResponse(data);
      
      // If the proof is valid, update the UI
      if (data.verdict) {
        if (data.round_winner === userId) {
          // This player won the round
          const updatedRound = { ...currentRound, winner: userId };
          setCurrentRound(updatedRound);
          
          // Update the game
          if (game) {
            const updatedGame = { ...game };
            const roundIndex = updatedGame.game_rounds.findIndex((r: Round) => r.id === currentRound.id);
            
            if (roundIndex !== -1) {
              updatedGame.game_rounds[roundIndex] = updatedRound;
              setGame(updatedGame);
            }
            
            // If the game is over, update the game status
            if (data.game_winner) {
              updatedGame.winner = data.game_winner;
              updatedGame.ended = new Date().toISOString();
              setGame(updatedGame);
            } else {
              // Move to the next round
              const nextRoundIndex = roundIndex + 1;
              if (nextRoundIndex < updatedGame.game_rounds.length) {
                const nextRound = updatedGame.game_rounds[nextRoundIndex];
                setCurrentRound(nextRound);
                fetchPuzzle(nextRound.puzzle_id);
                setProof('');
                setResponse(null);
              }
            }
          }
        }
      } else {
        // Apply time penalty for invalid submission
        setPlayerTime(prevTime => Math.max(0, prevTime - 15));
      }
    } catch (error) {
      console.error('Error submitting proof:', error);
      alert('Failed to submit proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Calculate who's winning
  const getWinningStatus = () => {
    if (!game) return null;
    
    const playerWins = game.game_rounds.filter((round: Round) => round.winner === userId).length;
    const opponentWins = game.game_rounds.filter((round: Round) => round.winner === opponentId).length;
    
    if (playerWins > opponentWins) {
      return 'winning';
    } else if (opponentWins > playerWins) {
      return 'losing';
    } else {
      return 'tied';
    }
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Duel Mode</h1>
        
        {!gameId ? (
        // Queue view
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">Join a Duel</h2>
          
          {inQueue ? (
            <div>
              <div className="mb-4">
                <div className="text-center mb-2">Waiting for an opponent...</div>
                <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Position in queue: {queuePosition}
                </div>
                <div className="text-sm text-center text-gray-500 dark:text-gray-400">
                  Estimated wait time: {estimatedWait} seconds
                </div>
              </div>
              
              <button
                onClick={leaveQueue}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors w-full"
              >
                Leave Queue
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <label htmlFor="duel-difficulty" className="block mb-2">
                  Preferred Difficulty (optional):
                </label>
                <select
                  id="duel-difficulty"
                  className="p-2 border rounded w-full"
                  value={difficulty || ''}
                  onChange={(e) => setDifficulty(e.target.value ? parseInt(e.target.value) : undefined)}
                >
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={joinQueue}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors w-full"
              >
                Join Queue
              </button>
            </div>
          )}
        </div>
      ) : (
        // Game view
        <div>
          {game && currentRound && puzzle ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="text-xl font-semibold">
                    You vs. {opponentHandle}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Opponent Rating: {opponentRating}
                  </div>
                </div>
                
                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <div className="text-sm">Your Time</div>
                    <div className={`text-2xl font-mono ${playerTime < 30 ? 'text-red-500' : ''}`}>
                      {formatTime(playerTime)}
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm">Opponent's Time</div>
                    <div className={`text-2xl font-mono ${opponentTime < 30 ? 'text-red-500' : ''}`}>
                      {formatTime(opponentTime)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {game.game_rounds.map((round, index) => (
                  <div
                    key={round.id}
                    className={`p-4 rounded-lg border ${
                      currentRound.id === round.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="font-semibold">Round {index + 1}</div>
                    {round.winner ? (
                      <div
                        className={`mt-2 ${
                          round.winner === userId
                            ? 'text-green-500 dark:text-green-400'
                            : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {round.winner === userId ? 'You won!' : 'Opponent won'}
                      </div>
                    ) : (
                      <div className="mt-2 text-gray-500 dark:text-gray-400">
                        In progress...
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="mb-6">
                <div className="font-semibold text-lg mb-2">Current Status: </div>
                {game.winner || gameComplete ? (
                  <div
                    className={`p-4 rounded-lg ${
                      game.winner === userId
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}
                  >
                    <div className="text-xl font-bold">
                      {game.winner === userId ? 'You Won the Duel!' : 'You Lost the Duel'}
                    </div>
                    {game.winner === userId && game.player_a_rating_change && (
                      <div className="mt-2">
                        Rating change: +{game.player_a === userId ? game.player_a_rating_change : game.player_b_rating_change}
                      </div>
                    )}
                    {game.winner !== userId && game.player_b_rating_change && (
                      <div className="mt-2">
                        Rating change: {game.player_a === userId ? game.player_a_rating_change : game.player_b_rating_change}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className={`p-4 rounded-lg ${
                      getWinningStatus() === 'winning'
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : getWinningStatus() === 'losing'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-yellow-100 dark:bg-yellow-900/30'
                    }`}
                  >
                    {getWinningStatus() === 'winning' && <div>You're ahead! Keep it up.</div>}
                    {getWinningStatus() === 'losing' && <div>Your opponent is ahead. Focus!</div>}
                    {getWinningStatus() === 'tied' && <div>It's a tie. The next round is crucial!</div>}
                  </div>
                )}
              </div>
              
              {!game.winner && !gameComplete && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
                      <h2 className="text-xl font-semibold mb-4">Round {currentRound.round_number + 1}</h2>
                      
                      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md mb-4">
                        <div className="font-semibold mb-2">Premises (Γ):</div>
                        <div className="font-mono">{puzzle.gamma}</div>
                      </div>
                      
                      <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
                        <div className="font-semibold mb-2">Conclusion (φ):</div>
                        <div className="font-mono">{puzzle.phi}</div>
                      </div>
                    </div>
                    
                    {response && (
                      <div className={`mt-4 p-4 rounded-md ${response.verdict ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                        <h3 className="font-semibold mb-2">
                          {response.verdict ? 'Proof Accepted!' : 'Proof Rejected'}
                        </h3>
                        {response.error_message && (
                          <div className="text-red-600 dark:text-red-400">{response.error_message}</div>
                        )}
                        {!response.verdict && (
                          <div className="text-sm mt-2">
                            Time penalty: -15 seconds
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="font-semibold mb-2">Your Proof:</div>
                    <CarnapFitchEditor
                      value={proof}
                      onChange={setProof}
                      onSubmit={submitProof}
                      height="400px"
                      theme="light"
                      showSyntaxGuide={false}
                    />
                    
                    <div className="mt-4">
                      <button
                        onClick={submitProof}
                        disabled={submitting || !proof.trim() || currentRound.winner !== undefined || gameComplete}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50 w-full"
                      >
                        {submitting ? 'Submitting...' : 'Submit Proof'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">Loading game data...</div>
            </div>
          )}
        </div>
      )}
      </div>
    </AuthGuard>
  );
} 