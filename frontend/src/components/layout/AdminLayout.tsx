import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { auth } from '@/lib/api';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
  className?: string;
}

const navigationItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/requests', label: 'Requests' },
  { href: '/admin/clients', label: 'Clients' },
  { href: '/admin/projects', label: 'Projects' },
  { href: '/admin/tickets', label: 'Tickets' },
  { href: '/admin/messages', label: 'Messages' },
  { href: '/admin/team', label: 'Team' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/settings', label: 'Settings' },
];

export function AdminLayout({ children, className }: AdminLayoutProps) {
  const [location] = useLocation();
  const [displayName, setDisplayName] = useState('Admin');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await auth.getCurrentUser();
        setDisplayName(user.full_name || user.email || 'Admin');
      } catch {
        setDisplayName('Admin');
      }
    };

    if (auth.isAuthenticated()) {
      void loadProfile();
    }
  }, []);

  const currentTitle = useMemo(() => {
    const navItem = navigationItems.find((item) => item.href === location);
    return navItem?.label ?? 'Admin Dashboard';
  }, [location]);

  const handleLogout = () => {
    auth.logout();
    window.location.href = '/admin/login';
  };

  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      <div className="flex">
        <aside className="w-64 bg-gray-900 min-h-screen fixed left-0 top-0">
          <div className="p-6">
            <h2 className="text-white font-bold text-lg">VerideumDefence</h2>
            <p className="text-gray-400 text-xs mt-1">Admin Portal</p>
          </div>
          <nav className="mt-6">
            {navigationItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={cn(
                      'block px-6 py-3 transition-colors',
                      isActive
                        ? 'bg-gray-800 text-white border-l-2 border-cyan-400'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 ml-64">
          <header className="bg-white border-b border-gray-200 px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-xl font-semibold text-gray-900">{currentTitle}</h1>
              <div className="flex items-center gap-4">
                <button className="text-gray-600 hover:text-gray-900" aria-label="Notifications">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-xs font-semibold text-white">
                    {displayName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{displayName}</span>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">Admin</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="ml-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </header>
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
