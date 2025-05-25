import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { InteractiveProofEditor } from '@/components/Tutorial/InteractiveProofEditor';

export const nestedDerivationsTutorial: TutorialStep[] = [
  {
    id: 'why-nested',
    title: "Why We Need Multiple Assumptions",
    description: "Sometimes we need to prove complex statements that require assumptions within assumptions.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">
          Sometimes we need to prove complex statements like <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">P → (Q → R)</span>.
        </p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-gray-300 mb-2">This means: "If P is true, then if Q is true, then R is true"</p>
          <p className="text-gray-300">To prove this, we need to:</p>
          <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-300">
            <li>Assume P</li>
            <li>Show that Q → R follows from P</li>
            <li>But to show Q → R, we need to assume Q and derive R!</li>
          </ol>
        </div>
        <p className="text-gray-100">This requires <span className="text-cyan-400 font-semibold">nested assumptions</span> - assumptions within assumptions.</p>
      </div>
    )
  },
  {
    id: 'chess-example',
    title: "Real-World Example: Chess Strategy",
    description: "Let's see how nested reasoning works in everyday thinking.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">Let's see how nested reasoning works in everyday thinking:</p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-cyan-400 font-semibold mb-2">Chess Strategy</p>
          <p className="text-gray-300 mb-2">
            "If I move my bishop, then if my opponent takes my pawn, then I can checkmate in two moves."
          </p>
          <div className="mt-3 space-y-1 text-gray-300">
            <p>• First assumption: I move my bishop</p>
            <p>• Second assumption: My opponent takes my pawn</p>
            <p>• Conclusion: I can checkmate in two moves</p>
          </div>
        </div>
        <p className="text-gray-100 mt-4">
          This type of conditional planning requires thinking through multiple hypothetical scenarios - exactly what nested derivations allow us to do formally!
        </p>
      </div>
    )
  },
  {
    id: 'structure',
    title: "Structure of Nested Derivations",
    description: "Nested derivations have a clear visual structure with indentation levels.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">Nested derivations have a clear visual structure:</p>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 font-mono text-sm">
          <div className="space-y-1">
            <div className="text-gray-300">1. P → (Q → R)    :PR</div>
            <div className="text-gray-300">2. <span className="ml-4">| P</span>    :AS</div>
            <div className="text-gray-300">3. <span className="ml-4">| </span><span className="ml-4">| Q</span>    :AS</div>
            <div className="text-gray-300">4. <span className="ml-4">| </span><span className="ml-4">| ...</span></div>
            <div className="text-gray-300">5. <span className="ml-4">| </span><span className="ml-4">| R</span>    :...</div>
            <div className="text-gray-300">6. <span className="ml-4">| Q → R</span>    :CD 3-5</div>
            <div className="text-gray-300">7. P → (Q → R)    :CD 2-6</div>
          </div>
        </div>
        <div className="mt-4 bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-cyan-400 font-semibold mb-2">Key Points:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>Each level of assumption gets its own indentation</li>
            <li>Inner derivations must close before outer ones</li>
            <li>Each derivation has its own scope</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'available-lines',
    title: "The Critical Challenge: Available vs Unavailable Lines",
    description: "The most important concept in nested derivations is understanding which lines are available.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">
          The most important concept in nested derivations is understanding which lines are <span className="text-green-400">available</span> vs <span className="text-red-400">unavailable</span>.
        </p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-cyan-400 font-semibold mb-2">The Santa Problem</p>
          <p className="text-gray-300 mb-2">Consider this flawed reasoning:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>If Santa exists, then he brings presents</li>
            <li>Assume Santa exists</li>
            <li>Then he brings presents (from 1 and 2)</li>
            <li>Therefore, Santa brings presents ❌</li>
          </ol>
          <p className="text-red-400 mt-3">This is wrong! We can't use line 3 outside its assumption.</p>
        </div>
        <p className="text-gray-100 mt-4">
          Once you close an assumption, everything derived within it becomes <span className="text-red-400 font-semibold">unavailable</span> for direct use.
        </p>
      </div>
    )
  },
  {
    id: 'availability-rules',
    title: "Understanding Line Availability",
    description: "Learn the rules for which lines can be cited at each point in your proof.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">Let's see which lines are available at each point:</p>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 font-mono text-sm">
          <div className="space-y-1">
            <div className="text-gray-300">1. P → Q    :PR</div>
            <div className="text-gray-300">2. <span className="ml-4">| P</span>    :AS</div>
            <div className="text-gray-300">3. <span className="ml-4">| Q</span>    :MP 1,2 <span className="text-green-400">✓ Line 1 available here</span></div>
            <div className="text-gray-300">4. P → Q    :CD 2-3</div>
            <div className="text-gray-300">5. Q    <span className="text-red-400">❌ Can't cite line 3 here!</span></div>
          </div>
        </div>
        <div className="mt-4 bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-cyan-400 font-semibold mb-2">Availability Rules:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>Lines outside all derivations are always available</li>
            <li>Lines in parent derivations are available to children</li>
            <li>Lines in closed derivations are never available</li>
            <li>Lines in sibling derivations are never available</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'direct-derivation',
    title: "Types of Nested Derivations: Direct Derivation",
    description: "Nested Direct Derivation is used when you need to derive a contradiction within another derivation.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">
          <span className="text-cyan-400 font-semibold">Nested Direct Derivation</span> is used when you need to derive a contradiction within another derivation.
        </p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-gray-300 mb-2">Example: Proving ¬(P ∧ ¬P)</p>
          <p className="text-gray-300">We assume P ∧ ¬P and show it leads to contradiction:</p>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 font-mono text-sm mt-4">
          <div className="space-y-1">
            <div className="text-gray-300">1. ¬(P ∧ ¬P)    :ID 2-6</div>
            <div className="text-gray-300">2. <span className="ml-4">| P ∧ ¬P</span>    :AS</div>
            <div className="text-gray-300">3. <span className="ml-4">| P</span>    :S 2</div>
            <div className="text-gray-300">4. <span className="ml-4">| ¬P</span>    :S 2</div>
            <div className="text-gray-300">5. <span className="ml-4">| P ∧ ¬P</span>    :ADJ 3,4</div>
            <div className="text-gray-300">6. <span className="ml-4">| ¬(P ∧ ¬P)</span>    :DD 5</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'conditional-derivation',
    title: "Types of Nested Derivations: Conditional Derivation",
    description: "Nested Conditional Derivation is used when you need to prove a conditional within another derivation.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">
          <span className="text-cyan-400 font-semibold">Nested Conditional Derivation</span> is used when you need to prove a conditional within another derivation.
        </p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-gray-300 mb-2">Example: Proving P → (Q → (P ∧ Q))</p>
          <p className="text-gray-300">We need two nested assumptions to build this proof:</p>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 font-mono text-sm mt-4">
          <div className="space-y-1">
            <div className="text-gray-300">1. P → (Q → (P ∧ Q))    :CD 2-6</div>
            <div className="text-gray-300">2. <span className="ml-4">| P</span>    :AS</div>
            <div className="text-gray-300">3. <span className="ml-4">| Q → (P ∧ Q)</span>    :CD 4-6</div>
            <div className="text-gray-300">4. <span className="ml-4">| </span><span className="ml-4">| Q</span>    :AS</div>
            <div className="text-gray-300">5. <span className="ml-4">| </span><span className="ml-4">| P ∧ Q</span>    :ADJ 2,4</div>
            <div className="text-gray-300">6. <span className="ml-4">| </span><span className="ml-4">| P ∧ Q</span>    :R 5</div>
          </div>
        </div>
        <p className="text-gray-100 mt-4">
          Notice how line 2 (P) is available inside the nested derivation at line 5!
        </p>
      </div>
    )
  },
  {
    id: 'first-practice',
    title: "Let's Practice: Your First Nested Proof",
    description: "Try proving P → (P → P) using nested assumptions.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">
          Let's prove: <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">P → (P → P)</span>
        </p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-cyan-400 font-semibold mb-2">Strategy:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-300">
            <li>Assume P (outer assumption)</li>
            <li>To prove P → P, assume P again (inner assumption)</li>
            <li>We already have P, so use Reiteration</li>
            <li>Close inner derivation with CD</li>
            <li>Close outer derivation with CD</li>
          </ol>
        </div>
        <InteractiveProofEditor
          initialLines={[]}
          highlightedLines={[]}
          readOnly={false}
        />
        <p className="text-gray-100 mt-4">
          Start by adding the first assumption line. Remember to indent properly!
        </p>
      </div>
    ),
    hint: "Start with your first assumption: P. Then make a nested assumption, also P."
  },
  {
    id: 'complex-example',
    title: "A More Complex Example",
    description: "Prove the transitivity of implication using three levels of assumptions.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">
          Now let's prove: <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">(P → Q) → ((Q → R) → (P → R))</span>
        </p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-cyan-400 font-semibold mb-2">This is the transitivity of implication!</p>
          <p className="text-gray-300">We'll need three levels of assumptions:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300 mt-2">
            <li>Assume P → Q</li>
            <li>Within that, assume Q → R</li>
            <li>Within that, assume P</li>
            <li>Then derive R using Modus Ponens twice</li>
          </ul>
        </div>
        <InteractiveProofEditor
          initialLines={[]}
          highlightedLines={[]}
          readOnly={false}
        />
        <p className="text-gray-100 mt-4">
          This proof requires careful tracking of available lines. Take your time!
        </p>
      </div>
    ),
    hint: "Start by assuming P → Q, then nest Q → R inside that, then P inside that. Use MP twice to get R."
  },
  {
    id: 'common-mistakes',
    title: "Common Mistakes to Avoid",
    description: "Learn the most common errors students make with nested derivations.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">Here are the most common errors students make with nested derivations:</p>
        <div className="space-y-3">
          <div className="bg-red-900/20 backdrop-blur-sm p-4 rounded-lg border border-red-800">
            <p className="text-red-400 font-semibold">❌ Using closed lines</p>
            <p className="text-gray-300">Once a derivation closes, its lines are gone forever!</p>
          </div>
          <div className="bg-red-900/20 backdrop-blur-sm p-4 rounded-lg border border-red-800">
            <p className="text-red-400 font-semibold">❌ Crossing derivation boundaries</p>
            <p className="text-gray-300">You can't cite lines from sibling derivations.</p>
          </div>
          <div className="bg-red-900/20 backdrop-blur-sm p-4 rounded-lg border border-red-800">
            <p className="text-red-400 font-semibold">❌ Incorrect indentation</p>
            <p className="text-gray-300">Each assumption level needs proper indentation.</p>
          </div>
          <div className="bg-red-900/20 backdrop-blur-sm p-4 rounded-lg border border-red-800">
            <p className="text-red-400 font-semibold">❌ Forgetting to close derivations</p>
            <p className="text-gray-300">Every assumption needs its corresponding CD or ID.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'challenge',
    title: "Challenge Problem",
    description: "Test your understanding with a challenging nested derivation problem.",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100">
          Ready for a challenge? Prove: <span className="font-mono bg-gray-800/50 px-2 py-1 rounded">¬¬(P → P)</span>
        </p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-cyan-400 font-semibold mb-2">Hint:</p>
          <p className="text-gray-300">You'll need to:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-300 mt-2">
            <li>Use Indirect Derivation as your main strategy</li>
            <li>Inside that, prove P → P using Conditional Derivation</li>
            <li>This creates a nested structure!</li>
          </ol>
        </div>
        <InteractiveProofEditor
          initialLines={[]}
          highlightedLines={[]}
          readOnly={false}
        />
        <p className="text-gray-100 mt-4">
          This combines everything you've learned about nested derivations. Good luck!
        </p>
      </div>
    ),
    hint: "Start by assuming ¬(P → P) for Indirect Derivation. Then prove P → P inside to get a contradiction."
  },
  {
    id: 'congratulations',
    title: "Congratulations!",
    description: "You've mastered nested derivations!",
    content: (
      <div className="space-y-4">
        <p className="text-gray-100 text-lg">
          You've mastered <span className="text-cyan-400 font-semibold">Nested Derivations</span>! 🎉
        </p>
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-gray-700">
          <p className="text-cyan-400 font-semibold mb-2">What you've learned:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>How to work with multiple assumptions</li>
            <li>The critical concept of available vs unavailable lines</li>
            <li>How to structure nested derivations properly</li>
            <li>Both nested DD and nested CD techniques</li>
            <li>Common pitfalls and how to avoid them</li>
          </ul>
        </div>
        <p className="text-gray-100 mt-4">
          Nested derivations are powerful tools for proving complex logical statements. With practice, tracking available lines will become second nature!
        </p>
        <div className="bg-cyan-900/20 backdrop-blur-sm p-4 rounded-lg border border-cyan-700 mt-4">
          <p className="text-cyan-400 font-semibold mb-2">Next Steps:</p>
          <p className="text-gray-300">
            Try more practice problems with nested derivations, especially those involving multiple conditionals and negations. The more you practice, the more intuitive it becomes!
          </p>
        </div>
      </div>
    )
  }
];