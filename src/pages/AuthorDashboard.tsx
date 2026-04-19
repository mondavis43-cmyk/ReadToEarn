import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

const BOUNTY_RATE = 0.0085;
const BOUNTY_CAP = 5.0;

function calcBounty(pageCount: number): number {
  return Math.min(pageCount * BOUNTY_RATE, BOUNTY_CAP);
}

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

interface BookListing {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  bounty_amount: number;
  page_count: number;
  description: string | null;
  is_platform_book: boolean;
  created_at: string;
  total_completions: number;
  pass_count: number;
  total_paid_out: number;
}

interface ClaimableBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number;
}

type EditTab = "details" | "quiz";

export default function AuthorDashboard() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main state
  const [books, setBooks] = useState<BookListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Edit modal state
  const [editingBook, setEditingBook] = useState<BookListing | null>(null);
  const [activeTab, setActiveTab] = useState<EditTab>("details");
  const [editForm, setEditForm] = useState({
    title: "",
    author: "",
    description: "",
    page_count: 0,
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSearch, setClaimSearch] = useState("");
  const [claimResults, setClaimResults] = useState<ClaimableBook[]>([]);
  const [claimSearching, setClaimSearching] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      navigate("/login");
      return;
    }
    setUserId(user.id);
    await fetchAuthorBooks(user.id);
  }

  async function fetchAuthorBooks(uid: string) {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("books")
      .select(`
        id,
        title,
        author,
        cover_url,
        bounty_amount,
        page_count,
        description,
        is_platform_book,
        created_at,
        completed_books (
          id,
          passed
        )
      `)
      .eq("author_id", uid)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError("Failed to load your listings. Please try again.");
      setLoading(false);
      return;
    }

    const shaped: BookListing[] = (data || []).map((book: any) => {
      const completions = book.completed_books || [];
      const passCount = completions.filter((c: any) => c.passed === true).length;
      const totalCompletions = completions.length;
      return {
        id: book.id,
        title: book.title,
        author: book.author,
        cover_url: book.cover_url,
        bounty_amount: book.bounty_amount,
        page_count: book.page_count,
        description: book.description,
        is_platform_book: book.is_platform_book,
        created_at: book.created_at,
        total_completions: totalCompletions,
        pass_count: passCount,
        total_paid_out: passCount * book.bounty_amount,
      };
    });

    setBooks(shaped);
    setLoading(false);
  }

  // ─── Edit modal ───────────────────────────────────────────────

  async function openEdit(book: BookListing) {
    setEditingBook(book);
    setActiveTab("details");
    setEditForm({
      title: book.title,
      author: book.author,
      description: book.description || "",
      page_count: book.page_count,
    });
    setCoverFile(null);
    setCoverPreview(null);
    setSaveSuccess(false);
    setError(null);
    await loadQuestions(book.id);
  }

  function closeEdit() {
    setEditingBook(null);
    setCoverFile(null);
    setCoverPreview(null);
    setSaveSuccess(false);
  }

  async function loadQuestions(bookId: string) {
    setQuestionsLoading(true);
    const { data, error: qErr } = await supabase
      .from("questions")
      .select("id, question_text, correct_answer, wrong_answer_1, wrong_answer_2, wrong_answer_3")
      .eq("book_id", bookId);

    if (!qErr && data) {
      setQuestions(data as Question[]);
    }
    setQuestionsLoading(false);
  }

  function handleCoverSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function uploadCover(bookId: string): Promise<string | null> {
    if (!coverFile) return null;
    setUploadingCover(true);
    const ext = coverFile.name.split(".").pop();
    const path = `covers/${bookId}-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("book-covers")
      .upload(path, coverFile, { upsert: true });

    if (uploadError) {
      setError("Cover upload failed. Other changes were saved.");
      setUploadingCover(false);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("book-covers")
      .getPublicUrl(path);

    setUploadingCover(false);
    return urlData.publicUrl;
  }

  async function handleSaveDetails() {
    if (!editingBook) return;
    setSaving(true);
    setSaveSuccess(false);

    const newBounty = calcBounty(editForm.page_count);
    let newCoverUrl = editingBook.cover_url;

    if (coverFile) {
      const uploaded = await uploadCover(editingBook.id);
      if (uploaded) newCoverUrl = uploaded;
    }

    const { error: updateError } = await supabase
      .from("books")
      .update({
        title: editForm.title.trim(),
        author: editForm.author.trim(),
        description: editForm.description.trim(),
        page_count: Number(editForm.page_count),
        bounty_amount: newBounty,
        cover_url: newCoverUrl,
      })
      .eq("id", editingBook.id);

    setSaving(false);

    if (updateError) {
      setError("Failed to save changes. Please try again.");
      return;
    }

    setSaveSuccess(true);
    await fetchAuthorBooks(userId!);
    setTimeout(() => setSaveSuccess(false), 2000);
  }

  function updateQuestion(index: number, field: keyof Question, value: string) {
    setQuestions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  async function handleSaveQuestions() {
    if (!editingBook) return;
    setSaving(true);
    setSaveSuccess(false);

    // Upsert all questions
    const upsertData = questions.map((q) => ({
      id: q.id,
      book_id: editingBook.id,
      question_text: q.question_text,
      correct_answer: q.correct_answer,
      wrong_answer_1: q.wrong_answer_1,
      wrong_answer_2: q.wrong_answer_2,
      wrong_answer_3: q.wrong_answer_3,
    }));

    const { error: upsertError } = await supabase
      .from("questions")
      .upsert(upsertData, { onConflict: "id" });

    setSaving(false);

    if (upsertError) {
      setError("Failed to save quiz questions. Please try again.");
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }

  // ─── Claim modal ──────────────────────────────────────────────

  async function searchClaimableBooks() {
    if (!claimSearch.trim()) return;
    setClaimSearching(true);
    setClaimResults([]);

    const { data, error: searchError } = await supabase
      .from("books")
      .select("id, title, author, cover_url, page_count")
      .eq("is_platform_book", true)
      .is("author_id", null)
      .ilike("title", `%${claimSearch.trim()}%`)
      .limit(10);

    if (!searchError && data) {
      setClaimResults(data as ClaimableBook[]);
    }
    setClaimSearching(false);
  }

  async function claimBook(book: ClaimableBook) {
    if (!userId) return;
    setClaiming(book.id);

    const { error: claimError } = await supabase
      .from("books")
      .update({
        author_id: userId,
        is_platform_book: false,
      })
      .eq("id", book.id)
      .is("author_id", null); // safety: only claim if still unclaimed

    if (claimError) {
      setError("Failed to claim this book. It may have already been claimed.");
      setClaiming(null);
      return;
    }

    setClaiming(null);
    setClaimSuccess(book.title);
    setClaimResults((prev) => prev.filter((b) => b.id !== book.id));
    await fetchAuthorBooks(userId);
    setTimeout(() => setClaimSuccess(null), 3000);
  }

  // ─── Render ───────────────────────────────────────────────────

  const totalReaders = books.reduce((sum, b) => sum + b.total_completions, 0);
  const totalPaidOut = books.reduce((sum, b) => sum + b.total_paid_out, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Author Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your book listings and track performance</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowClaimModal(true); setClaimSearch(""); setClaimResults([]); setClaimSuccess(null); }}
              className="border border-indigo-600 text-indigo-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
            >
              Claim a Book
            </button>
            <button
              onClick={() => navigate("/author-submit")}
              className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              + Add New Listing
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-4 text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Listings</p>
            <p className="text-3xl font-bold text-gray-900">{books.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Readers</p>
            <p className="text-3xl font-bold text-gray-900">{totalReaders}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Paid Out</p>
            <p className="text-3xl font-bold text-gray-900">${totalPaidOut.toFixed(2)}</p>
          </div>
        </div>

        {/* Book listings */}
        {books.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <p className="text-gray-500 text-sm mb-4">You haven't submitted any book listings yet.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { setShowClaimModal(true); setClaimSearch(""); setClaimResults([]); }}
                className="border border-indigo-600 text-indigo-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-50 transition"
              >
                Claim a Book
              </button>
              <button
                onClick={() => navigate("/author-submit")}
                className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Submit Your First Book
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <div key={book.id} className="bg-white rounded-xl border border-gray-200 p-5 flex gap-4 items-start">
                {/* Cover */}
                <div className="flex-shrink-0 w-16 h-20 bg-gray-100 rounded-lg overflow-hidden">
                  {book.cover_url ? (
                    <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs text-center px-1">
                      No cover
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 truncate">{book.title}</h2>
                      <p className="text-sm text-gray-500">{book.author}</p>
                    </div>
                    {book.is_platform_book && (
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">
                        Platform Book
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                    <span><span className="font-medium text-gray-900">{book.page_count}</span> pages</span>
                    <span><span className="font-medium text-gray-900">${book.bounty_amount.toFixed(2)}</span> bounty</span>
                    <span><span className="font-medium text-gray-900">{book.total_completions}</span> attempts</span>
                    <span><span className="font-medium text-gray-900">{book.pass_count}</span> passed</span>
                    <span>
                      <span className="font-medium text-gray-900">
                        {book.total_completions > 0
                          ? Math.round((book.pass_count / book.total_completions) * 100)
                          : 0}%
                      </span>{" "}pass rate
                    </span>
                    <span><span className="font-medium text-gray-900">${book.total_paid_out.toFixed(2)}</span> paid out</span>
                  </div>

                  {/* Actions */}
                  <div className="mt-3">
                    <button
                      onClick={() => openEdit(book)}
                      className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit listing
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Edit Modal ─────────────────────────────────────────── */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4 py-8 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Edit Listing</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {(["details", "quiz"] as EditTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-3 px-4 text-sm font-medium border-b-2 transition -mb-px ${
                    activeTab === tab
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab === "details" ? "Book Details" : "Quiz Questions"}
                </button>
              ))}
            </div>

            <div className="px-6 py-5">

              {/* ── Details tab ── */}
              {activeTab === "details" && (
                <div className="space-y-5">

                  {/* Cover upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {coverPreview ? (
                          <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : editingBook.cover_url ? (
                          <img src={editingBook.cover_url} alt="Current cover" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs text-center px-1">No cover</div>
                        )}
                      </div>
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleCoverSelect}
                          className="hidden"
                        />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
                        >
                          {editingBook.cover_url ? "Replace cover" : "Upload cover"}
                        </button>
                        {coverFile && (
                          <p className="text-xs text-gray-400 mt-1">{coverFile.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
                    <input
                      type="text"
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Author */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Author Name</label>
                    <input
                      type="text"
                      value={editForm.author}
                      onChange={(e) => setEditForm({ ...editForm, author: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={4}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  {/* Page count + bounty preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Page Count</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        value={editForm.page_count}
                        onChange={(e) => setEditForm({ ...editForm, page_count: parseInt(e.target.value) || 0 })}
                        className="w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-500">
                        → bounty:{" "}
                        <span className="font-semibold text-gray-900">
                          ${calcBounty(editForm.page_count).toFixed(2)}
                        </span>
                        {editForm.page_count * BOUNTY_RATE > BOUNTY_CAP && (
                          <span className="ml-1 text-xs text-amber-600">(capped at $5.00)</span>
                        )}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Bounty = page count × $0.0085, max $5.00
                    </p>
                  </div>

                  {saveSuccess && (
                    <p className="text-sm text-green-600 font-medium">Changes saved!</p>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={closeEdit} className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2">
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      disabled={saving || uploadingCover}
                      className="bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      {uploadingCover ? "Uploading cover..." : saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Quiz tab ── */}
              {activeTab === "quiz" && (
                <div>
                  {questionsLoading ? (
                    <p className="text-sm text-gray-400 py-4">Loading questions...</p>
                  ) : questions.length === 0 ? (
                    <p className="text-sm text-gray-400 py-4">No questions found for this book.</p>
                  ) : (
                    <div className="space-y-6">
                      {questions.map((q, i) => (
                        <div key={q.id} className="border border-gray-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                            Question {i + 1}
                          </p>

                          <div className="space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Question</label>
                              <textarea
                                value={q.question_text}
                                onChange={(e) => updateQuestion(i, "question_text", e.target.value)}
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-green-600 mb-1">✓ Correct Answer</label>
                              <input
                                type="text"
                                value={q.correct_answer}
                                onChange={(e) => updateQuestion(i, "correct_answer", e.target.value)}
                                className="w-full border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                              />
                            </div>

                            {(["wrong_answer_1", "wrong_answer_2", "wrong_answer_3"] as const).map((field, wi) => (
                              <div key={field}>
                                <label className="block text-xs font-medium text-gray-500 mb-1">
                                  Wrong Answer {wi + 1}
                                </label>
                                <input
                                  type="text"
                                  value={q[field]}
                                  onChange={(e) => updateQuestion(i, field, e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      {saveSuccess && (
                        <p className="text-sm text-green-600 font-medium">Questions saved!</p>
                      )}

                      <div className="flex justify-end gap-3 pt-2">
                        <button onClick={closeEdit} className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2">
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveQuestions}
                          disabled={saving}
                          className="bg-indigo-600 text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                        >
                          {saving ? "Saving..." : "Save Questions"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Claim Modal ─────────────────────────────────────────── */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Claim a Platform Book</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  If your book is already on Read to Earn, claim it to manage it from your dashboard.
                </p>
              </div>
              <button onClick={() => setShowClaimModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">✕</button>
            </div>

            {claimSuccess && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                "{claimSuccess}" has been claimed and added to your dashboard.
              </div>
            )}

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Search by book title..."
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchClaimableBooks()}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                onClick={searchClaimableBooks}
                disabled={claimSearching || !claimSearch.trim()}
                className="bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {claimSearching ? "Searching..." : "Search"}
              </button>
            </div>

            {claimResults.length > 0 && (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {claimResults.map((book) => (
                  <div key={book.id} className="flex items-center gap-3 border border-gray-200 rounded-xl p-3">
                    <div className="w-10 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">?</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{book.title}</p>
                      <p className="text-xs text-gray-500">{book.author} · {book.page_count} pages · ${calcBounty(book.page_count).toFixed(2)} bounty</p>
                    </div>
                    <button
                      onClick={() => claimBook(book)}
                      disabled={claiming === book.id}
                      className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition flex-shrink-0"
                    >
                      {claiming === book.id ? "Claiming..." : "Claim"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {claimResults.length === 0 && claimSearch && !claimSearching && (
              <p className="text-sm text-gray-400 text-center py-4">
                No unclaimed platform books found matching "{claimSearch}".
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowClaimModal(false)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium px-4 py-2"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
