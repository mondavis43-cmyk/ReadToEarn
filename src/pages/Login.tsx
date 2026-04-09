import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { navigateTo } = useNavigate();
  const { isDark } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      navigateTo('/');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setError('');

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setResetLoading(false);
  };

  const bg = isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]';
  const cardBg = isDark ? 'bg-[#162238]' : 'bg-white';
  const cardBorder = isDark ? 'border-[#F5F0E8]/10' : 'border-[#1B2A4A]/10';
  const headingColor = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';
  const subColor = isDark ? 'text-[#F5F0E8]/50' : 'text-[#1B2A4A]/50';
  const labelColor = isDark ? 'text-[#F5F0E8]/70' : 'text-[#1B2A4A]/70';
  const inputBg = isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]';
  const inputBorder = isDark ? 'border-[#F5F0E8]/15 focus:border-[#D4A843]' : 'border-[#1B2A4A]/20 focus:border-[#D4A843]';
  const inputText = isDark ? 'text-[#F5F0E8]' : 'text-[#1B2A4A]';

  if (showReset) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center px-4 transition-colors duration-300`}>
        <div className="w-full max-w-md">
          <h1 className={`font-serif text-4xl ${headingColor} mb-2 text-center`}>Read to Earn</h1>
          <p className={`${subColor} text-center mb-8`}>Reset your password</p>

          <div className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
            {resetSent ? (
              <div className="text-center">
                <p className={`${headingColor} font-medium mb-2`}>Check your email</p>
                <p className={`${subColor} text-sm mb-6`}>
                  We sent a reset link to{' '}
                  <span className={headingColor}>{resetEmail}</span>.
                  Click the link to set a new password.
                </p>
                <button
                  onClick={() => { setShowReset(false); setResetSent(false); }}
                  className="w-full bg-[#D4A843] text-[#1B2A4A] font-medium py-3 rounded-lg hover:bg-[#c49a38] transition"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword}>
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <div className="mb-6">
                  <label className={`block text-sm font-medium ${labelColor} mb-2`}>Email</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-lg ${inputText} focus:outline-none transition`}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-[#D4A843] text-[#1B2A4A] font-medium py-3 rounded-lg hover:bg-[#c49a38] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowReset(false); setError(''); }}
                  className={`w-full mt-3 ${subColor} hover:${headingColor} text-sm transition`}
                >
                  Back to Sign In
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} flex items-center justify-center px-4 transition-colors duration-300`}>
      <div className="w-full max-w-md">
        <h1 className={`font-serif text-4xl ${headingColor} mb-2 text-center`}>Read to Earn</h1>
        <p className={`${subColor} text-center mb-8`}>Sign in to your account</p>

        <form onSubmit={handleLogin} className={`${cardBg} rounded-lg p-8 border ${cardBorder}`}>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className={`block text-sm font-medium ${labelColor} mb-2`}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-lg ${inputText} focus:outline-none transition`}
              required
            />
          </div>

          <div className="mb-2">
            <label htmlFor="password" className={`block text-sm font-medium ${labelColor} mb-2`}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-3 ${inputBg} border ${inputBorder} rounded-lg ${inputText} focus:outline-none transition`}
              required
            />
          </div>

          <div className="mb-6 text-right">
            <button
              type="button"
              onClick={() => { setShowReset(true); setResetEmail(email); setError(''); }}
              className={`${subColor} hover:text-[#D4A843] text-sm transition`}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#D4A843] text-[#1B2A4A] font-medium py-3 rounded-lg hover:bg-[#c49a38] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className={`mt-6 text-center ${subColor} text-sm`}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigateTo('/signup')}
              className="text-[#D4A843] hover:underline"
            >
              Sign up
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
