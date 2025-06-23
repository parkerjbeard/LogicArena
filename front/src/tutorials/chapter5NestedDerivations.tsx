import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { InteractiveProofEditor } from '@/components/Tutorial/InteractiveProofEditor';
import { InferenceRulePalette } from '@/components/Tutorial/InferenceRulePalette';
import { motion } from 'framer-motion';

export const chapter5NestedDerivationsSteps: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Nested Derivations',
    description: 'Learn to work with multiple layers of assumptions - like navigating dreams within dreams in logical reasoning.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Going Deeper</h3>
          <p className="text-gray-200 mb-3">
            Sometimes, while working within one assumption, we need to make another assumption. 
            This creates nested subproofs - assumptions within assumptions.
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-purple-400 font-semibold mb-2">Real-World Analogy</p>
            <p className="text-gray-300">
              "If I move to a new city, then if I find a good job there, I'll be happy."
            </p>
            <p className="text-gray-400 text-sm mt-2">
              This has two layers of hypothetical thinking!
            </p>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Visual Structure</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <div className="text-gray-200">
              <p>1. (Premises...)</p>
              <p className="ml-4 text-blue-300">2. P         Assumption</p>
              <p className="ml-8 text-green-300">3. Q         Assumption</p>
              <p className="ml-8 text-gray-300">4. (work...)</p>
              <p className="ml-8 text-gray-300">5. R         (derived)</p>
              <p className="ml-4 text-green-300">6. Q → R     CD 3-5</p>
              <p className="text-blue-300">7. P → (Q → R) CD 2-6</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Each level of indentation represents a deeper level of assumption.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'line-availability',
    title: 'Line Availability Rules',
    description: 'In nested derivations, not all lines are available at all times. Let\'s understand the rules.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">The Fundamental Rule</h3>
          <div className="bg-purple-900/20 backdrop-blur-sm border border-purple-600/30 rounded-lg p-4">
            <p className="text-purple-400 font-semibold mb-2">Line Availability</p>
            <p className="text-gray-200">
              You can only reference lines that are:
            </p>
            <ol className="list-decimal list-inside text-gray-300 mt-2 space-y-1">
              <li>At the same level of assumption or higher (less indented)</li>
              <li>Still "in scope" (not closed off by discharge)</li>
            </ol>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Visual Example</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <div className="font-mono text-sm">
              <p className="text-gray-200">1. A → B     Premise    ✓ Available everywhere</p>
              <p className="text-blue-300 ml-4">2. A         Assumption ✓ Available in blue & green</p>
              <p className="text-blue-300 ml-4">3. B         MP 1,2     ✓ Available in blue & green</p>
              <p className="text-green-300 ml-8">4. C         Assumption ✓ Only in green</p>
              <p className="text-green-300 ml-8">5. B ∧ C     Conj 3,4   ✓ Only in green</p>
              <p className="text-blue-300 ml-4">6. C → (B ∧ C) CD 4-5   ✓ Available in blue</p>
              <p className="text-gray-200">7. A → (C → (B ∧ C)) CD 2-6 ✓ Available at top level</p>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3">
            Notice how line 5 (deepest level) can't be referenced after its subproof closes.
          </p>
        </div>
        
        <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            <strong className="text-yellow-300">Key Insight:</strong> Think of subproofs as "bubbles" - 
            what happens in a bubble stays in that bubble!
          </p>
        </div>
      </div>
    ),
    hint: 'Lines can look "up" (to less indented lines) but not "down" (to more indented lines).'
  },
  {
    id: 'first-nested-example',
    title: 'Your First Nested Derivation',
    description: 'Let\'s work through a complete example of a nested conditional proof.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Goal: Prove P → (Q → R)</h3>
          <p className="text-gray-300 mb-3">
            Given: P → (Q ∧ R) as premise
          </p>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → (Q ∧ R)', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'P', justification: 'Assumption', depth: 1 },
              { lineNumber: 3, formula: 'Q ∧ R', justification: 'MP 1,2', depth: 1 },
              { lineNumber: 4, formula: 'Q', justification: 'Assumption', depth: 2 },
              { lineNumber: 5, formula: 'R', justification: 'Simp 3', depth: 2 },
              { lineNumber: 6, formula: 'Q → R', justification: 'CD 4-5', depth: 1 },
              { lineNumber: 7, formula: 'P → (Q → R)', justification: 'CD 2-6', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[2, 4, 6, 7]}
          />
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Step-by-Step Breakdown</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="text-blue-400 font-mono">2.</span>
              <p className="text-gray-200">
                First assumption: assume P (first level of nesting)
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">3.</span>
              <p className="text-gray-200">
                Use MP to get Q ∧ R from our assumption
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-green-400 font-mono">4.</span>
              <p className="text-gray-200">
                Second assumption: assume Q (second level of nesting)
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-400 font-mono">5.</span>
              <p className="text-gray-200">
                Extract R from line 3 (which is still available!)
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-green-400 font-mono">6.</span>
              <p className="text-gray-200">
                Discharge inner assumption, getting Q → R
              </p>
            </div>
            <div className="flex gap-3">
              <span className="text-blue-400 font-mono">7.</span>
              <p className="text-gray-200">
                Discharge outer assumption, getting P → (Q → R)
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    hint: 'Work from outside in: first assume P, then within that context, assume Q.'
  },
  {
    id: 'complex-nesting',
    title: 'Complex Nesting Patterns',
    description: 'Nested derivations can involve multiple branches and complex structures.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Different Nesting Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-purple-400 font-semibold mb-2">Sequential Nesting</p>
              <div className="font-mono text-xs text-gray-300">
                <p className="ml-0">1. Premise</p>
                <p className="ml-4">2. Assumption 1</p>
                <p className="ml-8">3. Assumption 2</p>
                <p className="ml-8">4. ...</p>
                <p className="ml-4">5. CD</p>
                <p className="ml-0">6. CD</p>
              </div>
            </div>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-blue-400 font-semibold mb-2">Parallel Subproofs</p>
              <div className="font-mono text-xs text-gray-300">
                <p className="ml-0">1. Premise</p>
                <p className="ml-4">2. Assumption A</p>
                <p className="ml-4">3. ...</p>
                <p className="ml-0">4. CD</p>
                <p className="ml-4">5. Assumption B</p>
                <p className="ml-4">6. ...</p>
                <p className="ml-0">7. CD</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Example: Proving a Complex Theorem</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove (P → Q) → ((P → R) → (P → (Q ∧ R)))
            </p>
            <p className="text-gray-400 text-sm mt-1">
              "If P implies Q, then if P implies R, then P implies both Q and R"
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → Q', justification: 'Assumption', depth: 1 },
              { lineNumber: 2, formula: 'P → R', justification: 'Assumption', depth: 2 },
              { lineNumber: 3, formula: 'P', justification: 'Assumption', depth: 3 },
              { lineNumber: 4, formula: 'Q', justification: 'MP 1,3', depth: 3 },
              { lineNumber: 5, formula: 'R', justification: 'MP 2,3', depth: 3 },
              { lineNumber: 6, formula: 'Q ∧ R', justification: 'Conj 4,5', depth: 3 },
              { lineNumber: 7, formula: 'P → (Q ∧ R)', justification: 'CD 3-6', depth: 2 },
              { lineNumber: 8, formula: '(P → R) → (P → (Q ∧ R))', justification: 'CD 2-7', depth: 1 },
              { lineNumber: 9, formula: '(P → Q) → ((P → R) → (P → (Q ∧ R)))', justification: 'CD 1-8', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[1, 2, 3, 9]}
          />
          <p className="text-gray-400 text-sm mt-3">
            Notice the three levels of assumptions, discharged in reverse order!
          </p>
        </div>
      </div>
    ),
    hint: 'Each CD closes the most recent unclosed assumption - like closing nested parentheses.'
  },
  {
    id: 'new-rules',
    title: 'New Rules for Nested Work',
    description: 'Let\'s introduce conjunction rules that are particularly useful in nested contexts.',
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-lg mb-2 text-white">Conjunction Introduction</h3>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-green-400 font-semibold mb-2">Conj (∧I)</p>
              <p className="font-mono text-gray-200 text-sm">
                From: P<br/>
                And:  Q<br/>
                ────────────<br/>
                Get:  P ∧ Q
              </p>
            </div>
            <p className="text-gray-300 text-sm mt-3">
              Combine two statements into a conjunction.
            </p>
          </div>
          
          <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
            <h3 className="font-semibold text-lg mb-2 text-white">Simplification (Review)</h3>
            <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
              <p className="text-green-400 font-semibold mb-2">Simp (∧E)</p>
              <p className="font-mono text-gray-200 text-sm">
                From: P ∧ Q<br/>
                ────────────<br/>
                Get:  P (or Q)
              </p>
            </div>
            <p className="text-gray-300 text-sm mt-3">
              Extract either part of a conjunction.
            </p>
          </div>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Using These Rules in Nested Contexts</h3>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: '(P ∧ Q) → R', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'P', justification: 'Assumption', depth: 1 },
              { lineNumber: 3, formula: 'Q', justification: 'Assumption', depth: 2 },
              { lineNumber: 4, formula: 'P ∧ Q', justification: 'Conj 2,3', depth: 2 },
              { lineNumber: 5, formula: 'R', justification: 'MP 1,4', depth: 2 },
              { lineNumber: 6, formula: 'Q → R', justification: 'CD 3-5', depth: 1 },
              { lineNumber: 7, formula: 'P → (Q → R)', justification: 'CD 2-6', depth: 0, isValid: true }
            ]}
            readOnly={true}
            highlightedLines={[4]}
          />
          <p className="text-gray-400 text-sm mt-3">
            Line 4 shows how we can reference line 2 (from outer scope) within the inner assumption.
          </p>
        </div>
      </div>
    ),
    hint: 'Conjunction and Simplification are inverse operations - one builds, one breaks down.'
  },
  {
    id: 'practice-nested',
    title: 'Practice with Nesting',
    description: 'Try building your own nested derivations.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Problem 1: Two-Level Nesting</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove A → (B → C)
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: '(A ∧ B) → C', justification: 'Premise', depth: 0 }
            ]}
            onLineAdd={(line) => true}
          />
          <p className="text-gray-400 text-sm mt-2">
            Hint: Start by assuming A, then assume B, then use Conj to combine them.
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Problem 2: Three Conditionals</h3>
          <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50 mb-3">
            <p className="text-gray-300">
              <strong>Goal:</strong> Prove X → (Y → (Z → W))
            </p>
          </div>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'X → Y', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'Y → Z', justification: 'Premise', depth: 0 },
              { lineNumber: 3, formula: 'Z → W', justification: 'Premise', depth: 0 }
            ]}
            onLineAdd={(line) => true}
          />
          <p className="text-gray-400 text-sm mt-2">
            This requires three levels of nesting! Take it one assumption at a time.
          </p>
        </div>
        
        <div className="bg-green-900/20 backdrop-blur-sm border border-green-600/30 rounded-lg p-4">
          <p className="text-sm text-green-400">
            <strong className="text-green-300">Strategy Tip:</strong> Count the arrows in your goal - 
            that's usually how many nested assumptions you'll need!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'common-patterns-nested',
    title: 'Common Nested Patterns',
    description: 'Certain nested structures appear frequently in logic proofs.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Exportation Pattern</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 mb-3">
            <p className="text-purple-400 font-semibold mb-2">From (P ∧ Q) → R to P → (Q → R)</p>
            <div className="font-mono text-sm text-gray-300 mt-2">
              <p>1. (P ∧ Q) → R    Premise</p>
              <p className="ml-4">2. P              Assumption</p>
              <p className="ml-8">3. Q              Assumption</p>
              <p className="ml-8">4. P ∧ Q          Conj 2,3</p>
              <p className="ml-8">5. R              MP 1,4</p>
              <p className="ml-4">6. Q → R          CD 3-5</p>
              <p>7. P → (Q → R)    CD 2-6</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm">
            This "exports" the conjunction into nested conditionals.
          </p>
        </div>
        
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Importation Pattern</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 mb-3">
            <p className="text-blue-400 font-semibold mb-2">From P → (Q → R) to (P ∧ Q) → R</p>
            <div className="font-mono text-sm text-gray-300 mt-2">
              <p>1. P → (Q → R)    Premise</p>
              <p className="ml-4">2. P ∧ Q          Assumption</p>
              <p className="ml-4">3. P              Simp 2</p>
              <p className="ml-4">4. Q              Simp 2</p>
              <p className="ml-4">5. Q → R          MP 1,3</p>
              <p className="ml-4">6. R              MP 5,4</p>
              <p>7. (P ∧ Q) → R    CD 2-6</p>
            </div>
          </div>
          <p className="text-gray-300 text-sm">
            This "imports" nested conditionals into a conjunction.
          </p>
        </div>
      </div>
    ),
    hint: 'These patterns show how conjunctions and nested conditionals are related.'
  },
  {
    id: 'debugging-nested',
    title: 'Debugging Nested Proofs',
    description: 'Common errors and how to fix them when working with nested derivations.',
    content: (
      <div className="space-y-4">
        <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-red-400">❌ Error: Wrong Indentation Level</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <p className="text-gray-200">1. P → Q      Premise</p>
            <p className="text-gray-200 ml-4">2. P          Assumption</p>
            <p className="text-gray-200 ml-4">3. Q          MP 1,2</p>
            <p className="text-red-400">4. R          Assumption ❌ Should be indented more!</p>
          </div>
          <p className="text-gray-300 text-sm mt-3">
            New assumptions must be indented further than the current level.
          </p>
        </div>
        
        <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-red-400">❌ Error: Referencing Closed Lines</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <p className="text-gray-200 ml-4">2. P          Assumption</p>
            <p className="text-gray-200 ml-8">3. Q          Assumption</p>
            <p className="text-gray-200 ml-8">4. R          (some work)</p>
            <p className="text-gray-200 ml-4">5. Q → R      CD 3-4</p>
            <p className="text-red-400 ml-4">6. S ∧ R      Conj ?,4 ❌ Can't use line 4!</p>
          </div>
          <p className="text-gray-300 text-sm mt-3">
            Line 4 is "inside" the closed subproof and no longer available.
          </p>
        </div>
        
        <div className="bg-green-900/20 backdrop-blur-sm border border-green-600/30 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3 text-green-400">✓ Correct Approach</h3>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>Always check indentation matches assumption depth</li>
            <li>Close inner assumptions before outer ones</li>
            <li>Only reference lines at your level or above</li>
            <li>Plan your proof structure before starting</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'summary',
    title: 'Chapter Summary',
    description: 'Let\'s review the art of nested derivations.',
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
                <p className="text-gray-200 font-medium">Multiple Assumption Levels</p>
                <p className="text-gray-400 text-sm">Creating assumptions within assumptions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Line Availability Rules</p>
                <p className="text-gray-400 text-sm">Understanding scope and reference restrictions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Conjunction Rules</p>
                <p className="text-gray-400 text-sm">Using Conj and Simp in nested contexts</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Complex Proof Construction</p>
                <p className="text-gray-400 text-sm">Building multi-layered logical arguments</p>
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
          <h3 className="font-semibold text-lg mb-3 text-white">Visual Summary</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 font-mono text-sm">
            <p className="text-gray-400">// Nested structure pattern:</p>
            <p className="text-gray-200">Premise level</p>
            <p className="text-blue-300 ml-4">├─ First assumption</p>
            <p className="text-green-300 ml-8">│  ├─ Second assumption</p>
            <p className="text-orange-300 ml-12">│  │  └─ Third assumption...</p>
            <p className="text-green-300 ml-8">│  └─ CD (discharge second)</p>
            <p className="text-blue-300 ml-4">└─ CD (discharge first)</p>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4"
        >
          <p className="text-blue-400">
            <strong className="text-blue-300">Coming Up:</strong> Chapter 6 introduces indirect derivation 
            (proof by contradiction), where we'll learn to prove statements by showing their negation leads 
            to absurdity!
          </p>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="text-center pt-4"
        >
          <p className="text-lg font-semibold text-gray-200">
            Outstanding work navigating nested derivations!
          </p>
        </motion.div>
      </div>
    )
  }
];