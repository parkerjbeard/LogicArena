export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  hint?: string;
  validate?: (userInput: any) => boolean | Promise<boolean>;
  errorMessage?: string;
  highlightElements?: string[]; // CSS selectors to highlight
  requiredAction?: 'click' | 'type' | 'drag' | 'complete';
}

export interface TutorialState {
  currentStep: number;
  completedSteps: number[];
  hintsUsed: number[];
  mistakes: { step: number; timestamp: number }[];
}

export interface TutorialProgress {
  tutorialId: string;
  completed: boolean;
  completedAt?: Date;
  stepProgress: number[];
  totalHintsUsed: number;
  totalMistakes: number;
}

export interface InferenceRule {
  id: string;
  name: string;
  symbol: string;
  description: string;
  example: string;
  category: 'basic' | 'conditional' | 'negation' | 'quantifier';
}

export interface ProofLine {
  lineNumber: number;
  formula: string;
  justification: string;
  depth: number;
  isValid?: boolean;
  error?: string;
}