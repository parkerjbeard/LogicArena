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
  FormActions
} from '@/components/ui';
import { useToast } from '@/contexts/ToastContext';
import api from '@/lib/api';
import { AcademicCapIcon, BuildingOffice2Icon, LinkIcon, IdentificationIcon } from '@heroicons/react/24/outline';

export default function InstructorRequestPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    institution_name: '',
    course_info: '',
    faculty_url: '',
    faculty_id: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post('/api/instructor/request', formData);
      
      if (response.data) {
        showToast({
          message: 'Instructor access request submitted successfully! We will review your request within 24 hours.',
          type: 'success'
        });
        router.push('/account');
      }
    } catch (error: any) {
      showToast({
        message: error.response?.data?.detail || 'Failed to submit request',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  return (
    <ResponsiveContainer maxWidth="md">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ResponsiveCard padding="lg">
          <CardHeader
            title="Request Instructor Access"
            subtitle="Apply to become an instructor and create classes for your students"
          />
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-900/20 backdrop-blur-sm border border-blue-600/30 rounded-lg p-4">
                <p className="text-sm text-blue-400">
                  <strong>Note:</strong> Instructor access is granted to verified faculty members and teaching assistants. 
                  Please provide accurate information to help us verify your academic affiliation.
                </p>
              </div>

              <FormFieldGroup>
                <ResponsiveInput
                  label="Institution Name"
                  required
                  value={formData.institution_name}
                  onChange={handleChange('institution_name')}
                  placeholder="e.g., Massachusetts Institute of Technology"
                  hint="Full name of your academic institution"
                  icon={<BuildingOffice2Icon className="w-5 h-5" />}
                />

                <ResponsiveTextarea
                  label="Course Information"
                  required
                  value={formData.course_info}
                  onChange={handleChange('course_info')}
                  placeholder="e.g., Teaching CS101 Introduction to Logic and CS201 Advanced Reasoning"
                  hint="Describe the courses you plan to teach using LogicArena"
                  rows={4}
                />

                <ResponsiveInput
                  label="Faculty Profile URL"
                  type="url"
                  value={formData.faculty_url}
                  onChange={handleChange('faculty_url')}
                  placeholder="https://university.edu/faculty/yourname"
                  hint="Link to your faculty page (optional but helps verification)"
                  icon={<LinkIcon className="w-5 h-5" />}
                />

                <ResponsiveInput
                  label="Faculty/Employee ID"
                  value={formData.faculty_id}
                  onChange={handleChange('faculty_id')}
                  placeholder="e.g., FAC-12345"
                  hint="Your institutional ID (optional)"
                  icon={<IdentificationIcon className="w-5 h-5" />}
                />
              </FormFieldGroup>

              <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-white">What happens next?</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">1.</span>
                    We'll review your request within 24 hours
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">2.</span>
                    You'll receive an email notification once approved
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">3.</span>
                    You can start creating classes and inviting students
                  </li>
                </ul>
              </div>

              <div className="bg-yellow-900/20 backdrop-blur-sm border border-yellow-600/30 rounded-lg p-4">
                <p className="text-sm text-yellow-400">
                  <strong>While waiting for approval:</strong> You can create "draft" classes that will become active once your instructor status is approved.
                </p>
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
                  disabled={!formData.institution_name || !formData.course_info || loading}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </ResponsiveButton>
              </FormActions>
            </form>
          </CardContent>
        </ResponsiveCard>
      </motion.div>
    </ResponsiveContainer>
  );
}