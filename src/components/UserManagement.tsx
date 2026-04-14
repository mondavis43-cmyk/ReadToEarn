// src/components/UserManagement.tsx
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type Tier = 'free' | 'casual' | 'avid' | 'voracious'
type UserStatus = 'active' | 'flagged' | 'suspended'

interface AdminUser {
  id: string
  email: string
  subscription_tier: Tier
  total_balance: number
  available_balance: number
  books_completed: number
  status: UserStatus
  created_at: string
  is_flagged: boolean
  is_suspended: boolean
}

type SortableCol = 'email' | 'created_at' | 'subscription_tier' | 'total_balance' | 'books_completed'

// ─── Constants ────────────────────────────────────────────────────────────────

const TIERS: Tier[] = ['free', 'casual', 'avid', 'voracious']
const PAGE_SIZE = 25

const TIER_COLORS: Record<Tier, string> = {
  free:       'bg-gray-700 text-gray-200',
  casual:     'bg-blue-900 text-blue-200',
  avid:       'bg-purple-900 text-purple-200',
  voracious:  'bg-amber-900 text-amber-200',
}

const STATUS_COLORS: Record<UserStatus, string> = {
  active:    'bg-green-900 text-green-200',
  flagged:   'bg-yellow-900 text-yellow-200',
  suspended: 'bg-red-900 text-red-200',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function deriveStatus(user: { is_flagged: boolean; is_suspended: boolean }): UserStatus {
  if (user.is_suspended) return 'suspended'
  if (user.is_flagged)   return 'flagged'
  return 'active'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function formatBalance(cents: number) {
  return `$${((cents ?? 0) / 100).toFixed(2)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserManagement() {
  // Data
  const [users, setUsers]           = useState<AdminUser[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Filters
  const [search, setSearch]             = useState('')
  const [tierFilter, setTierFilter]     = useState<Tier | ''>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')
  const [page, setPage]                 = useState(0)

  // Sorting
  const [sortCol, setSortCol] = useState<SortableCol>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Modals / menus
  const [openMenuId, setOpenMenuId]       = useState<string | null>(null)
  const [profileUser, setProfileUser]     = useState<AdminUser | null>(null)
  const [tierModalUser, setTierModalUser] = useState<AdminUser | null>(null)
  const [newTier, setNewTier]             = useState<Tier>('free')

  const menuRef = useRef<HTMLDivElement>(null)

  // ── Load users ──────────────────────────────────────────────────────────────

  async function loadUsers() {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('profiles')
        .select(
          'id, email, subscription_tier, total_balance, available_balance, books_completed, is_flagged, is_suspended, created_at',
          { count: 'exact' }
        )

      if (search.trim()) {
        query = query.ilike('email', `%${search.trim()}%`)
      }

      if (tierFilter) {
        query = query.eq('subscription_tier', tierFilter)
      }

      if (statusFilter === 'suspended') {
        query = query.eq('is_suspended', true)
      } else if (statusFilter === 'flagged') {
        query = query.eq('is_flagged', true).eq('is_suspended', false)
      } else if (statusFilter === 'active') {
        query = query.eq('is_flagged', false).eq('is_suspended', false)
      }

      query = query.order(sortCol, { ascending: sortDir === 'asc' })
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

      const result = await query

      if (result.error) {
        setError(result.error.message)
        setUsers([])
        setTotalCount(0)
      } else {
        const mapped: AdminUser[] = (result.data ?? []).map((u: any) => ({
          ...u,
          subscription_tier: u.subscription_tier ?? 'free',
          total_balance:     u.total_balance     ?? 0,
          available_balance: u.available_balance ?? 0,
          books_completed:   u.books_completed   ?? 0,
          is_flagged:        u.is_flagged        ?? false,
          is_suspended:      u.is_suspended      ?? false,
          status: deriveStatus({
            is_flagged:   u.is_flagged   ?? false,
            is_suspended: u.is_suspended ?? false,
          }),
        }))
        setUsers(mapped)
        setTotalCount(result.count ?? 0)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load users')
      setUsers([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, tierFilter, statusFilter, sortCol, sortDir, page])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Flash message helper ────────────────────────────────────────────────────

  function flash(msg: string) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  // ── Actions ─────────────────────────────────────────────────────────────────

  async function handleFlagToggle(user: AdminUser) {
    const newFlagged = !user.is_flagged
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_flagged: newFlagged })
      .eq('id', user.id)
    if (err) { setError(err.message); return }
    flash(newFlagged ? `${user.email} flagged` : `${user.email} unflagged`)
    loadUsers()
  }

  async function handleSuspendToggle(user: AdminUser) {
    const newSuspended = !user.is_suspended
    const { error: err } = await supabase
      .from('profiles')
      .update({ is_suspended: newSuspended })
      .eq('id', user.id)
    if (err) { setError(err.message); return }
    flash(newSuspended ? `${user.email} suspended` : `${user.email} reactivated`)
    loadUsers()
  }

  async function handleChangeTier() {
    if (!tierModalUser) return
    const { error: err } = await supabase
      .from('profiles')
      .update({ subscription_tier: newTier })
      .eq('id', tierModalUser.id)
    if (err) { setError(err.message); return }
    flash(`${tierModalUser.email} moved to ${newTier}`)
    setTierModalUser(null)
    loadUsers()
  }

  async function handleResetPassword(user: AdminUser) {
    const { error: err } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (err) { setError(err.message); return }
    flash(`Password reset email sent to ${user.email}`)
  }

  // ── Sort handler ─────────────────────────────────────────────────────────────

  function handleSort(col: SortableCol) {
    if (sortCol === col) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(0)
  }

  function SortIcon({ col }: { col: SortableCol }) {
    if (sortCol !== col) return <span className="ml-1 opacity-30">↕</span>
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  // ── Styles ───────────────────────────────────────────────────────────────────

  const inputClass  = 'bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
  const selectClass = 'bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500'
  const btnClass    = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors'
  const totalPages  = Math.ceil(totalCount / PAGE_SIZE)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Flash messages */}
      {successMsg && (
        <div className="bg-green-900 border border-green-700 text-green-200 rounded-lg px-4 py-2 text-sm">
          ✓ {successMsg}
        </div>
      )}

      {/* Error banner -- always visible when error exists */}
      {error && (
        <div className="bg-red-900 border border-red-700 text-red-200 rounded-lg px-4 py-3 text-sm flex justify-between items-start">
          <div>
            <div className="font-semibold mb-1">⚠ Failed to load users</div>
            <div className="opacity-80 font-mono text-xs">{error}</div>
          </div>
          <button onClick={() => setError(null)} className="ml-4 opacity-60 hover:opacity-100 text-lg leading-none shrink-0">✕</button>
        </div>
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          placeholder="Search email..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(0) }}
          className={`${inputClass} w-64`}
        />

        <select
          value={tierFilter}
          onChange={e => { setTierFilter(e.target.value as Tier | ''); setPage(0) }}
          className={selectClass}
        >
          <option value="">All Tiers</option>
          {TIERS.map(t => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as UserStatus | ''); setPage(0) }}
          className={selectClass}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="flagged">⚠️ Flagged</option>
          <option value="suspended">Suspended</option>
        </select>

        <span className="text-gray-400 text-sm ml-auto">
          {totalCount.toLocaleString()} user{totalCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-800 text-gray-400 uppercase text-xs tracking-wider">
            <tr>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('email')}
              >
                User <SortIcon col="email" />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('created_at')}
              >
                Joined <SortIcon col="created_at" />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('subscription_tier')}
              >
                Tier <SortIcon col="subscription_tier" />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('total_balance')}
              >
                Balance <SortIcon col="total_balance" />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white select-none"
                onClick={() => handleSort('books_completed')}
              >
                Books <SortIcon col="books_completed" />
              </th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}

            {!loading && !error && users.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No users found
                </td>
              </tr>
            )}

            {!loading && users.map(user => (
              <tr key={user.id} className="bg-gray-900 hover:bg-gray-800 transition-colors">

                {/* User */}
                <td className="px-4 py-3">
                  <div className="font-medium text-white flex items-center gap-1.5">
                    {user.is_flagged && <span title="Flagged">⚠️</span>}
                    {user.email.split('@')[0]}
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">{user.email}</div>
                </td>

                {/* Joined */}
                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                  {formatDate(user.created_at)}
                </td>

                {/* Tier */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_COLORS[user.subscription_tier]}`}>
                    {user.subscription_tier}
                  </span>
                </td>

                {/* Balance */}
                <td className="px-4 py-3 text-gray-300 font-mono">
                  {formatBalance(user.total_balance)}
                </td>

                {/* Books */}
                <td className="px-4 py-3 text-gray-300 text-center">
                  {user.books_completed}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[user.status]}`}>
                    {user.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-3 text-right relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                    className="text-gray-400 hover:text-white px-2 py-1 rounded transition-colors"
                  >
                    ···
                  </button>

                  {openMenuId === user.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-4 top-10 z-50 bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-48 py-1 text-left"
                    >
                      <button
                        onClick={() => { setProfileUser(user); setOpenMenuId(null) }}
                        className="w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                      >
                        👤 View Profile
                      </button>
                      <button
                        onClick={() => {
                          setTierModalUser(user)
                          setNewTier(user.subscription_tier)
                          setOpenMenuId(null)
                        }}
                        className="w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                      >
                        🔄 Change Tier
                      </button>
                      <button
                        onClick={() => { handleFlagToggle(user); setOpenMenuId(null) }}
                        className="w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                      >
                        {user.is_flagged ? '✅ Unflag User' : '⚠️ Flag User'}
                      </button>
                      <button
                        onClick={() => { handleSuspendToggle(user); setOpenMenuId(null) }}
                        className="w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                      >
                        {user.is_suspended ? '✅ Reactivate' : '🚫 Suspend'}
                      </button>
                      <div className="border-t border-gray-700 my-1" />
                      <button
                        onClick={() => { handleResetPassword(user); setOpenMenuId(null) }}
                        className="w-full px-4 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                      >
                        🔑 Reset Password
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>
            Page {page + 1} of {totalPages} &nbsp;·&nbsp; {totalCount.toLocaleString()} total
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className={`${btnClass} bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              ← Prev
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className={`${btnClass} bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── Profile Modal ─────────────────────────────────────────────────── */}
      {profileUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h2 className="text-white text-lg font-semibold">User Profile</h2>
              <button
                onClick={() => setProfileUser(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <Row label="Email"           value={profileUser.email} />
              <Row label="User ID"         value={profileUser.id} mono />
              <Row label="Joined"          value={formatDate(profileUser.created_at)} />
              <Row
                label="Tier"
                value={
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${TIER_COLORS[profileUser.subscription_tier]}`}>
                    {profileUser.subscription_tier}
                  </span>
                }
              />
              <Row label="Total Balance"   value={formatBalance(profileUser.total_balance)} mono />
              <Row label="Avail. Balance"  value={formatBalance(profileUser.available_balance)} mono />
              <Row label="Books Completed" value={String(profileUser.books_completed)} />
              <Row
                label="Status"
                value={
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[profileUser.status]}`}>
                    {profileUser.status}
                  </span>
                }
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { handleFlagToggle(profileUser); setProfileUser(null) }}
                className={`${btnClass} bg-yellow-900 hover:bg-yellow-800 text-yellow-200 flex-1`}
              >
                {profileUser.is_flagged ? 'Unflag' : '⚠️ Flag'}
              </button>
              <button
                onClick={() => { handleSuspendToggle(profileUser); setProfileUser(null) }}
                className={`${btnClass} bg-red-900 hover:bg-red-800 text-red-200 flex-1`}
              >
                {profileUser.is_suspended ? 'Reactivate' : '🚫 Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Tier Modal ─────────────────────────────────────────────── */}
      {tierModalUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h2 className="text-white text-lg font-semibold">Change Tier</h2>
              <button
                onClick={() => setTierModalUser(null)}
                className="text-gray-400 hover:text-white text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <p className="text-gray-400 text-sm">{tierModalUser.email}</p>

            <select
              value={newTier}
              onChange={e => setNewTier(e.target.value as Tier)}
              className={`${selectClass} w-full`}
            >
              {TIERS.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={() => setTierModalUser(null)}
                className={`${btnClass} bg-gray-800 hover:bg-gray-700 text-gray-300 flex-1`}
              >
                Cancel
              </button>
              <button
                onClick={handleChangeTier}
                className={`${btnClass} bg-amber-600 hover:bg-amber-500 text-white flex-1`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Small helper component ────────────────────────────────────────────────────

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`text-white text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}
