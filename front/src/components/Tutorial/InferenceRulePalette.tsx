'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { InferenceRule } from '@/types/tutorial';

const inferenceRules: InferenceRule[] = [
  // Basic Rules
  {
    id: 'mp',
    name: 'Modus Ponens',
    symbol: 'MP',
    description: 'From P→Q and P, infer Q',
    example: '1. P→Q\n2. P\n3. Q :MP 1,2',
    category: 'basic'
  },
  {
    id: 'mt',
    name: 'Modus Tollens',
    symbol: 'MT',
    description: 'From P→Q and ¬Q, infer ¬P',
    example: '1. P→Q\n2. ¬Q\n3. ¬P :MT 1,2',
    category: 'basic'
  },
  
  // Conjunction Rules
  {
    id: 'and-intro',
    name: 'Conjunction Introduction',
    symbol: '∧I',
    description: 'From P and Q, infer P∧Q',
    example: '1. P\n2. Q\n3. P∧Q :∧I 1,2',
    category: 'basic'
  },
  {
    id: 'and-elim',
    name: 'Conjunction Elimination',
    symbol: '∧E',
    description: 'From P∧Q, infer P or Q',
    example: '1. P∧Q\n2. P :∧E 1\n3. Q :∧E 1',
    category: 'basic'
  },
  
  // Disjunction Rules
  {
    id: 'or-intro',
    name: 'Disjunction Introduction',
    symbol: '∨I',
    description: 'From P, infer P∨Q',
    example: '1. P\n2. P∨Q :∨I 1',
    category: 'basic'
  },
  
  // Conditional Rules
  {
    id: 'cond-intro',
    name: 'Conditional Introduction',
    symbol: '→I',
    description: 'Assume P, derive Q, infer P→Q',
    example: '1. show P→Q\n2.   P :AS\n3.   Q :...\n4. QED :→I 2-3',
    category: 'conditional'
  },
  
  // Negation Rules
  {
    id: 'neg-intro',
    name: 'Negation Introduction',
    symbol: '¬I',
    description: 'Assume P, derive ⊥, infer ¬P',
    example: '1. show ¬P\n2.   P :AS\n3.   ⊥ :...\n4. QED :¬I 2-3',
    category: 'negation'
  },
  {
    id: 'neg-elim',
    name: 'Negation Elimination',
    symbol: '¬E',
    description: 'From P and ¬P, infer ⊥',
    example: '1. P\n2. ¬P\n3. ⊥ :¬E 1,2',
    category: 'negation'
  },
  {
    id: 'dn',
    name: 'Double Negation',
    symbol: 'DN',
    description: 'From ¬¬P, infer P',
    example: '1. ¬¬P\n2. P :DN 1',
    category: 'negation'
  }
];

interface InferenceRulePaletteProps {
  onRuleSelect?: (rule: InferenceRule) => void;
  highlightedRules?: string[];
  disabledRules?: string[];
  showExamples?: boolean;
}

export const InferenceRulePalette: React.FC<InferenceRulePaletteProps> = ({
  onRuleSelect,
  highlightedRules = [],
  disabledRules = [],
  showExamples = true
}) => {
  const [selectedRule, setSelectedRule] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['basic']);

  const categories = [
    { id: 'basic', name: 'Basic Rules', color: 'blue' },
    { id: 'conditional', name: 'Conditional Proof', color: 'purple' },
    { id: 'negation', name: 'Negation Rules', color: 'red' }
  ];

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleRuleClick = (rule: InferenceRule) => {
    if (disabledRules.includes(rule.id)) return;
    
    setSelectedRule(rule.id);
    if (onRuleSelect) {
      onRuleSelect(rule);
    }
  };

  const getRuleClassName = (rule: InferenceRule) => {
    const isHighlighted = highlightedRules.includes(rule.id);
    const isDisabled = disabledRules.includes(rule.id);
    const isSelected = selectedRule === rule.id;

    return `
      p-3 rounded-lg border transition-all duration-200 cursor-pointer
      ${isHighlighted ? 'bg-yellow-900/20 border-yellow-600/50 shadow-md' : 'bg-gray-800/30 border-gray-700/50'}
      ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700/30 hover:border-gray-600/50'}
      ${isSelected ? 'ring-2 ring-blue-500' : ''}
    `;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 space-y-4 border border-gray-700/50">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-200">Inference Rules</h3>
        <Info className="w-5 h-5 text-gray-500" />
      </div>

      {categories.map(category => {
        const categoryRules = inferenceRules.filter(r => r.category === category.id);
        const isExpanded = expandedCategories.includes(category.id);

        return (
          <div key={category.id} className="space-y-2">
            <button
              onClick={() => toggleCategory(category.id)}
              className="w-full flex items-center justify-between p-2 hover:bg-gray-700/30 rounded-lg transition-colors"
            >
              <span className="font-medium text-gray-300">
                {category.name}
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-2 pt-2">
                    {categoryRules.map(rule => (
                      <motion.div
                        key={rule.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={getRuleClassName(rule)}
                        onClick={() => handleRuleClick(rule)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-lg font-bold text-gray-200">
                                {rule.symbol}
                              </span>
                              <span className="text-sm text-gray-400">
                                {rule.name}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {rule.description}
                            </p>
                          </div>
                          
                          {highlightedRules.includes(rule.id) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 bg-yellow-400 rounded-full"
                            />
                          )}
                        </div>

                        {/* Example on selection */}
                        <AnimatePresence>
                          {selectedRule === rule.id && showExamples && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t border-gray-700"
                            >
                              <p className="text-xs text-gray-400 mb-1">Example:</p>
                              <pre className="text-xs font-mono bg-gray-900/50 text-gray-300 p-2 rounded border border-gray-700/50">
                                {rule.example}
                              </pre>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};