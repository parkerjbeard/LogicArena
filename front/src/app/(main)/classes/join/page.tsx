'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, 
  ResponsiveCard, 
  CardHeader, 
  CardContent,
  ResponsiveButton,
  ResponsiveInput,
  FormFieldGroup,
  FormActions
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { 
  AcademicCapIcon,
  QrCodeIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function JoinClassPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [joinedClass, setJoinedClass] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classCode || classCode.length !== 6) {
      showToast({
        message: 'Please enter a valid 6-character class code',
        type: 'error'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/instructor/classes/join', {
        class_code: classCode.toUpperCase()
      });
      
      if (response.data) {
        setJoinedClass(response.data);
        showToast({
          message: `Successfully joined ${response.data.class_name}!`,
          type: 'success'
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          router.push('/classes/my-classes');
        }, 2000);
      }
    } catch (error: any) {
      showToast({
        message: error.response?.data?.detail || 'Failed to join class',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (value.length <= 6) {
      setClassCode(value);
    }
  };

  if (joinedClass) {
    return (
      <ResponsiveContainer maxWidth="md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveCard padding="lg">
            <CardContent>
              <div className="text-center py-8">
                <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Welcome to {joinedClass.class_name}!
                </h2>
                <p className="text-gray-400 mb-6">
                  You've successfully joined the class. Redirecting to your classes...
                </p>
                <ResponsiveButton
                  variant="primary"
                  onClick={() => router.push('/classes/my-classes')}
                >
                  Go to My Classes
                </ResponsiveButton>
              </div>
            </CardContent>
          </ResponsiveCard>
        </motion.div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer maxWidth="md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ResponsiveCard padding="lg">
          <CardHeader
            title="Join a Class"
            subtitle="Enter the class code provided by your instructor"
          />
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-6">
                <div className="flex items-center justify-center mb-4">
                  <QrCodeIcon className="w-12 h-12 text-blue-400" />
                </div>
                <p className="text-center text-blue-400 mb-6">
                  Ask your instructor for the 6-character class code
                </p>
                
                <FormFieldGroup>
                  <ResponsiveInput
                    label="Class Code"
                    value={classCode}
                    onChange={handleCodeChange}
                    placeholder="ABC123"
                    maxLength={6}
                    className="text-center text-2xl font-mono tracking-widest"
                    hint={`${classCode.length}/6 characters`}
                  />
                </FormFieldGroup>
              </div>

              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-white">What to expect:</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    Access to class assignments and puzzles
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    Track your progress and grades
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    Compete with classmates on the class leaderboard
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">•</span>
                    Get feedback from your instructor
                  </li>
                </ul>
              </div>

              <FormActions align="center">
                <ResponsiveButton
                  variant="ghost"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </ResponsiveButton>
                <ResponsiveButton
                  type="submit"
                  variant="primary"
                  disabled={classCode.length !== 6 || loading}
                  size="lg"
                >
                  {loading ? 'Joining...' : 'Join Class'}
                </ResponsiveButton>
              </FormActions>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                Are you an instructor?{' '}
                <button
                  onClick={() => router.push('/instructor/request')}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Request instructor access
                </button>
              </p>
            </div>
          </CardContent>
        </ResponsiveCard>
      </motion.div>
    </ResponsiveContainer>
  );
}