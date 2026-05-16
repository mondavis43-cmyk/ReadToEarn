import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { MessageSquare, Clock, Send, ChevronLeft, BookOpen, Lock, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';

type AMASession = {
  id: string;
  title: string;
  description: string | null;
  status: 'open' | 'answering' | 'closed';
  questions_close_at: string;
  ama_starts_at: string;
  ama_ends_at: string | null;
  author_id: string;
  books?: { title: string; author: string } | null;
  profiles?: { display_name: string | null; username: string | null; email: string } | null;
};

type Question = {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  content: string;
  created_at: string;
  ama_answers?: Answer[];
  ama_replies?: Reply[];
};

type Answer = {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
};

type Reply = {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  content: string;
  created_at: string;
};

// Returns @username if set, falls back to display_name, then fallback string
const resolveName = (
  username?: string | null,
  displayName?: string | null,
  fallback = 'Reader'
) => {
  if (username) return `@${username}`;
  return displayName || fallback;
};

// Returns first character for avatar initials
const resolveInitial = (
  username?: string | null,
  displayName?: string | null
) => {
  if (username) return username[0].toUpperCase();
  if (displayName) return displayName[0].toUpperCase();
  return 'R';
};

export const AMASession = ({ sessionId }: { sessionId: string }) => {
  const { isDark } = useTheme();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';

  const [session, setSession] = useState<AMASession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [questionText, setQuestionText] = useState('');
  const [submittingQ, setSubmittingQ] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [questionSuccess, setQuestionSuccess] = useState(false);

  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [submittingA, setSubmittingA] = useState<string | null>(null);

  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [submittingR, setSubmittingR] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    loadAll();
  }, [sessionId]);

  useEffect(() => {
    if (user && sessionId) checkFollowStatus();
  }, [user, sessionId]);

  async function checkFollowStatus() {
    if (!user || !sessionId) return;
    const { data } = await supabase
      .from('ama_followers')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsFollowing(!!data);
  }

  async function toggleFollow() {
    if (!user) { setQuestionError('Sign in to get notified.'); return; }
    if (isFollowing) {
      await supabase.from('ama_followers').delete().eq('session_id', sessionId).eq('user_id', user.id);
      setIsFollowing(false);
    } else {
      await supabase.from('ama_followers').insert({ session_id: sessionId, user_id: user.id });
      setIsFollowing(true);
    }
  }

  async function loadAll() {
    setLoading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);

    if (u) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, username, role')
        .eq('id', u.id)
        .single();
      setUserProfile(profile);
    }

    const [{ data: sessionData }, { data: questionsData }] = await Promise.all([
      supabase
        .from('ama_sessions')
        .select('*, books(title, author)')
        .eq('id', sessionId)
        .single(),
      supabase
        .from('ama_questions')
        .select('*, ama_answers(*), ama_replies(*)')
        .eq('session_id', sessionId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true }),
    ]);

    setSession(sessionData);
    setQuestions(questionsData || []);
    setLoading(false);
  }

  const isAuthor = user && session && user.id === session.author_id;
  const questionsOpen = session
    ? session.status === 'open' && new Date() < new Date(session.questions_close_at)
    : false;
  const userHasQuestion = questions.some((q) => q.user_id === user?.id);

  async function handleSubmitQuestion() {
    if (!questionText.trim()) return;
    if (!user) { setQuestionError('Sign in to submit a question.'); return; }
    if (userHasQuestion) { setQuestionError('You already submitted a question for this AMA.'); return; }
    setSubmittingQ(true);
    setQuestionError('');
    const { error } = await supabase.from('ama_questions').insert({
      session_id: sessionId,
      user_id: user.id,
      display_name: userProfile?.display_name || user.email,
      username: userProfile?.username || null,
      content: questionText.trim(),
    });
    if (error) { setQuestionError('Failed to submit. Try again.'); setSubmittingQ(false); return; }
    setQuestionText('');
    setQuestionSuccess(true);
    setSubmittingQ(false);
    loadAll();
  }

  async function handleSubmitAnswer(questionId: string) {
    const text = answerText[questionId]?.trim();
    if (!text || !isAuthor) return;
    setSubmittingA(questionId);
    await supabase.from('ama_answers').insert({
      question_id: questionId,
      author_id: user.id,
      content: text,
    });
    setAnswerText((prev) => ({ ...prev, [questionId]: '' }));
    setSubmittingA(null);
    loadAll();
  }

  async function handleSubmitReply(questionId: string) {
    const text = replyText[questionId]?.trim();
    if (!text || !user) return;
    setSubmittingR(questionId);
    await supabase.from('ama_replies').insert({
      question_id: questionId,
      user_id: user.id,
      display_name: userProfile?.display_name || user.email,
      username: userProfile?.username || null,
      content: text,
    });
    setReplyText((prev) => ({ ...prev, [questionId]: '' }));
    setSubmittingR(null);
    loadAll();
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'} flex items-center justify-center`}>
        <div className="w-8 h-8 border-2 border-[#D4A843] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'} flex items-center justify-center`}>
        <p className={textMuted}>AMA session not found.</p>
      </div>
    );
  }

  const authorName = resolveName(
    session.profiles?.username,
    session.profiles?.display_name,
    session.profiles?.email || 'Author'
  );

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0F1923]' : 'bg-[#FAF8F5]'}`}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Back */}
        <button
          onClick={() => window.history.back()}
          className={`flex items-center gap-1 text-sm ${textMuted} hover:text-[#D4A843] transition-colors mb-6`}
        >
          <ChevronLeft size={16} /> All AMAs
        </button>

        {/* Session header */}
        <div className={`rounded-2xl border ${cardBg} p-6 mb-6`}>
          <div className="mb-3">
            {session.status === 'answering' && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full mb-2 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live Now
              </span>
            )}
            <h1 className={`text-xl font-bold ${textPrimary}`}>{session.title}</h1>
            <p className={`text-sm ${textMuted} mt-1`}>with {authorName}</p>
          </div>

          {session.books && (
            <div className="flex items-center gap-1.5 text-sm text-[#D4A843] mb-3">
              <BookOpen size={14} />
              <span>{session.books.title} by {session.books.author}</span>
            </div>
          )}

          {session.description && (
            <p className={`text-sm ${textMuted} mb-4`}>{session.description}</p>
          )}

          {/* Notify me button */}
          {!isAuthor && session.status !== 'closed' && (
            <button
              onClick={toggleFollow}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition mb-4 ${
                isFollowing
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-[#D4A843]/10 text-[#D4A843] hover:bg-[#D4A843]/20'
              }`}
            >
              <Bell size={16} />
              {isFollowing ? 'You\'ll be notified when live' : 'Notify me when live'}
            </button>
          )}

          <div className={`flex flex-wrap gap-4 text-xs ${textMuted}`}>
            {session.status === 'open' && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                Questions close {new Date(session.questions_close_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            )}
            <span className="flex items-center gap-1">
              <MessageSquare size={11} />
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Submit question */}
        {questionsOpen && !isAuthor && (
          <div className={`rounded-2xl border ${cardBg} p-5 mb-6`}>
            <h3 className={`font-semibold ${textPrimary} mb-3`}>Submit Your Question</h3>
            {questionSuccess ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <MessageSquare size={16} />
                Your question was submitted! The author will answer during the live AMA.
              </div>
            ) : userHasQuestion ? (
              <p className={`text-sm ${textMuted}`}>You've already submitted a question for this AMA.</p>
            ) : !user ? (
              <p className={`text-sm ${textMuted}`}>
                <button onClick={() => window.location.href = '/login'} className="text-[#D4A843] underline">Sign in</button> to submit a question.
              </p>
            ) : (
              <>
                <textarea
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 ${textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40 resize-none mb-2`}
                  placeholder="What do you want to ask?"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${textMuted}`}>{questionText.length}/500</span>
                  <button
                    onClick={handleSubmitQuestion}
                    disabled={submittingQ || !questionText.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50 transition"
                  >
                    <Send size={14} />
                    {submittingQ ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
                {questionError && <p className="text-xs text-red-500 mt-2">{questionError}</p>}
              </>
            )}
          </div>
        )}

        {/* Questions closed notice */}
        {session.status === 'open' && !questionsOpen && (
          <div className={`rounded-2xl border ${cardBg} p-4 mb-6 flex items-center gap-2 ${textMuted} text-sm`}>
            <Lock size={14} className="text-[#D4A843]" />
            Questions are now closed. The AMA starts {new Date(session.ama_starts_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}.
          </div>
        )}

        {/* Questions list */}
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare size={36} className="mx-auto text-[#D4A843]/30 mb-3" />
              <p className={`text-sm ${textMuted}`}>No questions yet. Be the first to ask!</p>
            </div>
          ) : (
            questions.map((q) => {
              const answer = q.ama_answers?.[0];
              const replies = q.ama_replies || [];
              const isMyQuestion = user && q.user_id === user.id;
              const questionerName = resolveName(q.username, q.display_name);
              const questionerInitial = resolveInitial(q.username, q.display_name);

              return (
                <div key={q.id} className={`rounded-2xl border ${cardBg} overflow-hidden`}>

                  {/* Question */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-[#D4A843]/20 flex items-center justify-center text-xs font-bold text-[#D4A843]">
                        {questionerInitial}
                      </div>
                      <span className={`text-xs font-medium ${textPrimary}`}>
                        {questionerName}
                        {isMyQuestion && <span className="ml-1 text-[#D4A843]">(you)</span>}
                      </span>
                      <span className={`text-xs ${textMuted}`}>
                        {new Date(q.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className={`text-sm ${textPrimary}`}>{q.content}</p>
                  </div>

                  {/* Author answer input */}
                  {isAuthor && !answer && session.status === 'answering' && (
                    <div className="border-t border-[#e8e0d5] dark:border-gray-700 bg-[#D4A843]/5 p-4">
                      <textarea
                        rows={2}
                        className={`w-full px-3 py-2 rounded-lg border border-[#D4A843]/30 bg-white dark:bg-gray-800 ${textPrimary} text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40 resize-none mb-2`}
                        placeholder="Write your answer..."
                        value={answerText[q.id] || ''}
                        onChange={(e) => setAnswerText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      />
                      <button
                        onClick={() => handleSubmitAnswer(q.id)}
                        disabled={submittingA === q.id || !answerText[q.id]?.trim()}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3a] disabled:opacity-50 transition"
                      >
                        <Send size={12} />
                        {submittingA === q.id ? 'Posting...' : 'Post Answer'}
                      </button>
                    </div>
                  )}

                  {/* Answer display */}
                  {answer && (
                    <div className="border-t border-[#D4A843]/20 bg-[#D4A843]/5 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-[#D4A843] flex items-center justify-center text-xs font-bold text-[#1B2A4A]">
                          A
                        </div>
                        <span className="text-xs font-semibold text-[#D4A843]">
                          {authorName} <span className="text-[#D4A843]/60 font-normal">· Author</span>
                        </span>
                      </div>
                      <p className={`text-sm ${textPrimary}`}>{answer.content}</p>

                      {/* Replies */}
                      {replies.length > 0 && (
                        <div className="mt-4 space-y-3 pl-4 border-l-2 border-[#D4A843]/20">
                          {replies.map((r) => {
                            const replyName = resolveName(r.username, r.display_name);
                            const replyInitial = resolveInitial(r.username, r.display_name);
                            return (
                              <div key={r.id}>
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-5 h-5 rounded-full bg-[#D4A843]/20 flex items-center justify-center text-xs font-bold text-[#D4A843]">
                                    {replyInitial}
                                  </div>
                                  <span className={`text-xs font-medium ${textPrimary}`}>
                                    {replyName}
                                  </span>
                                </div>
                                <p className={`text-xs ${textMuted}`}>{r.content}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Reply box (question owner only) */}
                      {isMyQuestion && !isAuthor && (
                        <div className="mt-4 pl-4 border-l-2 border-[#D4A843]/20">
                          <textarea
                            rows={2}
                            className={`w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 ${textPrimary} text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A843]/40 resize-none mb-2`}
                            placeholder="Reply to the author's answer..."
                            value={replyText[q.id] || ''}
                            onChange={(e) => setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                          />
                          <button
                            onClick={() => handleSubmitReply(q.id)}
                            disabled={submittingR === q.id || !replyText[q.id]?.trim()}
                            className="flex items-center gap-2 px-3 py-1.5 border border-[#D4A843] text-[#D4A843] rounded-lg text-xs font-semibold hover:bg-[#D4A843]/10 disabled:opacity-50 transition"
                          >
                            <Send size={11} />
                            {submittingR === q.id ? 'Sending...' : 'Reply'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
