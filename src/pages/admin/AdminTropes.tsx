import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, X } from 'lucide-react';

interface Trope {
  id: string;
  name: string;
  created_at: string;
}

interface TropeSuggestion {
  id: string;
  book_id: string;
  suggested_name: string;
  status: string;
  created_at: string;
  books: { title: string } | null;
}

const inputClass =
  'w-full px-3 py-2 rounded-lg border border-[#e8e0d5] dark:border-gray-700 bg-white dark:bg-gray-800 text-[#1B2A4A] dark:text-[#F5F0E8] text-sm focus:outline-none focus:ring-2';

export function AdminTropes() {
  const [tropes, setTropes] = useState<Trope[]>([]);
  const [tropeSuggestions, setTropeSuggestions] = useState<TropeSuggestion[]>([]);
  const [newTropeName, setNewTropeName] = useState('');
  const [addingTrope, setAddingTrope] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: tropesData }, { data: suggestionsData }] = await Promise.all([
      supabase.from('tropes').select('*').order('name'),
      supabase
        .from('trope_suggestions')
        .select('*, books(title)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ]);
    setTropes(tropesData || []);
    setTropeSuggestions(suggestionsData || []);
  }

  async function handleAddTrope() {
    if (!newTropeName.trim()) return;
    setAddingTrope(true);
    await supabase.from('tropes').insert({ name: newTropeName.trim() });
    setNewTropeName('');
    setAddingTrope(false);
    loadData();
  }

  async function handleDeleteTrope(id: string) {
    await supabase.from('book_tropes').delete().eq('trope_id', id);
    await supabase.from('tropes').delete().eq('id', id);
    loadData();
  }

  async function handleApproveSuggestion(suggestion: TropeSuggestion) {
    const existing = tropes.find(
      (t) => t.name.toLowerCase() === suggestion.suggested_name.toLowerCase()
    );
    let tropeId = existing?.id;
    if (!tropeId) {
      const { data } = await supabase
        .from('tropes')
        .insert({ name: suggestion.suggested_name })
        .select()
        .single();
      tropeId = data?.id;
    }
    if (tropeId) {
      await supabase
        .from('book_tropes')
        .upsert({ book_id: suggestion.book_id, trope_id: tropeId });
    }
    await supabase
      .from('trope_suggestions')
      .update({ status: 'approved' })
      .eq('id', suggestion.id);
    loadData();
  }

  async function handleRejectSuggestion(id: string) {
    await supabase
      .from('trope_suggestions')
      .update({ status: 'rejected' })
      .eq('id', id);
    loadData();
  }

  return (
    <div className="space-y-6">
      {/* Pending suggestions */}
      {tropeSuggestions.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
            Pending Suggestions ({tropeSuggestions.length})
          </h2>
          {tropeSuggestions.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-[#1B2A4A] dark:text-[#F5F0E8]">
                  {s.suggested_name}
                </p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  for: {s.books?.title ?? 'Unknown'}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleApproveSuggestion(s)}
                  className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleRejectSuggestion(s.id)}
                  className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 transition"
                >
                  <X size={12} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trope library */}
      <div className="space-y-3">
        <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
          Trope Library ({tropes.length})
        </h2>
        <div className="flex gap-2">
          <input
            className={inputClass}
            placeholder="New trope name..."
            value={newTropeName}
            onChange={(e) => setNewTropeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTrope()}
          />
          <button
            onClick={handleAddTrope}
            disabled={addingTrope || !newTropeName.trim()}
            className="px-4 py-2 bg-[#D4A843] text-[#1B2A4A] rounded-lg text-sm font-medium hover:bg-[#c49a3a] disabled:opacity-50 flex items-center gap-1"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tropes.map((trope) => (
            <span
              key={trope.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-[#e8e0d5] dark:border-gray-700 text-[#D4A843] text-xs"
            >
              {trope.name}
              <button
                onClick={() => handleDeleteTrope(trope.id)}
                className="text-[#6B7280] hover:text-red-500 transition ml-0.5"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
