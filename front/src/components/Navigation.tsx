'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';

export default function Navigation() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="w-full">
      <div className="z-10 w-full max-w-5xl mx-auto items-center justify-between font-mono text-sm flex px-4">
        <div className="flex items-center justify-between w-full py-6">
          <Link href="/" className="flex items-center">
            <h1 className="text-2xl font-bold">LogicArena-α</h1>
          </Link>
          
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="text-gray-300 text-sm">
                    {user.handle} • Rating: {user.rating}
                  </span>
                  <Link 
                    href={`/profile/${user.id}`}
                    className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
                  >
                    Profile
                  </Link>
                  <Link 
                    href="/account"
                    className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
                  >
                    Account
                  </Link>
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  href="/login"
                  className="px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 rounded-md border border-gray-700 hover:bg-gray-700/50 transition-all"
                >
                  Login
                </Link>
                <Link 
                  href="/register"
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}