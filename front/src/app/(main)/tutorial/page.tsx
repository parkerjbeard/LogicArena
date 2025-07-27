'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
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
import { TutorialFramework } from '@/components/Tutorial/LazyTutorialFramework';
import { yourFirstProofSteps } from '@/tutorials/yourFirstProof';
import { usingAssumptionsSteps } from '@/tutorials/usingAssumptions';
import { nestedDerivationsTutorial } from '@/tutorials/nestedDerivations';
import { chapter1SubjectMatterOfLogicSteps } from '@/tutorials/chapter1SubjectMatterOfLogic';
import { chapter2OfficialUnofficialNotationSteps } from '@/tutorials/chapter2OfficialUnofficialNotation';
import { chapter3DerivationsSteps } from '@/tutorials/chapter3Derivations';
import { chapter4ConditionalDerivationsSteps } from '@/tutorials/chapter4ConditionalDerivations';
import { chapter5NestedDerivationsSteps } from '@/tutorials/chapter5NestedDerivations';
import { chapter6IndirectDerivationsSteps } from '@/tutorials/chapter6IndirectDerivations';

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
    id: 'chapter-1',
    title: 'Chapter 1: The Subject Matter of Logic',
    description: 'Understand what logic is, how arguments work, and the concept of validity',
    difficulty: 'beginner',
    estimatedTime: 20,
    icon: <BookOpen className="w-6 h-6" />,
    steps: chapter1SubjectMatterOfLogicSteps,
    completed: false,
    locked: false
  },
  {
    id: 'chapter-2',
    title: 'Chapter 2: Official and Unofficial Notation',
    description: 'Learn logical symbols, notation rules, and translation between English and logic',
    difficulty: 'beginner',
    estimatedTime: 25,
    icon: <BookOpen className="w-6 h-6" />,
    steps: chapter2OfficialUnofficialNotationSteps,
    prerequisites: ['chapter-1'],
    completed: false,
    locked: false
  },
  {
    id: 'chapter-3',
    title: 'Chapter 3: Derivations',
    description: 'Master basic inference rules: Modus Ponens, Modus Tollens, and Double Negation',
    difficulty: 'beginner',
    estimatedTime: 30,
    icon: <BookOpen className="w-6 h-6" />,
    steps: chapter3DerivationsSteps,
    prerequisites: ['chapter-2'],
    completed: false,
    locked: false
  },
  {
    id: 'first-proof',
    title: 'Your First Proof (Practice)',
    description: 'Hands-on practice with Modus Ponens in a simple proof',
    difficulty: 'beginner',
    estimatedTime: 10,
    icon: <Sparkles className="w-6 h-6" />,
    steps: yourFirstProofSteps,
    prerequisites: ['chapter-3'],
    completed: false,
    locked: false
  },
  {
    id: 'chapter-4',
    title: 'Chapter 4: Conditional Derivations',
    description: 'Learn to prove "if-then" statements using hypothetical reasoning',
    difficulty: 'intermediate',
    estimatedTime: 30,
    icon: <BookOpen className="w-6 h-6" />,
    steps: chapter4ConditionalDerivationsSteps,
    prerequisites: ['chapter-3'],
    completed: false,
    locked: false
  },
  {
    id: 'using-assumptions',
    title: 'Using Assumptions (Practice)',
    description: 'Practice conditional proofs with the assumption technique',
    difficulty: 'intermediate',
    estimatedTime: 15,
    icon: <TrendingUp className="w-6 h-6" />,
    steps: usingAssumptionsSteps,
    prerequisites: ['chapter-4'],
    completed: false,
    locked: false
  },
  {
    id: 'chapter-5',
    title: 'Chapter 5: Nested Derivations',
    description: 'Work with multiple assumption layers and understand line availability',
    difficulty: 'intermediate',
    estimatedTime: 35,
    icon: <BookOpen className="w-6 h-6" />,
    steps: chapter5NestedDerivationsSteps,
    prerequisites: ['chapter-4'],
    completed: false,
    locked: false
  },
  {
    id: 'nested-derivations',
    title: 'Nested Derivations (Practice)',
    description: 'Practice working with multiple assumptions and complex proofs',
    difficulty: 'intermediate',
    estimatedTime: 30,
    icon: <Users className="w-6 h-6" />,
    steps: nestedDerivationsTutorial,
    prerequisites: ['chapter-5'],
    completed: false,
    locked: false
  },
  {
    id: 'chapter-6',
    title: 'Chapter 6: Indirect Derivations',
    description: 'Master proof by contradiction - showing negations lead to impossibility',
    difficulty: 'advanced',
    estimatedTime: 35,
    icon: <BookOpen className="w-6 h-6" />,
    steps: chapter6IndirectDerivationsSteps,
    prerequisites: ['chapter-5'],
    completed: false,
    locked: false
  }
];


export default function TutorialsPage() {
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [completedTutorials, setCompletedTutorials] = useState<string[]>([]);
  const { userId } = useAuth();


  const handleStartTutorial = (tutorial: Tutorial) => {
    if (!tutorial.locked) {
      setSelectedTutorial(tutorial);
    }
  };

  const handleCompleteTutorial = async () => {
    if (selectedTutorial) {
      setCompletedTutorials([...completedTutorials, selectedTutorial.id]);
      
      // Track tutorial completion in the backend
      try {
        // Use authenticated user ID or fallback to anonymous
        const actualUserId = userId || 1;
        
        const response = await fetch('/api/tutorials/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_id: userId,
            tutorial_id: selectedTutorial.id,
            progress_data: {
              completed_steps: selectedTutorial.steps.length,
              total_steps: selectedTutorial.steps.length
            }
          })
        });
        
        if (response.ok) {
          console.log(`Tutorial ${selectedTutorial.id} completion tracked successfully`);
        }
      } catch (error) {
        console.error('Failed to track tutorial completion:', error);
      }
      
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

      {/* Tutorial Sections */}
      <div className="w-full max-w-5xl px-4">
        {/* Lessons Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Lessons</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.filter(tutorial => !tutorial.title.includes('(Practice)')).map((tutorial, index) => {
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
                    ${tutorial.id === 'chapter-1' ? 'bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-900/10 dark:to-blue-900/10' : ''}
                  `}
                  onClick={() => handleStartTutorial(tutorial)}
                >
                  {/* Tutorial Content */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-2xl font-semibold">
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
                    </h3>
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
        </div>

        {/* Practice Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Practice</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.filter(tutorial => tutorial.title.includes('(Practice)')).map((tutorial, index) => {
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
                  `}
                  onClick={() => handleStartTutorial(tutorial)}
                >
                  {/* Tutorial Content */}
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-2xl font-semibold">
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
                    </h3>
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
      {selectedTutorial && (
        <TutorialFramework
          title={selectedTutorial.title}
          steps={selectedTutorial.steps || []}
          onComplete={handleCompleteTutorial}
          onExit={() => setSelectedTutorial(null)}
        />
      )}
    </main>
  );
}