'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    handle: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.register(
        formData.handle,
        formData.email,
        formData.password
      );

      if (response) {
        // Registration successful, redirect to login
        router.push('/login?message=Registration successful! Please login.');
      }
    } catch (error: any) {
      setErrorMessage(
        error.response?.data?.detail || 
        'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">Register</h1>
      
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-900/20 backdrop-blur-sm border border-red-600/30 rounded-lg w-full max-w-sm">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <div className="mb-4 p-6 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg">
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Username
            </label>
            <input 
              type="text" 
              name="handle"
              placeholder="Choose a username" 
              value={formData.handle}
              onChange={handleChange}
              className="w-full p-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              required
              disabled={isLoading}
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_-]+"
              title="Username can only contain letters, numbers, underscores, and hyphens"
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Email
            </label>
            <input 
              type="email" 
              name="email"
              placeholder="your@email.com" 
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              required
              disabled={isLoading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Password
            </label>
            <input 
              type="password" 
              name="password"
              placeholder="••••••••" 
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Confirm Password
            </label>
            <input 
              type="password" 
              name="confirmPassword"
              placeholder="••••••••" 
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Register'}
          </button>
        </div>
      </form>
      
      <p className="mt-4">
        Already have an account? <Link href="/login" className="text-blue-500 hover:underline">Login here</Link>
      </p>
    </div>
  );
}