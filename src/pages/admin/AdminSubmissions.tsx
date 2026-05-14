import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'bounties' | 'competitions' | 'quick_tasks' | 'surveys' | 'beta' | 'sensitivity';
type SubmissionStatus = 'pending' | 'approved' | 'rejected' | 'pending_payment' | 'paid';

const TAB_TABLES: Record<Tab, string> = {
  bounties: 'bounty_submissions',
  competitions: 'competition_submissions',
  quick_tasks: 'quick_task_submissions',
  surveys: 'survey_submissions',
  beta: 'beta_reader_submissions',
  sensitivity: 'sensitivity_reader_submissions',
};

const TAB_DEFAULT_STATUS: Record<Tab, SubmissionStatus | 'all'> = {
  bounties:     'pending_payment',
  competitions: 'pending_payment',
  quick_tasks:  'pending_payment',
  surveys:      'pending_payment',
  beta:         'pending',
  sensitivity:  'pending_payment',
};

const TABS: Tab[] = ['bounties', 'competitions', 'quick_tasks', 'surveys', 'beta', 'sensitivity'];

export default function AdminSubmissions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('bounties');
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('pending_payment');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [activeTab, statusFilter]);

  async function fetchSubmissions() {
    setLoading(true);
    const table = TAB_TABLES[activeTab];
    let query = supabase.from(table).select('*').order('created_at', { ascending: false });
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data, error } = await query;
    if (!error) setSubmissions(data || []);
    setLoading(false);
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Submissions</h1>
      <div className="flex gap-2 mb-4 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            onClick={() => { setActiveTab(tab); setStatusFilter(TAB_DEFAULT_STATUS[tab]); }}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'pending', 'approved', 'rejected', 'pending_payment', 'paid'] as const).map((s) => (
          <button
            key={s}
            className={`px-3 py-1 rounded border ${statusFilter === s ? 'bg-blue-500 text-white' : ''}`}
            onClick={() => setStatusFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">ID</th>
              <th className="border p-2 text-left">User</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <tr key={sub.id} className="hover:bg-gray-50">
                <td className="border p-2">{sub.id}</td>
                <td className="border p-2">{sub.user_id}</td>
                <td className="border p-2">{sub.status}</td>
                <td className="border p-2">{sub.created_at}</td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td colSpan={4} className="border p-2 text-center text-gray-400">No submissions found.</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
