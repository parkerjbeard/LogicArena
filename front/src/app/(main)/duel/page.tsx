'use client';

import Link from 'next/link';

export default function DuelPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">Duel Mode</h1>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-lg p-8 border border-gray-700/50">
          <p className="text-gray-300 mb-6">
            Duel mode allows players to compete head-to-head in real-time proof battles. 
            This feature requires user accounts to track ratings and match players fairly.
          </p>
          <p className="text-gray-400 mb-8">
            Currently, authentication has been disabled for testing. 
            To experience competitive duels, authentication will need to be re-enabled.
          </p>
          <Link 
            href="/practice"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Practice Mode Instead
          </Link>
        </div>
      </div>
    </div>
  );
}