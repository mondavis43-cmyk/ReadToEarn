import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Trash2, CheckCircle } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
}

interface Author {
  id: string;
  email: string;
  display_name: string | null;
}

interface AMASession {
  id: string;
  author_id: string;
  book_id: string | null;
  title: string;
  description: string | null;
  questions_close_at: string;
  ama_starts_at: string;
  ama_ends_at: string | null;
  status: 'open' | 'answering' | 'closed';
  created_at: string;
  books?: { title: string; author: string } | null;
}

interface AMAQuestion {
  id: string;
  session_id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  is_deleted: boolean;
  created_at: string;
}

interface AMARequest {
  id: string;
  author_id: string;
  proposed_topic: string;
  proposed_date: string | null;
  bio_blurb: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  profiles?: { display_name: string | null; email: string } | null;
}

interface NewSession {
  author_id: string;
  book_id: string;
  title: string;
  description: string;
  questions_close_at: string;
  ama_starts_at: string;
  ama_ends_at: string;
}

const emptySession: NewSession = {
  author_id: '',
  book_id: '',
  title: '',
  description: '',
  questions_close_at: '',
  ama_starts_at: '',
  ama_ends_at: '',
};

type AdminTab = 'sessions' | 'requests';

export function AdminAMA() {
  const [adminTab, setAdminTab] = useState<AdminTab>('requests');
  const [books, setBooks] = useState<Book[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [sessions, setSessions] = useState<AMASession[]>([]);
  const [questions, setQuestions] = useState<Record<string, AMAQuestion[]>>({});
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [newSession, setNewSession] = useState<NewSession>(emptySession);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Requests state
  const [requests, setRequests] = useState<AMARequest[]>([]);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';
  const selectClass = inputClass;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: booksData }, { data: sessionsData }] = await Promise.all([
      supabase.from('books').select('id, title, author').order('title'),
      supabase
        .from('ama_sessions')
        .select('*, books(title, author)')
        .order('ama_starts_at', { ascending: false }),
    ]);

    const { data: authorsData } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .eq('role', 'author')
      .order('display_name');

    setBooks(booksData || []);
    setSessions(sessionsData || []);
    setAuthors(authorsData || []);
    loadRequests();
  }

  async function loadRequests() {
    setRequestsLoading(true);
    const { data } = await supabase
      .from('ama_requests')
      .select('*, profiles(display_name, email)')
      .order('created_at', { ascending: false });
    setRequests(data || []);
    setRequestsLoading(false);
  }

  async function handleApproveRequest(id: string) {
    await supabase.from('ama_requests').update({ status: 'approved' }).eq('id', id);
    setSuccess('Request approved. Create their AMA session below.');
    setAdminTab('sessions');
    setShowForm(true);
    loadRequests();
  }

  async function handleRejectRequest(id: string) {
    const note = rejectNotes[id] || '';
    await supabase.from('ama_requests').update({ status: 'rejected', admin_note: note || null }).eq('id', id);
    setRejectOpen(null);
    setRejectNotes(prev => { const n = { ...prev }; delete n[id]; return n; });
    loadRequests();
  }

  async function loadQuestions(sessionId: string) {
    const { data } = await supabase
      .from('ama_questions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    setQuestions((prev) => ({ ...prev, [sessionId]: data || [] }));
  }

  function toggleExpand(sessionId: string) {
    if (expandedSession === sessionId) {
      setExpandedSession(null);
    } else {
      setExpandedSession(sessionId);
      loadQuestions(sessionId);
    }
  }

  async function handleSave() {
    if (!newSession.author_id || !newSession.title || !newSession.questions_close_at || !newSession.ama_starts_at) {
      setError('Author, title, and dates are required.');
      return;
    }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('ama_sessions').insert({
      author_id: newSession.author_id,
      book_id: newSession.book_id || null,
      title: newSession.title,
      description: newSession.description || null,
      questions_close_at: newSession.questions_close_at,
      ama_starts_at: newSession.ama_starts_at,
      ama_ends_at: newSession.ama_ends_at || null,
      status: 'open',
    });
    if (err) { setError('Failed to save: ' + err.message); setSaving(false); return; }
    setSuccess('AMA session created!');
    setNewSession(emptySession);
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleUpdateStatus(id: string, status: 'open' | 'answering' | 'closed') {
    await supabase.from('ama_sessions').update({ status }).eq('id', id);
    loadData();
  }

  async function handleDeleteSession(id: string) {
    if (!confirm('Delete this AMA session and all its questions?')) return;
    await supabase.from('ama_sessions').delete().eq('id', id);
    loadData();
  }

  async function handleDeleteQuestion(sessionId: string, questionId: string) {
    await supabase.from('ama_questions').update({ is_deleted: true }).eq('id', questionId);
    loadQuestions(sessionId);
  }

  async function handleRestoreQuestion(sessionId: string, questionId: string) {
    await supabase.from('ama_questions').update({ is_deleted: false }).eq('id', questionId);
    loadQuestions(sessionId);
  }

  const statusColor = (status: AMASession['status']) => {
    if (status === 'open') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'answering') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400';
  };

  const requestStatusColor = (status: string) => {
    if (status === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    if (status === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
  };

  const standardBooks = books.filter((b) => (b as any).book_type !== 'bulletin_board');
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          {error}<button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-green-700 dark:text-green-400 text-sm flex items-center justify-between">
          {success}<button onClick={() => setSuccess('')}><X size={14} /></button>
        </div>
      )}

      {/* Admin tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800 w-fit">
        <button
          onClick={() => setAdminTab('requests')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            adminTab === 'requests'
              ? 'bg-white dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] shadow-sm'
              : 'text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]'
          }`}
        >
          Requests
          {pendingCount > 0 && (
            <span className="bg-[#D4A843] text-[#1B2A4A] text-xs font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setAdminTab('sessions')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            adminTab === 'sessions'
              ? 'bg-white dark:bg-gray-700 text-[#1B2A4A] dark:text-[#F5F0E8] shadow-sm'
              : 'text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]'
          }`}
        >
          Sessions
        </button>
      </div>

      {/* ── REQUESTS TAB ── */}
      {adminTab === 'requests' && (
        <div className="space-y-3">
          <p className="text-sm text-[#6B7280] dark:text-gray-400">
            Authors who have expressed interest in hosting an AMA.
          </p>
          {requestsLoading ? (
            <p className="text-sm text-[#6B7280] dark:text-gray-400">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-[#6B7280] dark:text-gray-400">No requests yet.</p>
          ) : (
            requests.map((req) => {
              const authorName = req.profiles?.display_name || req.profiles?.email || req.author_id;
              return (
                <div key={req.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">{authorName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${requestStatusColor(req.status)}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">
                        <span className="text-[#6B7280] dark:text-gray-400">Topic: </span>{req.proposed_topic}
                      </p>
                      {req.proposed_date && (
                        <p className="text-xs text-[#6B7280] dark:text-gray-400">
                          Preferred date: {new Date(req.proposed_date).toLocaleDateString()}
                        </p>
                      )}
                      {req.bio_blurb && (
                        <p className="text-xs text-[#6B7280] dark:text-gray-400">Bio: {req.bio_blurb}</p>
                      )}
                      {req.admin_note && (
                        <p className="text-xs text-red-500 dark:text-red-400">Note sent: {req.admin_note}</p>
                      )}
                      <p className="text-xs text-[#6B7280] dark:text-gray-400">
                        Submitted {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition font-medium"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => setRejectOpen(rejectOpen === req.id ? null : req.id)}
                          className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium"
                        >
                          ✕ Reject
                        </button>
                      </div>
                      {rejectOpen === req.id && (
                        <div className="space-y-2">
                          <textarea
                            className={`${inputClass} resize-none`}
                            rows={2}
                            placeholder="Optional note to author explaining the rejection..."
                            value={rejectNotes[req.id] || ''}
                            onChange={e => setRejectNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRejectRequest(req.id)}
                              className="text-xs px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition font-medium"
                            >
                              Confirm Reject
                            </button>
                            <button
                              onClick={() => setRejectOpen(null)}
                              className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── SESSIONS TAB ── */}
      {adminTab === 'sessions' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
              Author AMAs ({sessions.filter((s) => s.status !== 'closed').length} active/open)
            </h2>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]"
              >
                <Plus size={16} /> New AMA
              </button>
            )}
          </div>

          {/* Create form */}
          {showForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Create AMA Session</h3>
                <button onClick={() => { setShowForm(false); setNewSession(emptySession); }} className="text-[#6B7280]">
                  <X size={18} />
                </button>
              </div>

              <div>
                <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Author *</label>
                <select
                  className={selectClass}
                  value={newSession.author_id}
                  onChange={(e) => setNewSession({ ...newSession, author_id: e.target.value })}
                >
                  <option value="">Select an author...</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.display_name || a.email}
                    </option>
                  ))}
                </select>
                {authors.length === 0 && (
                  <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
                    No authors found. Make sure author accounts have role = 'author' in profiles.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Title *</label>
                <input
                  className={inputClass}
                  placeholder="e.g. Ask Me Anything with Toni Morrison"
                  value={newSession.title}
                  onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Description</label>
                <textarea
                  className={inputClass}
                  rows={3}
                  placeholder="What will this AMA cover? (optional)"
                  value={newSession.description}
                  onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">
                  Book <span className="text-[#6B7280]">(optional)</span>
                </label>
                <select
                  className={selectClass}
                  value={newSession.book_id}
                  onChange={(e) => setNewSession({ ...newSession, book_id: e.target.value })}
                >
                  <option value="">No specific book</option>
                  {standardBooks.map((b) => (
                    <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Questions Close *</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={newSession.questions_close_at}
                    onChange={(e) => setNewSession({ ...newSession, questions_close_at: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">AMA Starts *</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={newSession.ama_starts_at}
                    onChange={(e) => setNewSession({ ...newSession, ama_starts_at: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">AMA Ends</label>
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={newSession.ama_ends_at}
                    onChange={(e) => setNewSession({ ...newSession, ama_ends_at: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Create AMA'}
                </button>
                <button
                  onClick={() => { setShowForm(false); setNewSession(emptySession); }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Sessions list */}
          {sessions.length === 0 ? (
            <p className="text-sm text-[#6B7280] dark:text-gray-400">No AMA sessions yet.</p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div key={session.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">{session.title}</p>
                        <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                          {session.books ? `${session.books.title} · ` : 'General AMA · '}
                          Questions close {new Date(session.questions_close_at).toLocaleDateString()} ·
                          AMA {new Date(session.ama_starts_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${statusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-3 flex-wrap">
                      {session.status === 'open' && (
                        <button
                          onClick={() => handleUpdateStatus(session.id, 'answering')}
                          className="text-xs px-3 py-1.5 rounded-lg border border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition"
                        >
                          Start Answering
                        </button>
                      )}
                      {session.status === 'answering' && (
                        <button
                          onClick={() => handleUpdateStatus(session.id, 'closed')}
                          className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          Close AMA
                        </button>
                      )}
                      <button
                        onClick={() => toggleExpand(session.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-[#D4A843] text-[#D4A843] hover:bg-[#D4A843]/10 transition"
                      >
                        {expandedSession === session.id ? 'Hide Questions' : 'Moderate Questions'}
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {expandedSession === session.id && (
                    <div className="border-t border-[#e8e0d5] dark:border-gray-700 p-4 space-y-3">
                      <p className="text-xs font-medium text-[#6B7280] dark:text-gray-400 uppercase tracking-wide">
                        Questions ({(questions[session.id] || []).length})
                      </p>
                      {(questions[session.id] || []).length === 0 ? (
                        <p className="text-sm text-[#6B7280] dark:text-gray-400">No questions yet.</p>
                      ) : (
                        (questions[session.id] || []).map((q) => (
                          <div
                            key={q.id}
                            className={`rounded-lg border p-3 ${
                              q.is_deleted
                                ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 opacity-60'
                                : 'border-[#e8e0d5] dark:border-gray-700 bg-[#faf8f5] dark:bg-gray-700/30'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <p className="text-xs text-[#6B7280] dark:text-gray-400 mb-1">
                                  {q.display_name || 'Anonymous'} · {new Date(q.created_at).toLocaleString()}
                                  {q.is_deleted && <span className="ml-2 text-red-500 font-medium">DELETED</span>}
                                </p>
                                <p className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">{q.content}</p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                {!q.is_deleted ? (
                                  <button
                                    onClick={() => handleDeleteQuestion(session.id, q.id)}
                                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                                    title="Delete question"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleRestoreQuestion(session.id, q.id)}
                                    className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition"
                                    title="Restore question"
                                  >
                                    <CheckCircle size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
