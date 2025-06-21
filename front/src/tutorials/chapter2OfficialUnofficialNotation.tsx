import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { motion } from 'framer-motion';

export const chapter2OfficialUnofficialNotationSteps: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Official and Unofficial Notation',
    description: 'In this chapter, we\'ll learn how to write logical expressions using formal notation and how to translate between symbols and English.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Why Formal Notation?</h3>
          <p className="text-gray-200 mb-3">
            Just like mathematics uses symbols (+, -, ×) to express operations clearly, logic uses symbols to express 
            relationships between statements without ambiguity.
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">Compare:</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs">English</p>
                <p className="text-gray-200">"If P and Q, then R"</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Formal</p>
                <p className="text-gray-200 font-mono">(P ∧ Q) → R</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Chapter Overview</h3>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>Basic logical connectives and their symbols</li>
            <li>Rules for building well-formed formulas</li>
            <li>Official vs unofficial notation</li>
            <li>Translating between English and symbols</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'basic-connectives',
    title: 'Basic Logical Connectives',
    description: 'Let\'s learn the fundamental symbols that connect logical statements.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-4 text-white">The Five Basic Connectives</h3>
          <div className="space-y-3">
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-400 font-semibold">Negation (NOT)</span>
                <span className="text-gray-200 font-mono text-lg">¬P</span>
              </div>
              <p className="text-gray-300 text-sm">Means: "It is not the case that P"</p>
              <p className="text-gray-400 text-xs mt-1">Example: ¬(It's raining) = It's not raining</p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-400 font-semibold">Conjunction (AND)</span>
                <span className="text-gray-200 font-mono text-lg">P ∧ Q</span>
              </div>
              <p className="text-gray-300 text-sm">Means: "Both P and Q are true"</p>
              <p className="text-gray-400 text-xs mt-1">Example: (It's sunny) ∧ (It's warm)</p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-orange-400 font-semibold">Disjunction (OR)</span>
                <span className="text-gray-200 font-mono text-lg">P ∨ Q</span>
              </div>
              <p className="text-gray-300 text-sm">Means: "Either P or Q (or both)"</p>
              <p className="text-gray-400 text-xs mt-1">Example: (I'll have coffee) ∨ (I'll have tea)</p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-green-400 font-semibold">Conditional (IF-THEN)</span>
                <span className="text-gray-200 font-mono text-lg">P → Q</span>
              </div>
              <p className="text-gray-300 text-sm">Means: "If P then Q"</p>
              <p className="text-gray-400 text-xs mt-1">Example: (You study) → (You'll pass)</p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-yellow-400 font-semibold">Biconditional (IF AND ONLY IF)</span>
                <span className="text-gray-200 font-mono text-lg">P ↔ Q</span>
              </div>
              <p className="text-gray-300 text-sm">Means: "P if and only if Q"</p>
              <p className="text-gray-400 text-xs mt-1">Example: (It's weekend) ↔ (No work today)</p>
            </div>
          </div>
        </div>
      </div>
    ),
    hint: 'Think of these connectives as the "glue" that holds complex statements together.'
  },
  {
    id: 'building-formulas',
    title: 'Building Well-Formed Formulas',
    description: 'Not every string of symbols is a valid formula. Let\'s learn the rules for building proper logical expressions.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Basic Building Rules</h3>
          <ol className="list-decimal list-inside text-gray-200 space-y-2">
            <li>Single letters (P, Q, R...) are formulas (atomic formulas)</li>
            <li>If φ is a formula, then ¬φ is a formula</li>
            <li>If φ and ψ are formulas, then:
              <ul className="list-disc list-inside ml-6 mt-1 text-gray-300">
                <li>(φ ∧ ψ) is a formula</li>
                <li>(φ ∨ ψ) is a formula</li>
                <li>(φ → ψ) is a formula</li>
                <li>(φ ↔ ψ) is a formula</li>
              </ul>
            </li>
          </ol>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Examples</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-900/20 border border-green-600/30 p-4 rounded">
              <p className="text-green-400 font-semibold mb-2">✓ Well-Formed</p>
              <ul className="space-y-1 text-gray-200 font-mono text-sm">
                <li>P</li>
                <li>¬P</li>
                <li>(P ∧ Q)</li>
                <li>((P → Q) ∧ R)</li>
                <li>¬(P ∨ ¬Q)</li>
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-600/30 p-4 rounded">
              <p className="text-red-400 font-semibold mb-2">✗ Not Well-Formed</p>
              <ul className="space-y-1 text-gray-200 font-mono text-sm">
                <li>P Q (missing connective)</li>
                <li>∧PQ (wrong order)</li>
                <li>(P ∧ Q (missing parenthesis)</li>
                <li>P → → Q (double connective)</li>
                <li>¬ (nothing to negate)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'parentheses-rules',
    title: 'Official Notation and Parentheses',
    description: 'Official notation requires lots of parentheses. Let\'s see why and how we can simplify.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Why So Many Parentheses?</h3>
          <p className="text-gray-200 mb-4">
            Consider the expression: P ∧ Q → R
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-gray-300 mb-2">This could mean two different things:</p>
            <ol className="list-decimal list-inside text-gray-200 space-y-2">
              <li><span className="font-mono">(P ∧ Q) → R</span> - "If P and Q, then R"</li>
              <li><span className="font-mono">P ∧ (Q → R)</span> - "P, and if Q then R"</li>
            </ol>
            <p className="text-yellow-400 text-sm mt-3">
              These have completely different meanings!
            </p>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Official Notation</h3>
          <p className="text-gray-200 mb-3">
            In official notation, we must use parentheses for every binary connective:
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 space-y-2">
            <p className="text-gray-200 font-mono">((P ∧ Q) → (R ∨ S))</p>
            <p className="text-gray-200 font-mono">(¬P ∨ (Q ∧ R))</p>
            <p className="text-gray-200 font-mono">((P → Q) → (Q → P))</p>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            This ensures no ambiguity, but can be hard to read!
          </p>
        </div>
      </div>
    ),
    hint: 'Parentheses are like punctuation in logic - they show how to group ideas together.'
  },
  {
    id: 'unofficial-notation',
    title: 'Unofficial Notation (Simplification Rules)',
    description: 'Let\'s learn conventions that let us drop some parentheses while keeping formulas unambiguous.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Order of Operations</h3>
          <p className="text-gray-200 mb-3">
            Just like PEMDAS in math, logic has precedence rules:
          </p>
          <ol className="list-decimal list-inside text-gray-200 space-y-2">
            <li><span className="text-purple-400 font-semibold">¬</span> (negation) binds most tightly</li>
            <li><span className="text-blue-400 font-semibold">∧</span> (and) and <span className="text-orange-400 font-semibold">∨</span> (or)</li>
            <li><span className="text-green-400 font-semibold">→</span> (if-then)</li>
            <li><span className="text-yellow-400 font-semibold">↔</span> (if and only if) binds least tightly</li>
          </ol>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Simplification Examples</h3>
          <div className="space-y-3">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Official</p>
                  <p className="font-mono text-gray-200">(¬(P ∧ Q))</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Unofficial</p>
                  <p className="font-mono text-gray-200">¬(P ∧ Q)</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-2">Outer parentheses dropped</p>
            </div>
            
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Official</p>
                  <p className="font-mono text-gray-200">((P ∧ Q) → R)</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Unofficial</p>
                  <p className="font-mono text-gray-200">P ∧ Q → R</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-2">∧ binds tighter than →</p>
            </div>
            
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Official</p>
                  <p className="font-mono text-gray-200">(P → (Q → R))</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Unofficial</p>
                  <p className="font-mono text-gray-200">P → Q → R</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs mt-2">→ associates right</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            <strong className="text-yellow-300">Remember:</strong> When in doubt, use parentheses! 
            It's better to be explicit than ambiguous.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'symbols-to-english',
    title: 'Translating Symbols to English',
    description: 'Let\'s practice reading logical formulas as English sentences.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Translation Guidelines</h3>
          <div className="space-y-2 text-gray-200">
            <p>• <span className="font-mono">¬P</span> → "not P" or "it is not the case that P"</p>
            <p>• <span className="font-mono">P ∧ Q</span> → "P and Q" or "both P and Q"</p>
            <p>• <span className="font-mono">P ∨ Q</span> → "P or Q" or "either P or Q (or both)"</p>
            <p>• <span className="font-mono">P → Q</span> → "if P then Q" or "P implies Q"</p>
            <p>• <span className="font-mono">P ↔ Q</span> → "P if and only if Q" or "P exactly when Q"</p>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Practice Examples</h3>
          <div className="space-y-4">
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="font-mono text-gray-200 mb-2">P → (Q ∨ R)</p>
              <p className="text-gray-300">
                "If P, then either Q or R"
              </p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="font-mono text-gray-200 mb-2">¬P ∧ ¬Q</p>
              <p className="text-gray-300">
                "Not P and not Q" or "Neither P nor Q"
              </p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="font-mono text-gray-200 mb-2">(P ∧ Q) → ¬R</p>
              <p className="text-gray-300">
                "If both P and Q, then not R"
              </p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="font-mono text-gray-200 mb-2">P ↔ (Q ∨ ¬R)</p>
              <p className="text-gray-300">
                "P if and only if either Q or not R"
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    hint: 'Read from left to right, respecting the precedence rules we learned.'
  },
  {
    id: 'english-to-symbols',
    title: 'Translating English to Symbols',
    description: 'Now let\'s go the other way - from natural language to formal notation.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Translation Strategy</h3>
          <ol className="list-decimal list-inside text-gray-200 space-y-2">
            <li>Identify the atomic propositions (assign letters)</li>
            <li>Identify the main connective</li>
            <li>Break complex sentences into parts</li>
            <li>Translate each part</li>
            <li>Combine with appropriate connectives</li>
          </ol>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Step-by-Step Example</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 mb-4">
            <p className="text-gray-200 mb-3">
              "If it's raining and cold, then I'll stay home or go to the movies"
            </p>
            <div className="space-y-2 text-sm">
              <p className="text-gray-400">Step 1: Identify atomic propositions</p>
              <ul className="list-disc list-inside text-gray-300 ml-4">
                <li>R = It's raining</li>
                <li>C = It's cold</li>
                <li>H = I'll stay home</li>
                <li>M = I'll go to the movies</li>
              </ul>
              <p className="text-gray-400 mt-2">Step 2: Main connective is "if...then" (→)</p>
              <p className="text-gray-400">Step 3: Antecedent: "raining and cold" = R ∧ C</p>
              <p className="text-gray-400">Step 4: Consequent: "stay home or movies" = H ∨ M</p>
              <p className="text-gray-400">Step 5: Complete formula:</p>
              <p className="font-mono text-gray-200 ml-4">(R ∧ C) → (H ∨ M)</p>
            </div>
          </div>
        </div>
        
        <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong className="text-blue-300">Pro tip:</strong> Look for keywords: 
            "and" (∧), "or" (∨), "not" (¬), "if...then" (→), "if and only if" (↔)
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'common-patterns',
    title: 'Common English Patterns',
    description: 'Some English phrases have standard logical translations. Let\'s learn the most common ones.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Conditional Variations</h3>
          <div className="space-y-3">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200">"P only if Q" = <span className="font-mono">P → Q</span></p>
              <p className="text-gray-400 text-xs mt-1">P can happen only when Q is true</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200">"P if Q" = <span className="font-mono">Q → P</span></p>
              <p className="text-gray-400 text-xs mt-1">When Q happens, P follows</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200">"P unless Q" = <span className="font-mono">¬Q → P</span></p>
              <p className="text-gray-400 text-xs mt-1">P happens if Q doesn't</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200">"P is necessary for Q" = <span className="font-mono">Q → P</span></p>
              <p className="text-gray-400 text-xs mt-1">Q requires P</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200">"P is sufficient for Q" = <span className="font-mono">P → Q</span></p>
              <p className="text-gray-400 text-xs mt-1">P is enough for Q</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Negation Patterns</h3>
          <div className="space-y-3">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200">"Neither P nor Q" = <span className="font-mono">¬P ∧ ¬Q</span></p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200">"Not both P and Q" = <span className="font-mono">¬(P ∧ Q)</span></p>
            </div>
          </div>
        </div>
      </div>
    ),
    hint: 'These patterns appear frequently in logic puzzles and proofs!'
  },
  {
    id: 'summary',
    title: 'Chapter Summary',
    description: 'Let\'s review what we\'ve learned about logical notation.',
    content: (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50"
        >
          <h3 className="font-semibold text-lg mb-4 text-white">Key Concepts Mastered</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Five Basic Connectives</p>
                <p className="text-gray-400 text-sm">¬ (not), ∧ (and), ∨ (or), → (if-then), ↔ (iff)</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Well-Formed Formulas</p>
                <p className="text-gray-400 text-sm">Rules for building valid logical expressions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Official vs Unofficial Notation</p>
                <p className="text-gray-400 text-sm">When and how to drop parentheses safely</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Translation Skills</p>
                <p className="text-gray-400 text-sm">Converting between English and logical symbols</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Common Patterns</p>
                <p className="text-gray-400 text-sm">Standard translations for tricky phrases</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4"
        >
          <p className="text-blue-400">
            <strong className="text-blue-300">What's Next?</strong> In Chapter 3, we'll put this notation to work 
            by learning how to construct formal proofs using derivations!
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center pt-4"
        >
          <p className="text-lg font-semibold text-gray-200">
            Excellent work mastering logical notation!
          </p>
        </motion.div>
      </div>
    )
  }
];