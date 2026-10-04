import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { MessageSquare, Building2, Clock, User, Plus, Trash2, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Client, Ticket } from '@/types';

const emptyTicketDraft = {
  subject: '',
  client_id: 0,
  client_name: '',
  category: 'technical',
  priority: 'medium',
  status: 'open',
  description: '',
};

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyTicketDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      const [ticketData, clientData] = await Promise.all([
        api.get('/tickets'),
        api.get('/clients'),
      ]);
      setTickets(ticketData);
      setClients(clientData);
      if (clientData[0]) {
        setDraft((current) => ({ ...current, client_id: clientData[0].id, client_name: clientData[0].name }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const handleCreateTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.subject.trim() || !draft.description.trim()) {
      setError('Subject and description are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const payload = {
        subject: draft.subject.trim(),
        client_id: draft.client_id,
        client_name: draft.client_name || clients.find((client) => client.id === draft.client_id)?.name || 'Client',
        category: draft.category,
        priority: draft.priority,
        description: draft.description.trim(),
      };

      const created = await api.post('/tickets', payload);
      setTickets((current) => [created, ...current]);
      setShowForm(false);
      setDraft({
        subject: '',
        client_id: clients[0]?.id ?? 0,
        client_name: clients[0]?.name ?? '',
        category: 'technical',
        priority: 'medium',
        status: 'open',
        description: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await api.delete(`/tickets/${id}`);
      setTickets((current) => current.filter((ticket) => ticket.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await api.patch(`/tickets/${id}`, { status });
      setTickets((current) => current.map((ticket) => (ticket.id === id ? updated : ticket)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-purple-100 text-purple-700';
      case 'waiting_for_client': return 'bg-yellow-100 text-yellow-700';
      case 'resolved': return 'bg-green-100 text-green-700';
      case 'closed': return 'bg-gray-100 text-gray-700';
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
          title="Tickets"
          description="Manage support tickets and client communications."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading tickets...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <PageHeader
          title="Tickets"
          description="Manage support tickets and client communications."
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
        title="Tickets"
        description="Manage support tickets and client communications."
        action={
          <button
            onClick={() => setShowForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Close' : 'New ticket'}
          </button>
        }
      />
      {showForm && (
        <form onSubmit={handleCreateTicket} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
              <input value={draft.subject} onChange={(e) => setDraft((current) => ({ ...current, subject: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Share access issue" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Client</label>
              <select value={draft.client_id} onChange={(e) => {
                const selected = clients.find((client) => client.id === Number(e.target.value));
                setDraft((current) => ({ ...current, client_id: Number(e.target.value), client_name: selected?.name || '' }));
              }} className="w-full rounded-md border border-gray-300 px-3 py-2">
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Category</label>
              <select value={draft.category} onChange={(e) => setDraft((current) => ({ ...current, category: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="service_request">Service request</option>
                <option value="incident">Incident</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Priority</label>
              <select value={draft.priority} onChange={(e) => setDraft((current) => ({ ...current, priority: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
              <textarea value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} className="h-28 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Explain the issue, expected behavior, and urgency." />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Create ticket'}
            </button>
          </div>
        </form>
      )}
      {tickets.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <EmptyState
            icon={<MessageSquare className="w-12 h-12" />}
            title="No Tickets Yet"
            description="Support tickets will appear here once clients submit them."
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MessageSquare className="w-5 h-5 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{ticket.client_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {ticket.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={ticket.status}
                      onChange={(e) => void handleStatusChange(ticket.id, e.target.value)}
                      className={`rounded-full border border-transparent px-2 py-1 text-xs font-medium ${getStatusColor(ticket.status)}`}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In progress</option>
                      <option value="waiting_for_client">Waiting for client</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => void handleDelete(ticket.id)}
                      disabled={deletingId === ticket.id}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === ticket.id ? 'Deleting...' : 'Delete'}
                    </button>
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
