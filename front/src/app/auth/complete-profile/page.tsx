'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios'; // Assuming axios is used for API calls

// TODO: Define API base URL properly (e.g., from environment variables)
const API_BASE_URL = 'http://localhost:8000'; // Adjust if your gateway runs elsewhere

// TODO: Implement proper token storage (e.g., HttpOnly cookie via API route)
// TODO: Implement a global auth context to update user state

export default function CompleteProfilePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [handle, setHandle] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const tempToken = searchParams.get('token');
    if (tempToken) {
      setToken(tempToken);
    } else {
      setError('Missing required token.');
      // Optionally redirect if token is missing
      // router.push('/login?error=Missing token');
    }
  }, [searchParams, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !handle) {
      setError('Handle cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/complete-profile`, {
        token: token,
        handle: handle,
      });

      const { access_token } = response.data;

      if (access_token) {
        // Store the token (using localStorage for simplicity, replace with secure method)
        localStorage.setItem('jwt_token', access_token);
        // TODO: Update global auth state
        // Redirect to dashboard or home page
        router.push('/dashboard'); // Adjust this route as needed
      } else {
        throw new Error('No access token received from server.');
      }

    } catch (err: any) {
      console.error('Error completing profile:', err);
      const serverError = err.response?.data?.detail || 'Failed to complete profile. Handle might be taken or token invalid/expired.';
      setError(serverError);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !error) {
      // Still waiting for token from effect
      return (
          <div className="flex min-h-screen flex-col items-center justify-center">
              <p>Loading...</p>
          </div>
      );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">Choose Your Handle</h1>
      
      {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
          </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Welcome! Since this is your first time logging in with Google, please choose a unique username (handle).
        </p>
        <div className="mb-4">
          <label htmlFor="handle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Handle
          </label>
          <input
            type="text"
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            className="w-full p-2 border rounded text-black"
            required
            minLength={3}
            maxLength={30}
            pattern="^[a-zA-Z0-9_-]+$" // Matches backend validation
            title="Handle must be 3-30 characters, alphanumeric with optional underscores and hyphens."
            disabled={isLoading}
          />
        </div>
        
        <button 
          type="submit"
          className={`w-full text-white p-2 rounded ${isLoading ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Complete Registration'}
        </button>
      </form>
    </div>
  );
} 