'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { 
  BookOpen, 
  Play, 
  CheckCircle, 
  Lock, 
  Clock,
  TrendingUp,
  Sparkles,
  Users,
  ChevronLeft
} from 'lucide-react';
import { TutorialFramework } from '@/components/Tutorial/TutorialFramework';
import { yourFirstProofSteps } from '@/tutorials/yourFirstProof';
import { usingAssumptionsSteps } from '@/tutorials/usingAssumptions';
import { nestedDerivationsTutorial } from '@/tutorials/nestedDerivations';

interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // in minutes
  icon: React.ReactNode;
  steps: any[]; // TutorialStep[]
  prerequisites?: string[];
  completed?: boolean;
  locked?: boolean;
}

const tutorials: Tutorial[] = [
  {
    id: 'first-proof',
    title: 'Your First Proof',
    description: 'Learn the basics of formal proofs with Modus Ponens',
    difficulty: 'beginner',
    estimatedTime: 10,
    icon: <Sparkles className="w-6 h-6" />,
    steps: yourFirstProofSteps,
    completed: false,
    locked: false
  },
  {
    id: 'using-assumptions',
    title: 'Using Assumptions',
    description: 'Master conditional proofs with the assumption technique',
    difficulty: 'beginner',
    estimatedTime: 15,
    icon: <TrendingUp className="w-6 h-6" />,
    steps: usingAssumptionsSteps,
    prerequisites: ['first-proof'],
    completed: false,
    locked: false
  },
  {
    id: 'nested-derivations',
    title: 'Chapter 5: Nested Derivations',
    description: 'Learn to work with multiple assumptions and understand available vs unavailable lines',
    difficulty: 'intermediate',
    estimatedTime: 30,
    icon: <BookOpen className="w-6 h-6" />,
    steps: nestedDerivationsTutorial,
    prerequisites: ['using-assumptions'],
    completed: false,
    locked: false
  },
  {
    id: 'proof-by-contradiction',
    title: 'Proof by Contradiction',
    description: 'Learn RAA (Reductio ad Absurdum) to prove statements indirectly',
    difficulty: 'intermediate',
    estimatedTime: 20,
    icon: <Users className="w-6 h-6" />,
    steps: [], // To be implemented
    prerequisites: ['using-assumptions'],
    completed: false,
    locked: true
  },
  {
    id: 'working-with-and-or',
    title: 'Working with And/Or',
    description: 'Master conjunction and disjunction rules in proofs',
    difficulty: 'intermediate',
    estimatedTime: 25,
    icon: <BookOpen className="w-6 h-6" />,
    steps: [], // To be implemented
    prerequisites: ['first-proof'],
    completed: false,
    locked: true
  }
];

export default function TutorialsPage() {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);

  const handleStartTutorial = (tutorial: Tutorial) => {
    if (!tutorial.locked) {
      setSelectedTutorial(tutorial);
    }
  };

  const handleCompleteTutorial = () => {
    if (selectedTutorial) {
      setCompletedTutorials([...completedTutorials, selectedTutorial.id]);
      setSelectedTutorial(null);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      case 'intermediate': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'advanced': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTutorialStatus = (tutorial: Tutorial) => {
    if (completedTutorials.includes(tutorial.id)) return 'completed';
    if (tutorial.locked) return 'locked';
    return 'available';
  };

  return (
    <main className="flex min-h-screen flex-col items-center">
      {/* Header - matching landing page */}
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex">
        <div className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <Link href="/" className="flex items-center gap-2 hover:underline">
            <ChevronLeft className="w-4 h-4" />
            <h1 className="text-2xl font-bold">LogicArena-α</h1>
          </Link>
        </div>
      </div>

      {/* Title */}
      <div className="relative flex place-items-center mt-20 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold mb-4">Interactive Tutorials</h1>
          <p className="text-lg opacity-75">
            Learn formal logic step by step with guided lessons
          </p>
        </motion.div>
      </div>

      {/* Tutorial Grid */}
      <div className="w-full max-w-5xl px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tutorials.map((tutorial, index) => {
            const status = getTutorialStatus(tutorial);
            
            return (
              <motion.div
                key={tutorial.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`
                  group rounded-lg border border-transparent px-5 py-4 
                  transition-colors hover:border-gray-300 hover:bg-gray-100 
                  hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30
                  ${status === 'locked' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                  ${tutorial.id === 'first-proof' ? 'bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10' : ''}
                `}
                onClick={() => handleStartTutorial(tutorial)}
              >
                {/* Tutorial Content */}
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-2xl font-semibold">
                    {tutorial.title}{' '}
                    {status === 'completed' ? (
                      <CheckCircle className="inline w-5 h-5 text-green-500 ml-2" />
                    ) : status === 'locked' ? (
                      <Lock className="inline w-5 h-5 text-gray-400 ml-2" />
                    ) : (
                      <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                        →
                      </span>
                    )}
                  </h2>
                </div>
                
                <p className="m-0 max-w-[30ch] text-sm opacity-50 mb-4">
                  {tutorial.description}
                </p>

                {/* Bottom info */}
                <div className="flex items-center justify-between text-xs opacity-50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{tutorial.estimatedTime} min</span>
                  </div>
                  
                  {tutorial.prerequisites && tutorial.prerequisites.length > 0 && (
                    <div className="flex items-center gap-1">
                      <span>Requires:</span>
                      {tutorial.prerequisites.map(prereq => {
                        const prereqTutorial = tutorials.find(t => t.id === prereq);
                        return (
                          <span key={prereq} className="font-medium">
                            {prereqTutorial?.title}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  
                  <span className={`
                    px-2 py-0.5 rounded-full text-xs
                    ${getDifficultyColor(tutorial.difficulty)}
                  `}>
                    {tutorial.difficulty}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Coming Soon */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center mb-8"
        >
          <p className="text-sm opacity-50">
            More tutorials coming soon! Check back regularly for new content.
          </p>
        </motion.div>
      </div>

      {/* Tutorial Modal */}
      {selectedTutorial && selectedTutorial.steps.length > 0 && (
        <TutorialFramework
          title={selectedTutorial.title}
          steps={selectedTutorial.steps}
          onComplete={handleCompleteTutorial}
          onExit={() => setSelectedTutorial(null)}
        />
      )}
    </main>
  );
}