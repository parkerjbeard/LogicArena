'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import AdminGuard from '@/components/AdminGuard';
import api from '@/lib/api';
import { 
  AcademicCapIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  LinkIcon,
  IdentificationIcon,
  UserIcon,
  EnvelopeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface InstructorRequest {
  id: number;
  user_id: number;
  institution_name: string;
  course_info: string;
  faculty_url: string | null;
  faculty_id: string | null;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  denial_reason: string | null;
}

interface UserDetails {
  id: number;
  handle: string;
  email: string;
  rating: number;
  created: string;
}

export default function InstructorRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<InstructorRequest[]>([]);
  const [userDetails, setUserDetails] = useState<Record<string, UserDetails>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'denied'>('pending');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [denialReason, setDenialReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await api.get('/api/instructor/requests');
      setRequests(response.data);
      
      // Fetch user details for each request
      const userIds: number[] = Array.from(new Set(response.data.map((r: InstructorRequest) => r.user_id)));
      for (const userId of userIds) {
        try {
          const userResponse = await api.get(`/api/users/${userId}`);
          setUserDetails(prev => ({
            ...prev,
            [userId.toString()]: userResponse.data
          }));
        } catch (error) {
          console.error(`Failed to fetch user ${userId}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch instructor requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    setReviewingId(requestId);
    try {
      await api.put(`/api/instructor/requests/${requestId}/review`, {
        status: 'approved'
      });
      await fetchRequests();
    } catch (error) {
      console.error('Failed to approve request:', error);
    } finally {
      setReviewingId(null);
    }
  };

  const handleDeny = async (requestId: number) => {
    if (!denialReason.trim()) {
      alert('Please provide a reason for denial');
      return;
    }
    
    setReviewingId(requestId);
    try {
      await api.put(`/api/instructor/requests/${requestId}/review`, {
        status: 'denied',
        denial_reason: denialReason
      });
      setDenialReason('');
      await fetchRequests();
    } catch (error) {
      console.error('Failed to deny request:', error);
    } finally {
      setReviewingId(null);
    }
  };

  const filteredRequests = requests.filter(r => r.status === activeTab);

  if (loading) {
    return (
      <AdminGuard>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-gray-400">Loading requests...</div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="min-h-screen bg-gray-900">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <AcademicCapIcon className="h-6 w-6" />
                Instructor Requests
              </h1>
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Tabs */}
          <div className="flex space-x-1 mb-6">
            {(['pending', 'approved', 'denied'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="ml-2 text-sm">
                  ({requests.filter(r => r.status === tab).length})
                </span>
              </button>
            ))}
          </div>

          {/* Requests List */}
          {filteredRequests.length === 0 ? (
            <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-8 text-center">
              <p className="text-gray-400">No {activeTab} requests</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request) => {
                const user = userDetails[request.user_id.toString()];
                const isReviewing = reviewingId === request.id;
                
                return (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-lg p-6"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* User Info */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">User Information</h3>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-400">Handle</p>
                              <p className="text-white">{user?.handle || 'Loading...'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-400">Email</p>
                              <p className="text-white">{user?.email || 'Loading...'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <ClockIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-400">Member Since</p>
                              <p className="text-white">
                                {user?.created ? new Date(user.created).toLocaleDateString() : 'Loading...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Request Info */}
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-4">Request Details</h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm text-gray-400">Institution</p>
                            <p className="text-white">{request.institution_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-400">Course Information</p>
                            <p className="text-white whitespace-pre-wrap">{request.course_info}</p>
                          </div>
                          {request.faculty_url && (
                            <div className="flex items-center gap-3">
                              <LinkIcon className="h-5 w-5 text-gray-400" />
                              <a
                                href={request.faculty_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 underline"
                              >
                                Faculty Profile
                              </a>
                            </div>
                          )}
                          {request.faculty_id && (
                            <div className="flex items-center gap-3">
                              <IdentificationIcon className="h-5 w-5 text-gray-400" />
                              <div>
                                <p className="text-sm text-gray-400">Faculty ID</p>
                                <p className="text-white">{request.faculty_id}</p>
                              </div>
                            </div>
                          )}
                          <div>
                            <p className="text-sm text-gray-400">Submitted</p>
                            <p className="text-white">
                              {new Date(request.submitted_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions for Pending Requests */}
                    {request.status === 'pending' && (
                      <div className="mt-6 pt-6 border-t border-gray-700">
                        {reviewingId === request.id && (
                          <div className="mb-4">
                            <label className="block text-sm text-gray-400 mb-2">
                              Denial Reason (required for denial)
                            </label>
                            <textarea
                              value={denialReason}
                              onChange={(e) => setDenialReason(e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-md text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              placeholder="Please provide a reason for denial..."
                              rows={3}
                            />
                          </div>
                        )}
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={isReviewing}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <CheckIcon className="h-5 w-5" />
                            {isReviewing ? 'Processing...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => setReviewingId(reviewingId === request.id ? null : request.id)}
                            disabled={isReviewing}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XMarkIcon className="h-5 w-5" />
                            {reviewingId === request.id ? 'Cancel' : 'Deny'}
                          </button>
                          {reviewingId === request.id && (
                            <button
                              onClick={() => handleDeny(request.id)}
                              disabled={!denialReason.trim()}
                              className="px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Confirm Denial
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Status for Reviewed Requests */}
                    {request.status !== 'pending' && (
                      <div className="mt-6 pt-6 border-t border-gray-700">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-400">Reviewed</p>
                            <p className="text-white">
                              {request.reviewed_at ? new Date(request.reviewed_at).toLocaleString() : 'N/A'}
                            </p>
                          </div>
                          {request.status === 'approved' && (
                            <span className="px-3 py-1 bg-green-900/50 text-green-400 rounded-full text-sm">
                              Approved
                            </span>
                          )}
                          {request.status === 'denied' && (
                            <span className="px-3 py-1 bg-red-900/50 text-red-400 rounded-full text-sm">
                              Denied
                            </span>
                          )}
                        </div>
                        {request.denial_reason && (
                          <div className="mt-4 p-4 bg-red-900/20 border border-red-600/30 rounded-lg">
                            <p className="text-sm text-red-400">
                              <strong>Denial Reason:</strong> {request.denial_reason}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}