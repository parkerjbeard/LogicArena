'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { signIn, signUp, isAuthenticated } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/practice');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register with Supabase
        const { error: signUpError } = await signUp(email, password, {
          handle: handle || email.split('@')[0],
        });

        if (signUpError) {
          throw signUpError;
        }

        // Create user profile in our backend
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await fetch('/api/users/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                supabase_id: user.id,
                email: user.email,
                handle: handle || email.split('@')[0],
              }),
            });
          }
        } catch (profileError) {
          console.error('Failed to create profile:', profileError);
        }

        setMessage('Registration successful! Please check your email to verify your account.');
        setIsRegister(false);
      } else {
        // Sign in with Supabase
        const { error: signInError } = await signIn(email, password);

        if (signInError) {
          throw signInError;
        }

        router.push('/practice');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">LogicArena</h1>
          <p className="text-gray-400">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isRegister && (
            <div>
              <label htmlFor="handle" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                id="handle"
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="johndoe"
                pattern="[a-zA-Z0-9_]+"
                title="Username can only contain letters, numbers, and underscores"
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
              <p className="text-sm text-green-400">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
              setMessage('');
              setHandle('');
            }}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Create one"}
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700/50">
          <Link
            href="/"
            className="block text-center text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}