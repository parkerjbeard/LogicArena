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
import InstructorGuard from '@/components/InstructorGuard';
import api from '@/lib/api';
import { 
  AcademicCapIcon, 
  PlusIcon, 
  UserGroupIcon,
  BookOpenIcon,
  ChartBarIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

interface ClassData {
  id: number;
  code: string;
  name: string;
  description: string;
  student_count: number;
  created: string;
  archived: boolean;
}

interface ClassStats {
  total_students: number;
  active_students: number;
  total_assignments: number;
  published_assignments: number;
  submissions_today: number;
  average_class_grade: number | null;
  completion_rate: number | null;
}

export default function InstructorDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<number, ClassStats>>({});

  useEffect(() => {
    if (!user?.is_instructor && !user?.is_admin) {
      router.push('/account');
      return;
    }
    fetchClasses();
  }, [user]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/instructor/classes');
      setClasses(response.data);
      
      // Fetch stats for each class
      response.data.forEach(async (cls: ClassData) => {
        if (!cls.archived) {
          try {
            const statsResponse = await api.get(`/api/instructor/classes/${cls.id}/stats`);
            setStats(prev => ({ ...prev, [cls.id]: statsResponse.data }));
          } catch (error) {
            console.error(`Failed to fetch stats for class ${cls.id}:`, error);
          }
        }
      });
    } catch (error) {
      showToast({
        message: 'Failed to load classes',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveClass = async (classId: number) => {
    try {
      await api.delete(`/api/instructor/classes/${classId}`);
      showToast({
        message: 'Class archived successfully',
        type: 'success'
      });
      fetchClasses();
    } catch (error) {
      showToast({
        message: 'Failed to archive class',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <ResponsiveContainer maxWidth="xl">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-gray-400">Loading...</div>
        </div>
      </ResponsiveContainer>
    );
  }

  const activeClasses = classes.filter(c => !c.archived);
  const archivedClasses = classes.filter(c => c.archived);

  return (
    <InstructorGuard>
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
              <AcademicCapIcon className="w-8 h-8" />
              Instructor Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Manage your classes and track student progress</p>
          </div>
          <ResponsiveButton
            variant="primary"
            onClick={() => router.push('/instructor/classes/new')}
            icon={<PlusIcon className="w-5 h-5" />}
          >
            Create New Class
          </ResponsiveButton>
        </div>

        {/* Quick Stats */}
        <ResponsiveGrid cols={{ xs: 1, sm: 2, lg: 4 }} gap="md">
          <ResponsiveCard padding="md">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Classes</p>
                  <p className="text-2xl font-bold text-white">{activeClasses.length}</p>
                </div>
                <BookOpenIcon className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </ResponsiveCard>

          <ResponsiveCard padding="md">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Students</p>
                  <p className="text-2xl font-bold text-white">
                    {activeClasses.reduce((sum, cls) => sum + cls.student_count, 0)}
                  </p>
                </div>
                <UserGroupIcon className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </ResponsiveCard>

          <ResponsiveCard padding="md">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Active Assignments</p>
                  <p className="text-2xl font-bold text-white">
                    {Object.values(stats).reduce((sum, s) => sum + (s.published_assignments || 0), 0)}
                  </p>
                </div>
                <BookOpenIcon className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </ResponsiveCard>

          <ResponsiveCard padding="md">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Submissions Today</p>
                  <p className="text-2xl font-bold text-white">
                    {Object.values(stats).reduce((sum, s) => sum + (s.submissions_today || 0), 0)}
                  </p>
                </div>
                <ChartBarIcon className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </ResponsiveCard>
        </ResponsiveGrid>

        {/* Active Classes */}
        {activeClasses.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Active Classes</h2>
            <ResponsiveGrid cols={{ xs: 1, md: 2, lg: 3 }} gap="md">
              <AnimatePresence>
                {activeClasses.map((cls) => {
                  const classStats = stats[cls.id];
                  return (
                    <motion.div
                      key={cls.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ResponsiveCard variant="interactive" padding="md">
                        <CardHeader
                          title={cls.name}
                          subtitle={`Code: ${cls.code}`}
                        />
                        <CardContent>
                          <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                            {cls.description || 'No description provided'}
                          </p>
                          
                          <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                            <div>
                              <p className="text-gray-400">Students</p>
                              <p className="text-white font-medium">{cls.student_count}</p>
                            </div>
                            <div>
                              <p className="text-gray-400">Assignments</p>
                              <p className="text-white font-medium">
                                {classStats?.published_assignments || 0}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Completion</p>
                              <p className="text-white font-medium">
                                {classStats?.completion_rate 
                                  ? `${Math.round(classStats.completion_rate)}%` 
                                  : 'N/A'}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Created</p>
                              <p className="text-white font-medium">
                                {new Date(cls.created).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <ResponsiveButton
                              variant="primary"
                              size="sm"
                              onClick={() => router.push(`/instructor/classes/${cls.id}`)}
                              icon={<EyeIcon className="w-4 h-4" />}
                            >
                              View
                            </ResponsiveButton>
                            <ResponsiveButton
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/instructor/classes/${cls.id}/edit`)}
                              icon={<PencilIcon className="w-4 h-4" />}
                            >
                              Edit
                            </ResponsiveButton>
                            <ResponsiveButton
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveClass(cls.id)}
                              icon={<ArchiveBoxIcon className="w-4 h-4" />}
                            >
                              Archive
                            </ResponsiveButton>
                          </div>
                        </CardContent>
                      </ResponsiveCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </ResponsiveGrid>
          </div>
        )}

        {/* Empty State */}
        {activeClasses.length === 0 && (
          <ResponsiveCard padding="lg">
            <CardContent>
              <div className="text-center py-12">
                <BookOpenIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Classes Yet</h3>
                <p className="text-gray-400 mb-6">
                  Create your first class to start teaching logic puzzles to your students.
                </p>
                <ResponsiveButton
                  variant="primary"
                  onClick={() => router.push('/instructor/classes/new')}
                  icon={<PlusIcon className="w-5 h-5" />}
                >
                  Create Your First Class
                </ResponsiveButton>
              </div>
            </CardContent>
          </ResponsiveCard>
        )}

        {/* Archived Classes */}
        {archivedClasses.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 text-gray-500">
              Archived Classes ({archivedClasses.length})
            </h2>
            <div className="space-y-2">
              {archivedClasses.map((cls) => (
                <div
                  key={cls.id}
                  className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-gray-400">{cls.name}</p>
                    <p className="text-sm text-gray-500">Code: {cls.code}</p>
                  </div>
                  <ResponsiveButton
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/instructor/classes/${cls.id}`)}
                  >
                    View
                  </ResponsiveButton>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
      </ResponsiveContainer>
    </InstructorGuard>
  );
}