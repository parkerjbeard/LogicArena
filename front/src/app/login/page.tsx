'use client';

import React from 'react';
import Link from 'next/link';

export default function LoginPage() {

  const handleGoogleLogin = () => {
    // Redirect to the backend Google OAuth endpoint
    window.location.href = '/api/auth/login/google';
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-3xl font-bold mb-6">Login</h1>
      
      {/* Placeholder for Email/Password Form */}
      <div className="mb-4 p-4 bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg w-full max-w-sm">
        <h2 className="text-xl mb-4 text-gray-200">Login with Email</h2>
        <input 
          type="email" 
          placeholder="Email" 
          className="mb-3 w-full p-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          disabled 
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="mb-3 w-full p-2 bg-gray-900/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
          disabled 
        />
        <button 
          className="w-full bg-gray-600 text-gray-400 p-2 rounded-lg cursor-not-allowed"
          disabled
        >
          Login (Not Implemented)
        </button>
      </div>

      <div className="my-4 text-center text-gray-400">OR</div>

      {/* Google Login Button */}
      <button 
        onClick={handleGoogleLogin}
        className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 w-full max-w-sm mb-4 transition-colors"
      >
        Login with Google (@pepperdine.edu only)
      </button>
      
      <p className="mt-4">
        Don't have an account? <Link href="/register" className="text-blue-500 hover:underline">Register here</Link>
      </p>
    </div>
  );
} 