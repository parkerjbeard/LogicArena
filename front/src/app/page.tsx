'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { useBreakpoint } from '@/hooks/useResponsive';
import { motion } from 'framer-motion';
import ResponsiveNavigation from '@/components/ResponsiveNavigation';
import { OptimizedLayout } from '@/components/OptimizedLayout';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
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
          <h1 className="text-4xl lg:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Welcome to LogicArena
          </h1>
          <p className="text-lg lg:text-xl text-gray-300 max-w-2xl mx-auto">
            Master natural deduction through interactive tutorials, practice puzzles, and competitive duels
          </p>
        </motion.div>

        {isAuthenticated && user && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8 lg:mb-12 bg-gray-800/50 backdrop-blur-sm p-4 lg:p-6 rounded-lg border border-gray-700/50 w-full max-w-md"
          >
            <div className="text-center">
              <p className="text-gray-200 font-medium text-lg">Welcome back, {user.handle}!</p>
              <p className="text-sm text-gray-400 mt-1">Current Rating: {user.rating}</p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 w-full max-w-5xl mb-8">
          <motion.div 
            {...cardAnimation}
            transition={{ delay: 0.3 }}
            whileHover={cardAnimation.whileHover}
          >
            <Link
              href="/tutorial"
              className="block group rounded-lg border border-transparent p-6 lg:p-8 transition-all hover:border-gray-600 hover:bg-gray-800/30 bg-gradient-to-br from-purple-900/20 to-blue-900/20 h-full"
            >
              <h2 className="mb-3 text-2xl font-semibold text-purple-300 flex items-center gap-2">
                Tutorials
                <span className="text-2xl group-hover:translate-x-1 transition-transform">✨</span>
              </h2>
              <p className="text-sm lg:text-base text-gray-300">
                New to logic? Start here with interactive lessons and guided proofs.
              </p>
            </Link>
          </motion.div>

          <motion.div 
            {...cardAnimation}
            transition={{ delay: 0.4 }}
            whileHover={cardAnimation.whileHover}
          >
            <Link
              href="/practice"
              className="block group rounded-lg border border-gray-700/50 p-6 lg:p-8 transition-all hover:border-gray-600 hover:bg-gray-800/30 h-full"
            >
              <h2 className="mb-3 text-2xl font-semibold flex items-center gap-2">
                Practice
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
              </h2>
              <p className="text-sm lg:text-base text-gray-400">
                Improve your natural deduction skills with puzzles of varying difficulty.
              </p>
            </Link>
          </motion.div>

          <motion.div 
            {...cardAnimation}
            transition={{ delay: 0.5 }}
            whileHover={cardAnimation.whileHover}
          >
            <Link
              href="/duel"
              className="block group rounded-lg border border-gray-700/50 p-6 lg:p-8 transition-all hover:border-gray-600 hover:bg-gray-800/30 h-full"
            >
              <h2 className="mb-3 text-2xl font-semibold flex items-center gap-2">
                Duel
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">⚔️</span>
              </h2>
              <p className="text-sm lg:text-base text-gray-400">
                Challenge other players to real-time proof battles and climb the leaderboard.
              </p>
            </Link>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 w-full max-w-5xl">
          <motion.div 
            {...cardAnimation}
            transition={{ delay: 0.6 }}
            whileHover={cardAnimation.whileHover}
          >
            <Link
              href="/leaderboard"
              className="block group rounded-lg border border-gray-700/50 p-6 lg:p-8 transition-all hover:border-gray-600 hover:bg-gray-800/30 h-full"
            >
              <h2 className="mb-3 text-2xl font-semibold flex items-center gap-2">
                Leaderboard
                <span className="text-gray-400 group-hover:translate-x-1 transition-transform">🏆</span>
              </h2>
              <p className="text-sm lg:text-base text-gray-400">
                See the top players and their Elo ratings.
              </p>
            </Link>
          </motion.div>

          {isAuthenticated && user ? (
            <motion.div 
              {...cardAnimation}
              transition={{ delay: 0.7 }}
              whileHover={cardAnimation.whileHover}
            >
              <Link
                href={`/profile/${user.id}`}
                className="block group rounded-lg border border-gray-700/50 p-6 lg:p-8 transition-all hover:border-gray-600 hover:bg-gray-800/30 h-full"
              >
                <h2 className="mb-3 text-2xl font-semibold flex items-center gap-2">
                  My Profile
                  <span className="text-gray-400 group-hover:translate-x-1 transition-transform">👤</span>
                </h2>
                <p className="text-sm lg:text-base text-gray-400">
                  View your stats and match history.
                </p>
              </Link>
            </motion.div>
          ) : (
            <motion.div 
              {...cardAnimation}
              transition={{ delay: 0.7 }}
              whileHover={cardAnimation.whileHover}
            >
              <Link
                href="/login"
                className="block group rounded-lg border border-blue-700/50 p-6 lg:p-8 transition-all hover:border-blue-600 hover:bg-blue-900/20 h-full"
              >
                <h2 className="mb-3 text-2xl font-semibold text-blue-300 flex items-center gap-2">
                  Get Started
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </h2>
                <p className="text-sm lg:text-base text-gray-400">
                  Create an account or sign in to track your progress.
                </p>
              </Link>
            </motion.div>
          )}

          {isAuthenticated ? (
            <motion.div 
              {...cardAnimation}
              transition={{ delay: 0.8 }}
              whileHover={cardAnimation.whileHover}
            >
              <Link
                href="/classes/join"
                className="block group rounded-lg border border-purple-700/50 p-6 lg:p-8 transition-all hover:border-purple-600 hover:bg-purple-900/20 h-full"
              >
                <h2 className="mb-3 text-2xl font-semibold text-purple-300 flex items-center gap-2">
                  Join Class
                  <span className="group-hover:translate-x-1 transition-transform">🎓</span>
                </h2>
                <p className="text-sm lg:text-base text-gray-400">
                  Enter a class code to join your instructor's class.
                </p>
              </Link>
            </motion.div>
          ) : (
            <motion.div 
              {...cardAnimation}
              transition={{ delay: 0.8 }}
              className="opacity-75"
            >
              <div className="block rounded-lg border border-gray-700/50 p-6 lg:p-8 h-full cursor-not-allowed">
                <h2 className="mb-3 text-2xl font-semibold text-gray-500 flex items-center gap-2">
                  About
                  <span className="text-gray-600">→</span>
                </h2>
                <p className="text-sm lg:text-base text-gray-500">
                  Learn more about natural deduction and LogicArena. (Coming soon)
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-12 lg:mt-16 text-center"
        >
          <a
            href="https://github.com/your-repo/LogicArena"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span>View on GitHub</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </motion.div>
      </main>
    </OptimizedLayout>
  );
}