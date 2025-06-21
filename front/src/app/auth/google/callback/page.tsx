'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export default function GoogleCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuthToken, refreshAuth } = useAuth();
  const [isProcessing, setIsProcessing] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Processing login...');

  useEffect(() => {
    const token = searchParams.get('token');
    const tempToken = searchParams.get('temp_token');
    const error = searchParams.get('error');

    const processCallback = async () => {
      if (error) {
        console.error('Google OAuth Error:', error);
        setStatusMessage(`Authentication failed: ${error}`);
        setIsProcessing(false);
        
        setTimeout(() => {
          router.push(`/login?error=${encodeURIComponent(error)}`);
        }, 2000);
        
      } else if (token) {
        console.log('Received JWT token');
        setStatusMessage('Login successful! Redirecting...');
        
        try {
          // Use the AuthContext to set the token
          setAuthToken(token);
          
          // Wait for auth refresh
          await refreshAuth();
          
          setIsProcessing(false);
          
          setTimeout(() => {
            router.push('/');
          }, 1000);
          
        } catch (err) {
          console.error('Error processing token:', err);
          setStatusMessage('Error processing authentication');
          setIsProcessing(false);
          
          setTimeout(() => {
            router.push('/login?error=token_processing_error');
          }, 2000);
        }
        
      } else if (tempToken) {
        console.log('Received temporary registration token');
        setStatusMessage('Completing registration...');
        setIsProcessing(false);
        
        router.push(`/auth/complete-profile?token=${encodeURIComponent(tempToken)}`);
        
      } else {
        console.error('Invalid callback state');
        setStatusMessage('Invalid authentication state');
        setIsProcessing(false);
        
        setTimeout(() => {
          router.push('/login?error=invalid_callback_state');
        }, 2000);
      }
    };

    processCallback();
    
  }, [searchParams, router, setAuthToken, refreshAuth]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <div className="text-center">
          {isProcessing ? (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          ) : (
            <div className="h-12 w-12 mx-auto mb-4 flex items-center justify-center">
              {statusMessage.includes('successful') ? (
                <div className="rounded-full bg-green-100 p-2">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="rounded-full bg-red-100 p-2">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
          )}
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Google Authentication
          </h2>
          
          <p className="text-gray-600">
            {statusMessage}
          </p>
          
          {!isProcessing && (
            <div className="mt-4">
              <button
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Return to login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 