import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import AdminLayout from '../../components/admin/AdminLayout';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type TableKey = 'book_submissions' | 'quick_tasks' | 'task_submissions';

interface Submission {
  [key: string]: unknown;
}

/* ------------------------------------------------------------------ */
/*  Config                                                              */
/* ------------------------------------------------------------------ */
const TABLES: { key: TableKey; label: string }[] = [
  { key: 'book_submissions', label: 'Book Submissions' },
  { key: 'quick_tasks',      label: 'Quick Tasks' },
  { key: 'task_submissions', label: 'Task Submissions' },
];

/** Columns shown in the list view */
const LIST_FIELDS: Record<TableKey, { key: string; label: string }[]> = {
  book_submissions: [
    { key: 'id',         label: 'ID' },
    { key: 'title',      label: 'Title' },
    { key: 'author',     label: 'Author' },
    { key: 'status',     label: 'Status' },
    { key: 'created_at', label: 'Submitted' },
  ],
  quick_tasks: [
    { key: 'id',         label: 'ID' },
    { key: 'book_title', label: 'Book Title' },
    { key: 'tier_label', label: 'Tier' },
    { key: 'status',     label: 'Status' },
    { key: 'created_at', label: 'Created' },
  ],
  task_submissions: [
    { key: 'id',         label: 'ID' },
    { key: 'task_id',    label: 'Task ID' },
    { key: 'user_id',    label: 'User ID' },
    { key: 'status',     label: 'Status' },
    { key: 'created_at', label: 'Submitted' },
  ],
};

/** Fields shown in the detail / modal view */
const DETAIL_FIELDS: Record<TableKey, { key: string; label: string }[]> = {
  book_submissions: [
    { key: 'id',          label: 'ID' },
    { key: 'title',       label: 'Title' },
    { key: 'author',      label: 'Author' },
    { key: 'genre',       label: 'Genre' },
    { key: 'description', label: 'Description' },
    { key: 'status',      label: 'Status' },
    { key: 'created_at',  label: 'Submitted' },
    { key: 'notes',       label: 'Notes' },
  ],
  quick_tasks: [
    { key: 'book_title',          label: 'Book Title' },
    { key: 'task_type',           label: 'Task Type' },
    { key: 'task_content',        label: 'Task Content' },
    { key: 'tier_label',          label: 'Tier' },
    { key: 'price',               label: 'Price ($)' },
    { key: 'platform_fee',        label: 'Platform Fee ($)' },
    { key: 'prize_pool',          label: 'Prize Pool ($)' },
    { key: 'completions',         label: 'Completions' },
    { key: 'payout_per_response', label: 'Payout / Response ($)' },
    { key: 'notes',               label: 'Notes' },
  ],
  task_submissions: [
    { key: 'id',          label: 'ID' },
    { key: 'task_id',     label: 'Task ID' },
    { key: 'user_id',     label: 'User ID' },
    { key: 'response',    label: 'Response' },
    { key: 'status',      label: 'Status' },
    { key: 'created_at',  label: 'Submitted' },
    { key: 'notes',       label: 'Notes' },
  ],
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function AdminSubmissions() {
  const [activeTable, setActiveTable] = useState<TableKey>('book_submissions');
  const [rows, setRows]               = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(false);
  const [selected, setSelected]       = useState<Submission | null>(null);

  /* fetch rows whenever the active table changes */
  const fetchRows = useCallback(async () => {
    setLoading(true);
    setSelected(null);
    const { data, error } = await supabase
      .from(activeTable)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    setRows(data ?? []);
    setLoading(false);
  }, [activeTable]);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Submissions</h1>

        {/* Tab bar */}
        <div className="flex gap-2 border-b border-gray-200">
          {TABLES.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTable(t.key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTable === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* List table */}
        {loading ? (
          <p className="text-gray-500">Loading…</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {LIST_FIELDS[activeTable].map(f => (
                    <th
                      key={f.key}
                      className="px-4 py-3 text-left font-semibold text-gray-600 uppercase tracking-wide text-xs"
                    >
                      {f.label}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={LIST_FIELDS[activeTable].length + 1}
                      className="px-4 py-6 text-center text-gray-400"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {LIST_FIELDS[activeTable].map(f => (
                        <td key={f.key} className="px-4 py-3 text-gray-700 truncate max-w-xs">
                          {String(row[f.key] ?? '—')}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelected(row)}
                          className="text-blue-600 hover:underline text-xs font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Detail modal */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 space-y-4 overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Detail View</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              <dl className="divide-y divide-gray-100">
                {DETAIL_FIELDS[activeTable].map(f => (
                  <div key={f.key} className="py-2 grid grid-cols-3 gap-2">
                    <dt className="text-xs font-semibold text-gray-500 uppercase col-span-1">
                      {f.label}
                    </dt>
                    <dd className="text-sm text-gray-800 col-span-2 break-words">
                      {String(selected[f.key] ?? '—')}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
