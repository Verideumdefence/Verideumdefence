import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { FileText, Clock, User, Shield, Download, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { AuditLog } from '@/types';

export default function AdminAuditLogs() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ q: '', action: '', status: '', resource: '', user_id: '' });
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const pageSize = 50;

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setIsLoading(true);
        setError('');
        const params = new URLSearchParams({ skip: String(skip), limit: String(pageSize) });
        Object.entries(filters).forEach(([key, value]) => {
          if (value.trim()) params.set(key, value.trim());
        });
        const data = await api.get(`/audit-logs?${params.toString()}`);
        setAuditLogs(data);
        setHasMore(data.length === pageSize);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit logs');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchAuditLogs();
  }, [filters, skip]);

  const exportCurrentPage = () => {
    const columns = ['timestamp', 'user_name', 'user_role', 'action', 'resource', 'resource_id', 'status', 'ip_address', 'details'];
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = auditLogs.map((log) => columns.map((column) => escapeCsv(log[column as keyof AuditLog])).join(','));
    const content = [columns.join(','), ...rows].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-green-100 text-green-700';
      case 'logout': return 'bg-gray-100 text-gray-700';
      case 'create': return 'bg-blue-100 text-blue-700';
      case 'update': return 'bg-yellow-100 text-yellow-700';
      case 'delete': return 'bg-red-100 text-red-700';
      case 'view': return 'bg-purple-100 text-purple-700';
      case 'export': return 'bg-indigo-100 text-indigo-700';
      case 'assign': return 'bg-orange-100 text-orange-700';
      case 'change_status': return 'bg-teal-100 text-teal-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader
          title="Audit Logs"
          description="View system activity, security events, and access logs."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading audit logs...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Audit Logs"
        description="View system activity, security events, and access logs."
        action={
          <button onClick={exportCurrentPage} disabled={auditLogs.length === 0} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export page
          </button>
        }
      />
      {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={(event) => { event.preventDefault(); setSkip(0); }} className="mb-4 grid gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-5">
        <label className="relative sm:col-span-2 xl:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={filters.q} onChange={(e) => { setFilters((current) => ({ ...current, q: e.target.value })); setSkip(0); }} className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm" placeholder="Search events" />
        </label>
        <select aria-label="Filter by action" value={filters.action} onChange={(e) => { setFilters((current) => ({ ...current, action: e.target.value })); setSkip(0); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All actions</option>
          {['login', 'logout', 'create', 'update', 'delete', 'view', 'export', 'assign', 'change_status'].map((action) => <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>)}
        </select>
        <select aria-label="Filter by result" value={filters.status} onChange={(e) => { setFilters((current) => ({ ...current, status: e.target.value })); setSkip(0); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">All results</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <input aria-label="Filter by resource" value={filters.resource} onChange={(e) => { setFilters((current) => ({ ...current, resource: e.target.value })); setSkip(0); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Resource (e.g. client)" />
        <input aria-label="Filter by user ID" inputMode="numeric" value={filters.user_id} onChange={(e) => { setFilters((current) => ({ ...current, user_id: e.target.value.replace(/\D/g, '') })); setSkip(0); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="User ID" />
      </form>
      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-500">Loading audit logs...</div>
      ) : auditLogs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="No Audit Events Found"
            description="Change filters or wait for tracked admin activity to occur."
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                        <div className="text-sm text-gray-500">{log.user_role}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{log.resource}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button onClick={() => setSelectedLog(log)} aria-label={`View audit event ${log.id}`} className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!isLoading && auditLogs.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-500">Showing {skip + 1}–{skip + auditLogs.length}</span>
          <div className="flex gap-2">
            <button disabled={skip === 0} onClick={() => setSkip((current) => Math.max(0, current - pageSize))} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"><ChevronLeft className="h-4 w-4" /> Previous</button>
            <button disabled={!hasMore} onClick={() => setSkip((current) => current + pageSize)} className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 disabled:opacity-50">Next <ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedLog(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="audit-detail-title" className="w-full max-w-xl rounded-lg bg-white shadow-xl">
            <header className="flex items-center justify-between border-b border-gray-200 p-5">
              <div>
                <h2 id="audit-detail-title" className="text-lg font-semibold text-gray-900">Audit event #{selectedLog.id}</h2>
                <p className="mt-1 text-sm text-gray-500">{new Date(selectedLog.timestamp).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} aria-label="Close event details" className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </header>
            <dl className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
              {[
                ['User', `${selectedLog.user_name} (${selectedLog.user_role})`],
                ['Action', selectedLog.action.replace(/_/g, ' ')],
                ['Resource', `${selectedLog.resource}${selectedLog.resource_id ? ` #${selectedLog.resource_id}` : ''}`],
                ['Result', selectedLog.status],
                ['IP address', selectedLog.ip_address || 'Not recorded'],
                ['User agent', selectedLog.user_agent || 'Not recorded'],
              ].map(([label, value]) => <div key={label}><dt className="text-xs font-medium uppercase text-gray-500">{label}</dt><dd className="mt-1 break-words text-sm text-gray-900">{value}</dd></div>)}
              <div className="sm:col-span-2"><dt className="text-xs font-medium uppercase text-gray-500">Details</dt><dd className="mt-1 whitespace-pre-wrap break-words rounded-md bg-gray-50 p-3 font-mono text-xs text-gray-800">{selectedLog.details || 'No additional details'}</dd></div>
            </dl>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
