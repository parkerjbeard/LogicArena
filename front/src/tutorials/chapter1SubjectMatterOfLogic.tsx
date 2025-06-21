import React from 'react';
import { TutorialStep } from '@/types/tutorial';
import { motion } from 'framer-motion';

export const chapter1SubjectMatterOfLogicSteps: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Welcome to Logic!',
    description: 'In this chapter, we\'ll explore what logic is all about and why it matters. Logic is the study of good reasoning - let\'s discover what that means.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">What is Logic?</h3>
          <p className="text-gray-200">
            Logic is the systematic study of reasoning and argumentation. It helps us distinguish good arguments from bad ones, 
            and understand why some conclusions follow from their premises while others don't.
          </p>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Why Study Logic?</h3>
          <ul className="list-disc list-inside text-gray-200 space-y-2">
            <li>Improve critical thinking skills</li>
            <li>Evaluate arguments in everyday life</li>
            <li>Build a foundation for mathematics and computer science</li>
            <li>Understand the structure of reasoning itself</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'reasoning-and-arguments',
    title: 'Reasoning and Arguments',
    description: 'Reasoning is giving reasons for beliefs. Let\'s explore what makes up an argument.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">What is Reasoning?</h3>
          <p className="text-gray-200 mb-4">
            Reasoning is the process of giving reasons for our beliefs. When we reason, we connect ideas together 
            to support conclusions.
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-gray-300 font-mono text-sm">
              Example: "It's raining outside, so I should take an umbrella."
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Here, the observation about rain is a reason for the conclusion about taking an umbrella.
            </p>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Arguments Have Structure</h3>
          <p className="text-gray-200 mb-3">Every argument consists of:</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="text-blue-400 font-semibold">Premises:</span>
              <span className="text-gray-200">The starting points or assumptions (the reasons)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-400 font-semibold">Conclusion:</span>
              <span className="text-gray-200">What we're trying to establish (what the reasons support)</span>
            </li>
          </ul>
        </div>
      </div>
    ),
    hint: 'Think of premises as the "because" part and the conclusion as the "therefore" part.'
  },
  {
    id: 'identifying-arguments',
    title: 'Identifying Arguments',
    description: 'Let\'s practice identifying premises and conclusions in real arguments.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-4 text-white">Example 1: Simple Argument</h3>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50 mb-4">
            <p className="text-gray-200 font-mono">
              "All humans are mortal. Socrates is human. Therefore, Socrates is mortal."
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-blue-400">
              <strong>Premises:</strong>
            </p>
            <ul className="list-disc list-inside text-gray-200 ml-4">
              <li>All humans are mortal</li>
              <li>Socrates is human</li>
            </ul>
            <p className="text-green-400 mt-2">
              <strong>Conclusion:</strong> Socrates is mortal
            </p>
          </div>
        </div>
        <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
          <p className="text-sm text-yellow-400">
            <strong className="text-yellow-300">Tip:</strong> Look for indicator words like "therefore," "thus," "hence," 
            or "so" to identify conclusions. Words like "because," "since," or "given that" often introduce premises.
          </p>
        </div>
      </div>
    ),
    hint: 'The conclusion is what the argument is trying to convince you of.'
  },
  {
    id: 'good-vs-bad-arguments',
    title: 'Good and Bad Arguments',
    description: 'Not all arguments are created equal. Let\'s learn what makes an argument good or bad.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">What Makes an Argument Good?</h3>
          <p className="text-gray-200 mb-4">
            A good argument has two essential features:
          </p>
          <ol className="list-decimal list-inside space-y-3 text-gray-200">
            <li>
              <strong className="text-blue-300">True premises:</strong> The starting points should be factually correct
            </li>
            <li>
              <strong className="text-green-300">Valid structure:</strong> The conclusion should logically follow from the premises
            </li>
          </ol>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-green-900/20 backdrop-blur-sm border border-green-600/30 p-4 rounded-lg">
            <h4 className="font-semibold text-green-400 mb-2">Good Argument</h4>
            <p className="text-gray-200 font-mono text-sm">
              All birds have wings.<br/>
              Robins are birds.<br/>
              ∴ Robins have wings.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              ✓ True premises<br/>
              ✓ Valid structure
            </p>
          </div>
          <div className="bg-red-900/20 backdrop-blur-sm border border-red-600/30 p-4 rounded-lg">
            <h4 className="font-semibold text-red-400 mb-2">Bad Argument</h4>
            <p className="text-gray-200 font-mono text-sm">
              All birds can fly.<br/>
              Penguins are birds.<br/>
              ∴ Penguins can fly.
            </p>
            <p className="text-gray-400 text-sm mt-2">
              ✗ False premise<br/>
              ✓ Valid structure
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'validity',
    title: 'Understanding Validity',
    description: 'Validity is the core concept in logic. An argument is valid when its conclusion must be true if its premises are true.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">What is Validity?</h3>
          <p className="text-gray-200 mb-4">
            An argument is <strong className="text-blue-300">deductively valid</strong> when it's impossible for 
            the premises to be true while the conclusion is false.
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-purple-400 font-semibold mb-2">Key Insight:</p>
            <p className="text-gray-200">
              Validity is about the <em>relationship</em> between premises and conclusion, not about whether 
              the premises are actually true.
            </p>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Examples of Valid Arguments</h3>
          <div className="space-y-4">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200 font-mono text-sm">
                If it rains, the ground gets wet.<br/>
                It's raining.<br/>
                ∴ The ground is wet.
              </p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-200 font-mono text-sm">
                All cats are purple.<br/>
                Fluffy is a cat.<br/>
                ∴ Fluffy is purple.
              </p>
              <p className="text-gray-400 text-xs mt-2">
                (Valid even though the first premise is false!)
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    hint: 'Remember: validity is about structure, not truth. Even arguments with false premises can be valid!'
  },
  {
    id: 'logical-form',
    title: 'Logical Form',
    description: 'Arguments can share the same logical form even when they\'re about different topics.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">What is Logical Form?</h3>
          <p className="text-gray-200 mb-4">
            Logical form is the abstract structure of an argument, independent of its specific content. 
            Arguments with the same form will be valid or invalid together.
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-purple-400 font-semibold mb-2">Pattern: Modus Ponens</p>
            <p className="text-gray-300 font-mono">
              If P, then Q<br/>
              P<br/>
              ∴ Q
            </p>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-3 text-white">Same Form, Different Content</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-blue-400 font-semibold text-sm mb-2">Example 1</p>
              <p className="text-gray-200 font-mono text-sm">
                If it's sunny, I'll go to the beach.<br/>
                It's sunny.<br/>
                ∴ I'll go to the beach.
              </p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-green-400 font-semibold text-sm mb-2">Example 2</p>
              <p className="text-gray-200 font-mono text-sm">
                If you study, you'll pass.<br/>
                You studied.<br/>
                ∴ You'll pass.
              </p>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-3 text-center">
            Both have the same logical form: Modus Ponens
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'formal-languages',
    title: 'Why Formal Languages?',
    description: 'Natural language can be ambiguous. Formal languages help us be precise about logical relationships.',
    content: (
      <div className="space-y-4">
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">The Problem with Natural Language</h3>
          <p className="text-gray-200 mb-4">
            Natural language is full of ambiguity. Consider this sentence:
          </p>
          <div className="bg-gray-900/50 p-4 rounded border border-gray-700/50">
            <p className="text-gray-200 font-mono">
              "I saw the man with the telescope."
            </p>
            <div className="mt-3 space-y-2">
              <p className="text-gray-400 text-sm">Could mean:</p>
              <ul className="list-disc list-inside text-gray-300 text-sm ml-4">
                <li>I used a telescope to see the man</li>
                <li>I saw a man who had a telescope</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-lg border border-gray-700/50">
          <h3 className="font-semibold text-lg mb-2 text-white">Formal Languages to the Rescue</h3>
          <p className="text-gray-200 mb-4">
            Formal languages use precise symbols to eliminate ambiguity:
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-400 text-sm mb-1">Natural Language</p>
              <p className="text-gray-200">If P then Q</p>
            </div>
            <div className="bg-gray-900/50 p-3 rounded border border-gray-700/50">
              <p className="text-gray-400 text-sm mb-1">Formal Language</p>
              <p className="text-gray-200 font-mono">P → Q</p>
            </div>
          </div>
        </div>
        <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
          <p className="text-sm text-blue-400">
            <strong className="text-blue-300">Coming Next:</strong> In Chapter 2, we'll learn the official notation 
            and rules for building logical expressions!
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'summary',
    title: 'Chapter Summary',
    description: 'Let\'s review what we\'ve learned about the subject matter of logic.',
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
                <p className="text-gray-200 font-medium">Reasoning and Arguments</p>
                <p className="text-gray-400 text-sm">Arguments consist of premises that support conclusions</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Good vs Bad Arguments</p>
                <p className="text-gray-400 text-sm">Good arguments have true premises and valid structure</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Validity</p>
                <p className="text-gray-400 text-sm">Valid arguments preserve truth from premises to conclusion</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Logical Form</p>
                <p className="text-gray-400 text-sm">Arguments can share abstract structures</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-green-400 mt-1">✓</span>
              <div>
                <p className="text-gray-200 font-medium">Formal Languages</p>
                <p className="text-gray-400 text-sm">Precise notation eliminates ambiguity</p>
              </div>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center pt-4"
        >
          <p className="text-lg font-semibold text-gray-200 mb-2">
            Great job completing Chapter 1!
          </p>
          <p className="text-gray-400">
            Ready to learn about formal notation in Chapter 2?
          </p>
        </motion.div>
      </div>
    )
  }
];