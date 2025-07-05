// User statistics types
export interface UserStatistics {
  total_puzzles_solved: number;
  total_puzzles_attempted: number;
  success_rate: number;
  average_solving_time: number;
  puzzles_by_difficulty: Record<number, {
    solved: number;
    attempted: number;
    success_rate: number;
    average_time: number;
  }>;
  current_streak: number;
  longest_streak: number;
  last_solved_date?: string;
  total_hints_used: number;
  perfect_solutions: number; // Solutions matching best_len
}

export interface PuzzleSubmissionHistory {
  id: number;
  user_id: number;
  puzzle_id: number;
  puzzle: {
    id: number;
    gamma: string;
    phi: string;
    difficulty: number;
    best_len: number;
  };
  proof: string;
  verdict: boolean;
  proof_length?: number;
  solving_time?: number;
  hints_used: number;
  submitted_at: string;
}

export interface PuzzleHint {
  level: number; // 1, 2, or 3
  content: string;
  rule_type?: string; // e.g., "MP", "CP", etc.
}

export interface PuzzleProgress {
  puzzle_id: number;
  draft_proof: string;
  hints_viewed: number[];
  started_at: string;
  last_saved_at: string;
}