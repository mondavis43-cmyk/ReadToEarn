import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";

type Tab = "payout" | "tax" | "account" | "notifications" | "danger";

export default function AccountSettings() {
  const [activeTab, setActiveTab] = useState<Tab>("payout");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Payout fields
  const [payoutMethod, setPayoutMethod] = useState<"bank" | "debit" | "">("");
  const [payoutSaved, setPayoutSaved] = useState(false);

  // Tax fields
  const [taxIdType, setTaxIdType] = useState<"ssn" | "ein">("ssn");
  const [taxId, setTaxId] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxSaved, setTaxSaved] = useState(false);

  // Username fields
  const [username, setUsername] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameSaved, setUsernameSaved] = useState(false);

  // Account fields
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [accountMsg, setAccountMsg] = useState("");

  // Notification prefs
  const [notifEarnings, setNotifEarnings] = useState(true);
  const [notifCompetitions, setNotifCompetitions] = useState(true);
  const [notifBounties, setNotifBounties] = useState(true);
  const [notifNewBooks, setNotifNewBooks] = useState(false);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.history.pushState({}, "", "/login"); return; }
      setUser(user);

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (prof) {
        setProfile(prof);
        setLegalName(prof.legal_name || "");
        setTaxIdType(prof.tax_id_type || "ssn");
        setUsername(prof.username || "");
        setNotifEarnings(prof.notif_earnings ?? true);
        setNotifCompetitions(prof.notif_competitions ?? true);
        setNotifBounties(prof.notif_bounties ?? true);
        setNotifNewBooks(prof.notif_new_books ?? false);
        setNotifMarketing(prof.notif_marketing ?? false);
        setPayoutMethod(prof.payout_method || "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "payout", label: "Payout Method", icon: "💳" },
    { key: "tax", label: "Tax Info", icon: "🧾" },
    { key: "account", label: "Account", icon: "🔐" },
    { key: "notifications", label: "Notifications", icon: "🔔" },
    { key: "danger", label: "Danger Zone", icon: "⚠️" },
  ];

  const handleSavePayout = async () => {
    if (!payoutMethod) return;
    await supabase
      .from("profiles")
      .update({ payout_method: payoutMethod })
      .eq("id", user.id);
    setPayoutSaved(true);
    setTimeout(() => setPayoutSaved(false), 3000);
  };

  const handleSaveTax = async () => {
    if (!legalName || !taxId) return;
    const masked = taxId.replace(/\d(?=\d{4})/g, "*");
    await supabase
      .from("profiles")
      .update({
        legal_name: legalName,
        tax_id_type: taxIdType,
        tax_id_masked: masked,
        tax_id_submitted: true,
      })
      .eq("id", user.id);
    setTaxSaved(true);
    setTaxId("");
    setTimeout(() => setTaxSaved(false), 3000);
  };

  const checkUsername = async (val: string) => {
    if (val.length < 3) { setUsernameAvailable(null); return; }
    setUsernameChecking(true);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", val.toLowerCase())
      .neq("id", user.id)
      .maybeSingle();
    setUsernameAvailable(!data);
    setUsernameChecking(false);
  };

  const handleSaveUsername = async () => {
    if (!username || !usernameAvailable) return;
    await supabase
      .from("profiles")
      .update({ username: username.toLowerCase() })
      .eq("id", user.id);
    setProfile((prev: any) => ({ ...prev, username: username.toLowerCase() }));
    setUsernameSaved(true);
    setTimeout(() => setUsernameSaved(false), 3000);
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return;
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setAccountMsg(error ? `Error: ${error.message}` : "Confirmation sent to your new email.");
    setNewEmail("");
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setAccountMsg("Passwords don't match.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setAccountMsg(error ? `Error: ${error.message}` : "Password updated successfully.");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSaveNotifications = async () => {
    await supabase
      .from("profiles")
      .update({
        notif_earnings: notifEarnings,
        notif_competitions: notifCompetitions,
        notif_bounties: notifBounties,
        notif_new_books: notifNewBooks,
        notif_marketing: notifMarketing,
      })
      .eq("id", user.id);
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      setDeleteError('Type "DELETE" to confirm.');
      return;
    }
    await supabase
      .from("profiles")
      .update({ account_deleted: true, deleted_at: new Date().toISOString() })
      .eq("id", user.id);
    await supabase.auth.signOut();
    window.history.pushState({}, "", "/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="bg-[#111] border-b border-white/10 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => window.history.pushState({}, "", "/profile")}
            className="text-sm text-white/50 hover:text-white mb-3 flex items-center gap-1 transition-colors"
          >
            ← Back to Profile
          </button>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-white/50 text-sm mt-1">
            Manage your payout, tax info, and account preferences
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 flex gap-8">
        {/* Sidebar */}
        <div className="w-52 shrink-0">
          <nav className="flex flex-col gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left transition-all ${
                  activeTab === tab.key
                    ? "bg-[#7c3aed] text-white"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">

          {/* ── PAYOUT METHOD ── */}
          {activeTab === "payout" && (
            <div>
              <h2 className="text-xl font-bold mb-1">Payout Method</h2>
              <p className="text-white/50 text-sm mb-6">
                Choose how you receive your earnings. Payouts are processed weekly for balances over $10.
              </p>

              <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-xl p-4 mb-6 text-sm text-[#a78bfa]">
                💡 You must have a verified tax ID on file before your first payout can be processed.
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  {
                    key: "bank",
                    label: "Bank Account (ACH)",
                    desc: "Direct deposit — 2–3 business days",
                    icon: "🏦",
                  },
                  {
                    key: "debit",
                    label: "Debit Card",
                    desc: "Instant payout — small fee may apply",
                    icon: "💳",
                  },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setPayoutMethod(opt.key as "bank" | "debit")}
                    className={`p-5 rounded-xl border text-left transition-all ${
                      payoutMethod === opt.key
                        ? "border-[#7c3aed] bg-[#7c3aed]/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                  >
                    <div className="text-2xl mb-2">{opt.icon}</div>
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-white/50 text-xs mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>

              {payoutMethod && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-5 mb-6">
                  <p className="text-sm text-white/70 mb-4">
                    {payoutMethod === "bank"
                      ? "You'll be redirected to Stripe to securely link your bank account via Plaid."
                      : "You'll be redirected to Stripe to securely add your debit card."}
                  </p>
                  <button
                    onClick={() => {
                      // TODO: redirect to Stripe Connect onboarding URL
                      alert("Stripe Connect onboarding coming soon.");
                    }}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Connect via Stripe →
                  </button>
                </div>
              )}

              <button
                onClick={handleSavePayout}
                disabled={!payoutMethod}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {payoutSaved ? "✓ Saved" : "Save Preference"}
              </button>
            </div>
          )}

          {/* ── TAX INFO ── */}
          {activeTab === "tax" && (
            <div>
              <h2 className="text-xl font-bold mb-1">Tax Information</h2>
              <p className="text-white/50 text-sm mb-6">
                Required for earnings over $600/year. We'll use this to generate your 1099-NEC.
              </p>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-sm text-amber-300">
                ⚠️ Your tax ID is encrypted and stored securely. We never display it in full after submission.
              </div>

              {profile?.tax_id_submitted && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 text-sm text-green-300">
                  ✓ Tax ID on file: {profile.tax_id_masked} ({profile.tax_id_type?.toUpperCase()}) — Legal name: {profile.legal_name}
                </div>
              )}

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Legal Name (as it appears on your tax return)
                  </label>
                  <input
                    type="text"
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="Full legal name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Tax ID Type</label>
                  <div className="flex gap-3">
                    {(["ssn", "ein"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setTaxIdType(t)}
                        className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                          taxIdType === t
                            ? "bg-[#7c3aed] border-[#7c3aed] text-white"
                            : "border-white/10 text-white/60 hover:text-white hover:border-white/20"
                        }`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    {taxIdType === "ssn" ? "Social Security Number" : "Employer Identification Number"}
                  </label>
                  <input
                    type="password"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    placeholder={taxIdType === "ssn" ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed]"
                  />
                  <p className="text-white/40 text-xs mt-1">
                    Stored encrypted. Never shown again after submission.
                  </p>
                </div>

                <button
                  onClick={handleSaveTax}
                  disabled={!legalName || !taxId}
                  className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  {taxSaved ? "✓ Submitted" : "Submit Tax Info"}
                </button>
              </div>
            </div>
          )}

          {/* ── ACCOUNT ── */}
          {activeTab === "account" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Account</h2>
                <p className="text-white/50 text-sm">Manage your username, email, and password.</p>
              </div>

              {accountMsg && (
                <div className="bg-[#7c3aed]/10 border border-[#7c3aed]/30 rounded-xl p-4 text-sm text-[#a78bfa]">
                  {accountMsg}
                </div>
              )}

              {/* ── Username ── */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-1">Username</h3>
                <p className="text-white/50 text-sm mb-4">
                  Your public display name on leaderboards and Author AMA. Lowercase only, no spaces.
                </p>
                {profile?.username && (
                  <p className="text-white/40 text-xs mb-3">Current: @{profile.username}</p>
                )}
                <div className="flex gap-3 items-center mb-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^a-z0-9_]/g, "");
                        setUsername(val);
                        setUsernameAvailable(null);
                      }}
                      onBlur={() => checkUsername(username)}
                      placeholder="yourname"
                      maxLength={20}
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed]"
                    />
                  </div>
                  <button
                    onClick={handleSaveUsername}
                    disabled={!username || !usernameAvailable}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
                  >
                    {usernameSaved ? "✓ Saved" : "Save Username"}
                  </button>
                </div>
                {usernameChecking && (
                  <p className="text-white/40 text-xs">Checking availability...</p>
                )}
                {!usernameChecking && usernameAvailable === true && username.length >= 3 && (
                  <p className="text-green-400 text-xs">✓ @{username} is available</p>
                )}
                {!usernameChecking && usernameAvailable === false && (
                  <p className="text-red-400 text-xs">✗ @{username} is already taken</p>
                )}
                <p className="text-white/30 text-xs mt-2">
                  3–20 characters. Letters, numbers, and underscores only.
                </p>
              </div>

              {/* ── Change Email ── */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-1">Change Email</h3>
                <p className="text-white/50 text-sm mb-4">Current: {user?.email}</p>
                <div className="space-y-3">
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="New email address"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed]"
                  />
                  <button
                    onClick={handleChangeEmail}
                    disabled={!newEmail}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Send Confirmation
                  </button>
                </div>
              </div>

              {/* ── Change Password ── */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Change Password</h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed]"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#7c3aed]"
                  />
                  <button
                    onClick={handleChangePassword}
                    disabled={!newPassword || !confirmPassword}
                    className="bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === "notifications" && (
            <div>
              <h2 className="text-xl font-bold mb-1">Notifications</h2>
              <p className="text-white/50 text-sm mb-6">
                Choose which emails you receive from Read to Earn.
              </p>

              <div className="space-y-3 mb-6">
                {[
                  {
                    label: "Earnings & payouts",
                    desc: "When you earn money or a payout is processed",
                    val: notifEarnings,
                    set: setNotifEarnings,
                  },
                  {
                    label: "Competition updates",
                    desc: "Results, new competitions, and leaderboard changes",
                    val: notifCompetitions,
                    set: setNotifCompetitions,
                  },
                  {
                    label: "Bounty alerts",
                    desc: "New bounties matching your reading preferences",
                    val: notifBounties,
                    set: setNotifBounties,
                  },
                  {
                    label: "New books added",
                    desc: "When new books are added to the library",
                    val: notifNewBooks,
                    set: setNotifNewBooks,
                  },
                  {
                    label: "Marketing & promotions",
                    desc: "Platform news, feature announcements, and offers",
                    val: notifMarketing,
                    set: setNotifMarketing,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl px-5 py-4"
                  >
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-white/40 text-xs mt-0.5">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => item.set(!item.val)}
                      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
                        item.val ? "bg-[#7c3aed]" : "bg-white/20"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          item.val ? "left-5" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveNotifications}
                className="bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {notifSaved ? "✓ Saved" : "Save Preferences"}
              </button>
            </div>
          )}

          {/* ── DANGER ZONE ── */}
          {activeTab === "danger" && (
            <div>
              <h2 className="text-xl font-bold mb-1">Danger Zone</h2>
              <p className="text-white/50 text-sm mb-6">
                These actions are permanent and cannot be undone.
              </p>

              <div className="border border-red-500/30 rounded-xl p-6">
                <h3 className="font-semibold text-red-400 mb-1">Delete Account</h3>
                <p className="text-white/50 text-sm mb-4">
                  Your account, earnings history, and all data will be permanently deleted. Any pending payouts must be claimed first.
                </p>

                {deleteError && (
                  <p className="text-red-400 text-sm mb-3">{deleteError}</p>
                )}

                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="w-full bg-white/5 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-red-500 mb-4"
                />
                <button
                  onClick={handleDeleteAccount}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  Delete My Account
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
