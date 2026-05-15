import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Edit2, Save, X } from 'lucide-react';

type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'paid';
type FilterStatus = 'pending' | 'approved' | 'rejected' | 'paid';

interface BookListing {
  id: string;
  email: string;
  title: string;
  author: string;
  page_count: number;
  description: string;
  cover_url: string;
  affiliate_link: string | null;
  genres: string[];
  tropes: string[];
  questions: QuizQuestion[];
  bundle_size: number;
  amount_paid: number;
  status: SubmissionStatus;
  created_at: string;
}

interface QuizQuestion {
  question: string;
  correct: string;
  wrong1: string;
  wrong2: string;
  wrong3: string;
}

export const AdminBookListings = () => {
  const { isDark } = useTheme();

  const [listings, setListings] = useState<BookListing[]>([]);
  const [filter, setFilter] = useState<FilterStatus>('paid');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<BookListing>>({});
  const [pendingCount, setPendingCount] = useState(0);

  // Theme tokens
  const pageBg = isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]';
  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/60' : 'text-[#1B2A4A]/60';
  const cardBg = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';
  const divider = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
  const inputCls = `w-full px-3 py-2 rounded-lg border text-sm focus:outline-none transition-colors ${
    isDark
      ? 'bg-[#0f1623] border-[#F5F0E8]/10 text-[#F5F0E8] focus:border-[#D4A843]/60'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] focus:border-[#D4A843]/60'
  }`;

  useEffect(() => {
    loadListings();
    loadPendingCount();
  }, [filter]);

  const loadListings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('author_submissions')
      .select('*')
      .eq('status', filter)
      .order('created_at', { ascending: false });
    setListings((data as BookListing[]) || []);
    setLoading(false);
  };

  const loadPendingCount = async () => {
    const { count } = await supabase
      .from('author_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    setPendingCount(count || 0);
  };

  const updateStatus = async (id: string, status: SubmissionStatus) => {
    const { error } = await supabase.from('author_submissions').update({ status }).eq('id', id);
    if (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status: ' + error.message);
      return;
    }

    // If approving, also insert into books table so it appears in Library
    if (status === 'approved') {
      const listing = listings.find((l) => l.id === id);
      if (listing) {
        // Insert book
        const { data: bookData, error: bookErr } = await supabase
          .from('books')
          .insert({
            title: listing.title,
            author: listing.author,
            cover_url: listing.cover_url || null,
            page_count: parseInt(listing.page_count.toString()),
            description: listing.description || null,
            geniuslink_url: listing.affiliate_link || null,
            submission_email: listing.email || null,
            book_type: 'standard',
            genres: listing.genres || [],
            is_listed: true,
            bounty_amount: 0,
          })
          .select()
          .single();

        if (bookErr || !bookData) {
          console.error('Failed to insert book:', bookErr);
          alert('Status updated but failed to add book to Library: ' + (bookErr?.message || 'Unknown error'));
        } else {
          // Insert questions if any
          if (listing.questions && listing.questions.length > 0) {
            const questionsToInsert = listing.questions.map((q) => ({
              book_id: bookData.id,
              question_text: q.question,
              correct_answer: q.correct,
              wrong_answer_1: q.wrong1,
              wrong_answer_2: q.wrong2,
              wrong_answer_3: q.wrong3,
            }));
            const { error: qErr } = await supabase.from('questions').insert(questionsToInsert);
            if (qErr) {
              console.error('Failed to insert questions:', qErr);
            }
          }
        }
      }
    }

    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    if (status !== 'pending') {
      setPendingCount((p) => Math.max(0, p - 1));
    }
  };

  const startEdit = (listing: BookListing) => {
    setEditDraft({
      title: listing.title,
      author: listing.author,
      page_count: listing.page_count,
      amount_paid: listing.amount_paid,
      description: listing.description,
      affiliate_link: listing.affiliate_link,
    });
    setEditingId(listing.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEdit = async (id: string) => {
    await supabase.from('author_submissions').update(editDraft).eq('id', id);
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...editDraft } : l)));
    setEditingId(null);
    setEditDraft({});
  };

  const saveAndApprove = async (id: string) => {
    await saveEdit(id);
    await updateStatus(id, 'approved');
  };

  const StatusBadge = ({ status }: { status: SubmissionStatus }) => {
    const map: Record<SubmissionStatus, { icon: React.ReactNode; cls: string }> = {
      pending: { icon: <Clock size={12} />, cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
      approved: { icon: <CheckCircle size={12} />, cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
      rejected: { icon: <XCircle size={12} />, cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
      paid: { icon: <CheckCircle size={12} />, cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    };
    const { icon, cls } = map[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium ${cls}`}>
        {icon}
        {status}
      </span>
    );
  };

  const QuizList = ({ questions }: { questions: QuizQuestion[] }) => {
    if (!questions || questions.length === 0) {
      return <p className={`text-xs italic ${textMuted}`}>No quiz questions submitted.</p>;
    }
    return (
      <ol className="space-y-3">
        {questions.map((q, idx) => (
          <li
            key={idx}
            className={`rounded-lg p-4 border ${
              isDark ? 'border-[#F5F0E8]/10 bg-[#0f1623]/40' : 'border-[#1B2A4A]/10 bg-[#F5F0E8]/60'
            }`}
          >
            <p className={`text-sm ${textPrimary} mb-3`}>
              <span className={`font-semibold mr-1.5 ${textMuted}`}>Q{idx + 1}.</span>
              {q.question}
            </p>
            <div className="space-y-1.5 text-sm">
              <p className="text-green-600 dark:text-green-400">
                <span className="font-medium">Correct:</span> {q.correct}
              </p>
              <p className={textMuted}>
                <span className="font-medium">Wrong 1:</span> {q.wrong1}
              </p>
              <p className={textMuted}>
                <span className="font-medium">Wrong 2:</span> {q.wrong2}
              </p>
              <p className={textMuted}>
                <span className="font-medium">Wrong 3:</span> {q.wrong3}
              </p>
            </div>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>
      {/* Header */}
      <div className={`border-b ${divider} px-6 py-5`}>
        <div className="max-w-6xl mx-auto">
          <h1 className={`font-serif text-3xl ${textPrimary}`}>Book Listings</h1>
          <p className={`text-sm mt-1 ${textMuted}`}>
            Review and approve author book submissions with quiz questions.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Status filter */}
        <div className="flex gap-2 mb-6">
          {(['paid', 'pending', 'approved', 'rejected'] as FilterStatus[]).map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`relative px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                filter === opt
                  ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                  : `${
                      isDark
                        ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/60 hover:border-[#D4A843]/40'
                        : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#D4A843]/40'
                    }`
              }`}
            >
              {opt}
              {opt === 'pending' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Listings list */}
        {loading ? (
          <div className={`text-center py-16 ${textMuted}`}>Loading...</div>
        ) : listings.length === 0 ? (
          <div className={`text-center py-16 ${textMuted}`}>
            No {filter} book listings found.
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => {
              const isExpanded = expandedId === listing.id;
              const isEditing = editingId === listing.id;

              return (
                <div key={listing.id} className={`rounded-xl border ${cardBg} overflow-hidden`}>
                  {/* Row header */}
                  <div className="flex items-center justify-between px-5 py-4 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusBadge status={listing.status} />
                      <div className="min-w-0">
                        <p className={`font-semibold text-sm truncate ${textPrimary}`}>
                          {listing.title || '—'}
                        </p>
                        <p className={`text-xs truncate ${textMuted}`}>
                          {listing.email} · {listing.author}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs ${textMuted}`}>
                        {new Date(listing.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-semibold text-[#D4A843]">
                        ${listing.amount_paid}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${isDark ? 'border-[#F5F0E8]/20' : 'border-[#1B2A4A]/20'}`}>
                        {listing.questions?.length || 0} Qs
                      </span>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : listing.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          isDark ? 'hover:bg-[#F5F0E8]/10' : 'hover:bg-[#1B2A4A]/10'
                        }`}
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} className={textMuted} />
                        ) : (
                          <ChevronDown size={16} className={textMuted} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className={`border-t ${divider} px-5 py-5`}>
                      {/* Detail fields */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-6">
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                            Book Title
                          </p>
                          <p className={`text-sm ${textPrimary}`}>{listing.title}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                            Author
                          </p>
                          <p className={`text-sm ${textPrimary}`}>{listing.author}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                            Email
                          </p>
                          <p className={`text-sm ${textPrimary}`}>{listing.email}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                            Page Count
                          </p>
                          <p className={`text-sm ${textPrimary}`}>{listing.page_count}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                            Amount Paid
                          </p>
                          <p className={`text-sm ${textPrimary}`}>${listing.amount_paid}</p>
                        </div>
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                            Bundle Size
                          </p>
                          <p className={`text-sm ${textPrimary}`}>{listing.bundle_size}</p>
                        </div>
                        {listing.cover_url && (
                          <div className="col-span-2">
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                              Cover Image
                            </p>
                            <img
                              src={listing.cover_url}
                              alt={listing.title}
                              className="w-32 h-48 object-cover rounded-lg border"
                            />
                          </div>
                        )}
                        {listing.description && (
                          <div className="col-span-2">
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                              Description
                            </p>
                            <p className={`text-sm ${textPrimary} whitespace-pre-wrap`}>
                              {listing.description}
                            </p>
                          </div>
                        )}
                        {listing.affiliate_link && (
                          <div className="col-span-2">
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                              Affiliate Link
                            </p>
                            <a
                              href={listing.affiliate_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline break-all"
                            >
                              {listing.affiliate_link}
                            </a>
                          </div>
                        )}
                        {listing.genres && listing.genres.length > 0 && (
                          <div className="col-span-2">
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                              Genres
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {listing.genres.map((g) => (
                                <span
                                  key={g}
                                  className={`px-2 py-1 rounded-full text-xs border ${
                                    isDark
                                      ? 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843]'
                                      : 'bg-[#D4A843]/10 border-[#D4A843]/40 text-[#1B2A4A]'
                                  }`}
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {listing.tropes && listing.tropes.length > 0 && (
                          <div className="col-span-2">
                            <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${textMuted}`}>
                              Tropes
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {listing.tropes.map((t) => (
                                <span
                                  key={t}
                                  className={`px-2 py-1 rounded-full text-xs border ${
                                    isDark
                                      ? 'bg-[#D4A843]/10 border-[#D4A843]/30 text-[#D4A843]'
                                      : 'bg-[#D4A843]/10 border-[#D4A843]/40 text-[#1B2A4A]'
                                  }`}
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quiz questions */}
                      <div className="mb-6">
                        <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${textMuted}`}>
                          Quiz Questions ({listing.questions?.length || 0})
                        </p>
                        <QuizList questions={listing.questions || []} />
                      </div>

                      {/* Edit mode */}
                      {isEditing ? (
                        <div>
                          <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${textMuted}`}>
                            Editing Fields
                          </p>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
                                Book Title
                              </label>
                              <input
                                type="text"
                                value={editDraft.title || ''}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({ ...prev, title: e.target.value }))
                                }
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
                                Author
                              </label>
                              <input
                                type="text"
                                value={editDraft.author || ''}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({ ...prev, author: e.target.value }))
                                }
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
                                Page Count
                              </label>
                              <input
                                type="text"
                                value={editDraft.page_count || ''}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    page_count: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className={inputCls}
                              />
                            </div>
                            <div>
                              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
                                Amount Paid ($)
                              </label>
                              <input
                                type="text"
                                value={editDraft.amount_paid || ''}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({
                                    ...prev,
                                    amount_paid: parseFloat(e.target.value) || 0,
                                  }))
                                }
                                className={inputCls}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
                                Description
                              </label>
                              <textarea
                                rows={3}
                                value={editDraft.description || ''}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({ ...prev, description: e.target.value }))
                                }
                                className={`${inputCls} resize-none`}
                              />
                            </div>
                            <div className="col-span-2">
                              <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
                                Affiliate Link
                              </label>
                              <input
                                type="text"
                                value={editDraft.affiliate_link || ''}
                                onChange={(e) =>
                                  setEditDraft((prev) => ({ ...prev, affiliate_link: e.target.value }))
                                }
                                className={inputCls}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={cancelEdit}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                                isDark
                                  ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/60 hover:border-[#F5F0E8]/40'
                                  : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#1B2A4A]/40'
                              }`}
                            >
                              <X size={14} /> Cancel
                            </button>
                            <button
                              onClick={() => saveEdit(listing.id)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                                isDark
                                  ? 'border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10'
                                  : 'border-[#D4A843]/60 text-[#D4A843] hover:bg-[#D4A843]/10'
                              }`}
                            >
                              <Save size={14} /> Save Changes
                            </button>
                            <button
                              onClick={() => saveAndApprove(listing.id)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-500 transition-colors"
                            >
                              <CheckCircle size={14} /> Save & Approve
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => startEdit(listing)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-colors ${
                              isDark
                                ? 'border-[#F5F0E8]/20 text-[#F5F0E8]/60 hover:border-[#D4A843]/40 hover:text-[#D4A843]'
                                : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60 hover:border-[#D4A843]/40 hover:text-[#D4A843]'
                            }`}
                          >
                            <Edit2 size={14} /> Edit
                          </button>
                          {listing.status !== 'approved' && (
                            <button
                              onClick={() => updateStatus(listing.id, 'approved')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-500 transition-colors"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                          )}
                          {listing.status !== 'rejected' && (
                            <button
                              onClick={() => updateStatus(listing.id, 'rejected')}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm bg-red-600/80 text-white hover:bg-red-500 transition-colors"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
