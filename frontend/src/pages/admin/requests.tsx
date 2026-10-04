import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Inbox, Clock, User, Building2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import type { Request } from '@/types';

type Inquiry = {
  id: number;
  requester_name: string;
  requester_email: string;
  company: string | null;
  service: string;
  description: string;
  created_at: string;
};

export default function AdminRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await api.patch(`/requests/${id}`, { status });
      setRequests((current) => current.map((request) => (request.id === id ? updated : request)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request');
    }
  };

  const handleNoteUpdate = async (id: number) => {
    const field = document.getElementById(`internal_notes_${id}`) as HTMLTextAreaElement | null;
    if (!field) return;

    try {
      const updated = await api.patch(`/requests/${id}`, { internal_notes: field.value.trim() || null });
      setRequests((current) => current.map((request) => (request.id === id ? updated : request)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update request notes');
    }
  };

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setIsLoading(true);
        const [requestData, inquiryData] = await Promise.all([
          api.get('/requests'),
          api.get('/inquiries'),
        ]);
        setRequests(requestData);
        setInquiries(inquiryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load requests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-700';
      case 'reviewing': return 'bg-yellow-100 text-yellow-700';
      case 'in_progress': return 'bg-purple-100 text-purple-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-700';
      case 'medium': return 'bg-blue-100 text-blue-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader
          title="Requests"
          description="Manage incoming contact requests, security assessments, and service inquiries."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading requests...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <PageHeader
          title="Requests"
          description="Manage incoming contact requests, security assessments, and service inquiries."
        />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Requests"
        description="Manage incoming contact requests, security assessments, and service inquiries."
      />
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Website inquiries</h2>
        {inquiries.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-sm text-gray-500">No website inquiries yet.</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50"><tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-200">{inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td className="px-6 py-4 text-sm"><div className="font-medium text-gray-900">{inquiry.requester_name}</div><div className="text-gray-500">{inquiry.requester_email}</div></td>
                  <td className="px-6 py-4 text-sm text-gray-700">{inquiry.company || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{inquiry.service.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-md whitespace-normal">{inquiry.description}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(inquiry.created_at).toLocaleDateString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
      {requests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <EmptyState
            icon={<Inbox className="w-12 h-12" />}
            title="No Requests Yet"
            description="Incoming requests will appear here once users submit them."
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{request.requester_name}</div>
                        <div className="text-sm text-gray-500">{request.requester_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.company ? (
                      <div className="flex items-center">
                        <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">{request.company}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {request.service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(request.priority)}`}>
                      {request.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={request.status}
                      onChange={(e) => void handleStatusChange(request.id, e.target.value)}
                      className={`rounded-full border border-transparent px-2 py-1 text-xs font-medium ${getStatusColor(request.status)}`}
                    >
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(request.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right align-top">
                    <div className="flex flex-col gap-2">
                      <textarea
                        id={`internal_notes_${request.id}`}
                        defaultValue={request.internal_notes ?? ''}
                        className="min-h-[56px] w-44 rounded-md border border-gray-300 px-2 py-1 text-xs"
                        placeholder="Internal notes"
                      />
                      <button
                        onClick={() => void handleNoteUpdate(request.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                      >
                        <Save className="h-3.5 w-3.5" /> Save notes
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
