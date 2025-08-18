'use client';

import Link from 'next/link';
import { useBreakpoint } from '@/hooks/useResponsive';
import { motion } from 'framer-motion';
import ResponsiveNavigation from '@/components/ResponsiveNavigation';
import { OptimizedLayout } from '@/components/OptimizedLayout';

export default function Home() {
  const { isMobile } = useBreakpoint();

  const cardAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    whileHover: isMobile ? {} : { scale: 1.02, transition: { duration: 0.2 } }
  };

  return (
    <OptimizedLayout>
      <ResponsiveNavigation />
      <main className="flex min-h-screen flex-col items-center px-4 py-8 lg:py-16">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 lg:mb-16"
        >
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent inline-block leading-tight lg:leading-[1.1] tracking-tight pb-1">
            Welcome to LogicArena
          </h1>
          <p className="text-lg lg:text-xl text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
            Master natural deduction through interactive tutorials, practice puzzles, and competitive duels
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 w-full max-w-5xl">
          <motion.div
            {...cardAnimation}
            transition={{ delay: 0.1 }}
          >
            <Link href="/tutorial">
              <div className="surface p-6 lg:p-8 rounded-lg border border-default hover:opacity-95 transition-all cursor-pointer h-full">
                <h2 className="text-xl lg:text-2xl font-semibold mb-3">📚 Interactive Tutorials</h2>
                <p className="text-gray-700 dark:text-gray-300 text-sm lg:text-base">
                  Learn natural deduction step-by-step with guided lessons and interactive proof exercises
                </p>
              </div>
            </Link>
          </motion.div>

          <motion.div
            {...cardAnimation}
            transition={{ delay: 0.2 }}
          >
            <Link href="/practice">
              <div className="surface p-6 lg:p-8 rounded-lg border border-default hover:opacity-95 transition-all cursor-pointer h-full">
                <h2 className="text-xl lg:text-2xl font-semibold mb-3">🧩 Practice Mode</h2>
                <p className="text-gray-700 dark:text-gray-300 text-sm lg:text-base">
                  Solve puzzles at your own pace, from beginner to expert difficulty levels
                </p>
              </div>
            </Link>
          </motion.div>

          <motion.div
            {...cardAnimation}
            transition={{ delay: 0.3 }}
          >
            <Link href="/leaderboard">
              <div className="surface p-6 lg:p-8 rounded-lg border border-default hover:opacity-95 transition-all cursor-pointer h-full">
                <h2 className="text-xl lg:text-2xl font-semibold mb-3">🏆 Leaderboard</h2>
                <p className="text-gray-700 dark:text-gray-300 text-sm lg:text-base">
                  See the top players and track your progress in the global rankings
                </p>
              </div>
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 lg:mt-16 text-center max-w-3xl"
        >
          <h3 className="text-lg lg:text-xl font-semibold mb-4">What is Natural Deduction?</h3>
          <p className="text-gray-700 dark:text-gray-400 text-sm lg:text-base leading-relaxed">
            Natural deduction is a formal proof system in logic where you derive conclusions from premises using logical rules. 
            In LogicArena, you&apos;ll learn to construct proofs using inference rules like modus ponens, modus tollens, 
            and many others. Whether you&apos;re a student, educator, or logic enthusiast, LogicArena provides an engaging 
            platform to sharpen your logical reasoning skills.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 lg:mt-12"
        >
          <Link 
            href="/practice" 
            className="inline-block px-6 lg:px-8 py-3 lg:py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base lg:text-lg"
          >
            Start Practicing Now
          </Link>
        </motion.div>
      </main>
    </OptimizedLayout>
  );
}