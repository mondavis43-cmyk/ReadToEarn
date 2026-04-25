import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X, Trash2 } from 'lucide-react';

interface Trope {
  id: string;
  name: string;
  category: string | null;
  created_at: string;
}

const TROPE_CATEGORIES = [
  'Romance',
  'Fantasy',
  'Mystery',
  'Thriller',
  'Sci-Fi',
  'Horror',
  'Literary',
  'Historical',
  'Contemporary',
  'Other',
];

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

export function AdminTropes() {
  const [tropes, setTropes] = useState<Trope[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [form, setForm] = useState({ name: '', category: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase
      .from('tropes')
      .select('*')
      .order('category', { ascending: true });
    setTropes(data || []);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Trope name is required.'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('tropes').insert({
      name: form.name.trim(),
      category: form.category || null,
    });
    if (err) {
      if (err.code === '23505') {
        setError('That trope already exists.');
      } else {
        setError('Failed to save trope.');
      }
      setSaving(false);
      return;
    }
    setSuccess('Trope added!');
    setForm({ name: '', category: '' });
    setShowForm(false);
    setSaving(false);
    loadData();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This will remove it from all books.`)) return;
    await supabase.from('tropes').delete().eq('id', id);
    loadData();
  }

  const categories = ['all', ...TROPE_CATEGORIES];

  const filtered = tropes.filter((t) =>
    filterCategory === 'all'
      ? true
      : (t.category ?? 'Other') === filterCategory
  );

  // Group by category for display
  const grouped = filtered.reduce<Record<string, Trope[]>>((acc, trope) => {
    const cat = trope.category ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(trope);
    return acc;
  }, {});

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
          Tropes ({tropes.length} total)
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a]"
          >
            <Plus size={16} /> Add Trope
          </button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8] text-sm">New Trope</h3>
            <button onClick={() => { setShowForm(false); setForm({ name: '', category: '' }); }} className="text-[#6B7280]">
              <X size={16} />
            </button>
          </div>
          <input
            className={inputClass}
            placeholder="Trope name (e.g. Enemies to Lovers)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
          />
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">No category</option>
            {TROPE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-xs font-semibold hover:bg-[#c49a3a] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Add Trope'}
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ name: '', category: '' }); }}
              className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-[#6B7280] hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
              filterCategory === cat
                ? 'bg-[#1B2A4A] text-white dark:bg-[#D4A843] dark:text-[#1B2A4A]'
                : 'bg-white dark:bg-gray-800 text-[#6B7280] dark:text-gray-400 border border-[#e8e0d5] dark:border-gray-700 hover:text-[#1B2A4A] dark:hover:text-[#F5F0E8]'
            }`}
          >
            {cat === 'all' ? `All (${tropes.length})` : `${cat} (${tropes.filter((t) => (t.category ?? 'Other') === cat).length})`}
          </button>
        ))}
      </div>

      {/* Grouped trope list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">No tropes yet.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-[#6B7280] dark:text-gray-400 uppercase tracking-wide mb-2">
                {category} ({items.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((trope) => (
                  <div
                    key={trope.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 rounded-full text-sm text-[#1B2A4A] dark:text-[#F5F0E8] group"
                  >
                    <span>{trope.name}</span>
                    <button
                      onClick={() => handleDelete(trope.id, trope.name)}
                      className="text-[#6B7280] hover:text-red-500 transition opacity-0 group-hover:opacity-100 ml-0.5"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
