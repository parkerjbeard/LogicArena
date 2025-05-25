import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { InteractiveProofEditor } from '@/components/Tutorial/InteractiveProofEditor';
import { InferenceRulePalette } from '@/components/Tutorial/InferenceRulePalette';
import { motion } from 'framer-motion';

export const yourFirstProofSteps: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Welcome to Logic Proofs!',
    description: 'In this tutorial, you\'ll learn how to construct your first formal proof using natural deduction. We\'ll start with a simple example using Modus Ponens.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">What is a proof?</h3>
          <p className="text-gray-200">
            A proof is a sequence of logical steps that demonstrates why a conclusion follows from given premises.
          </p>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Our Goal</h3>
          <p className="text-gray-300 mb-3 font-medium">Given:</p>
          <ul className="list-disc list-inside text-gray-200 font-mono space-y-2 ml-2">
            <li>If it rains, then the ground is wet (P → Q)</li>
            <li>It is raining (P)</li>
          </ul>
          <p className="text-gray-300 mt-4 font-medium">Prove: <span className="text-gray-200">The ground is wet (Q)</span></p>
        </div>
      </div>
    )
  },
  {
    id: 'premises',
    title: 'Starting with Premises',
    description: 'Every proof begins with premises - the facts we\'re given as true. Let\'s add our premises to the proof.',
    content: (
      <div className="space-y-4">
        <InteractiveProofEditor
          initialLines={[
            { lineNumber: 1, formula: 'P → Q', justification: 'Premise', depth: 0 },
            { lineNumber: 2, formula: 'P', justification: 'Premise', depth: 0 }
          ]}
          highlightedLines={[1, 2]}
          readOnly={true}
        />
        <div className="bg-gray-800/30 backdrop-blur-sm p-4 rounded-lg border border-green-600/30">
          <p className="text-sm text-green-400">
            <strong className="text-green-300">Note:</strong> Premises are always justified with the word "Premise". 
            They are the starting points of our proof.
          </p>
        </div>
      </div>
    ),
    hint: 'Premises are the given facts. We use them as building blocks for our proof.'
  },
  {
    id: 'modus-ponens',
    title: 'Applying Modus Ponens',
    description: 'Now we\'ll use our first inference rule: Modus Ponens (MP). This rule says: if we have "P → Q" and "P", we can conclude "Q".',
    content: (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Proof Editor</h4>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'P → Q', justification: 'Premise', depth: 0 },
              { lineNumber: 2, formula: 'P', justification: 'Premise', depth: 0 }
            ]}
            highlightedLines={[1, 2]}
            expectedNext={{ lineNumber: 3, formula: 'Q', justification: 'MP 1,2', depth: 0 }}
            onLineAdd={(line) => {
              return line.formula === 'Q' && line.justification.includes('MP');
            }}
          />
        </div>
        <div>
          <h4 className="font-semibold mb-2">Inference Rules</h4>
          <InferenceRulePalette
            highlightedRules={['mp']}
            showExamples={true}
          />
        </div>
      </div>
    ),
    hint: 'Look at lines 1 and 2. Line 1 says "If P then Q", and line 2 gives us P. What can we conclude?',
    validate: async (userInput) => {
      // Check if user added the correct line
      return true; // Implement validation logic
    },
    errorMessage: 'Not quite! Remember, Modus Ponens lets us conclude Q from "P → Q" and "P".'
  },
  {
    id: 'complete',
    title: 'Proof Complete!',
    description: 'Congratulations! You\'ve completed your first formal proof. Let\'s review what we learned.',
    content: (
      <div className="space-y-4">
        <InteractiveProofEditor
          initialLines={[
            { lineNumber: 1, formula: 'P → Q', justification: 'Premise', depth: 0 },
            { lineNumber: 2, formula: 'P', justification: 'Premise', depth: 0 },
            { lineNumber: 3, formula: 'Q', justification: 'MP 1,2', depth: 0, isValid: true }
          ]}
          readOnly={true}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200"
        >
          <h3 className="font-semibold text-lg mb-3">What you learned:</h3>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Proofs start with premises (given facts)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Modus Ponens (MP) lets us infer Q from "P → Q" and P</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Each line needs a justification that references previous lines</span>
            </li>
          </ul>
        </motion.div>
        
        <div className="text-center pt-4">
          <p className="text-lg font-semibold text-gray-700">Ready for the next challenge?</p>
        </div>
      </div>
    )
  }
];