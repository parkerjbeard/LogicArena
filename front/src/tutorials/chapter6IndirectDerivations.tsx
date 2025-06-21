import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { InteractiveProofEditor } from '@/components/Tutorial/InteractiveProofEditor';
import { InferenceRulePalette } from '@/components/Tutorial/InferenceRulePalette';
import { motion } from 'framer-motion';

export const chapter6IndirectDerivationsSteps: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Indirect Derivations',
    description: 'Learn the powerful technique of proof by contradiction - showing something must be true by proving its negation leads to absurdity.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">A Different Approach</h3>
          <p className="text-gray-200 mb-3">
            Sometimes the direct path to a proof is blocked. Indirect derivation offers a clever alternative: 
            assume the opposite of what you want to prove, show this leads to a contradiction, 
            then conclude your original statement must be true.
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-purple-400 font-semibold mb-2">The Logic of Contradiction</p>
            <p className="text-gray-300">
              If assuming ¬P leads to both Q and ¬Q (impossible!), then ¬P must be false, so P must be true.
            </p>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Real-World Example</h3>
          <p className="text-gray-200 mb-3">
            Proving your keys are in your pocket:
          </p>
          <ol className="list-decimal list-inside text-gray-300 space-y-2">
            <li>Assume your keys are NOT in your pocket</li>
            <li>You remember locking the door (requires keys)</li>
            <li>The door is locked (fact)</li>
            <li>But without keys, you couldn't have locked it</li>
            <li>Contradiction! So the keys MUST be in your pocket</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: 'structure-id',
    title: 'Structure of Indirect Derivation',
    description: 'Indirect derivations follow a specific pattern: assume the negation, derive a contradiction, conclude the original.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">The Three Steps</h3>
          <ol className="list-decimal list-inside text-gray-200 space-y-3">
            <li>
              <strong className="text-red-300">Assume</strong> the negation of your goal (¬P)
            </li>
            <li>
              <strong className="text-yellow-300">Derive</strong> a contradiction (both Q and ¬Q)
            </li>
            <li>
              <strong className="text-green-300">Conclude</strong> the original statement (P)
            </li>
          </ol>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Visual Structure</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <div className="text-gray-200">
              <p>1. (Premises...)</p>
              <p className="ml-4 text-red-300">2. ¬P        Assumption (for ID)</p>
              <p className="ml-4 text-gray-300">3. (derive...)</p>
              <p className="ml-4 text-yellow-300">4. Q         (some justification)</p>
              <p className="ml-4 text-gray-300">5. (derive...)</p>
              <p className="ml-4 text-yellow-300">6. ¬Q        (some justification)</p>
              <p className="text-green-300">7. P         ID 2-6</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            The contradiction (lines 4 and 6) proves our assumption was wrong.
          </p>
        </div>
        
        <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            <strong className="text-yellow-300">Key Point:</strong> The contradiction can be ANY statement 
            and its negation - not necessarily related to your goal!
          </p>
        </div>
      </div>
    ),
    hint: 'Think of ID as "proof by impossibility" - showing the opposite leads to nonsense.'
  },
  {
    id: 'first-indirect',
    title: 'Your First Indirect Derivation',
    description: 'Let\'s work through a simple example of proof by contradiction.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Goal: Prove Q</h3>
          <p className="text-gray-300 mb-3">
            Given: P → Q and ¬P → ¬Q as premises
          </p>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: '¬P → ¬Q', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: '¬Q', justification: 'Assumption (for ID)', depth: 1, isAssumption: true },
              { lineNumber: 4, formula: '¬P', justification: 'MT 1,3', depth: 1 },
              { lineNumber: 5, formula: '¬Q', justification: 'MP 2,4', depth: 1 },
              { lineNumber: 6, formula: 'Q', justification: 'ID 3-5', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[3, 5, 6]}
          />
          <p className="text-gray-400 text-sm mt-3">
            Wait - lines 3 and 5 are the same! That's our contradiction: we assumed ¬Q and derived ¬Q, 
            but we also need Q for a proper contradiction...
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Better Example</h3>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P ∨ Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: '¬P', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: '¬Q', justification: 'Assumption (for ID)', depth: 1, isAssumption: true },
              { lineNumber: 4, formula: '¬P ∧ ¬Q', justification: 'Conj 2,3', depth: 1 },
              { lineNumber: 5, formula: '¬(P ∨ Q)', justification: 'DeMorgan 4', depth: 1 },
              { lineNumber: 6, formula: 'P ∨ Q', justification: 'Reit 1', depth: 1 },
              { lineNumber: 7, formula: 'Q', justification: 'ID 3-6', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[5, 6, 7]}
          />
          <p className="text-gray-400 text-sm mt-3">
            Lines 5 and 6 form a perfect contradiction: ¬(P ∨ Q) and (P ∨ Q).
          </p>
        </div>
      </div>
    ),
    hint: 'The contradiction shows our assumption (¬Q) must be false, so Q must be true.'
  },
  {
    id: 'finding-contradictions',
    title: 'Finding Contradictions',
    description: 'The art of indirect proof lies in finding the right contradiction.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Types of Contradictions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold mb-2">Direct Contradiction</p>
              <p className="font-mono text-gray-300 text-sm mb-2">
                P and ¬P
              </p>
              <p className="text-gray-400 text-xs">
                The most obvious form
              </p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-blue-400 font-semibold mb-2">Complex Contradiction</p>
              <p className="font-mono text-gray-300 text-sm mb-2">
                (P → Q) and (P ∧ ¬Q)
              </p>
              <p className="text-gray-400 text-xs">
                Less obvious but equally valid
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Strategies for Finding Contradictions</h3>
          <ol className="list-decimal list-inside text-gray-200 space-y-3">
            <li>
              <strong>Look at your premises:</strong> Can your assumption conflict with any of them?
            </li>
            <li>
              <strong>Follow chains:</strong> Use your assumption with conditionals to derive consequences
            </li>
            <li>
              <strong>Build compounds:</strong> Combine statements to create contradictory formulas
            </li>
            <li>
              <strong>Use new rules:</strong> DeMorgan's laws often help create contradictions
            </li>
          </ol>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">New Rules for ID</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-orange-400 font-semibold text-sm mb-1">Reiteration (Reit)</p>
              <p className="font-mono text-gray-300 text-xs">
                Copy any available line
              </p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-orange-400 font-semibold text-sm mb-1">DeMorgan's Laws</p>
              <p className="font-mono text-gray-300 text-xs">
                ¬(P ∧ Q) ≡ ¬P ∨ ¬Q<br/>
                ¬(P ∨ Q) ≡ ¬P ∧ ¬Q
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    hint: 'Any contradiction works - even if it seems unrelated to your goal!'
  },
  {
    id: 'complex-indirect',
    title: 'Complex Indirect Proofs',
    description: 'Indirect derivation becomes especially powerful when combined with other techniques.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Proving Conditionals Indirectly</h3>
          <p className="text-gray-300 mb-3">
            Goal: Prove P → Q using indirect derivation
          </p>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → (R ∧ S)', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'S → Q', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: '¬(P → Q)', justification: 'Assumption (for ID)', depth: 1, isAssumption: true },
              { lineNumber: 4, formula: 'P ∧ ¬Q', justification: 'Neg Cond 3', depth: 1 },
              { lineNumber: 5, formula: 'P', justification: 'Simp 4', depth: 1 },
              { lineNumber: 6, formula: '¬Q', justification: 'Simp 4', depth: 1 },
              { lineNumber: 7, formula: 'R ∧ S', justification: 'MP 1,5', depth: 1 },
              { lineNumber: 8, formula: 'S', justification: 'Simp 7', depth: 1 },
              { lineNumber: 9, formula: 'Q', justification: 'MP 2,8', depth: 1 },
              { lineNumber: 10, formula: 'P → Q', justification: 'ID 3-9', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[3, 6, 9, 10]}
          />
          <p className="text-gray-400 text-sm mt-3">
            The contradiction is between lines 6 (¬Q) and 9 (Q).
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">New Rule: Negation of Conditional</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-purple-400 font-semibold mb-2">Neg Cond</p>
            <p className="font-mono text-gray-200 text-sm">
              ¬(P → Q) ≡ P ∧ ¬Q
            </p>
            <p className="text-gray-400 text-sm mt-2">
              A conditional is false only when antecedent is true and consequent is false.
            </p>
          </div>
        </div>
      </div>
    ),
    hint: 'Indirect derivation can prove any type of statement, including conditionals!'
  },
  {
    id: 'nested-indirect',
    title: 'Nested Indirect Derivations',
    description: 'You can use indirect derivation within other subproofs, creating powerful combinations.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">ID Inside CD</h3>
          <p className="text-gray-300 mb-3">
            Sometimes you need contradiction to prove something within a conditional derivation.
          </p>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → (Q ∨ R)', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'P → ¬R', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: 'P', justification: 'Assumption (for CD)', depth: 1, isAssumption: true },
              { lineNumber: 4, formula: '¬Q', justification: 'Assumption (for ID)', depth: 2, isAssumption: true },
              { lineNumber: 5, formula: 'Q ∨ R', justification: 'MP 1,3', depth: 2 },
              { lineNumber: 6, formula: '¬R', justification: 'MP 2,3', depth: 2 },
              { lineNumber: 7, formula: 'R', justification: 'DS 5,4', depth: 2 },
              { lineNumber: 8, formula: 'Q', justification: 'ID 4-7', depth: 1 },
              { lineNumber: 9, formula: 'P → Q', justification: 'CD 3-8', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[3, 4, 8, 9]}
          />
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">New Rule: Disjunctive Syllogism</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-orange-400 font-semibold mb-2">DS</p>
            <p className="font-mono text-gray-200 text-sm">
              From: P ∨ Q<br/>
              And:  ¬P<br/>
              ────────────<br/>
              Get:  Q
            </p>
            <p className="text-gray-400 text-sm mt-2">
              If one disjunct is false, the other must be true.
            </p>
          </div>
        </div>
        
        <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong className="text-blue-300">Power Move:</strong> Combining CD and ID lets you prove 
            complex conditionals that would be difficult with CD alone.
          </p>
        </div>
      </div>
    ),
    hint: 'Think of nested ID as a "sub-contradiction" that helps your main proof.'
  },
  {
    id: 'when-to-use-id',
    title: 'When to Use Indirect Derivation',
    description: 'Recognizing when ID is the best approach is a key skill.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">ID is Especially Useful For:</h3>
          <div className="space-y-3">
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold mb-1">Proving Negations</p>
              <p className="text-gray-300 text-sm">
                To prove ¬P, assume ¬¬P (which is P), derive a contradiction
              </p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-blue-400 font-semibold mb-1">Limited Premises</p>
              <p className="text-gray-300 text-sm">
                When you have few premises but need a specific conclusion
              </p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-green-400 font-semibold mb-1">Disjunction Elimination</p>
              <p className="text-gray-300 text-sm">
                To prove something from P ∨ Q when you can't use either disjunct directly
              </p>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-orange-400 font-semibold mb-1">Classical Theorems</p>
              <p className="text-gray-300 text-sm">
                Many classical logical theorems require ID (like excluded middle)
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">ID vs CD: Making the Choice</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-900/20 border border-green-600/30 p-4 rounded">
              <p className="text-green-400 font-semibold mb-2">Use CD when:</p>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Proving conditionals (P → Q)</li>
                <li>• Natural forward reasoning works</li>
                <li>• You can assume and derive</li>
              </ul>
            </div>
            <div className="bg-red-900/20 border border-red-600/30 p-4 rounded">
              <p className="text-red-400 font-semibold mb-2">Use ID when:</p>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Proving negations or atoms</li>
                <li>• Direct approach is blocked</li>
                <li>• Contradiction is easier to find</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    ),
    hint: 'When stuck, try ID - sometimes the indirect path is clearer!'
  },
  {
    id: 'practice-id',
    title: 'Practice with Indirect Derivation',
    description: 'Strengthen your contradiction-finding skills with these exercises.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Problem 1: Prove an Atom</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove P
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P ∨ Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'Q → R', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: '¬R', justification: 'Premise', depth: 0 }
            ]}
            onLineAdd={(line) => true}
          />
          <p className="text-gray-400 text-sm mt-2">
            Hint: Assume ¬P, then use DS to get Q, then derive a contradiction with R.
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Problem 2: Prove a Negation</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove ¬(P ∧ Q)
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → ¬Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'P', justification: 'Premise', depth: 0 }
            ]}
            onLineAdd={(line) => true}
          />
          <p className="text-gray-400 text-sm mt-2">
            Hint: To prove a negation, assume the positive (P ∧ Q) and find a contradiction.
          </p>
        </div>
        
        <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            <strong className="text-yellow-300">Strategy:</strong> For ID, your first step is always to 
            assume the negation of your goal. Then hunt for any contradiction!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'common-mistakes-id',
    title: 'Common Mistakes with ID',
    description: 'Learn to avoid frequent errors when using indirect derivation.',
    content: (
      <div className="space-y-4">
        <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-red-400">❌ Mistake: Wrong Assumption</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <p className="text-gray-400">Goal: Prove ¬P</p>
            <p className="text-red-400 ml-4">1. ¬P    Assumption ❌ Wrong!</p>
            <p className="text-green-400 ml-4">1. P     Assumption ✓ Correct!</p>
          </div>
          <p className="text-gray-300 text-sm mt-3">
            Always assume the NEGATION of your goal. To prove ¬P, assume P (not ¬¬P).
          </p>
        </div>
        
        <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-red-400">❌ Mistake: No Real Contradiction</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <p className="text-gray-200">1. P → Q    Premise</p>
            <p className="text-gray-200 ml-4">2. ¬Q       Assumption</p>
            <p className="text-gray-200 ml-4">3. ¬P       MT 1,2</p>
            <p className="text-red-400">4. Q        ID 2-3 ❌ No contradiction!</p>
          </div>
          <p className="text-gray-300 text-sm mt-3">
            You must derive BOTH a statement and its negation for a valid contradiction.
          </p>
        </div>
        
        <div className="bg-green-900/20 backdrop-blur-sm border border-green-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-green-400">✓ Correct ID Pattern</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-gray-300">
              1. Assume negation of goal<br/>
              2. Derive some statement X<br/>
              3. Derive ¬X (or vice versa)<br/>
              4. Conclude original goal by ID
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'summary',
    title: 'Chapter Summary',
    description: 'Let\'s review the power of proof by contradiction.',
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
                <p className="text-gray-200 font-medium">Indirect Derivation (ID)</p>
                <p className="text-gray-400 text-sm">Proving statements by showing their negation leads to contradiction</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Finding Contradictions</p>
                <p className="text-gray-400 text-sm">Identifying when you've derived both P and ¬P</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Strategic Use of ID</p>
                <p className="text-gray-400 text-sm">Knowing when contradiction is the best approach</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Combining Techniques</p>
                <p className="text-gray-400 text-sm">Using ID within CD and other nested contexts</p>
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
          <h3 className="font-semibold text-lg mb-3 text-white">Your Proof Toolkit</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold text-sm mb-1">Direct Derivation</p>
              <p className="text-gray-400 text-xs">Straightforward reasoning from premises</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-blue-400 font-semibold text-sm mb-1">Conditional (CD)</p>
              <p className="text-gray-400 text-xs">Assume antecedent, derive consequent</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-red-400 font-semibold text-sm mb-1">Indirect (ID)</p>
              <p className="text-gray-400 text-xs">Assume negation, find contradiction</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 backdrop-blur-sm border border-purple-600/30 rounded-lg p-6"
        >
          <h3 className="font-semibold text-lg mb-3 text-white">Congratulations!</h3>
          <p className="text-gray-200 mb-3">
            You've completed the fundamental chapters of formal logic! You now have a complete toolkit 
            for constructing rigorous proofs:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>Understanding logical structure and notation</li>
            <li>Building direct proofs with inference rules</li>
            <li>Proving conditionals through assumptions</li>
            <li>Managing complex nested derivations</li>
            <li>Using contradiction to establish truth</li>
          </ul>
          <p className="text-gray-200 mt-4">
            With these skills, you're ready to tackle advanced logical challenges and explore 
            the deeper realms of formal reasoning!
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center pt-4"
        >
          <p className="text-xl font-bold text-gray-200">
            🎉 Incredible work completing all six chapters! 🎉
          </p>
        </motion.div>
      </div>
    )
  }
];