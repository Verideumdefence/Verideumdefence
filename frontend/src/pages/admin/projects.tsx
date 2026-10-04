import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { FolderKanban, Building2, Clock, TrendingUp, Plus, Trash2, Save, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { Client, Project } from '@/types';

const emptyProjectDraft = {
  name: '',
  client_id: 0,
  client_name: '',
  service: 'security_assessment',
  priority: 'medium',
  status: 'planning',
  description: '',
  assigned_team: '',
};

const parseAssignedTeam = (value: string) =>
  value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((part) => Number.isFinite(part) && part > 0);

export default function AdminProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyProjectDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const [projectData, clientData] = await Promise.all([
        api.get('/projects'),
        api.get('/clients'),
      ]);
      setProjects(projectData);
      setClients(clientData);
      if (clientData[0]) {
        setDraft((current) => ({
          ...current,
          client_id: clientData[0].id,
          client_name: clientData[0].name,
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  const handleCreateProject = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.name.trim()) {
      setError('Project name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        name: draft.name.trim(),
        client_id: draft.client_id,
        client_name: draft.client_name || clients.find((client) => client.id === draft.client_id)?.name || 'Client',
        service: draft.service,
        priority: draft.priority,
        status: draft.status,
        start_date: new Date().toISOString(),
        expected_completion: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString(),
        assigned_team: parseAssignedTeam(draft.assigned_team),
        description: draft.description || null,
      };

      const created = await api.post('/projects', payload);
      setProjects((current) => [created, ...current]);
      setShowForm(false);
      setDraft({
        name: '',
        client_id: clients[0]?.id ?? 0,
        client_name: clients[0]?.name ?? '',
        service: 'security_assessment',
        priority: 'medium',
        status: 'planning',
        description: '',
        assigned_team: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeletingId(id);
      await api.delete(`/projects/${id}`);
      setProjects((current) => current.filter((project) => project.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const updated = await api.patch(`/projects/${id}`, { status });
      setProjects((current) => current.map((project) => (project.id === id ? updated : project)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-blue-100 text-blue-700';
      case 'assessment': return 'bg-purple-100 text-purple-700';
      case 'investigation': return 'bg-orange-100 text-orange-700';
      case 'testing': return 'bg-yellow-100 text-yellow-700';
      case 'reporting': return 'bg-indigo-100 text-indigo-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'on_hold': return 'bg-gray-100 text-gray-700';
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
          title="Projects"
          description="Manage security assessments, investigations, and ongoing projects."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading projects...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <PageHeader
          title="Projects"
          description="Manage security assessments, investigations, and ongoing projects."
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
        title="Projects"
        description="Manage security assessments, investigations, and ongoing projects."
        action={
          <button
            onClick={() => setShowForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Close' : 'New project'}
          </button>
        }
      />
      {showForm && (
        <form onSubmit={handleCreateProject} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Project name</label>
              <input value={draft.name} onChange={(e) => setDraft((current) => ({ ...current, name: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="External Penetration Test" />
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
              <label className="mb-2 block text-sm font-medium text-gray-700">Service</label>
              <input value={draft.service} onChange={(e) => setDraft((current) => ({ ...current, service: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="security_assessment" />
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
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
              <select value={draft.status} onChange={(e) => setDraft((current) => ({ ...current, status: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="planning">Planning</option>
                <option value="assessment">Assessment</option>
                <option value="investigation">Investigation</option>
                <option value="testing">Testing</option>
                <option value="reporting">Reporting</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On hold</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Assigned team IDs</label>
              <input value={draft.assigned_team} onChange={(e) => setDraft((current) => ({ ...current, assigned_team: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="1, 2, 3" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Description</label>
              <textarea value={draft.description} onChange={(e) => setDraft((current) => ({ ...current, description: e.target.value }))} className="h-28 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Key scope, timeline, and security objectives." />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              <Save className="h-4 w-4" /> {isSubmitting ? 'Saving...' : 'Create project'}
            </button>
          </div>
        </form>
      )}
      {projects.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <EmptyState
            icon={<FolderKanban className="w-12 h-12" />}
            title="No Projects Yet"
            description="Projects will appear here once they are created."
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FolderKanban className="w-5 h-5 text-gray-400 mr-2" />
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{project.client_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.service}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={project.status}
                      onChange={(e) => void handleStatusChange(project.id, e.target.value)}
                      className={`rounded-full border border-transparent px-2 py-1 text-xs font-medium ${getStatusColor(project.status)}`}
                    >
                      <option value="planning">Planning</option>
                      <option value="assessment">Assessment</option>
                      <option value="investigation">Investigation</option>
                      <option value="testing">Testing</option>
                      <option value="reporting">Reporting</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On hold</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1 text-gray-400" />
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(project.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => void handleDelete(project.id)}
                      disabled={deletingId === project.id}
                      className="inline-flex items-center gap-2 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {deletingId === project.id ? 'Deleting...' : 'Delete'}
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
