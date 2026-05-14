
import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmissionType = 'sensitivity' | 'proofreading' | 'developmental';

interface Submission {
  id: string;
  type: SubmissionType;
  status: string;
  created_at: string;
  [key: string]: any;
}

// ─── Editable fields per submission type ─────────────────────────────────────

const EDITABLE_FIELDS: Record<SubmissionType, { key: string; label: string; type: string }[]> = {
  sensitivity: [
    { key: 'price',               label: 'Price ($)',            type: 'input'    },
    { key: 'readers',             label: 'Readers',              type: 'input'    },
    { key: 'payout_per_response', label: 'Payout / Response ($)', type: 'input'   },
    { key: 'context',             label: 'Context',              type: 'textarea' },
  ],
  proofreading: [
    { key: 'price',   label: 'Price ($)', type: 'input'    },
    { key: 'context', label: 'Context',   type: 'textarea' },
  ],
  developmental: [
    { key: 'price',   label: 'Price ($)', type: 'input'    },
    { key: 'context', label: 'Context',   type: 'textarea' },
  ],
};

// ─── Detail fields per submission type ───────────────────────────────────────

const DETAIL_FIELDS: Record<SubmissionType, { key: string; label: string }[]> = {
  sensitivity: [
    { key: 'book_title',          label: 'Book Title' },
    { key: 'package_label',       label: 'Package' },
    { key: 'readers',             label: 'Readers' },
    { key: 'price',               label: 'Price ($)' },
    { key: 'payout_per_response', label: 'Payout / Response ($)' },
    { key: 'chapter_text',        label: 'Chapter Text' },
    { key: 'context',             label: 'Context' },
  ],
  proofreading: [
    { key: 'book_title',   label: 'Book Title' },
    { key: 'price',        label: 'Price ($)' },
    { key: 'chapter_text', label: 'Chapter Text' },
    { key: 'context',      label: 'Context' },
  ],
  developmental: [
    { key: 'book_title',   label: 'Book Title' },
    { key: 'price',        label: 'Price ($)' },
    { key: 'chapter_text', label: 'Chapter Text' },
    { key: 'context',      label: 'Context' },
  ],
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminSubmissions: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<SubmissionType>('sensitivity');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(`${selectedType}_submissions`)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setSubmissions((data as Submission[]) ?? []);
    }
    setLoading(false);
  }, [selectedType]);

  useEffect(() => {
    fetchSubmissions();
    setSelectedSubmission(null);
    setEditValues({});
    setMessage('');
  }, [fetchSubmissions]);

  const openDetail = (sub: Submission) => {
    setSelectedSubmission(sub);
    const initial: Record<string, any> = {};
    EDITABLE_FIELDS[selectedType].forEach(({ key }) => {
      initial[key] = sub[key] ?? '';
    });
    setEditValues(initial);
    setMessage('');
  };

  const handleSave = async () => {
    if (!selectedSubmission) return;
    setSaving(true);
    const { error } = await supabase
      .from(`${selectedType}_submissions`)
      .update(editValues)
      .eq('id', selectedSubmission.id);

    if (error) {
      setMessage(`Error: ${error.message}`);
    } else {
      setMessage('Saved successfully.');
      fetchSubmissions();
      setSelectedSubmission({ ...selectedSubmission, ...editValues });
    }
    setSaving(false);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from(`${selectedType}_submissions`)
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) fetchSubmissions();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Admin – Submissions</h1>

      {/* Type tabs */}
      <div className="flex gap-2 mb-6">
        {(['sensitivity', 'proofreading', 'developmental'] as SubmissionType[]).map((t) => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-4 py-2 rounded capitalize ${
              selectedType === t ? 'bg-blue-600 text-white' : 'bg-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className="flex gap-6">
          {/* List */}
          <div className="w-1/3 border rounded overflow-y-auto max-h-[70vh]">
            {submissions.length === 0 && (
              <p className="p-4 text-gray-500">No submissions found.</p>
            )}
            {submissions.map((sub) => (
              <div
                key={sub.id}
                onClick={() => openDetail(sub)}
                className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedSubmission?.id === sub.id ? 'bg-blue-50' : ''
                }`}
              >
                <p className="font-medium truncate">{sub.book_title ?? sub.id}</p>
                <p className="text-xs text-gray-500">
                  {sub.status} · {new Date(sub.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>

          {/* Detail */}
          {selectedSubmission && (
            <div className="flex-1 border rounded p-4 overflow-y-auto max-h-[70vh]">
              <h2 className="text-lg font-semibold mb-3">
                {selectedSubmission.book_title ?? selectedSubmission.id}
              </h2>

              {/* Read-only detail fields */}
              <div className="mb-4 space-y-1">
                {DETAIL_FIELDS[selectedType].map(({ key, label }) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="font-medium w-40 shrink-0">{label}:</span>
                    <span className="text-gray-700 whitespace-pre-wrap break-words">
                      {selectedSubmission[key] ?? '—'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={selectedSubmission.status}
                  onChange={(e) =>
                    handleStatusChange(selectedSubmission.id, e.target.value)
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  {['pending', 'approved', 'rejected', 'active', 'completed'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Editable fields */}
              <div className="space-y-3">
                {EDITABLE_FIELDS[selectedType].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-1">{label}</label>
                    {type === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={editValues[key] ?? ''}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    ) : (
                      <input
                        type="text"
                        value={editValues[key] ?? ''}
                        onChange={(e) =>
                          setEditValues((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="w-full border rounded px-2 py-1 text-sm"
                      />
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>

              {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminSubmissions;
