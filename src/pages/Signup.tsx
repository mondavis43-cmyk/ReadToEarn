import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';

const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const getDaysInMonth = (month: number, year: number) =>
  new Date(year, month, 0).getDate();

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

export const Signup = () => {
  const { isDark } = useTheme();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay]     = useState('');
  const [dobYear, setDobYear]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent]       = useState(false);
  const { navigateTo } = useNavigate();

  // ─── Age helpers ────────────────────────────────────────────────────────────
  const calculateAge = (month: number, day: number, year: number): number => {
    const today = new Date();
    const dob   = new Date(year, month - 1, day);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // ── Validate DOB fields ──────────────────────────────────────────────────
    if (!dobMonth || !dobDay || !dobYear) {
      setError('Please enter your date of birth.');
      setLoading(false);
      return;
    }

    const month = parseInt(dobMonth, 10);
    const day   = parseInt(dobDay, 10);
    const year  = parseInt(dobYear, 10);
    const age   = calculateAge(month, day, year);

    // ── COPPA hard block: under 13 ───────────────────────────────────────────
    if (age < 13) {
      setError(
        'You must be at least 13 years old to create an account on Read to Earn.'
      );
      setLoading(false);
      return;
    }

    const isMinor = age < 18;

    // ── Format DOB as YYYY-MM-DD for Postgres ────────────────────────────────
    const dobFormatted = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // ── Create auth user ─────────────────────────────────────────────────────
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      const params = new URLSearchParams(window.location.search);
      const ref    = params.get('ref');

      const profileUpdates: Record<string, string | boolean> = {
        referral_code: generateReferralCode(),
        date_of_birth: dobFormatted,
        is_minor:      isMinor,
      };
      if (ref) profileUpdates.referred_by = ref;

      await supabase.from('profiles').update(profileUpdates).eq('id', userId);
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSent(false);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (!error) setResendSent(true);
    setResendLoading(false);
  };

  // ─── Shared tokens ──────────────────────────────────────────────────────────
  const bg            = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg        = isDark ? '#1e293b' : '#ffffff';
  const cardBorder    = isDark ? '#334155' : '#e2d9c8';
  const inputBg       = isDark ? '#0f172a' : '#F5F0E8';
  const inputBorder   = isDark ? '#475569' : '#d1c9b8';
  const dividerColor  = isDark ? '#334155' : '#e2d9c8';
  const textPrimary   = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const textMuted     = isDark ? '#64748b' : '#9ca3af';

  const selectStyle = {
    backgroundColor: inputBg,
    border: `1px solid ${inputBorder}`,
    color: textPrimary,
    appearance: 'none' as const,
  };

  // ─── Days available for selected month/year ─────────────────────────────────
  const daysInMonth = dobMonth && dobYear
    ? getDaysInMonth(parseInt(dobMonth, 10), parseInt(dobYear, 10))
    : 31;

  // ─── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: bg }}
      >
        <div className="w-full max-w-md text-center">
          <h1 className="font-serif text-4xl mb-4" style={{ color: textPrimary }}>
            Check your email
          </h1>
          <div
            className="rounded-lg p-8 border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <p className="mb-2" style={{ color: textSecondary }}>
              We sent a confirmation link to
            </p>
            <p className="font-medium mb-6" style={{ color: textPrimary }}>
              {email}
            </p>
            <p className="text-sm mb-6" style={{ color: textSecondary }}>
              Click the link in the email to confirm your account, then come
              back and sign in.
            </p>
            <button
              onClick={() => navigateTo('/login')}
              className="w-full font-medium py-3 rounded-lg transition"
              style={{ backgroundColor: '#1B2A4A', color: '#F5F0E8' }}
            >
              Go to Sign In
            </button>
            <div className="mt-6 pt-6 border-t" style={{ borderColor: dividerColor }}>
              <p className="text-sm mb-3" style={{ color: textMuted }}>
                Did not get the email?
              </p>
              {resendSent ? (
                <p className="text-sm" style={{ color: '#D4A843' }}>
                  Resent! Check your inbox (and spam folder).
                </p>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-sm transition underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ color: '#D4A843' }}
                >
                  {resendLoading ? 'Sending...' : 'Resend confirmation email'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main signup form ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: bg }}
    >
      <div className="w-full max-w-md">

        <h1
          className="font-serif text-4xl mb-2 text-center"
          style={{ color: textPrimary }}
        >
          Read to Earn
        </h1>
        <p className="text-center mb-8" style={{ color: textSecondary }}>
          Create your account
        </p>

        <form
          onSubmit={handleSignup}
          className="rounded-lg p-8 border"
          style={{ backgroundColor: cardBg, borderColor: cardBorder }}
        >
          {/* Error banner */}
          {error && (
            <div
              className="mb-4 p-3 rounded text-sm border"
              style={{
                backgroundColor: 'rgba(239,68,68,0.08)',
                borderColor: 'rgba(239,68,68,0.3)',
                color: '#f87171',
              }}
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-2"
              style={{ color: textSecondary }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
              style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
              onFocus={(e) => (e.target.style.borderColor = '#D4A843')}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
              required
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-2"
              style={{ color: textSecondary }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg focus:outline-none transition"
              style={{ backgroundColor: inputBg, border: `1px solid ${inputBorder}`, color: textPrimary }}
              onFocus={(e) => (e.target.style.borderColor = '#D4A843')}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
              required
              minLength={6}
            />
          </div>

          {/* Date of Birth */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: textSecondary }}>
              Date of Birth
            </label>
            <p className="text-xs mb-3" style={{ color: textMuted }}>
              You must be at least 13 years old to use Read to Earn.
            </p>
            <div className="grid grid-cols-3 gap-2">

              {/* Month */}
              <select
                value={dobMonth}
                onChange={(e) => { setDobMonth(e.target.value); setDobDay(''); }}
                className="px-3 py-3 rounded-lg focus:outline-none transition text-sm"
                style={selectStyle}
                onFocus={(e) => (e.target.style.borderColor = '#D4A843')}
                onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                required
              >
                <option value="" disabled>Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>

              {/* Day */}
              <select
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
                className="px-3 py-3 rounded-lg focus:outline-none transition text-sm"
                style={selectStyle}
                onFocus={(e) => (e.target.style.borderColor = '#D4A843')}
                onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                required
              >
                <option value="" disabled>Day</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={String(d)}>{d}</option>
                ))}
              </select>

              {/* Year */}
              <select
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
                className="px-3 py-3 rounded-lg focus:outline-none transition text-sm"
                style={selectStyle}
                onFocus={(e) => (e.target.style.borderColor = '#D4A843')}
                onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
                required
              >
                <option value="" disabled>Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>

            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#1B2A4A', color: '#F5F0E8' }}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          {/* Sign in link */}
          <p className="mt-6 text-center text-sm" style={{ color: textSecondary }}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              className="transition underline-offset-2 hover:underline"
              style={{ color: '#D4A843' }}
            >
              Sign in
            </button>
          </p>

        </form>
      </div>
    </div>
  );
};
