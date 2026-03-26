import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const { navigateTo } = useNavigate();

  useEffect(() => {
    // Supabase puts the token in the URL hash when redirecting
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

  if (success) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800">
            <p className="text-green-400 font-medium text-lg mb-2">Password updated!</p>
            <p className="text-gray-400 text-sm">Taking you to the library...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!validSession) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800">
            <p className="text-gray-400 text-sm mb-4">Waiting for reset link verification...</p>
            <p className="text-gray-500 text-xs">If you didn't come from a reset email, this page won't work.</p>
            <button
              onClick={() => navigateTo('/login')}
              className="mt-6 text-white hover:underline text-sm"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-serif text-4xl text-white mb-2 text-center">Read to Earn</h1>
        <p className="text-gray-400 text-center mb-8">Set a new password</p>

        <form onSubmit={handleReset} className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
              required
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
