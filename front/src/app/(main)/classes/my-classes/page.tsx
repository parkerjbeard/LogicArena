'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ResponsiveContainer, 
  ResponsiveCard, 
  CardHeader, 
  CardContent,
  ResponsiveButton,
  ResponsiveGrid
} from '@/components/ui';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { 
  AcademicCapIcon,
  BookOpenIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface EnrolledClass {
  id: number;
  class_id: number;
  class_name: string;
  enrolled_at: string;
  is_active: boolean;
  is_approved: boolean;
  role: string;
  final_grade: string | null;
}

interface ClassDetails {
  id: number;
  name: string;
  description: string;
  code: string;
  instructor_id: number;
}

interface Assignment {
  id: number;
  title: string;
  due_date: string | null;
  points: number;
  is_published: boolean;
}

export default function MyClassesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [enrollments, setEnrollments] = useState<EnrolledClass[]>([]);
  const [classDetails, setClassDetails] = useState<Record<number, ClassDetails>>({});
  const [classAssignments, setClassAssignments] = useState<Record<number, Assignment[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrollments();
  }, []);

  const fetchEnrollments = async () => {
    try {
      // Get user's enrollments
      const enrollResponse = await api.get('/api/users/me');
      const userData = enrollResponse.data;
      
      // For now, we'll need to implement a proper endpoint to get user's enrollments
      // This is a placeholder that will need backend implementation
      setLoading(false);
    } catch (error) {
      showToast({
        message: 'Failed to load your classes',
        type: 'error'
      });
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ResponsiveContainer maxWidth="xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-400">Loading your classes...</div>
        </div>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <BookOpenIcon className="w-8 h-8" />
              My Classes
            </h1>
            <p className="text-gray-400 mt-1">View and manage your enrolled classes</p>
          </div>
          <ResponsiveButton
            variant="primary"
            onClick={() => router.push('/classes/join')}
            icon={<PlusIcon className="w-5 h-5" />}
          >
            Join New Class
          </ResponsiveButton>
        </div>

        {/* Classes Grid */}
        {enrollments.length > 0 ? (
          <ResponsiveGrid cols={{ xs: 1, md: 2, lg: 3 }} gap="md">
            <AnimatePresence>
              {enrollments.map((enrollment) => {
                const classInfo = classDetails[enrollment.class_id];
                const assignments = classAssignments[enrollment.class_id] || [];
                
                return (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ResponsiveCard variant="interactive" padding="md">
                      <CardHeader
                        title={enrollment.class_name}
                        subtitle={enrollment.is_approved ? 'Active' : 'Pending Approval'}
                      />
                      <CardContent>
                        {!enrollment.is_approved && (
                          <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-3 mb-4">
                            <p className="text-sm text-yellow-400">
                              Waiting for instructor approval
                            </p>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                          <div>
                            <p className="text-gray-400">Enrolled</p>
                            <p className="text-white font-medium">
                              {new Date(enrollment.enrolled_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Assignments</p>
                            <p className="text-white font-medium">
                              {assignments.length}
                            </p>
                          </div>
                          {enrollment.final_grade && (
                            <>
                              <div>
                                <p className="text-gray-400">Grade</p>
                                <p className="text-white font-medium">
                                  {enrollment.final_grade}
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {enrollment.is_approved && (
                          <ResponsiveButton
                            variant="primary"
                            size="sm"
                            fullWidth
                            onClick={() => router.push(`/classes/${enrollment.class_id}`)}
                          >
                            View Class
                          </ResponsiveButton>
                        )}
                      </CardContent>
                    </ResponsiveCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </ResponsiveGrid>
        ) : (
          <ResponsiveCard padding="lg">
            <CardContent>
              <div className="text-center py-12">
                <AcademicCapIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Classes Yet</h3>
                <p className="text-gray-400 mb-6">
                  You haven't joined any classes yet. Enter a class code to get started!
                </p>
                <ResponsiveButton
                  variant="primary"
                  onClick={() => router.push('/classes/join')}
                  icon={<PlusIcon className="w-5 h-5" />}
                >
                  Join Your First Class
                </ResponsiveButton>
              </div>
            </CardContent>
          </ResponsiveCard>
        )}

        {/* Instructor Section */}
        {user?.is_instructor && (
          <div className="mt-8 pt-8 border-t border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Instructor Tools</h2>
            </div>
            <ResponsiveCard padding="md">
              <CardContent>
                <p className="text-gray-300 mb-4">
                  As an instructor, you can create and manage your own classes.
                </p>
                <div className="flex gap-3">
                  <ResponsiveButton
                    variant="primary"
                    onClick={() => router.push('/instructor/dashboard')}
                  >
                    Instructor Dashboard
                  </ResponsiveButton>
                  <ResponsiveButton
                    variant="ghost"
                    onClick={() => router.push('/instructor/classes/new')}
                  >
                    Create New Class
                  </ResponsiveButton>
                </div>
              </CardContent>
            </ResponsiveCard>
          </div>
        )}
      </motion.div>
    </ResponsiveContainer>
  );
}