import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';

export const ResetPassword = () => {
  const { isDark } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const { navigateTo } = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true);
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigateTo('/'), 2000);
    }
    setLoading(false);
  };

  // ─── Shared tokens ─────────────────────────────────────────────────────────
  const bg        = isDark ? '#0f172a' : '#F5F0E8';
  const cardBg    = isDark ? '#1e293b' : '#ffffff';
  const cardBorder = isDark ? '#334155' : '#e2d9c8';
  const inputBg   = isDark ? '#0f172a' : '#F5F0E8';
  const inputBorder = isDark ? '#475569' : '#d1c9b8';
  const textPrimary   = isDark ? '#F5F0E8' : '#1B2A4A';
  const textSecondary = isDark ? '#94a3b8' : '#6b7280';

  // ─── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: bg }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="rounded-lg p-8 border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <p
              className="font-medium text-lg mb-2"
              style={{ color: '#D4A843' }}
            >
              Password updated!
            </p>
            <p className="text-sm" style={{ color: textSecondary }}>
              Taking you to the library...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Invalid / waiting session ─────────────────────────────────────────────
  if (!validSession) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: bg }}
      >
        <div className="w-full max-w-md text-center">
          <div
            className="rounded-lg p-8 border"
            style={{ backgroundColor: cardBg, borderColor: cardBorder }}
          >
            <p className="text-sm mb-4" style={{ color: textSecondary }}>
              Waiting for reset link verification...
            </p>
            <p className="text-xs" style={{ color: isDark ? '#64748b' : '#9ca3af' }}>
              If you did not come from a reset email, this page will not work.
            </p>
            <button
              onClick={() => navigateTo('/login')}
              className="mt-6 text-sm transition underline-offset-2 hover:underline"
              style={{ color: '#D4A843' }}
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main form ─────────────────────────────────────────────────────────────
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
          Set a new password
        </p>

        {/* Card */}
        <form
          onSubmit={handleReset}
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

          {/* New Password */}
          <div className="mb-4">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: textSecondary }}
            >
              New Password
            </label>
            <input
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

          {/* Confirm Password */}
          <div className="mb-6">
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: textSecondary }}
            >
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Updating...' : 'Update Password'}
          </button>

        </form>
      </div>
    </div>
  );
};
