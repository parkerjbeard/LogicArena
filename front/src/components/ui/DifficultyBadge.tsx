import React from 'react';

interface DifficultyBadgeProps {
  difficulty: number;
  chapter?: number;
  nestedDepth?: number;
  category?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-600/20 text-green-400 border-green-600/30',
  easy: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  intermediate: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30',
  advanced: 'bg-orange-600/20 text-orange-400 border-orange-600/30',
  expert: 'bg-red-600/20 text-red-400 border-red-600/30',
};

const CHAPTER_NAMES: Record<number, string> = {
  1: 'Subject Matter',
  2: 'Notation',
  3: 'Derivations',
  4: 'Conditional',
  5: 'Nested',
  6: 'Indirect',
};

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({
  difficulty,
  chapter,
  nestedDepth,
  category,
  size = 'sm',
  showDetails = false,
  className = '',
}) => {
  const getDifficultyLevel = (): keyof typeof DIFFICULTY_COLORS => {
    if (difficulty <= 2) return 'beginner';
    if (difficulty <= 4) return 'easy';
    if (difficulty <= 6) return 'intermediate';
    if (difficulty <= 8) return 'advanced';
    return 'expert';
  };

  const getDifficultyLabel = (): string => {
    const level = getDifficultyLevel();
    return level.charAt(0).toUpperCase() + level.slice(1);
  };

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
    lg: 'text-lg px-4 py-1.5',
  };

  const level = getDifficultyLevel();
  const colorClass = DIFFICULTY_COLORS[level];

  if (!showDetails) {
    // Simple badge showing just difficulty
    return (
      <span
        className={`inline-flex items-center gap-1 ${sizeClasses[size]} ${colorClass} rounded border font-medium ${className}`}
      >
        {difficulty}/10
      </span>
    );
  }

  // Detailed badge with multiple pieces of information
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {chapter && (
        <span className={`${sizeClasses[size]} bg-gray-700/30 text-gray-400 rounded border border-gray-600/30`}>
          Ch {chapter}
        </span>
      )}
      
      <span
        className={`inline-flex items-center gap-1 ${sizeClasses[size]} ${colorClass} rounded border font-medium`}
      >
        {difficulty}/10
        {size !== 'xs' && (
          <span className="opacity-80 font-normal">
            ({getDifficultyLabel()})
          </span>
        )}
      </span>

      {nestedDepth !== undefined && nestedDepth > 0 && (
        <span className={`${sizeClasses[size]} bg-purple-600/20 text-purple-400 rounded border border-purple-600/30`}>
          N{nestedDepth}
        </span>
      )}
    </div>
  );
};

// Companion component for showing detailed difficulty information
export const DifficultyInfo: React.FC<{
  difficulty: number;
  chapter?: number;
  nestedDepth?: number;
  rulesRequired?: string[];
}> = ({ difficulty, chapter, nestedDepth, rulesRequired }) => {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">Difficulty:</span>
        <DifficultyBadge difficulty={difficulty} showDetails />
      </div>
      
      {chapter && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Chapter:</span>
          <span className="text-gray-200">
            {chapter} - {CHAPTER_NAMES[chapter]}
          </span>
        </div>
      )}
      
      {nestedDepth !== undefined && nestedDepth > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">Nesting:</span>
          <span className="text-gray-200">
            {nestedDepth} {nestedDepth === 1 ? 'level' : 'levels'} deep
          </span>
        </div>
      )}
      
      {rulesRequired && rulesRequired.length > 0 && (
        <div>
          <span className="text-gray-400">Required rules:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {rulesRequired.map((rule) => (
              <span
                key={rule}
                className="text-xs px-2 py-0.5 bg-gray-700/30 text-gray-300 rounded border border-gray-600/30"
              >
                {rule}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};