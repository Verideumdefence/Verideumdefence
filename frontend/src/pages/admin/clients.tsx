import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users, Building2, Mail, Clock, Plus, Trash2, Save, X, Pencil, Search } from 'lucide-react';
import { api } from '@/lib/api';
import type { Client, ClientStatus } from '@/types';

type ClientDraft = {
  name: string;
  email: string;
  company: string;
  services: string;
  status: ClientStatus;
  contact_info: string;
};

const emptyClientDraft: ClientDraft = {
  name: '',
  email: '',
  company: '',
  services: '',
  status: 'pending',
  contact_info: '{}',
};

const parseServices = (services: string) => {
  try {
    const parsed = JSON.parse(services);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (typeof parsed === 'string') {
      return [parsed];
    }
  } catch {
    // ignore malformed JSON and fall back to comma-separated text
  }

  return services
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseContactInfo = (value: string | null) => {
  if (!value) return '{}';
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const getClientServices = (value: string) => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
    if (typeof parsed === 'string') return [parsed];
  } catch {
    return value ? [value] : [];
  }
  return [];
};

const getContactSummary = (value: string | null) => {
  if (!value) return 'No contact details';
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.entries(parsed).map(([key, item]) => `${key}: ${String(item)}`).join(' · ') || 'No contact details';
  } catch {
    return value;
  }
};

export default function AdminClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyClientDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredClients = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch = !term || [client.name, client.email, client.company].some((value) => value.toLowerCase().includes(term));
      return matchesSearch && (statusFilter === 'all' || client.status === statusFilter);
    });
  }, [clients, search, statusFilter]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const data = await api.get('/clients');
      setClients(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clients');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchClients();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!draft.name.trim() || !draft.email.trim() || !draft.company.trim()) {
      setError('Name, email, and company are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const contactInfo = draft.contact_info.trim();
      const payload = {
        name: draft.name.trim(),
        email: draft.email.trim(),
        company: draft.company.trim(),
        services: parseServices(draft.services),
        status: draft.status,
        contact_info: contactInfo && contactInfo !== '{}' ? JSON.parse(contactInfo) : null,
      };

      const saved = editingId
        ? await api.patch(`/clients/${editingId}`, payload)
        : await api.post('/clients', payload);
      setClients((current) => editingId
        ? current.map((client) => client.id === editingId ? saved : client)
        : [saved, ...current]);
      setDraft(emptyClientDraft);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setDraft({
      name: client.name,
      email: client.email,
      company: client.company,
      services: getClientServices(client.services).join(', '),
      status: client.status,
      contact_info: parseContactInfo(client.contact_info),
    });
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await api.delete(`/clients/${id}`);
      setClients((current) => current.filter((client) => client.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setDraft(emptyClientDraft);
        setShowForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete client');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await api.patch(`/clients/${id}`, { status });
      setClients((current) => current.map((client) => (client.id === id ? updated : client)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader
          title="Clients"
          description="Manage client records, services, and relationships."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading clients...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Clients"
        description="Manage client records, services, and relationships."
        action={
          <button
            onClick={() => setShowForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Close' : 'Add client'}
          </button>
        }
      />
      {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">{editingId ? 'Edit client' : 'New client'}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Name</label>
              <input value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Acme Corp" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={draft.email} onChange={(e) => setDraft((current) => ({ ...current, email: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="ops@acme.com" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Company</label>
              <input value={draft.company} onChange={(e) => setDraft((current) => ({ ...current, company: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Acme Corporation" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
              <select value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value as ClientStatus }))} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Services</label>
              <input value={draft.services} onChange={(e) => setDraft((current) => ({ ...current, services: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="vulnerability assessment, incident response" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Contact Info (JSON)</label>
              <textarea value={draft.contact_info} onChange={(e) => setDraft((current) => ({ ...current, contact_info: e.target.value }))} className="h-24 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm" placeholder='{"phone":"+1...","location":"US"}' />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setDraft(emptyClientDraft); }} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : editingId ? 'Update client' : 'Save client'}
            </button>
          </div>
        </form>
      )}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3" placeholder="Search name, email, company" />
        </label>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2">
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {filteredClients.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <EmptyState
            icon={<Users className="w-12 h-12" />}
            title={clients.length === 0 ? 'No Clients Yet' : 'No Matching Clients'}
            description={clients.length === 0 ? 'Create a client record to start managing services and contacts.' : 'Try a different search or status filter.'}
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Users className="w-5 h-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{client.company}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {getClientServices(client.services).length ? getClientServices(client.services).map((service) => (
                        <span key={service} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">{service.replace(/_/g, ' ')}</span>
                      )) : <span>None listed</span>}
                    </div>
                  </td>
                  <td className="max-w-xs px-6 py-4 text-sm text-gray-600">
                    <span className="block truncate" title={getContactSummary(client.contact_info)}>{getContactSummary(client.contact_info)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={client.status}
                      onChange={(e) => void handleStatusChange(client.id, e.target.value)}
                      className={`rounded-full border border-transparent px-2 py-1 text-xs font-medium ${getStatusColor(client.status)}`}
                    >
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="pending">pending</option>
                      <option value="suspended">suspended</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(client.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(client)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete client ${client.name}? Related projects, tickets, and documents may also be removed.`)) void handleDelete(client.id);
                        }}
                        disabled={deletingId === client.id}
                        className="inline-flex items-center gap-2 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === client.id ? 'Deleting...' : 'Delete'}
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
