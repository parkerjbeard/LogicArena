import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { InteractiveProofEditor } from '@/components/Tutorial/InteractiveProofEditor';
import { InferenceRulePalette } from '@/components/Tutorial/InferenceRulePalette';
import { motion } from 'framer-motion';

export const chapter4ConditionalDerivationsSteps: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Conditional Derivations',
    description: 'Learn how to prove "if-then" statements by making temporary assumptions - a powerful technique that mirrors everyday reasoning.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">A New Kind of Proof</h3>
          <p className="text-gray-200 mb-3">
            So far, we've proven statements directly from premises. But how do we prove conditional statements 
            like "If P then Q" when P isn't given as a premise?
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-purple-400 font-semibold mb-2">The Solution: Hypothetical Reasoning</p>
            <p className="text-gray-300">
              We temporarily assume P is true, show that Q follows, then conclude "If P then Q" 
              without committing to P actually being true.
            </p>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Real-World Example</h3>
          <p className="text-gray-200 mb-3">
            Imagine a friend asks: "What would happen if I studied harder?"
          </p>
          <p className="text-gray-300">
            You might respond: "Well, <em>if</em> you studied harder, <em>then</em> you'd understand the material better, 
            which would lead to better grades."
          </p>
          <p className="text-gray-400 text-sm mt-3">
            You're not saying they <em>are</em> studying harder - you're exploring what <em>would</em> follow if they did.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'the-structure',
    title: 'Structure of Conditional Derivation',
    description: 'Conditional derivations have a special structure with assumptions and subproofs.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">The Three Steps</h3>
          <ol className="list-decimal list-inside text-gray-200 space-y-3">
            <li>
              <strong className="text-blue-300">Assume</strong> the antecedent (the "if" part)
            </li>
            <li>
              <strong className="text-green-300">Derive</strong> the consequent (the "then" part) using this assumption
            </li>
            <li>
              <strong className="text-purple-300">Discharge</strong> the assumption, concluding the full conditional
            </li>
          </ol>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Visual Structure</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <div className="text-gray-200">
              <p>1. (Premises...)</p>
              <p className="ml-4 text-blue-300">2. P         Assumption</p>
              <p className="ml-4 text-gray-300">3. (derive Q using P...)</p>
              <p className="ml-4 text-green-300">4. Q         (justified)</p>
              <p className="text-purple-300">5. P → Q     CD 2-4</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            The indented lines (2-4) form a subproof. Line 5 "discharges" the assumption.
          </p>
        </div>
        
        <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            <strong className="text-yellow-300">Important:</strong> The assumption is only valid within the subproof. 
            Once discharged, you can't use it anymore!
          </p>
        </div>
      </div>
    ),
    hint: 'Think of assumptions as "what if" scenarios that exist in their own bubble.'
  },
  {
    id: 'first-example',
    title: 'Your First Conditional Derivation',
    description: 'Let\'s work through a simple example step by step.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Goal: Prove P → R</h3>
          <p className="text-gray-300 mb-3">
            Given: P → Q and Q → R as premises
          </p>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'Q → R', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: 'P', justification: 'Assumption', depth: 1, isAssumption: true },
              { lineNumber: 4, formula: 'Q', justification: 'MP 1,3', depth: 1 },
              { lineNumber: 5, formula: 'R', justification: 'MP 2,4', depth: 1 },
              { lineNumber: 6, formula: 'P → R', justification: 'CD 3-5', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[3, 6]}
          />
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Step-by-Step Explanation</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-blue-400 font-mono">3.</span>
              <p className="text-gray-200">
                We <strong>assume P</strong> to start our subproof (note the indentation)
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">4.</span>
              <p className="text-gray-200">
                With P assumed, we can use MP on lines 1 and 3 to get Q
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">5.</span>
              <p className="text-gray-200">
                Now we can use MP on lines 2 and 4 to get R
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-purple-400 font-mono">6.</span>
              <p className="text-gray-200">
                We <strong>discharge the assumption</strong>, concluding P → R
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    hint: 'The key insight: we showed that IF we had P, THEN we could get R.'
  },
  {
    id: 'practice-cd',
    title: 'Practice Conditional Derivation',
    description: 'Try constructing your own conditional derivation.',
    content: (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-lg mb-2 text-white">Your Task</h3>
            <p className="text-gray-300 mb-3">
              Prove: A → C
            </p>
            <p className="text-gray-400 text-sm">
              Strategy: Assume A, then use the premises to derive C
            </p>
          </div>
          
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'A → B', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'B → C', justification: 'Premise', depth: 0 }
            ]}
            expectedNext={{ lineNumber: 3, formula: 'A', justification: 'Assumption', depth: 1 }}
            onLineAdd={(line) => {
              // Guide the user through the proof
              if (line.lineNumber === 3) {
                return line.formula === 'A' && line.justification === 'Assumption';
              }
              return true;
            }}
          />
          
          <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
            <p className="text-sm text-blue-400">
              <strong className="text-blue-300">Remember:</strong> Start by assuming A (line 3), 
              derive C within the subproof, then discharge with CD.
            </p>
          </div>
        </div>
        
        <div>
          <InferenceRulePalette
            highlightedRules={['cd']}
            showExamples={true}
          />
          <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700/50 mt-4">
            <h4 className="font-semibold mb-2 text-white">CD Rule Format</h4>
            <p className="text-gray-300 text-sm mb-2">
              After deriving Q from assumption P:
            </p>
            <p className="font-mono text-gray-200">
              P → Q    CD [start]-[end]
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Where [start]-[end] are the line numbers of the subproof
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'strategic-thinking',
    title: 'Strategic Thinking',
    description: 'Conditional derivation is like strategic planning - exploring "what if" scenarios.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">The Power of Hypothetical Reasoning</h3>
          <p className="text-gray-200 mb-4">
            Conditional derivation mirrors how we think strategically in real life:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-orange-400 font-semibold mb-2">🏁 Racing Strategy</p>
              <p className="text-gray-300 text-sm">
                "If my opponent takes the inside line, then I'll brake later and pass on the outside"
              </p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-blue-400 font-semibold mb-2">🎮 Game Strategy</p>
              <p className="text-gray-300 text-sm">
                "If they attack my left flank, then I'll counter with a pincer movement"
              </p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-green-400 font-semibold mb-2">💼 Business Strategy</p>
              <p className="text-gray-300 text-sm">
                "If demand increases, then we'll need to scale production"
              </p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold mb-2">🧩 Problem Solving</p>
              <p className="text-gray-300 text-sm">
                "If this approach doesn't work, then we'll try the alternative"
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">When to Use CD</h3>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>When you need to prove a conditional (P → Q)</li>
            <li>When direct derivation isn't possible</li>
            <li>To establish logical connections between statements</li>
            <li>To prove theorems that hold "in general"</li>
          </ul>
        </div>
      </div>
    ),
    hint: 'CD lets you prove relationships without committing to specific truths.'
  },
  {
    id: 'complex-example',
    title: 'More Complex Example',
    description: 'Let\'s see how conditional derivation works in a more elaborate proof.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Goal: Prove (P ∧ Q) → R</h3>
          <p className="text-gray-300 mb-3">
            Given: P → (Q → R) as premise
          </p>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → (Q → R)', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'P ∧ Q', justification: 'Assumption', depth: 1, isAssumption: true },
              { lineNumber: 3, formula: 'P', justification: 'Simp 2', depth: 1 },
              { lineNumber: 4, formula: 'Q', justification: 'Simp 2', depth: 1 },
              { lineNumber: 5, formula: 'Q → R', justification: 'MP 1,3', depth: 1 },
              { lineNumber: 6, formula: 'R', justification: 'MP 5,4', depth: 1 },
              { lineNumber: 7, formula: '(P ∧ Q) → R', justification: 'CD 2-6', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[2, 7]}
          />
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">New Rule Alert: Simplification</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-green-400 font-semibold mb-2">Simplification (Simp)</p>
            <p className="font-mono text-gray-200 text-sm">
              From: P ∧ Q<br/>
              ────────────<br/>
              Get:  P  (or Q)
            </p>
            <p className="text-gray-400 text-sm mt-2">
              From a conjunction, you can derive either conjunct.
            </p>
          </div>
          <p className="text-gray-300 mt-3">
            This example shows how we can assume complex formulas and use rules within the subproof.
          </p>
        </div>
      </div>
    ),
    hint: 'Even complex assumptions can be broken down using logical rules.'
  },
  {
    id: 'common-mistakes',
    title: 'Common Mistakes to Avoid',
    description: 'Learn from frequent errors when using conditional derivation.',
    content: (
      <div className="space-y-4">
        <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-red-400">❌ Mistake 1: Using Assumptions Outside Their Scope</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <p className="text-gray-200">1. P → Q      Premise</p>
            <p className="text-gray-200 ml-4">2. P          Assumption</p>
            <p className="text-gray-200 ml-4">3. Q          MP 1,2</p>
            <p className="text-gray-200">4. P → Q      CD 2-3</p>
            <p className="text-red-400">5. Q          <span className="line-through">From 3</span> ❌ Can't use!</p>
          </div>
          <p className="text-gray-300 text-sm mt-3">
            Line 3 only exists within the assumption. After CD, you can't reference it!
          </p>
        </div>
        
        <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-red-400">❌ Mistake 2: Forgetting to Discharge</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <p className="text-gray-200">1. P → Q      Premise</p>
            <p className="text-gray-200 ml-4">2. P          Assumption</p>
            <p className="text-gray-200 ml-4">3. Q          MP 1,2</p>
            <p className="text-red-400">❌ Proof ends here - forgot CD!</p>
          </div>
          <p className="text-gray-300 text-sm mt-3">
            Always discharge your assumptions to complete the conditional proof.
          </p>
        </div>
        
        <div className="bg-green-900/20 backdrop-blur-sm border border-green-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-green-400">✓ Correct Usage</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-gray-300">
              • Assumptions are indented and clearly marked<br/>
              • All work within the assumption stays in the subproof<br/>
              • The assumption is properly discharged with CD<br/>
              • Only the conditional (not its parts) is available after CD
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'practice-problems',
    title: 'Practice Problems',
    description: 'Strengthen your skills with these conditional derivation exercises.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Problem 1: Chain Rule</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove S → U from premises
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'S → T', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'T → U', justification: 'Premise', depth: 0 }
            ]}
            onLineAdd={(line) => true}
          />
          <p className="text-gray-400 text-sm mt-2">
            Hint: Assume S, then derive U using the chain of conditionals.
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Problem 2: Constructive Dilemma Setup</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove X → Z
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'X → Y', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'Y → Z', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: 'W → Z', justification: 'Premise', depth: 0 }
            ]}
            onLineAdd={(line) => true}
          />
          <p className="text-gray-400 text-sm mt-2">
            Note: Line 3 is a red herring - you don't need it for this proof!
          </p>
        </div>
        
        <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong className="text-blue-300">Problem-Solving Tip:</strong> When proving P → Q, your first move 
            should almost always be to assume P. Then focus on deriving Q.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'summary',
    title: 'Chapter Summary',
    description: 'Let\'s review the power of conditional derivation.',
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
                <p className="text-gray-200 font-medium">Conditional Derivation (CD)</p>
                <p className="text-gray-400 text-sm">Prove conditionals by assuming the antecedent</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Subproofs and Assumptions</p>
                <p className="text-gray-400 text-sm">Temporary assumptions exist only within their scope</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Strategic Thinking</p>
                <p className="text-gray-400 text-sm">Using "what if" reasoning to establish logical connections</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Proper Discharge</p>
                <p className="text-gray-400 text-sm">Correctly closing subproofs with CD notation</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50"
        >
          <h3 className="font-semibold text-lg mb-3 text-white">The CD Rule</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-purple-400 font-semibold mb-2">Conditional Derivation</p>
            <div className="font-mono text-gray-200 text-sm">
              <p className="ml-4">n.   P       Assumption</p>
              <p className="ml-4">...</p>
              <p className="ml-4">m.   Q       (derived)</p>
              <p>m+1. P → Q   CD n-m</p>
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
            <strong className="text-blue-300">What's Next:</strong> Chapter 5 introduces nested derivations, 
            where we'll learn to work with multiple layers of assumptions - like dreams within dreams!
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center pt-4"
        >
          <p className="text-lg font-semibold text-gray-200">
            Excellent work mastering conditional derivations!
          </p>
        </motion.div>
      </div>
    )
  }
];