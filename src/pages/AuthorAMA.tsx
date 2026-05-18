import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { MessageSquare, Clock, BookOpen, ChevronRight, Calendar, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AMASession = {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'answering' | 'closed';
  questions_close_at: string;
  ama_starts_at: string;
  ama_ends_at: string | null;
  books?: { title: string; author: string } | null;
  profiles?: { username: string | null; email: string } | null;
};

type Tab = 'upcoming' | 'live' | 'past';

export const AuthorAMA = () => {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const dividerColor = isDark ? 'border-gray-800' : 'border-gray-200';
  const subColor = isDark ? 'text-[#F5F0E8]/50' : 'text-[#1B2A4A]/50';
  const cardBg = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';

  const [tab, setTab] = useState<Tab>('upcoming');
  const [sessions, setSessions] = useState<AMASession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSessions(); }, [tab]);

  async function loadSessions() {
    setLoading(true);
    const statusMap: Record<Tab, string[]> = {
      upcoming: ['open'],
      live: ['answering'],
      past: ['closed'],
    };
    const { data } = await supabase
      .from('ama_sessions')
      .select('*, books(title, author)')
      .in('status', statusMap[tab])
      .order('ama_starts_at', { ascending: tab !== 'past' });
    setSessions(data || []);
    setLoading(false);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'live', label: 'Live Now' },
    { key: 'past', label: 'Past AMAs' },
  ];

  const statusBadge = (status: AMASession['status']) => {
    if (status === 'answering')
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </span>
      );
    if (status === 'open')
      return (
        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
          Taking Questions
        </span>
      );
    return (
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
        Archived
      </span>
    );
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'}`}>

      {/* Header — matches Profile/other pages */}
      <div className={`border-b ${dividerColor} px-4 py-4 mb-8`}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigateTo('/')}
            className={`${subColor} hover:text-[#D4A843] transition-colors`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`font-serif text-3xl ${textPrimary}`}>Ask the Author</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-12">

        {/* Intro */}
        <p className={`${textMuted} mb-8`}>
          Submit questions, get answers straight from the author. Live sessions, real conversations.
        </p>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl bg-[#e8e0d5]/50 dark:bg-[#1B2A4A]/40 mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-white dark:bg-[#1B2A4A] text-[#1B2A4A] dark:text-[#F5F0E8] shadow-sm'
                  : `${textMuted} hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]`
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Sessions */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`rounded-2xl border ${cardBg} p-5 animate-pulse`}>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <MessageSquare size={40} className="mx-auto text-[#D4A843]/40 mb-4" />
            <p className={`${textMuted} text-sm`}>
              {tab === 'upcoming'
                ? 'No upcoming AMAs scheduled yet. Check back soon.'
                : tab === 'live'
                ? 'No live AMAs right now.'
                : 'No past AMAs yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const authorName =
                session.profiles?.username || session.profiles?.email || 'Author';
              return (
                <button
                  key={session.id}
                  onClick={() => navigateTo(`ama/${session.id}`)}
                  className={`w-full text-left rounded-2xl border ${cardBg} p-5 hover:border-[#D4A843]/60 transition-all group`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {statusBadge(session.status)}
                        {session.books && (
                          <span className="flex items-center gap-1 text-xs text-[#D4A843]">
                            <BookOpen size={11} />
                            {session.books.title}
                          </span>
                        )}
                      </div>
                      <h3 className={`font-semibold ${textPrimary} mb-1 group-hover:text-[#D4A843] transition-colors`}>
                        {session.title}
                      </h3>
                      <p className={`text-sm ${textMuted} mb-3`}>with {authorName}</p>
                      {session.description && (
                        <p className={`text-sm ${textMuted} mb-3 line-clamp-2`}>
                          {session.description}
                        </p>
                      )}
                      <div className={`flex flex-wrap gap-4 text-xs ${textMuted}`}>
                        {session.status === 'open' && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            Questions close {new Date(session.questions_close_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          AMA {new Date(session.ama_starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[#D4A843] shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
