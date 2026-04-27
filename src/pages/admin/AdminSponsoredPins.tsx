import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, Save } from 'lucide-react';

type PinStatus = 'pending' | 'approved' | 'rejected';

interface SponsoredPin {
  id: string;
  brand_name: string;
  tagline: string;
  image_url: string;
  site_url: string;
  contact_email: string;
  category: string;
  status: PinStatus;
  is_active: boolean;
  created_at: string;
  display_start: string | null;
  display_end: string | null;
  admin_notes: string | null;
}

const STATUS_COLORS: Record<PinStatus, string> = {
  pending:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/10 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/30',
};

const STATUS_ICONS: Record<PinStatus, JSX.Element> = {
  pending:  <Clock size={14} />,
  approved: <CheckCircle size={14} />,
  rejected: <XCircle size={14} />,
};

export function AdminSponsoredPins() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [pins, setPins] = useState<SponsoredPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PinStatus | 'all'>('pending');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Per-pin editable fields
  const [edits, setEdits] = useState<Record<string, {
    display_start: string;
    display_end: string;
    admin_notes: string;
  }>>({});

  useEffect(() => { fetchPins(); }, [statusFilter]);

  const fetchPins = async () => {
    setLoading(true);
    let query = supabase
      .from('sponsored_pins')
      .select('*')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    const { data } = await query;
    if (data) {
      setPins(data as SponsoredPin[]);
      // Seed edits state
      const seed: typeof edits = {};
      data.forEach((p: SponsoredPin) => {
        seed[p.id] = {
          display_start: p.display_start ?? '',
          display_end:   p.display_end   ?? '',
          admin_notes:   p.admin_notes   ?? '',
        };
      });
      setEdits(seed);
    }
    setLoading(false);
  };

  const updateStatus = async (pin: SponsoredPin, status: PinStatus) => {
    setSaving(pin.id);
    const e = edits[pin.id] ?? { display_start: '', display_end: '', admin_notes: '' };
    await supabase
      .from('sponsored_pins')
      .update({
        status,
        is_active:     status === 'approved',
        display_start: e.display_start || null,
        display_end:   e.display_end   || null,
        admin_notes:   e.admin_notes   || null,
      })
      .eq('id', pin.id);
    setSaving(null);
    fetchPins();
  };

  const saveDates = async (pinId: string) => {
    setSaving(pinId);
    const e = edits[pinId];
    await supabase
      .from('sponsored_pins')
      .update({
        display_start: e.display_start || null,
        display_end:   e.display_end   || null,
        admin_notes:   e.admin_notes   || null,
      })
      .eq('id', pinId);
    setSaving(null);
  };

  const pendingCount = pins.filter(p => p.status === 'pending').length;

  const card = isDark
    ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20'
    : 'bg-white border-[#D4A843]/30';
  const textPrimary = isDark ? 'text-[#F5F0E8]'      : 'text-[#1B2A4A]';
  const textMuted   = isDark ? 'text-[#F5F0E8]/60'   : 'text-[#1B2A4A]/60';
  const inputCls    = isDark
    ? 'bg-[#0f1623] border-[#D4A843]/20 text-[#F5F0E8] placeholder-[#F5F0E8]/30'
    : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] placeholder-[#1B2A4A]/30';

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className={`text-xl font-semibold ${textPrimary}`}>Sponsored Pins</h2>
          {pendingCount > 0 && (
            <p className="text-yellow-400 text-sm mt-0.5">{pendingCount} pending review</p>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                statusFilter === s
                  ? 'bg-[#1B2A4A] text-white dark:bg-[#D4A843] dark:text-[#1B2A4A]'
                  : `${isDark ? 'bg-gray-800 text-gray-400' : 'bg-white text-[#6B7280]'} hover:opacity-80`
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <p className={`text-sm ${textMuted}`}>Loading...</p>
      )}

      {!loading && pins.length === 0 && (
        <div className={`rounded-xl border p-8 text-center ${card}`}>
          <p className={`text-sm ${textMuted}`}>No {statusFilter === 'all' ? '' : statusFilter} submissions.</p>
        </div>
      )}

      {pins.map(pin => {
        const isOpen = expanded === pin.id;
        const e = edits[pin.id] ?? { display_start: '', display_end: '', admin_notes: '' };
        const isSaving = saving === pin.id;

        return (
          <div key={pin.id} className={`rounded-xl border ${card}`}>

            {/* Row header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpanded(isOpen ? null : pin.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {pin.image_url && (
                  <img
                    src={pin.image_url}
                    alt={pin.brand_name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className={`font-semibold text-sm truncate ${textPrimary}`}>{pin.brand_name}</p>
                  <p className={`text-xs truncate ${textMuted}`}>{pin.category} · {pin.contact_email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[pin.status]}`}>
                  {STATUS_ICONS[pin.status]} {pin.status}
                </span>
                {isOpen ? <ChevronUp size={16} className={textMuted} /> : <ChevronDown size={16} className={textMuted} />}
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div className={`border-t px-4 pb-5 pt-4 space-y-4 ${isDark ? 'border-[#D4A843]/10' : 'border-[#D4A843]/20'}`}>

                {/* Pin details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Tagline',       value: pin.tagline },
                    { label: 'Site URL',      value: pin.site_url },
                    { label: 'Category',      value: pin.category },
                    { label: 'Submitted',     value: new Date(pin.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className={`text-xs font-medium mb-0.5 ${textMuted}`}>{label}</p>
                      <p className={textPrimary}>{value || '—'}</p>
                    </div>
                  ))}
                </div>

                {/* Display date controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${textMuted}`}>Display Start</label>
                    <input
                      type="date"
                      value={e.display_start}
                      onChange={ev => setEdits(prev => ({ ...prev, [pin.id]: { ...prev[pin.id], display_start: ev.target.value } }))}
                      className={`w-full text-sm px-3 py-2 rounded-lg border ${inputCls}`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium block mb-1 ${textMuted}`}>Display End</label>
                    <input
                      type="date"
                      value={e.display_end}
                      onChange={ev => setEdits(prev => ({ ...prev, [pin.id]: { ...prev[pin.id], display_end: ev.target.value } }))}
                      className={`w-full text-sm px-3 py-2 rounded-lg border ${inputCls}`}
                    />
                  </div>
                </div>

                {/* Admin notes */}
                <div>
                  <label className={`text-xs font-medium block mb-1 ${textMuted}`}>Admin Notes</label>
                  <textarea
                    rows={2}
                    value={e.admin_notes}
                    onChange={ev => setEdits(prev => ({ ...prev, [pin.id]: { ...prev[pin.id], admin_notes: ev.target.value } }))}
                    placeholder="Internal notes..."
                    className={`w-full text-sm px-3 py-2 rounded-lg border resize-none ${inputCls}`}
                  />
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={() => saveDates(pin.id)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-[#1B2A4A] text-white hover:bg-[#243a63] transition disabled:opacity-50"
                  >
                    <Save size={13} /> {isSaving ? 'Saving...' : 'Save Dates & Notes'}
                  </button>

                  {pin.status !== 'approved' && (
                    <button
                      onClick={() => updateStatus(pin, 'approved')}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                    >
                      <CheckCircle size={13} /> Approve
                    </button>
                  )}

                  {pin.status !== 'rejected' && (
                    <button
                      onClick={() => updateStatus(pin, 'rejected')}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 transition disabled:opacity-50"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  )}
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
