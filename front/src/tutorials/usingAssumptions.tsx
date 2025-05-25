import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { InteractiveProofEditor } from '@/components/Tutorial/InteractiveProofEditor';
import { InferenceRulePalette } from '@/components/Tutorial/InferenceRulePalette';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowRight } from 'lucide-react';

export const usingAssumptionsSteps: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Conditional Proofs with Assumptions',
    description: 'Sometimes we need to prove conditional statements like "If P then Q". We do this by assuming P and showing that Q follows.',
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">The Power of Assumptions</h3>
          <p className="text-gray-700 mb-3">
            To prove "If P then Q", we temporarily assume P is true, then show Q must follow.
          </p>
          <div className="flex items-center gap-3 text-purple-700 font-mono">
            <span>Assume P</span>
            <ArrowRight className="w-4 h-4" />
            <span>Derive Q</span>
            <ArrowRight className="w-4 h-4" />
            <span>Conclude P → Q</span>
          </div>
        </div>
        
        <div className="bg-blue-50 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-2">Our Goal</h3>
          <p className="text-gray-700 mb-2">Prove: If it\'s sunny, then I\'ll go to the beach</p>
          <p className="font-mono text-lg text-center mt-3">P → Q</p>
        </div>
      </div>
    )
  },
  {
    id: 'show-statement',
    title: 'The "Show" Statement',
    description: 'In Carnap-style proofs, we use "show" statements to announce what we\'re trying to prove.',
    content: (
      <div className="space-y-4">
        <InteractiveProofEditor
          initialLines={[
            { lineNumber: 1, formula: 'show P → Q', justification: '', depth: 0 }
          ]}
          highlightedLines={[1]}
          readOnly={true}
        />
        
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> "show" statements don\'t have justifications. 
                They announce our proof goal.
              </p>
            </div>
          </div>
        </div>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-50 p-4 rounded-lg"
        >
          <p className="text-sm text-gray-700">
            Think of "show" as saying: "I\'m about to prove this statement..."
          </p>
        </motion.div>
      </div>
    ),
    hint: 'The "show" keyword tells us what we\'re trying to prove. It\'s like setting a goal.'
  },
  {
    id: 'make-assumption',
    title: 'Making an Assumption',
    description: 'To prove P → Q, we assume P and then try to derive Q. The assumption is indented to show it\'s temporary.',
    content: (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-2">Proof Editor</h4>
          <InteractiveProofEditor
            initialLines={[
              { lineNumber: 1, formula: 'show P → Q', justification: '', depth: 0 },
              { lineNumber: 2, formula: 'P', justification: 'AS', depth: 1 }
            ]}
            highlightedLines={[2]}
            expectedNext={{ lineNumber: 3, formula: 'Q', justification: '...', depth: 1 }}
          />
          
          <div className="mt-4 bg-indigo-50 p-3 rounded-lg">
            <p className="text-sm text-indigo-800">
              <strong>Note the indentation!</strong> Line 2 is indented because it\'s an assumption 
              that only applies within this subproof.
            </p>
          </div>
        </div>
        
        <div>
          <h4 className="font-semibold mb-2">Key Concepts</h4>
          <div className="space-y-3">
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="font-semibold text-sm">AS = Assumption</p>
              <p className="text-xs text-gray-600 mt-1">
                Used to temporarily assume something is true
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <p className="font-semibold text-sm">Indentation</p>
              <p className="text-xs text-gray-600 mt-1">
                Shows we\'re working within a subproof
              </p>
            </div>
            
            <InferenceRulePalette
              highlightedRules={['cond-intro']}
              showExamples={false}
            />
          </div>
        </div>
      </div>
    ),
    hint: 'After assuming P, we need to somehow derive Q. In a real proof, we\'d use other premises and rules.',
    validate: async (userInput) => {
      return true;
    }
  },
  {
    id: 'complete-subproof',
    title: 'Completing the Subproof',
    description: 'Once we\'ve derived our goal within the assumption, we close the subproof with QED.',
    content: (
      <div className="space-y-4">
        <InteractiveProofEditor
          initialLines={[
            { lineNumber: 1, formula: 'show P → Q', justification: '', depth: 0 },
            { lineNumber: 2, formula: 'P', justification: 'AS', depth: 1 },
            { lineNumber: 3, formula: 'Q', justification: '(derived somehow)', depth: 1 },
            { lineNumber: 4, formula: 'QED', justification: '→I 2-3', depth: 0 }
          ]}
          highlightedLines={[4]}
          readOnly={true}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-green-50 p-4 rounded-lg"
          >
            <h4 className="font-semibold text-green-800 mb-2">QED Line</h4>
            <p className="text-sm text-green-700">
              "QED" (Quod Erat Demonstrandum) means "which was to be demonstrated". 
              It closes our subproof.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-blue-50 p-4 rounded-lg"
          >
            <h4 className="font-semibold text-blue-800 mb-2">→I Justification</h4>
            <p className="text-sm text-blue-700">
              "→I 2-3" means we used Conditional Introduction on lines 2-3 
              (from assumption to conclusion).
            </p>
          </motion.div>
        </div>
      </div>
    )
  },
  {
    id: 'review',
    title: 'Conditional Proof Pattern',
    description: 'You\'ve learned the conditional proof pattern! This is one of the most important techniques in formal logic.',
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-purple-100 to-blue-100 p-6 rounded-lg">
          <h3 className="font-semibold text-lg mb-3">The Conditional Proof Pattern</h3>
          <ol className="space-y-3">
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3"
            >
              <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
              <span>Write "show P → Q" to announce your goal</span>
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-3"
            >
              <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
              <span>Assume P (the antecedent) with "AS"</span>
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-start gap-3"
            >
              <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
              <span>Derive Q (the consequent) using any valid rules</span>
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-start gap-3"
            >
              <span className="bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
              <span>Close with "QED :→I" citing the assumption range</span>
            </motion.li>
          </ol>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Remember:</strong> Everything between the assumption and QED is indented 
            because it only holds under that assumption!
          </p>
        </div>
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-4"
        >
          <p className="text-lg font-semibold text-gray-700">
            Great job! You\'re ready for more complex proofs!
          </p>
        </motion.div>
      </div>
    )
  }
];