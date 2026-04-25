import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  book_type: string;
}

interface Bounty {
  id: string;
  book_id: string;
  pool_size: number;
  per_pass_amount: number;
  platform_fee: number;
  reader_pool: number;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  books: { title: string; author: string } | null;
}

interface NewBounty {
  book_id: string;
  pool_size: number;
  per_pass_amount: number;
}

const BOUNTY_POOL_OPTIONS = [25, 50, 100, 200, 500];
const emptyBounty: NewBounty = { book_id: '', pool_size: 25, per_pass_amount: 1 };

export function AdminBounties() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [newBounty, setNewBounty] = useState<NewBounty>(emptyBounty);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const inputClass =
    'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';
  const selectClass = inputClass;

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: booksData }, { data: bountiesData }] = await Promise.all([
      supabase.from('books').select('*').order('created_at', { ascending: false }),
      supabase.from('bounties').select('*, books(title, author)').order('created_at', { ascending: false }),
    ]);
    setBooks(booksData || []);
    setBounties(bountiesData || []);
  }

  async function handleSave() {
    if (!newBounty.book_id) { setError('Select a book for this bounty.'); return; }
    setSaving(true);
    setError('');
    const platform_fee = Math.round(newBounty.pool_size * 0.2 * 100) / 100;
    const reader_pool = Math.round(newBounty.pool_size * 0.8 * 100) / 100;
    const { error: err } = await supabase.from('bounties').insert({
      book_id: newBounty.book_id,
      pool_size: newBounty.pool_size,
      per_pass_amount: newBounty.per_pass_amount,
      platform_fee,
      reader_pool,
      status: 'active',
    });
    if (err) { setError('Failed to save bounty.'); setSaving(false); return; }
    setSuccess('Bounty created!');
    setNewBounty(emptyBounty);
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleUpdateStatus(id: string, status: 'active' | 'completed' | 'paused') {
    await supabase.from('bounties').update({ status }).eq('id', id);
    loadData();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this bounty?')) return;
    await supabase.from('bounties').delete().eq('id', id);
    loadData();
  }

  const eligibleBooks = books.filter((b) => b.book_type !== 'bulletin_board');

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

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
          Author Bounties ({bounties.filter((b) => b.status === 'active').length} active)
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]"
          >
            <Plus size={16} /> New Bounty
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">Create Bounty</h3>
            <button onClick={() => { setShowForm(false); setNewBounty(emptyBounty); }} className="text-[#6B7280]">
              <X size={18} />
            </button>
          </div>

          {/* Book selector */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Book</label>
            <select className={selectClass} value={newBounty.book_id} onChange={(e) => setNewBounty({ ...newBounty, book_id: e.target.value })}>
              <option value="">Select a book...</option>
              {eligibleBooks.map((book) => (
                <option key={book.id} value={book.id}>{book.title} — {book.author}</option>
              ))}
            </select>
          </div>

          {/* Pool size */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Pool Size</label>
            <div className="flex flex-wrap gap-2">
              {BOUNTY_POOL_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setNewBounty({ ...newBounty, pool_size: amt })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                    newBounty.pool_size === amt
                      ? 'bg-[#D4A843] border-[#D4A843] text-[#1B2A4A]'
                      : 'border-gray-300 dark:border-gray-600 text-[#1B2A4A] dark:text-[#F5F0E8] hover:border-[#D4A843]'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
            <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
              Platform keeps ${(newBounty.pool_size * 0.2).toFixed(2)} · Readers earn ${(newBounty.pool_size * 0.8).toFixed(2)}
            </p>
          </div>

          {/* Per-pass payout */}
          <div>
            <label className="text-xs text-[#6B7280] dark:text-gray-400 mb-1 block">Per-Pass Payout ($)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className={inputClass}
              value={newBounty.per_pass_amount}
              onChange={(e) => setNewBounty({ ...newBounty, per_pass_amount: parseFloat(e.target.value) || 0 })}
              placeholder="e.g. 0.50"
            />
            <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-1">
              Estimated passes:{' '}
              {newBounty.per_pass_amount > 0
                ? Math.floor((newBounty.pool_size * 0.8) / newBounty.per_pass_amount)
                : '—'}
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-semibold hover:bg-[#c49a3a] disabled:opacity-50">
              {saving ? 'Saving...' : 'Create Bounty'}
            </button>
            <button onClick={() => { setShowForm(false); setNewBounty(emptyBounty); }} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bounty list */}
      {bounties.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No bounties yet.</p>
      ) : (
        <div className="space-y-3">
          {bounties.map((bounty) => {
            const passesTotal = bounty.per_pass_amount > 0
              ? Math.floor(bounty.reader_pool / bounty.per_pass_amount)
              : 0;
            return (
              <div key={bounty.id} className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">
                      {bounty.books?.title ?? 'Unknown Book'}
                    </p>
                    <p className="text-xs text-[#6B7280] dark:text-gray-400 mt-0.5">
                      {bounty.books?.author ?? ''}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="text-[#1B2A4A] dark:text-[#F5F0E8]">
                        Pool: <strong>${bounty.pool_size}</strong>
                      </span>
                      <span className="text-[#6B7280] dark:text-gray-400">
                        Platform: ${bounty.platform_fee}
                      </span>
                      <span className="text-[#6B7280] dark:text-gray-400">
                        Reader pool: ${bounty.reader_pool}
                      </span>
                      <span className="text-[#D4A843] font-medium">
                        ${bounty.per_pass_amount}/pass · ~{passesTotal} passes
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                    bounty.status === 'active'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : bounty.status === 'paused'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                  }`}>
                    {bounty.status}
                  </span>
                </div>

                <div className="flex gap-2 mt-3 flex-wrap">
                  {bounty.status === 'active' && (
                    <button onClick={() => handleUpdateStatus(bounty.id, 'paused')} className="text-xs px-3 py-1.5 rounded-lg border border-yellow-400 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition">
                      Pause
                    </button>
                  )}
                  {bounty.status === 'paused' && (
                    <button onClick={() => handleUpdateStatus(bounty.id, 'active')} className="text-xs px-3 py-1.5 rounded-lg border border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition">
                      Resume
                    </button>
                  )}
                  {bounty.status !== 'completed' && (
                    <button onClick={() => handleUpdateStatus(bounty.id, 'completed')} className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      Mark Completed
                    </button>
                  )}
                  <button onClick={() => handleDelete(bounty.id)} className="text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-auto">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
