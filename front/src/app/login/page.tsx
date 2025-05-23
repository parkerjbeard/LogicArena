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
      <div className="mb-4 p-4 border rounded-md w-full max-w-sm">
        <h2 className="text-xl mb-2">Login with Email</h2>
        <input 
          type="email" 
          placeholder="Email" 
          className="mb-2 w-full p-2 border rounded text-black" 
          disabled 
        />
        <input 
          type="password" 
          placeholder="Password" 
          className="mb-2 w-full p-2 border rounded text-black" 
          disabled 
        />
        <button 
          className="w-full bg-gray-500 text-white p-2 rounded hover:bg-gray-600 cursor-not-allowed"
          disabled
        >
          Login (Not Implemented)
        </button>
      </div>

      <div className="my-4 text-center">OR</div>

      {/* Google Login Button */}
      <button 
        onClick={handleGoogleLogin}
        className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 w-full max-w-sm mb-4"
      >
        Login with Google (@pepperdine.edu only)
      </button>
      
      <p className="mt-4">
        Don't have an account? <Link href="/register" className="text-blue-500 hover:underline">Register here</Link>
      </p>
    </div>
  );
} 