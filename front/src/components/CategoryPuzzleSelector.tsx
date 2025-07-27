import React, { useState, useEffect } from 'react';
import { puzzleAPI } from '@/lib/api';

interface PuzzleCategory {
  name: string;
  display_name: string;
  description: string;
  chapter: number | null;
  difficulty_range: [number, number];
}

interface CategoryPuzzleSelectorProps {
  onSelectionChange: (category: string, difficulty?: number) => void;
  loading?: boolean;
}

export default function CategoryPuzzleSelector({ onSelectionChange, loading }: CategoryPuzzleSelectorProps) {
  const [categories, setCategories] = useState<PuzzleCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('any');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await puzzleAPI.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    
    // Auto-adjust difficulty based on category
    const categoryData = categories.find(c => c.name === category);
    if (categoryData) {
      // Set to middle of the range for the category
      const midDifficulty = Math.floor((categoryData.difficulty_range[0] + categoryData.difficulty_range[1]) / 2);
      setSelectedDifficulty(midDifficulty.toString());
      onSelectionChange(category, midDifficulty);
    } else {
      onSelectionChange(category, selectedDifficulty ? parseInt(selectedDifficulty) : undefined);
    }
  };

  const handleDifficultyChange = (difficulty: string) => {
    setSelectedDifficulty(difficulty);
    onSelectionChange(selectedCategory, difficulty ? parseInt(difficulty) : undefined);
  };

  const getCurrentCategory = () => categories.find(c => c.name === selectedCategory);

  const renderCategoryButtons = () => {
    const chapterCategories = categories.filter(c => c.chapter !== null).sort((a, b) => (a.chapter || 0) - (b.chapter || 0));
    const otherCategories = categories.filter(c => c.chapter === null);

    return (
      <div className="space-y-4">
        {/* Chapter-based categories */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Chapters</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {chapterCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategoryChange(category.name)}
                disabled={loading}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  selectedCategory === category.name
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800/30 border-gray-700 text-gray-300 hover:bg-gray-700/30 hover:border-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-medium">Chapter {category.chapter}</div>
                <div className="text-xs mt-1 opacity-80">
                  Difficulty {category.difficulty_range[0]}-{category.difficulty_range[1]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Other categories */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Special Categories</h3>
          <div className="grid grid-cols-2 gap-2">
            {otherCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => handleCategoryChange(category.name)}
                disabled={loading}
                className={`px-4 py-3 rounded-lg border transition-all ${
                  selectedCategory === category.name
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'bg-gray-800/30 border-gray-700 text-gray-300 hover:bg-gray-700/30 hover:border-gray-600'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-medium">{category.display_name}</div>
                <div className="text-xs mt-1 opacity-80">
                  Difficulty {category.difficulty_range[0]}-{category.difficulty_range[1]}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const currentCategory = getCurrentCategory();

  return (
    <div className="space-y-4">
      {/* Main selector */}
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
        <h2 className="text-lg font-semibold mb-4 text-white">Select Puzzle Type</h2>
        
        {/* Category description */}
        {currentCategory && (
          <div className="mb-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
            <h3 className="font-medium text-gray-200">{currentCategory.display_name}</h3>
            <p className="text-sm text-gray-400 mt-1">{currentCategory.description}</p>
          </div>
        )}

        {/* Category buttons */}
        {renderCategoryButtons()}

        {/* Advanced options */}
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors flex items-center gap-2"
          >
            <svg 
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-3">
              {/* Difficulty override */}
              <div>
                <label htmlFor="difficulty-override" className="block text-sm font-medium text-gray-300 mb-1">
                  Difficulty Override
                </label>
                <select
                  id="difficulty-override"
                  value={selectedDifficulty}
                  onChange={(e) => handleDifficultyChange(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Auto (Based on Category)</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                    <option key={level} value={level}>
                      Difficulty {level}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Override the default difficulty for the selected category
                </p>
              </div>

              {/* Current selection info */}
              <div className="p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                <div className="text-xs text-gray-400">Current Selection:</div>
                <div className="text-sm text-gray-200 mt-1">
                  Category: {currentCategory?.display_name || 'None'}<br />
                  Difficulty: {selectedDifficulty || 'Auto'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick guide */}
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Quick Guide</h3>
        <div className="text-xs text-gray-400 space-y-1">
          <p>• <strong>Chapters 1-2:</strong> Basic concepts and notation (Beginner)</p>
          <p>• <strong>Chapters 3-4:</strong> Core derivation rules (Intermediate)</p>
          <p>• <strong>Chapters 5-6:</strong> Advanced nested proofs (Advanced)</p>
          <p>• <strong>Any:</strong> Mixed puzzles from all chapters</p>
          <p>• <strong>Hard:</strong> Expert challenges with deep nesting</p>
        </div>
      </div>
    </div>
  );
}