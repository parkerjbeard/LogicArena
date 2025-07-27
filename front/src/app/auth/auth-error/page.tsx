'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-md text-center"
      >
        <div className="mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
          <p className="text-gray-400">
            There was a problem confirming your email or processing your authentication request.
          </p>
        </div>

        <div className="space-y-4 text-sm text-gray-300">
          <p>This could happen if:</p>
          <ul className="text-left space-y-2 ml-6">
            <li>• The confirmation link has expired</li>
            <li>• The link has already been used</li>
            <li>• The link is invalid or corrupted</li>
          </ul>
        </div>

        <div className="mt-8 space-y-3">
          <Link
            href="/login"
            className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Login
          </Link>
          <Link
            href="/"
            className="block w-full py-3 px-4 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}