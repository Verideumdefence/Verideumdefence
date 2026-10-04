import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { DashboardCharts } from '@/components/dashboard-charts';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Clock3,
  Eye,
  MessageSquare,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { Scan, User } from '@/types';

interface DashboardSummary {
  total_scans: number;
  completed_scans: number;
  total_findings: number;
  open_findings: number;
  findings_by_severity: Array<{ severity: string; count: number }>;
  risk_score: number;
}

const severityOrder = ['critical', 'high', 'medium', 'low', 'info'] as const;

export default function AdminDashboard() {
  const [scans, setScans] = useState<Scan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [websiteStats, setWebsiteStats] = useState({
    today_visitors: 0,
    today_signups: 0,
    total_customers: 0,
    today_reviews: 0,
  });
  const [reviews, setReviews] = useState<Array<{ id: number; reviewer_name: string; rating: number; review: string; created_at: string }>>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [scansData, usersData, statsData, reviewsData, summaryData] = await Promise.all([
          api.get('/scans'),
          api.get('/users'),
          api.get('/website/stats'),
          api.get('/website/reviews'),
          api.get('/reports/summary'),
        ]);

        setScans(scansData);
        setUsers(usersData);
        setWebsiteStats(statsData);
        setReviews(reviewsData);
        setSummary(summaryData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalUsers = users.length;
  const adminUsers = users.filter((user) => user.is_admin).length;
  const activeCustomers = users.filter((user) => !user.is_admin).length;
  const runningScans = scans.filter((scan) => scan.status === 'running').length;
  const completedScans = scans.filter((scan) => scan.status === 'completed').length;
  const pendingScans = scans.filter((scan) => scan.status === 'pending').length;

  const scanHistory = useMemo(() => {
    const data: Array<{ date: string; scans: number; findings: number }> = [];
    const counts = new Map<string, { scans: number; findings: number }>();

    scans.forEach((scan) => {
      const key = new Date(scan.created_at).toISOString().slice(0, 10);
      const current = counts.get(key) ?? { scans: 0, findings: 0 };
      current.scans += 1;
      counts.set(key, current);
    });

    Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .forEach(([date, values]) => {
        data.push({ date, scans: values.scans, findings: values.findings });
      });

    return data;
  }, [scans]);

  const severityBreakdown = useMemo(() => {
    const base = severityOrder.map((severity) => ({
      severity,
      count: summary?.findings_by_severity?.find((item) => item.severity === severity)?.count ?? 0,
    }));

    return base.filter((item) => item.count > 0);
  }, [summary]);

  const chartData = useMemo(() => ({
    totalScans: summary?.total_scans ?? scans.length,
    completedScans: summary?.completed_scans ?? completedScans,
    totalFindings: summary?.total_findings ?? 0,
    openFindings: summary?.open_findings ?? 0,
    findingsBySeverity: summary?.findings_by_severity ?? severityBreakdown,
    riskScore: summary?.risk_score ?? 0,
    scanHistory,
  }), [completedScans, scanHistory, scans.length, severityBreakdown, summary]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </AdminLayout>
    );
  }

  const completionRate = summary?.total_scans
    ? Math.round(((summary.completed_scans ?? 0) / summary.total_scans) * 100)
    : 0;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-600 font-medium">Operations overview</p>
            <h2 className="text-3xl font-bold text-gray-900">Security command center</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700">
            <Activity className="w-4 h-4" />
            System healthy
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard label="Website visits" value={websiteStats.today_visitors} icon={<Eye className="w-6 h-6" />} />
          <StatCard label="Active customers" value={activeCustomers} icon={<Users className="w-6 h-6" />} />
          <StatCard label="Security scans" value={summary?.total_scans ?? scans.length} icon={<Shield className="w-6 h-6" />} />
          <StatCard label="Open findings" value={summary?.open_findings ?? 0} icon={<AlertTriangle className="w-6 h-6" />} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-5">
              <div>
                <p className="text-sm text-gray-500">Coverage</p>
                <h3 className="text-2xl font-bold text-gray-900">{completionRate}% scan completion</h3>
              </div>
              <div className="rounded-full bg-cyan-50 px-3 py-1 text-sm font-medium text-cyan-700">
                {completedScans} completed / {scans.length} total
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{pendingScans}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Completed</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{completedScans}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Running</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{runningScans}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-gray-500">Team</p>
            <h3 className="mt-1 text-2xl font-bold text-gray-900">{totalUsers}</h3>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Admins</span>
                <span className="font-semibold text-gray-900">{adminUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Customers</span>
                <span className="font-semibold text-gray-900">{activeCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risk score</span>
                <span className="font-semibold text-gray-900">{summary?.risk_score ?? 0}/10</span>
              </div>
            </div>
          </div>
        </div>

        <DashboardCharts data={chartData} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent scans</h3>
              <button className="inline-flex items-center gap-1 text-sm font-medium text-cyan-600 hover:text-cyan-700">
                View all <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {scans.length === 0 ? (
              <EmptyState
                icon={<Shield className="w-12 h-12" />}
                title="No scans logged yet"
                description="As soon as a scan is started, it will appear here."
              />
            ) : (
              <div className="space-y-3">
                {scans.slice(0, 6).map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                    <div>
                      <p className="font-medium text-gray-900">{scan.target}</p>
                      <p className="text-sm text-gray-500">{scan.scan_type} • {new Date(scan.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        scan.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        scan.status === 'running' ? 'bg-cyan-100 text-cyan-700' :
                        scan.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {scan.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Risk posture</h3>
              <Clock3 className="w-4 h-4 text-gray-500" />
            </div>

            <div className="space-y-4">
              {severityOrder.map((severity) => {
                const value = summary?.findings_by_severity?.find((item) => item.severity === severity)?.count ?? 0;
                const maxValue = Math.max(summary?.total_findings ?? 1, 1);
                const width = (value / maxValue) * 100;

                return (
                  <div key={severity}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="capitalize text-gray-600">{severity}</span>
                      <span className="font-medium text-gray-900">{value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className={`h-2 rounded-full ${
                          severity === 'critical' ? 'bg-red-500' :
                          severity === 'high' ? 'bg-orange-500' :
                          severity === 'medium' ? 'bg-amber-500' :
                          severity === 'low' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Website reviews</h3>
            <span className="text-sm text-gray-500">{reviews.length} total</span>
          </div>
          {reviews.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-12 h-12" />}
              title="No reviews yet"
              description="Reviews submitted through the public site will appear here."
            />
          ) : (
            <div className="space-y-3">
              {reviews.slice(0, 4).map((review) => (
                <article key={review.id} className="rounded-xl border border-gray-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-gray-900">{review.reviewer_name}</p>
                    <span className="text-amber-500">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-700">{review.review}</p>
                  <p className="mt-2 text-xs text-gray-500">{new Date(review.created_at).toLocaleString()}</p>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Total users" value={totalUsers} icon={<Users className="w-6 h-6" />} />
          <StatCard label="Review count" value={websiteStats.today_reviews} icon={<Star className="w-6 h-6" />} />
          <StatCard label="Customer signups" value={websiteStats.today_signups} icon={<Users className="w-6 h-6" />} />
        </div>
      </div>
    </AdminLayout>
  );
}
