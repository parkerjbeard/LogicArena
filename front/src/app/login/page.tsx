'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Check for error messages
    const error = searchParams.get('error');
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
    
    // Check for success messages
    const message = searchParams.get('message');
    if (message) {
      setSuccessMessage(decodeURIComponent(message));
    }
    
    // Redirect if already authenticated
    const redirect = searchParams.get('redirect');
    if (isAuthenticated) {
      router.push(redirect || '/');
    }
  }, [searchParams, isAuthenticated, router]);

  const handleGoogleLogin = () => {
    // Check for redirect parameter
    const redirect = searchParams.get('redirect');
    const redirectParam = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
    
    // Get API URL from environment or default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Redirect to the backend Google OAuth endpoint
    window.location.href = `${apiUrl}/api/auth/login/google${redirectParam}`;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await login(email, password);
      const redirect = searchParams.get('redirect');
      router.push(redirect || '/');
    } catch (error: any) {
      setErrorMessage(error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">Login</h1>
      
      {successMessage && (
        <div className="mb-4 p-4 bg-green-900/20 backdrop-blur-sm border border-green-600/30 rounded-lg w-full max-w-sm">
          <p className="text-sm text-green-400">{successMessage}</p>
        </div>
      )}
      
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg w-full max-w-sm">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}
      
      {/* Email/Password Form */}
      <form onSubmit={handleEmailLogin} className="mb-4 p-4 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg w-full max-w-sm">
        <h2 className="text-xl mb-4 text-gray-200">Login with Email</h2>
        <input 
          type="email" 
          placeholder="Email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full p-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          required
          disabled={isLoading}
        />
        <input 
          type="password" 
          placeholder="Password" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full p-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          required
          disabled={isLoading}
        />
        <button 
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div className="my-4 text-center text-gray-400">OR</div>

      {/* Google Login Button */}
      <button 
        onClick={handleGoogleLogin}
        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 w-full max-w-sm mb-4 transition-colors"
      >
        Login with Google
      </button>
      
      <p className="mt-4">
        Don't have an account? <Link href="/register" className="text-blue-500 hover:underline">Register here</Link>
      </p>
    </div>
  );
} 