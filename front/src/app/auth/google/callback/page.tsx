'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import React from 'react';

// TODO: Implement proper token storage (e.g., HttpOnly cookie via API route)
// TODO: Implement a global auth context to update user state
// TODO: Define a proper loading state component

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const token = searchParams.get('token');
    const tempToken = searchParams.get('temp_token');
    const error = searchParams.get('error');

    if (error) {
      console.error('Google OAuth Error:', error);
      // Redirect to login page with error message
      // TODO: Implement displaying the error on the login page
      router.push(`/login?error=${encodeURIComponent(error)}`);
    } else if (token) {
      console.log('Received JWT:', token);
      // Store the token (using localStorage for simplicity, replace with secure method)
      localStorage.setItem('jwt_token', token);
      // TODO: Update global auth state
      // Redirect to dashboard or home page
      router.push('/dashboard'); // Adjust this route as needed
    } else if (tempToken) {
      console.log('Received temporary token:', tempToken);
      // Redirect to complete profile page with the temporary token
      router.push(`/auth/complete-profile?token=${encodeURIComponent(tempToken)}`);
    } else {
      // No expected parameters, redirect to login
      console.error('Invalid callback state');
      router.push('/login?error=Invalid callback state');
    }

    // Dependency array ensures this runs only when searchParams change
  }, [searchParams, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <p>Processing login...</p>
      {/* Add a spinner or loading indicator here */}
    </div>
  );
} 