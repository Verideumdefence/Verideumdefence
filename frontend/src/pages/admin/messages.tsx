import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Mail, Clock, User, UserCheck, Plus, Save, X, Search, Trash2, Check, Eye } from 'lucide-react';
import { api } from '@/lib/api';
import type { Message, User as TeamMember } from '@/types';

const CONTACT_EMAIL = 'Veridiumdefence@gmail.com';
const CONTACT_INBOX_ID = 'contact-inbox';

type MessageRecipientId = number | typeof CONTACT_INBOX_ID;

const emptyMessageDraft: {
  subject: string;
  to_id: MessageRecipientId;
  to_name: string;
  content: string;
} = {
  subject: '',
  to_id: 0,
  to_name: '',
  content: '',
};

export default function AdminMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(emptyMessageDraft);

  const isCustomerInboxRecipient = draft.to_id === CONTACT_INBOX_ID;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [folder, setFolder] = useState<'all' | 'inbox' | 'sent' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const filteredMessages = useMemo(() => {
    const term = search.trim().toLowerCase();
    return messages.filter((message) => {
      const isSent = message.from_id === currentUserId;
      const matchesFolder = folder === 'all'
        || (folder === 'sent' && isSent)
        || (folder === 'inbox' && !isSent)
        || (folder === 'unread' && !message.is_read && !isSent);
      const matchesSearch = !term || [message.subject, message.from_name, message.to_name, message.content]
        .some((value) => value.toLowerCase().includes(term));
      return matchesFolder && matchesSearch;
    });
  }, [currentUserId, folder, messages, search]);

  const loadMessages = async () => {
    try {
      setIsLoading(true);
      const [messageData, teamData, currentUser] = await Promise.all([
        api.get('/messages'),
        api.get('/users'),
        api.get('/auth/me'),
      ]);
      setMessages(messageData);
      setTeam(teamData);
      setCurrentUserId(currentUser.id);
      if (teamData[0]) {
        setDraft((current) => ({ ...current, to_id: teamData[0].id, to_name: teamData[0].full_name || teamData[0].email }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const openMessage = async (message: Message) => {
    try {
      const opened = await api.get(`/messages/${message.id}`);
      setSelectedMessage(opened);
      setMessages((current) => current.map((item) => item.id === opened.id ? opened : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open message');
    }
  };

  const markRead = async (message: Message) => {
    try {
      const updated = await api.patch(`/messages/${message.id}/read`, {});
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (selectedMessage?.id === updated.id) setSelectedMessage(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark message as read');
    }
  };

  const deleteMessage = async (message: Message) => {
    if (!window.confirm(`Delete message “${message.subject}”?`)) return;
    try {
      await api.delete(`/messages/${message.id}`);
      setMessages((current) => current.filter((item) => item.id !== message.id));
      if (selectedMessage?.id === message.id) setSelectedMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
    }
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  const handleCreateMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draft.subject.trim() || !draft.content.trim() || (!draft.to_id && draft.to_id !== 0) || (draft.to_id === 0 && !isCustomerInboxRecipient)) {
      setError('Subject, content, and recipient are required.');
      return;
    }

    if (isCustomerInboxRecipient) {
      const subject = draft.subject.trim();
      const content = draft.content.trim();
      const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Customer inbox inquiry\n\n${content}`)}`;
      window.location.href = mailto;
      setShowForm(false);
      setDraft({
        subject: '',
        to_id: team[0]?.id ?? 0,
        to_name: team[0]?.full_name || team[0]?.email || '',
        content: '',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const created = await api.post('/messages', {
        to_id: Number(draft.to_id),
        to_name: draft.to_name,
        subject: draft.subject.trim(),
        content: draft.content.trim(),
      });

      setMessages((current) => [created, ...current]);
      setShowForm(false);
      setDraft({
        subject: '',
        to_id: team[0]?.id ?? 0,
        to_name: team[0]?.full_name || team[0]?.email || '',
        content: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <PageHeader
          title="Messages"
          description="Internal team communications and notifications."
        />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading messages...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <PageHeader
        title="Messages"
        description="Internal team communications and notifications."
        action={
          <button
            onClick={() => setShowForm((current) => !current)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            {showForm ? 'Close' : 'New message'}
          </button>
        }
      />
      {error && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {showForm && (
        <form onSubmit={handleCreateMessage} className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            Default customer inbox: <span className="font-semibold">{CONTACT_EMAIL}</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Recipient</label>
              <select value={String(draft.to_id)} onChange={(e) => {
                const nextValue = e.target.value;
                if (nextValue === CONTACT_INBOX_ID) {
                  setDraft((current) => ({ ...current, to_id: CONTACT_INBOX_ID, to_name: CONTACT_EMAIL }));
                  return;
                }
                const selected = team.find((member) => member.id === Number(nextValue));
                setDraft((current) => ({ ...current, to_id: Number(nextValue), to_name: selected?.full_name || selected?.email || '' }));
              }} className="w-full rounded-md border border-gray-300 px-3 py-2">
                {team.map((member) => (
                  <option key={member.id} value={String(member.id)}>{member.full_name || member.email}</option>
                ))}
                <option value={CONTACT_INBOX_ID}>{CONTACT_EMAIL}</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Subject</label>
              <input value={draft.subject} onChange={(e) => setDraft((current) => ({ ...current, subject: e.target.value }))} className="w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Security update" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Message</label>
              <textarea value={draft.content} onChange={(e) => setDraft((current) => ({ ...current, content: e.target.value }))} className="h-28 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="Write the message here..." />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <X className="h-4 w-4" /> Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60">
              <Save className="h-4 w-4" /> {isSubmitting ? 'Sending...' : isCustomerInboxRecipient ? 'Open mail draft' : 'Send message'}
            </button>
          </div>
        </form>
      )}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1 border-b border-gray-200">
          {([
            ['all', 'All messages'], ['inbox', 'Inbox'], ['sent', 'Sent'], ['unread', 'Unread'],
          ] as const).map(([value, label]) => (
            <button key={value} onClick={() => setFolder(value)} className={`border-b-2 px-3 py-2 text-sm font-medium ${folder === value ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {label}
              {value === 'unread' && <span className="ml-2 text-xs">{messages.filter((message) => message.to_id === currentUserId && !message.is_read).length}</span>}
            </button>
          ))}
        </div>
        <label className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3" placeholder="Search messages" />
        </label>
      </div>
      {filteredMessages.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <EmptyState
            icon={<Mail className="w-12 h-12" />}
            title={messages.length === 0 ? 'No Messages Yet' : 'No Matching Messages'}
            description={messages.length === 0 ? 'Send a message to start a team conversation.' : 'Try another folder or search term.'}
          />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMessages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <button onClick={() => void openMessage(message)} className="flex items-center gap-2 text-left">
                      <Mail className={`h-5 w-5 shrink-0 ${message.is_read ? 'text-gray-400' : 'text-blue-600'}`} />
                      <span className={`text-sm ${message.is_read ? 'font-medium text-gray-800' : 'font-semibold text-gray-950'}`}>{message.subject}</span>
                    </button>
                    <p className="mt-1 max-w-md truncate pl-7 text-xs text-gray-500">{message.content}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{message.from_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserCheck className="w-5 h-5 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{message.to_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${message.is_read ? 'bg-gray-100 text-gray-700' : 'bg-blue-100 text-blue-700'}`}>
                      {message.is_read ? 'Read' : 'Unread'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(message.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => void openMessage(message)} title="View message" aria-label="View message" className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50">
                        <Eye className="h-4 w-4" />
                      </button>
                      {message.to_id === currentUserId && !message.is_read && (
                        <button onClick={() => void markRead(message)} title="Mark as read" aria-label="Mark as read" className="rounded-md border border-gray-300 p-2 text-gray-600 hover:bg-gray-50">
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      {message.from_id === currentUserId && (
                        <button onClick={() => void deleteMessage(message)} title="Delete message" aria-label="Delete message" className="rounded-md border border-red-200 p-2 text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMessage(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="message-title" className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <header className="flex items-start justify-between border-b border-gray-200 p-5">
              <div>
                <h2 id="message-title" className="text-lg font-semibold text-gray-900">{selectedMessage.subject}</h2>
                <p className="mt-1 text-sm text-gray-500">From {selectedMessage.from_name} to {selectedMessage.to_name}</p>
              </div>
              <button onClick={() => setSelectedMessage(null)} aria-label="Close message" className="rounded-md p-2 text-gray-500 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </header>
            <div className="whitespace-pre-wrap p-5 text-sm leading-6 text-gray-800">{selectedMessage.content}</div>
            <footer className="flex items-center justify-between border-t border-gray-200 p-5">
              <span className="text-xs text-gray-500">{new Date(selectedMessage.created_at).toLocaleString()}</span>
              <div className="flex gap-2">
                {selectedMessage.to_id === currentUserId && !selectedMessage.is_read && <button onClick={() => void markRead(selectedMessage)} className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"><Check className="h-4 w-4" /> Mark read</button>}
                {selectedMessage.from_id === currentUserId && <button onClick={() => void deleteMessage(selectedMessage)} className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700"><Trash2 className="h-4 w-4" /> Delete</button>}
              </div>
            </footer>
          </section>
        </div>
      )}
    </AdminLayout>
  );
}
