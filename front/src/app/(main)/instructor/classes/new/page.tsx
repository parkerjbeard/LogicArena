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
  ResponsiveTextarea,
  FormFieldGroup,
  FormActions,
  ResponsiveSelect
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import InstructorGuard from '@/components/InstructorGuard';
import api from '@/lib/api';
import { 
  BookOpenIcon, 
  InformationCircleIcon,
  LockClosedIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

export default function CreateClassPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: true,
    require_approval: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/instructor/classes', formData);
      
      if (response.data) {
        showToast({
          message: `Class created successfully! Join code: ${response.data.code}`,
          type: 'success'
        });
        router.push(`/instructor/classes/${response.data.id}`);
      }
    } catch (error: any) {
      showToast({
        message: error.response?.data?.detail || 'Failed to create class',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <InstructorGuard>
      <ResponsiveContainer maxWidth="md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ResponsiveCard padding="lg">
          <CardHeader
            title="Create New Class"
            subtitle="Set up a class for your students to join"
          />
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormFieldGroup>
                <ResponsiveInput
                  label="Class Name"
                  required
                  value={formData.name}
                  onChange={handleChange('name')}
                  placeholder="e.g., Logic 101 - Fall 2024"
                  hint="Choose a descriptive name for your class"
                />

                <ResponsiveTextarea
                  label="Description"
                  value={formData.description}
                  onChange={handleChange('description')}
                  placeholder="Describe what students will learn in this class..."
                  hint="Help students understand the class objectives"
                  rows={4}
                />
              </FormFieldGroup>

              <div className="space-y-4">
                <h3 className="font-medium text-white">Class Settings</h3>
                
                <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_public}
                      onChange={handleChange('is_public')}
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <GlobeAltIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-white">Public Class</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Allow students to discover and join your class from the public directory
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.require_approval}
                      onChange={handleChange('require_approval')}
                      className="mt-1 w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <LockClosedIcon className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-white">Require Approval</span>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        Review and approve students before they can access class content
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <InformationCircleIcon className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-blue-400 font-medium mb-1">What happens next?</p>
                    <ul className="text-gray-300 space-y-1">
                      <li>• A unique 6-character join code will be generated</li>
                      <li>• Share this code with your students to let them join</li>
                      <li>• You can create assignments and track progress immediately</li>
                    </ul>
                  </div>
                </div>
              </div>

              <FormActions align="right">
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
                  disabled={!formData.name || loading}
                >
                  {loading ? 'Creating...' : 'Create Class'}
                </ResponsiveButton>
              </FormActions>
            </form>
          </CardContent>
        </ResponsiveCard>
      </motion.div>
      </ResponsiveContainer>
    </InstructorGuard>
  );
}