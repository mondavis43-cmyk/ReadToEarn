import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';

export const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { navigateTo } = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email!,
          available_balance: 0.00,
        });

      if (profileError) {
        setError('Account created but profile setup failed. Please contact support.');
        setLoading(false);
        return;
      }

      navigateTo('/');
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="font-serif text-4xl text-white mb-2 text-center">Read to Earn</h1>
        <p className="text-gray-400 text-center mb-8">Create your account</p>

        <form onSubmit={handleSignup} className="bg-[#1a1a1a] rounded-lg p-8 border border-gray-800">
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-500 transition"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <p className="mt-6 text-center text-gray-400 text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              className="text-white hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};
