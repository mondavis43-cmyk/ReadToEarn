import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from '../hooks/useNavigate';
import { User, Bell, Shield, FileText, Trash2, Eye, EyeOff, Check, X } from 'lucide-react';

type Tab = 'tax' | 'account' | 'notifications' | 'danger';

export const AccountSettings = () => {
  const { isDark, toggleTheme } = useTheme();
  const { navigateTo } = useNavigate();

  const textPrimary = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const textMuted = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const cardBg = isDark ? 'bg-[#1B2A4A]/40 border-[#D4A843]/20' : 'bg-white border-[#D4A843]/30';
  const inputClass = `w-full px-4 py-2.5 rounded-lg border text-sm transition-colors ${
    isDark
      ? 'bg-[#0f1623] border-[#D4A843]/20 text-[#F5F0E8] placeholder-[#F5F0E8]/30 focus:border-[#D4A843]/60'
      : 'bg-white border-[#1B2A4A]/20 text-[#1B2A4A] placeholder-[#1B2A4A]/30 focus:border-[#1B2A4A]/60'
  } outline-none`;

  const [tab, setTab] = useState<Tab>('account');
  const [userId, setUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Tax
  const [taxIdType, setTaxIdType] = useState<'ssn' | 'ein'>('ssn');
  const [taxId, setTaxId] = useState('');
  const [legalName, setLegalName] = useState('');

  // Account
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Notifications
  const [notifCompetition, setNotifCompetition] = useState(true);
  const [notifBounty, setNotifBounty] = useState(true);
  const [notifPayout, setNotifPayout] = useState(true);
  const [notifNewsletter, setNotifNewsletter] = useState(false);
  const [notifAMA, setNotifAMA] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      setEmail(user.email || '');

      const { data } = await supabase
        .from('profiles')
        .select('username, payout_method, tax_id_type, tax_id, legal_name, notif_competition, notif_bounty, notif_payout, notif_newsletter, notif_ama')
        .eq('id', user.id)
        .single();

      if (data) {
        setCurrentUsername(data.username || null);
        setUsername(data.username || '');
        setPayoutMethod(data.payout_method || 'bank');
        setTaxIdType(data.tax_id_type || 'ssn');
        setTaxId(data.tax_id || '');
        setLegalName(data.legal_name || '');
        setNotifCompetition(data.notif_competition ?? true);
        setNotifBounty(data.notif_bounty ?? true);
        setNotifPayout(data.notif_payout ?? true);
        setNotifNewsletter(data.notif_newsletter ?? false);
        setNotifAMA(data.notif_ama ?? true);
      }
    };
    load();
  }, []);

  // Username availability check (debounced)
  useEffect(() => {
    if (!username || username === currentUsername) {
      setUsernameStatus('idle');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      setUsernameStatus('invalid');
      return;
    }
    setUsernameStatus('checking');
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
    return () => clearTimeout(timer);
  }, [username, currentUsername]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    const updates: Record<string, any> = {};

    if (tab === 'payout') {
      updates.payout_method = payoutMethod;
    }

    if (tab === 'tax') {
      updates.tax_id_type = taxIdType;
      updates.tax_id = taxId;
      updates.legal_name = legalName;
    }

    if (tab === 'account') {
      if (username !== currentUsername && usernameStatus === 'available') {
        updates.username = username;
      }
      if (newEmail && newEmail !== email) {
        await supabase.auth.updateUser({ email: newEmail });
      }
      if (newPassword) {
        await supabase.auth.updateUser({ password: newPassword });
      }
    }

    if (tab === 'notifications') {
      updates.notif_competition = notifCompetition;
      updates.notif_bounty = notifBounty;
      updates.notif_payout = notifPayout;
      updates.notif_newsletter = notifNewsletter;
      updates.notif_ama = notifAMA;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', userId);
      if (updates.username) setCurrentUsername(updates.username);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure? This cannot be undone.')) return;
    await supabase.auth.signOut();
    navigateTo('/');
  };

  const tabItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'payout', label: 'Payout', icon: <CreditCard size={15} /> },
    { key: 'tax', label: 'Tax', icon: <FileText size={15} /> },
    { key: 'account', label: 'Account', icon: <User size={15} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={15} /> },
    { key: 'danger', label: 'Danger Zone', icon: <Shield size={15} /> },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-[#0f1623]' : 'bg-[#F5F0E8]'}`}>

      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${isDark ? 'border-[#1B2A4A] bg-[#0f1623]' : 'border-[#D4A843]/30 bg-[#F5F0E8]'}`}>
        <div className="max-w-3xl mx-auto px-4 py-4 flex justify-between items-center">
          <button
            onClick={() => navigateTo('/')}
            className={`font-serif text-lg font-bold transition-colors ${isDark ? 'text-[#D4A843]' : 'text-[#1B2A4A]'}`}
          >
            Read to Earn
          </button>
          <button
            onClick={toggleTheme}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              isDark
                ? 'border-[#D4A843]/40 text-[#D4A843] hover:bg-[#D4A843]/10'
                : 'border-[#1B2A4A]/30 text-[#1B2A4A] hover:bg-[#1B2A4A]/10'
            }`}
          >
            {isDark ? '☀ Light' : '☾ Dark'}
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className={`font-serif text-3xl mb-8 ${textPrimary}`}>Account Settings</h1>

        {/* Tab Nav */}
        <div className="flex flex-wrap gap-2 mb-8">
          {tabItems.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tab === key
                  ? 'bg-[#D4A843] text-[#1B2A4A]'
                  : isDark
                  ? 'text-[#F5F0E8]/60 hover:text-[#F5F0E8]'
                  : 'text-[#1B2A4A]/60 hover:text-[#1B2A4A]'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Payout Tab */}
        {tab === 'payout' && (
          <div className={`rounded-xl border p-6 space-y-5 ${cardBg}`}>
            <h2 className={`font-serif text-xl ${textPrimary}`}>Payout Method</h2>
            <p className={`text-sm ${textMuted}`}>Where should we send your earnings?</p>
            <div className="flex gap-3">
              {(['bank', 'debit'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setPayoutMethod(m)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    payoutMethod === m
                      ? 'bg-[#D4A843] text-[#1B2A4A] border-[#D4A843]'
                      : isDark
                      ? 'border-[#D4A843]/20 text-[#F5F0E8]/60'
                      : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60'
                  }`}
                >
                  {m === 'bank' ? 'Bank Account' : 'Debit Card'}
                </button>
              ))}
            </div>
            {payoutMethod === 'bank' ? (
              <>
                <div>
                  <label className={`block text-xs mb-1.5 ${textMuted}`}>Routing Number</label>
                  <input className={inputClass} value={routingNumber} onChange={e => setRoutingNumber(e.target.value)} placeholder="9 digits" maxLength={9} />
                </div>
                <div>
                  <label className={`block text-xs mb-1.5 ${textMuted}`}>Account Number</label>
                  <input className={inputClass} value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="Account number" />
                </div>
              </>
            ) : (
              <div>
                <label className={`block text-xs mb-1.5 ${textMuted}`}>Debit Card Number</label>
                <input className={inputClass} value={debitCard} onChange={e => setDebitCard(e.target.value)} placeholder="16-digit card number" maxLength={16} />
              </div>
            )}
          </div>
        )}

        {/* Tax Tab */}
        {tab === 'tax' && (
          <div className={`rounded-xl border p-6 space-y-5 ${cardBg}`}>
            <h2 className={`font-serif text-xl ${textPrimary}`}>Tax Information</h2>
            <p className={`text-sm ${textMuted}`}>Required for payouts over $600/year (IRS 1099 reporting).</p>
            <div className="flex gap-3">
              {(['ssn', 'ein'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTaxIdType(t)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors ${
                    taxIdType === t
                      ? 'bg-[#D4A843] text-[#1B2A4A] border-[#D4A843]'
                      : isDark
                      ? 'border-[#D4A843]/20 text-[#F5F0E8]/60'
                      : 'border-[#1B2A4A]/20 text-[#1B2A4A]/60'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>Legal Name</label>
              <input className={inputClass} value={legalName} onChange={e => setLegalName(e.target.value)} placeholder="As it appears on your tax documents" />
            </div>
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>{taxIdType === 'ssn' ? 'Social Security Number' : 'Employer Identification Number'}</label>
              <input className={inputClass} value={taxId} onChange={e => setTaxId(e.target.value)} placeholder={taxIdType === 'ssn' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'} />
            </div>
          </div>
        )}

        {/* Account Tab */}
        {tab === 'account' && (
          <div className={`rounded-xl border p-6 space-y-6 ${cardBg}`}>
            <h2 className={`font-serif text-xl ${textPrimary}`}>Account Details</h2>

            {/* Username */}
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>
                Username {currentUsername ? <span className="text-[#D4A843]">(set — can be changed)</span> : <span className="text-[#D4A843]">(not set yet)</span>}
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${textMuted}`}>@</span>
                <input
                  className={`${inputClass} pl-7`}
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="your_username"
                  maxLength={20}
                />
                {usernameStatus !== 'idle' && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && <span className={`text-xs ${textMuted}`}>checking...</span>}
                    {usernameStatus === 'available' && <Check size={15} className="text-green-500" />}
                    {usernameStatus === 'taken' && <X size={15} className="text-red-500" />}
                    {usernameStatus === 'invalid' && <X size={15} className="text-red-500" />}
                  </span>
                )}
              </div>
              <p className={`text-xs mt-1 ${textMuted}`}>
                {usernameStatus === 'taken' && 'That username is taken.'}
                {usernameStatus === 'invalid' && '3–20 chars, lowercase letters, numbers, underscores only.'}
                {usernameStatus === 'available' && 'Username is available!'}
                {usernameStatus === 'idle' && 'Shown on leaderboards and AMA sessions.'}
              </p>
            </div>

            {/* Email */}
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>Current Email</label>
              <input className={inputClass} value={email} disabled />
            </div>
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>New Email</label>
              <input className={inputClass} value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Enter new email" type="email" />
            </div>

            {/* Password */}
            <div>
              <label className={`block text-xs mb-1.5 ${textMuted}`}>New Password</label>
              <div className="relative">
                <input
                  className={inputClass}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep current"
                  type={showPassword ? 'text' : 'password'}
                />
                <button
                  onClick={() => setShowPassword(p => !p)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${textMuted}`}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {tab === 'notifications' && (
          <div className={`rounded-xl border p-6 space-y-5 ${cardBg}`}>
            <h2 className={`font-serif text-xl ${textPrimary}`}>Notification Preferences</h2>
            {[
              { label: 'Competition alerts', sub: 'New competitions, results, pre-reg reminders', value: notifCompetition, set: setNotifCompetition },
              { label: 'Bounty alerts', sub: 'New bounties matching your reading history', value: notifBounty, set: setNotifBounty },
              { label: 'Payout notifications', sub: 'When earnings are sent to your account', value: notifPayout, set: setNotifPayout },
              { label: 'Newsletter', sub: 'Platform updates, tips, and announcements', value: notifNewsletter, set: setNotifNewsletter },
              { label: 'AMA sessions', sub: 'When authors you follow go live', value: notifAMA, set: setNotifAMA },
            ].map(({ label, sub, value, set }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${textPrimary}`}>{label}</p>
                  <p className={`text-xs ${textMuted}`}>{sub}</p>
                </div>
                <button
                  onClick={() => set(v => !v)}
                  className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-[#D4A843]' : isDark ? 'bg-[#1B2A4A]' : 'bg-[#1B2A4A]/20'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${value ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Danger Zone Tab */}
        {tab === 'danger' && (
          <div className={`rounded-xl border border-red-500/30 p-6 space-y-5 ${isDark ? 'bg-red-900/10' : 'bg-red-50'}`}>
            <h2 className="font-serif text-xl text-red-500">Danger Zone</h2>
            <p className={`text-sm ${textMuted}`}>
              Deleting your account is permanent. All your data, earnings history, and competition records will be removed. Any pending payouts will be forfeited.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Trash2 size={15} /> Delete My Account
            </button>
          </div>
        )}

        {/* Save Button */}
        {tab !== 'danger' && (
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-[#D4A843] text-[#1B2A4A] text-sm font-semibold rounded-lg hover:bg-[#c49a3a] transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
