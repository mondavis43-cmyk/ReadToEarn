import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';

const generateReferralCode = () =>
  Math.random().toString(36).substring(2, 10).toUpperCase();

export const Signup = () => {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const { navigateTo } = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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
      const ref = params.get('ref');

      const profileUpdates: Record<string, string> = {
        referral_code: generateReferralCode(),
      };
      if (ref) {
        profileUpdates.referred_by = ref;
      }

      await supabase.from('profiles').update(profileUpdates).eq('id', userId);
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSent(false);

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (!error) setResendSent(true);
    setResendLoading(false);
  };

  // ─── Shared tokens ─────────────────────────────────────────────────────────
  const bg            = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg        = isDark ? '#1e293b' : '#ffffff';
  const cardBorder    = isDark ? '#334155' : '#e2d9c8';
  const inputBg       = isDark ? '#0f172a' : '#F5F0E8';
  const inputBorder   = isDark ? '#475569' : '#d1c9b8';
  const dividerColor  = isDark ? '#334155' : '#e2d9c8';
  const textPrimary   = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';
  const textMuted     = isDark ? '#64748b' : '#9ca3af';

  // ─── Success / check email state ───────────────────────────────────────────
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: bg }}
      >
        <div className="w-full max-w-md text-center">
          <h1
            className="font-serif text-4xl mb-4"
            style={{ color: textPrimary }}
          >
            Check your email
          </h1>

          <div
            className="rounded-lg p-8 border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <p className="mb-2" style={{ color: textSecondary }}>
              We sent a confirmation link to
            </p>
            <p
              className="font-medium mb-6"
              style={{ color: textPrimary }}
            >
              {email}
            </p>
            <p className="text-sm mb-6" style={{ color: textSecondary }}>
              Click the link in the email to confirm your account, then come
              back and sign in.
            </p>

            <button
              onClick={() => navigateTo('/login')}
              className="w-full font-medium py-3 rounded-lg transition"
              style={{
                backgroundColor: '#1B2A4A',
                color: '#F5F0E8',
              }}
            >
              Go to Sign In
            </button>

            <div
              className="mt-6 pt-6 border-t"
              style={{ borderColor: dividerColor }}
            >
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
                  {resendLoading
                    ? 'Sending...'
                    : 'Resend confirmation email'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main signup form ──────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: bg }}
    >
      <div className="w-full max-w-md">

        {/* Header */}
        <h1
          className="font-serif text-4xl mb-2 text-center"
          style={{ color: textPrimary }}
        >
          Read to Earn
        </h1>
        <p
          className="text-center mb-8"
          style={{ color: textSecondary }}
        >
          Create your account
        </p>

        {/* Card */}
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
              style={{
                backgroundColor: inputBg,
                border: `1px solid ${inputBorder}`,
                color: textPrimary,
              }}
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
              style={{
                backgroundColor: inputBg,
                border: `1px solid ${inputBorder}`,
                color: textPrimary,
              }}
              onFocus={(e) => (e.target.style.borderColor = '#D4A843')}
              onBlur={(e)  => (e.target.style.borderColor = inputBorder)}
              required
              minLength={6}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full font-medium py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#1B2A4A',
              color: '#F5F0E8',
            }}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          {/* Sign in link */}
          <p
            className="mt-6 text-center text-sm"
            style={{ color: textSecondary }}
          >
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
