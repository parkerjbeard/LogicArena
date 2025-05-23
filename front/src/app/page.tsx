'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <main className="flex min-h-screen flex-col items-center">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex">
        <div className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
          <h1 className="text-2xl font-bold">LogicArena-α</h1>
        </div>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <a
            className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            href="https://github.com/your-repo/LogicArena"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>GitHub</span>
          </a>
        </div>
      </div>

      <div className="relative flex place-items-center mt-20 mb-10">
        <h1 className="text-4xl font-bold">Welcome to LogicArena</h1>
      </div>

      {isAuthenticated && user && (
        <div className="mb-6 bg-indigo-50 p-4 rounded-lg shadow-sm w-full max-w-md">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-indigo-900 font-medium">Welcome, {user.handle}</p>
              <p className="text-sm text-indigo-700">Rating: {user.rating}</p>
            </div>
            <div className="flex space-x-3">
              <Link 
                href={`/profile/${user.id}`}
                className="px-3 py-1 text-sm font-medium text-indigo-600 bg-white rounded-md border border-indigo-200 hover:bg-indigo-50"
              >
                My Profile
              </Link>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm font-medium text-red-600 bg-white rounded-md border border-red-200 hover:bg-red-50"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-32 grid text-center lg:mb-0 lg:grid-cols-2 lg:text-left gap-8">
        <Link
          href="/practice"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Practice{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Improve your natural deduction skills with puzzles of varying difficulty.
          </p>
        </Link>

        <Link
          href="/duel"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Duel{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Challenge other players to real-time proof battles and climb the leaderboard.
          </p>
        </Link>
      </div>

      <div className="mt-8 grid text-center lg:grid-cols-3 lg:text-left gap-8">
        <Link
          href="/leaderboard"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
        >
          <h2 className={`mb-3 text-2xl font-semibold`}>
            Leaderboard{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            See the top players and their Elo ratings.
          </p>
        </Link>

        {isAuthenticated && user ? (
          <Link
            href={`/profile/${user.id}`}
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <h2 className={`mb-3 text-2xl font-semibold`}>
              My Profile{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              View your stats and match history.
            </p>
          </Link>
        ) : (
          <Link
            href="/login"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30"
          >
            <h2 className={`mb-3 text-2xl font-semibold`}>
              Login/Register{' '}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                →
              </span>
            </h2>
            <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
              Create an account or sign in to track your progress.
            </p>
          </Link>
        )}

        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className={`mb-3 text-2xl font-semibold`}>
            About{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              →
            </span>
          </h2>
          <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>
            Learn more about natural deduction and LogicArena.
          </p>
        </div>
      </div>
    </main>
  );
} 