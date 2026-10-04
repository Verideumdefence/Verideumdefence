import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Settings, User, Bell, Shield, Globe } from 'lucide-react';
import { api } from '@/lib/api';

const defaultPrefs = {
  emailRequests: true,
  emailProjects: true,
  emailTickets: true,
  inAppMessages: true,
  weeklySummary: false,
};

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ full_name: '', email: '' });
  const [passwords, setPasswords] = useState({ current: '', newPassword: '', confirm: '' });
  const [prefs, setPrefs] = useState(defaultPrefs);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = await api.get('/auth/me');
        setProfile({
          full_name: user.full_name || '',
          email: user.email || '',
        });
      } catch {
        setFeedback('Unable to load your profile.');
      }
    };

    void loadProfile();
  }, []);

  const handleProfileSave = async () => {
    try {
      await api.patch('/users/me', { full_name: profile.full_name || null });
      setFeedback('Profile updated successfully.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to update profile.');
    }
  };

  const handleSecuritySave = async () => {
    if (!passwords.newPassword.trim()) {
      setFeedback('Enter a new password to continue.');
      return;
    }

    if (passwords.newPassword !== passwords.confirm) {
      setFeedback('New password does not match confirmation.');
      return;
    }

    try {
      await api.patch('/users/me', { password: passwords.newPassword });
      setPasswords({ current: '', newPassword: '', confirm: '' });
      setFeedback('Security settings updated successfully.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to update password.');
    }
  };

  const handlePreferencesSave = () => {
    localStorage.setItem('admin_preferences', JSON.stringify(prefs));
    setFeedback('Notification preferences saved.');
  };

  useEffect(() => {
    const stored = localStorage.getItem('admin_preferences');
    if (stored) {
      try {
        setPrefs({ ...defaultPrefs, ...JSON.parse(stored) });
      } catch {
        setPrefs(defaultPrefs);
      }
    }
  }, []);

  return (
    <AdminLayout>
      <PageHeader
        title="Settings"
        description="Manage profile, organization, notifications, and security preferences."
      />
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'security', label: 'Security', icon: Shield },
              { id: 'organization', label: 'Organization', icon: Globe },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {feedback && (
            <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{feedback}</div>
          )}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => setProfile((current) => ({ ...current, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your email"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => void handleProfileSave()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  'Email notifications for new requests',
                  'Email notifications for project updates',
                  'Email notifications for ticket assignments',
                  'In-app notifications for messages',
                  'Weekly activity summary',
                ].map((item, index) => (
                  <label key={index} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={
                        index === 0 ? prefs.emailRequests :
                        index === 1 ? prefs.emailProjects :
                        index === 2 ? prefs.emailTickets :
                        index === 3 ? prefs.inAppMessages :
                        prefs.weeklySummary
                      }
                      onChange={(e) => {
                        const next = {
                          ...prefs,
                          emailRequests: index === 0 ? e.target.checked : prefs.emailRequests,
                          emailProjects: index === 1 ? e.target.checked : prefs.emailProjects,
                          emailTickets: index === 2 ? e.target.checked : prefs.emailTickets,
                          inAppMessages: index === 3 ? e.target.checked : prefs.inAppMessages,
                          weeklySummary: index === 4 ? e.target.checked : prefs.weeklySummary,
                        };
                        setPrefs(next);
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={handlePreferencesSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) => setPasswords((current) => ({ ...current, current: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords((current) => ({ ...current, newPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords((current) => ({ ...current, confirm: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Confirm new password"
                  />
                </div>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <span className="text-sm text-gray-700">Enable two-factor authentication</span>
                </label>
              </div>
              <div className="flex justify-end">
                <button onClick={() => void handleSecuritySave()} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Update Security Settings
                </button>
              </div>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Organization Settings</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter organization name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>UTC</option>
                    <option>UTC-5 (Eastern Time)</option>
                    <option>UTC-8 (Pacific Time)</option>
                    <option>UTC+1 (Central European)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Save Organization Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
