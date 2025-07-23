'use client';

import Link from 'next/link';

export default function Navigation() {
  return (
    <nav className="bg-gray-800 text-white p-4 flex justify-between items-center">
      <div className="z-10 w-full max-w-5xl mx-auto items-center justify-between font-mono text-sm flex px-4">
        <div className="flex items-center justify-between w-full py-6">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold">LogicArena</h1>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link 
              href="/practice"
              className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-blue-300 bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
            >
              Practice
            </Link>
            <Link 
              href="/leaderboard"
              className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-blue-300 bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
            >
              Leaderboard
            </Link>
            <Link 
              href="/tutorials"
              className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-blue-300 bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
            >
              Tutorials
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}