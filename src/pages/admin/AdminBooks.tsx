import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Pencil, X } from 'lucide-react';
import { GENRES } from '../Admin';

// ── Interfaces ──────────────────────────────────────────
interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  page_count: number;
  description: string | null;
  geniuslink_url: string | null;
  book_type: 'standard' | 'bulletin_board';
  genres: string[];
  is_master_quiz: boolean;
}

interface Question {
  id: string;
  book_id: string;
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

interface NewBook {
  title: string;
  author: string;
  cover_url: string;
  page_count: string;
  description: string;
  geniuslink_url: string;
  book_type: 'standard' | 'bulletin_board';
  genres: string[];
}

interface NewQuestion {
  question_text: string;
  correct_answer: string;
  wrong_answer_1: string;
  wrong_answer_2: string;
  wrong_answer_3: string;
}

// ── Helpers ──────────────────────────────────────────────
const emptyBook: NewBook = {
  title: '', author: '', cover_url: '', page_count: '',
  description: '', geniuslink_url: '', book_type: 'standard', genres: [],
};

const emptyQuestion: NewQuestion = {
  question_text: '', correct_answer: '',
  wrong_answer_1: '', wrong_answer_2: '', wrong_answer_3: '',
};

// ── GenrePicker ──────────────────────────────────────────
function GenrePicker({
  selected, onChange, selectClass,
}: {
  selected: string[];
  onChange: (genres: string[]) => void;
  selectClass: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-[#6B7280] dark:text-gray-400">Genres</label>
      <select
        className={selectClass}
        value=""
        onChange={(e) => {
          if (e.target.value && !selected.includes(e.target.value)) {
            onChange([...selected, e.target.value]);
          }
        }}
      >
        <option value="">Add a genre...</option>
        {GENRES.filter((g) => !selected.includes(g)).map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      <div className="flex flex-wrap gap-2">
        {selected.map((g) => (
          <span
            key={g}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[#D4A843]/20 text-[#D4A843] text-xs"
          >
            {g}
            <button onClick={() => onChange(selected.filter((x) => x !== g))}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────
export function AdminBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [questions, setQuestions] = useState<NewQuestion[]>(
    Array(10).fill(null).map(() => ({ ...emptyQuestion }))
  );
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editingQuestions, setEditingQuestions] = useState<Question[]>([]);
  const [newBook, setNewBook] = useState<NewBook>(emptyBook);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2 focus:ring-2';
  const correctInputClass =
    'w-full px-3 py-2 rounded-lg border border-green-400 bg-green-50 dark:bg-green-900/20 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2 focus:ring-green-400/40';
  const selectClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase.from('books').select('*').order('created_at', { ascending: false });
    setBooks(data || []);
  }

  // ── Save new book ────────────────────────────────────
  async function handleSaveBook() {
    if (!newBook.title || !newBook.author || !newBook.page_count) {
      setError('Title, author, and page count are required.');
      return;
    }
    if (questions.some((q) => !q.question_text || !q.correct_answer)) {
      setError('All 10 questions must have a question and correct answer.');
      return;
    }
    setSaving(true);
    setError('');
    const { data: bookData, error: bookErr } = await supabase
      .from('books')
      .insert({
        title: newBook.title,
        author: newBook.author,
        cover_url: newBook.cover_url || null,
        page_count: parseInt(newBook.page_count),
        description: newBook.description || null,
        geniuslink_url: newBook.geniuslink_url || null,
        book_type: newBook.book_type,
        genres: newBook.genres,
      })
      .select()
      .single();
    if (bookErr || !bookData) { setError('Failed to save book.'); setSaving(false); return; }
    const questionsToInsert = questions.map((q) => ({ ...q, book_id: bookData.id }));
    const { error: qErr } = await supabase.from('questions').insert(questionsToInsert);
    if (qErr) { setError('Book saved but questions failed.'); setSaving(false); return; }
    setSuccess('Book added!');
    setNewBook(emptyBook);
    setQuestions(Array(10).fill(null).map(() => ({ ...emptyQuestion })));
    setShowAddForm(false);
    setSaving(false);
    loadData();
  }

  // ── Edit book ────────────────────────────────────────
  async function handleEditBook(book: Book) {
    setEditingBook(book);
    const { data } = await supabase.from('questions').select('*').eq('book_id', book.id);
    setEditingQuestions(data || []);
  }

  async function handleSaveEdit() {
    if (!editingBook) return;
    setSaving(true);
    await supabase.from('books').update({
      title: editingBook.title,
      author: editingBook.author,
      cover_url: editingBook.cover_url,
      page_count: editingBook.page_count,
      description: editingBook.description,
      geniuslink_url: editingBook.geniuslink_url,
      book_type: editingBook.book_type,
      genres: editingBook.genres,
    }).eq('id', editingBook.id);

    const existingQuestions = editingQuestions.filter((q) => !q.id.startsWith('new-'));
    const newQuestions = editingQuestions.filter((q) => q.id.startsWith('new-'));

    for (const q of existingQuestions) {
      await supabase.from('questions').update({
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        wrong_answer_1: q.wrong_answer_1,
        wrong_answer_2: q.wrong_answer_2,
        wrong_answer_3: q.wrong_answer_3,
      }).eq('id', q.id);
    }
    if (newQuestions.length > 0) {
      await supabase.from('questions').insert(
        newQuestions.map((q) => ({
          book_id: editingBook.id,
          question_text: q.question_text,
          correct_answer: q.correct_answer,
          wrong_answer_1: q.wrong_answer_1,
          wrong_answer_2: q.wrong_answer_2,
          wrong_answer_3: q.wrong_answer_3,
        }))
      );
    }
    const currentIds = existingQuestions.map((q) => q.id);
    const { data: dbQuestions } = await supabase.from('questions').select('id').eq('book_id', editingBook.id);
    const toDelete = (dbQuestions || []).map((q) => q.id).filter((id) => !currentIds.includes(id));
    if (toDelete.length > 0) await supabase.from('questions').delete().in('id', toDelete);

    setSuccess('Book updated!');
    setEditingBook(null);
    setSaving(false);
    loadData();
  }

  async function handleDeleteBook(id: string) {
    if (!confirm('Delete this book and all its questions?')) return;
    await supabase.from('questions').delete().eq('book_id', id);
    await supabase.from('books').delete().eq('id', id);
    loadData();
  }

  // ── Master Quiz toggle ───────────────────────────────
  async function handleToggleMasterQuiz(book: Book) {
    const newVal = !book.is_master_quiz;
    if (newVal) {
      // Turn off all others first
      await supabase.from('books').update({ is_master_quiz: false }).neq('id', book.id);
    }
    await supabase.from('books').update({ is_master_quiz: newVal }).eq('id', book.id);
    loadData();
  }

  // ── Render ───────────────────────────────────────────
  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 text-red-700 dark:text-red-400 text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError('')}><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-4 py-3 text-green-700 dark:text-green-400 text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess('')}><X size={14} /></button>
        </div>
      )}

      {/* ── Edit mode ── */}
      {editingBook ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Edit Book</h2>
            <button onClick={() => setEditingBook(null)} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input className={inputClass} placeholder="Title" value={editingBook.title} onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })} />
            <input className={inputClass} placeholder="Author" value={editingBook.author} onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })} />
            <input className={inputClass} placeholder="Cover URL" value={editingBook.cover_url || ''} onChange={(e) => setEditingBook({ ...editingBook, cover_url: e.target.value })} />
            <input className={inputClass} type="number" placeholder="Page Count" value={editingBook.page_count} onChange={(e) => setEditingBook({ ...editingBook, page_count: parseInt(e.target.value) })} />
            <input className={inputClass} placeholder="Geniuslink URL" value={editingBook.geniuslink_url || ''} onChange={(e) => setEditingBook({ ...editingBook, geniuslink_url: e.target.value })} />
            <select className={selectClass} value={editingBook.book_type} onChange={(e) => setEditingBook({ ...editingBook, book_type: e.target.value as Book['book_type'] })}>
              <option value="standard">Standard Listing</option>
              <option value="bulletin_board">Bulletin Board</option>
            </select>
          </div>
          <textarea className={inputClass} placeholder="Description" rows={3} value={editingBook.description || ''} onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })} />
          <GenrePicker selected={editingBook.genres} onChange={(genres) => setEditingBook({ ...editingBook, genres })} selectClass={selectClass} />

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">
                Questions ({editingQuestions.length})
              </h3>
              <button
                onClick={() => setEditingQuestions([...editingQuestions, { id: `new-${Date.now()}`, book_id: editingBook.id, ...emptyQuestion }])}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg font-medium hover:bg-[#c49a3a]"
              >
                <Plus size={13} /> Add Question
              </button>
            </div>
            {editingQuestions.map((q, i) => (
              <div key={q.id} className="border border-[#e8e0d5] dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[#1B2A4A] dark:text-[#F5F0E8] text-sm font-medium">Question {i + 1}</p>
                  {editingQuestions.length > 1 && (
                    <button onClick={() => setEditingQuestions(editingQuestions.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input className={inputClass} placeholder="Question" value={q.question_text} onChange={(e) => { const u = [...editingQuestions]; u[i] = { ...u[i], question_text: e.target.value }; setEditingQuestions(u); }} />
                <input className={correctInputClass} placeholder="Correct Answer" value={q.correct_answer} onChange={(e) => { const u = [...editingQuestions]; u[i] = { ...u[i], correct_answer: e.target.value }; setEditingQuestions(u); }} />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(['wrong_answer_1', 'wrong_answer_2', 'wrong_answer_3'] as const).map((field) => (
                    <input key={field} className={inputClass} placeholder={`Wrong ${field.slice(-1)}`} value={q[field]} onChange={(e) => { const u = [...editingQuestions]; u[i] = { ...u[i], [field]: e.target.value }; setEditingQuestions(u); }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={() => setEditingBook(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-[#6B7280] rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          {/* ── Add book form ── */}
          {showAddForm && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Add New Book</h2>
                <button onClick={() => setShowAddForm(false)} className="text-[#6B7280]"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input className={inputClass} placeholder="Title" value={newBook.title} onChange={(e) => setNewBook({ ...newBook, title: e.target.value })} />
                <input className={inputClass} placeholder="Author" value={newBook.author} onChange={(e) => setNewBook({ ...newBook, author: e.target.value })} />
                <input className={inputClass} placeholder="Cover URL" value={newBook.cover_url} onChange={(e) => setNewBook({ ...newBook, cover_url: e.target.value })} />
                <input className={inputClass} type="number" placeholder="Page Count" value={newBook.page_count} onChange={(e) => setNewBook({ ...newBook, page_count: e.target.value })} />
                <input className={inputClass} placeholder="Geniuslink URL" value={newBook.geniuslink_url} onChange={(e) => setNewBook({ ...newBook, geniuslink_url: e.target.value })} />
                <select className={selectClass} value={newBook.book_type} onChange={(e) => setNewBook({ ...newBook, book_type: e.target.value as NewBook['book_type'] })}>
                  <option value="standard">Standard Listing</option>
                  <option value="bulletin_board">Bulletin Board</option>
                </select>
              </div>
              <textarea className={inputClass} placeholder="Description" rows={3} value={newBook.description} onChange={(e) => setNewBook({ ...newBook, description: e.target.value })} />
              <GenrePicker selected={newBook.genres} onChange={(genres) => setNewBook({ ...newBook, genres })} selectClass={selectClass} />

              <div className="space-y-4">
                <h3 className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">Questions (10 required)</h3>
                {questions.map((q, i) => (
                  <div key={i} className="border border-[#e8e0d5] dark:border-gray-700 rounded-lg p-4 space-y-3">
                    <p className="text-[#1B2A4A] dark:text-[#F5F0E8] text-sm font-medium">Question {i + 1}</p>
                    <input className={inputClass} placeholder="Question" value={q.question_text} onChange={(e) => { const u = [...questions]; u[i] = { ...u[i], question_text: e.target.value }; setQuestions(u); }} />
                    <input className={correctInputClass} placeholder="Correct Answer" value={q.correct_answer} onChange={(e) => { const u = [...questions]; u[i] = { ...u[i], correct_answer: e.target.value }; setQuestions(u); }} />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(['wrong_answer_1', 'wrong_answer_2', 'wrong_answer_3'] as const).map((field) => (
                        <input key={field} className={inputClass} placeholder={`Wrong ${field.slice(-1)}`} value={q[field]} onChange={(e) => { const u = [...questions]; u[i] = { ...u[i], [field]: e.target.value }; setQuestions(u); }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={handleSaveBook} disabled={saving} className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Add Book'}
                </button>
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-[#6B7280] rounded-lg text-sm">Cancel</button>
              </div>
            </div>
          )}

          {/* ── Book list ── */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Books ({books.length})</h2>
            {!showAddForm && (
              <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]">
                <Plus size={16} /> Add Book
              </button>
            )}
          </div>

          <div className="space-y-3">
            {books.map((book) => (
              <div key={book.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 flex gap-4">
                {book.cover_url && (
                  <img src={book.cover_url} alt={book.title} className="w-12 h-16 object-cover rounded" />
                )}
                <div className="flex-1 min-w-8">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">{book.title}</p>
                      <p className="text-xs text-[#6B7280] dark:text-gray-400">{book.author} · {book.page_count} pages</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${book.book_type === 'bulletin_board' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-[#D4A843]/20 text-[#D4A843]'}`}>
                        {book.book_type === 'bulletin_board' ? 'Bulletin Board' : 'Standard'}
                      </span>
                      <button onClick={() => handleEditBook(book)} className="text-[#6B7280] hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDeleteBook(book.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Master Quiz toggle */}
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => handleToggleMasterQuiz(book)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium border transition-colors ${
                        book.is_master_quiz
                          ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700'
                          : 'bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 hover:border-blue-300'
                      }`}
                    >
                      {book.is_master_quiz ? '★ Master Quiz ON' : 'Set as Master Quiz'}
                    </button>
                  </div>

                  {book.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {book.genres.map((g) => (
                        <span key={g} className="text-xs bg-[#F5F0E8] dark:bg-gray-700 text-[#6B7280] dark:text-gray-400 px-2 py-0.5 rounded-full">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
