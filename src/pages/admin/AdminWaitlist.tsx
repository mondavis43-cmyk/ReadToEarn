import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2 } from 'lucide-react';

interface WaitlistEntry {
  id: string;
  email: string;
  created_at: string;
}

export function AdminWaitlist() {
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase
      .from('waitlist')
      .select('*')
      .order('created_at', { ascending: false });
    setWaitlist(data || []);
  }

  async function handleDelete(id: string) {
    await supabase.from('waitlist').delete().eq('id', id);
    loadData();
  }

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-[#1B2A4A] dark:text-[#F5F0E8]">
        Waitlist ({waitlist.length})
      </h2>

      {waitlist.length === 0 ? (
        <p className="text-sm text-[#6B7280] dark:text-gray-400">Waitlist is empty.</p>
      ) : (
        <div className="space-y-2">
          {waitlist.map((entry) => (
            <div
              key={entry.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-[#e8e0d5] dark:border-gray-700 p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-[#1B2A4A] dark:text-[#F5F0E8]">{entry.email}</p>
                <p className="text-xs text-[#6B7280] dark:text-gray-400">
                  {new Date(entry.created_at).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="text-red-400 hover:text-red-600 transition"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
