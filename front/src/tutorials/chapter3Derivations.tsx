import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { InteractiveProofEditor } from '@/components/Tutorial/InteractiveProofEditor';
import { InferenceRulePalette } from '@/components/Tutorial/InferenceRulePalette';
import { motion } from 'framer-motion';

export const chapter3DerivationsSteps: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Introduction to Derivations',
    description: 'In this chapter, we\'ll learn how to construct formal proofs using basic inference rules. This is where logic becomes hands-on!',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">What is a Derivation?</h3>
          <p className="text-gray-200 mb-3">
            A derivation is a step-by-step proof that shows how a conclusion follows from premises. 
            Each step must be justified by a valid inference rule.
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-gray-300 font-mono text-sm">
              1. P → Q     (Premise)<br/>
              2. P         (Premise)<br/>
              3. Q         (Modus Ponens 1,2)
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Each line has a number, formula, and justification
            </p>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Why Learn Derivations?</h3>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>Prove arguments are valid with certainty</li>
            <li>Develop systematic reasoning skills</li>
            <li>Foundation for mathematical proofs</li>
            <li>Essential for computer science and AI</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'direct-derivation',
    title: 'Direct Derivation',
    description: 'The simplest type of proof: start with premises and derive the conclusion using inference rules.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">How Direct Derivation Works</h3>
          <ol className="list-decimal list-inside text-gray-200 space-y-2">
            <li>List all given premises</li>
            <li>Apply inference rules to derive new formulas</li>
            <li>Continue until you reach the desired conclusion</li>
            <li>Each step must reference previous lines</li>
          </ol>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Example: Simple Argument</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300 mb-2">
              <strong>Goal:</strong> Prove Q from premises (P → Q) and P
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'P', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: 'Q', justification: 'MP 1,2', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[3]}
          />
        </div>
      </div>
    ),
    hint: 'Direct derivation is like following a recipe - each step builds on the previous ones.'
  },
  {
    id: 'modus-ponens',
    title: 'Modus Ponens (MP)',
    description: 'Our first and most important inference rule: from "If P then Q" and "P", we can derive "Q".',
    content: (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-lg mb-2 text-white">The Rule</h3>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold mb-2">Modus Ponens (MP)</p>
              <p className="font-mono text-gray-200 text-sm">
                From: P → Q<br/>
                And:  P<br/>
                ────────────<br/>
                Get:  Q
              </p>
            </div>
            <p className="text-gray-300 text-sm mt-3">
              "The way of affirming" - if the condition holds, the consequence follows.
            </p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50">
            <h4 className="font-semibold mb-2 text-white">Try It Yourself</h4>
            <p className="text-gray-300 text-sm mb-3">
              Given lines 1 and 2, add line 3 using MP:
            </p>
            <InteractiveProofEditor
              initialLines={[
                { lineNumber: 1, formula: 'R → S', justification: 'Premise', depth: 0 },
                { lineNumber: 2, formula: 'R', justification: 'Premise', depth: 0 }
              ]}
              expectedNext={{ lineNumber: 3, formula: 'S', justification: 'MP 1,2', depth: 0 }}
              onLineAdd={(line) => {
                return line.formula === 'S' && line.justification.includes('MP');
              }}
            />
          </div>
        </div>
        
        <div>
          <InferenceRulePalette
            highlightedRules={['mp']}
            showExamples={true}
          />
          <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4 mt-4">
            <p className="text-sm text-yellow-400">
              <strong className="text-yellow-300">Common Mistake:</strong> The order matters! 
              You need both the conditional (P → Q) AND the antecedent (P).
            </p>
          </div>
        </div>
      </div>
    ),
    hint: 'Look for a conditional statement and its antecedent, then apply MP.'
  },
  {
    id: 'modus-tollens',
    title: 'Modus Tollens (MT)',
    description: 'Our second inference rule: from "If P then Q" and "not Q", we can derive "not P".',
    content: (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-lg mb-2 text-white">The Rule</h3>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold mb-2">Modus Tollens (MT)</p>
              <p className="font-mono text-gray-200 text-sm">
                From: P → Q<br/>
                And:  ¬Q<br/>
                ────────────<br/>
                Get:  ¬P
              </p>
            </div>
            <p className="text-gray-300 text-sm mt-3">
              "The way of denying" - if the consequence is false, the condition must be false.
            </p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50">
            <h4 className="font-semibold mb-2 text-white">Real-World Example</h4>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 text-sm">
              <p className="text-gray-200">If it's raining, the ground is wet.</p>
              <p className="text-gray-200">The ground is not wet.</p>
              <p className="text-gray-200">─────────────────────</p>
              <p className="text-gray-200">Therefore, it's not raining.</p>
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50">
            <h4 className="font-semibold mb-2 text-white">Practice</h4>
            <p className="text-gray-300 text-sm mb-3">
              Apply MT to derive the conclusion:
            </p>
            <InteractiveProofEditor
              initialLines={[
                { lineNumber: 1, formula: 'A → B', justification: 'Premise', depth: 0 },
                { lineNumber: 2, formula: '¬B', justification: 'Premise', depth: 0 }
              ]}
              expectedNext={{ lineNumber: 3, formula: '¬A', justification: 'MT 1,2', depth: 0 }}
              onLineAdd={(line) => {
                return line.formula === '¬A' && line.justification.includes('MT');
              }}
            />
          </div>
          <InferenceRulePalette
            highlightedRules={['mt']}
            showExamples={true}
          />
        </div>
      </div>
    ),
    hint: 'MT works backwards: if the result didn\'t happen, the cause didn\'t either.'
  },
  {
    id: 'double-negation',
    title: 'Double Negation Rules',
    description: 'Two rules for handling double negatives: adding them (DNI) and removing them (DNE).',
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-lg mb-2 text-white">Double Negation Introduction (DNI)</h3>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-red-400 font-semibold mb-2">DNI Rule</p>
              <p className="font-mono text-gray-200 text-sm">
                From: P<br/>
                ────────<br/>
                Get:  ¬¬P
              </p>
            </div>
            <p className="text-gray-300 text-sm mt-3">
              Any statement implies its double negation.
            </p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-lg mb-2 text-white">Double Negation Elimination (DNE)</h3>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-red-400 font-semibold mb-2">DNE Rule</p>
              <p className="font-mono text-gray-200 text-sm">
                From: ¬¬P<br/>
                ────────<br/>
                Get:  P
              </p>
            </div>
            <p className="text-gray-300 text-sm mt-3">
              Double negatives cancel out.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Example: Using Both Rules</h3>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → ¬¬Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'P', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: '¬¬Q', justification: 'MP 1,2', depth: 0 },
              { lineNumber: 4, formula: 'Q', justification: 'DNE 3', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[3, 4]}
          />
          <p className="text-gray-400 text-sm mt-3">
            Line 3 uses MP, then line 4 removes the double negation with DNE.
          </p>
        </div>
        
        <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong className="text-blue-300">Why DNI?</strong> Sometimes you need a double negation to match 
            the form required by other rules. It's like algebraic manipulation in math!
          </p>
        </div>
      </div>
    ),
    hint: 'Think of ¬¬ as "not not" - two nots make a yes!'
  },
  {
    id: 'combining-rules',
    title: 'Combining Rules',
    description: 'Real proofs require using multiple rules together. Let\'s practice building longer derivations.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Strategy for Longer Proofs</h3>
          <ol className="list-decimal list-inside text-gray-200 space-y-2">
            <li>Identify what you need to prove</li>
            <li>Look at available premises</li>
            <li>Work backwards: what rule could give you the goal?</li>
            <li>Work forwards: what can you derive from premises?</li>
            <li>Connect the two directions</li>
          </ol>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Example: Multi-Step Proof</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove ¬R from premises
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'Q → R', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: '¬¬P', justification: 'Premise', depth: 0 },
              { lineNumber: 4, formula: '¬R', justification: 'Premise', depth: 0 }
            ]}
            expectedNext={{ lineNumber: 5, formula: 'P', justification: 'DNE 3', depth: 0 }}
            onLineAdd={(line) => {
              // Allow the user to build the proof step by step
              return true;
            }}
          />
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mt-3">
            <p className="text-gray-400 text-sm">
              <strong>Hint:</strong> First use DNE on line 3, then apply MP twice, 
              finally use MT with lines 2 and 4.
            </p>
          </div>
        </div>
      </div>
    ),
    hint: 'Break complex proofs into smaller steps. Each rule application is one step.'
  },
  {
    id: 'common-patterns',
    title: 'Common Proof Patterns',
    description: 'Certain combinations of rules appear frequently. Learning these patterns speeds up proof construction.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Chain Reasoning (Hypothetical Syllogism)</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 mb-3">
            <p className="font-mono text-gray-200 text-sm">
              1. P → Q     (Premise)<br/>
              2. Q → R     (Premise)<br/>
              3. P         (Premise)<br/>
              4. Q         (MP 1,3)<br/>
              5. R         (MP 2,4)
            </p>
          </div>
          <p className="text-gray-300 text-sm">
            Chain conditionals together by using MP repeatedly.
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Contrapositive Reasoning</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 mb-3">
            <p className="font-mono text-gray-200 text-sm">
              1. P → Q     (Premise)<br/>
              2. ¬Q        (Premise)<br/>
              3. ¬P        (MT 1,2)
            </p>
          </div>
          <p className="text-gray-300 text-sm">
            Use MT when you have a conditional and the negation of its consequent.
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Double Negation Cleanup</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 mb-3">
            <p className="font-mono text-gray-200 text-sm">
              1. P → ¬¬Q   (Premise)<br/>
              2. P         (Premise)<br/>
              3. ¬¬Q       (MP 1,2)<br/>
              4. Q         (DNE 3)
            </p>
          </div>
          <p className="text-gray-300 text-sm">
            Always simplify double negations when they appear.
          </p>
        </div>
      </div>
    ),
    hint: 'Recognizing patterns is like recognizing chess openings - it guides your strategy.'
  },
  {
    id: 'practice-problems',
    title: 'Practice Problems',
    description: 'Let\'s solidify your understanding with some practice derivations.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Problem 1: Basic MP</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove T
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'S → T', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'S', justification: 'Premise', depth: 0 }
            ]}
            expectedNext={{ lineNumber: 3, formula: 'T', justification: 'MP 1,2', depth: 0 }}
            onLineAdd={(line) => {
              return line.formula === 'T' && line.justification.includes('MP');
            }}
          />
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Problem 2: Using MT</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove ¬X
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'X → Y', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'Y → Z', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: '¬Z', justification: 'Premise', depth: 0 }
            ]}
            onLineAdd={(line) => true}
          />
          <p className="text-gray-400 text-sm mt-2">
            Hint: First use MT on lines 2 and 3, then use the result with line 1.
          </p>
        </div>
        
        <div className="bg-green-900/20 backdrop-blur-sm border border-green-600/30 rounded-lg p-4">
          <p className="text-sm text-green-400">
            <strong className="text-green-300">Success Tip:</strong> If stuck, work backwards from the goal. 
            Ask yourself: "What rule could produce what I need?"
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'summary',
    title: 'Chapter Summary',
    description: 'Let\'s review the fundamental concepts of derivations.',
    content: (
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50"
        >
          <h3 className="font-semibold text-lg mb-4 text-white">Inference Rules Learned</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold mb-2">Modus Ponens (MP)</p>
              <p className="font-mono text-gray-300 text-sm">
                P → Q, P ⊢ Q
              </p>
              <p className="text-gray-400 text-xs mt-1">Affirm the antecedent</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold mb-2">Modus Tollens (MT)</p>
              <p className="font-mono text-gray-300 text-sm">
                P → Q, ¬Q ⊢ ¬P
              </p>
              <p className="text-gray-400 text-xs mt-1">Deny the consequent</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-red-400 font-semibold mb-2">Double Negation Intro (DNI)</p>
              <p className="font-mono text-gray-300 text-sm">
                P ⊢ ¬¬P
              </p>
              <p className="text-gray-400 text-xs mt-1">Add double negative</p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-red-400 font-semibold mb-2">Double Negation Elim (DNE)</p>
              <p className="font-mono text-gray-300 text-sm">
                ¬¬P ⊢ P
              </p>
              <p className="text-gray-400 text-xs mt-1">Remove double negative</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50"
        >
          <h3 className="font-semibold text-lg mb-4 text-white">Key Skills Developed</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Direct Derivation</p>
                <p className="text-gray-400 text-sm">Constructing proofs from premises to conclusion</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Rule Application</p>
                <p className="text-gray-400 text-sm">Using MP, MT, DNI, and DNE correctly</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Proof Strategy</p>
                <p className="text-gray-400 text-sm">Working forwards and backwards to connect premises to goals</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4"
        >
          <p className="text-blue-400">
            <strong className="text-blue-300">Coming Next:</strong> Chapter 4 introduces conditional derivations, 
            where we'll learn to prove "if-then" statements by making temporary assumptions!
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center pt-4"
        >
          <p className="text-lg font-semibold text-gray-200">
            Fantastic work mastering basic derivations!
          </p>
        </motion.div>
      </div>
    )
  }
];