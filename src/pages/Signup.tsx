import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from '../hooks/useNavigate';
import { useTheme } from '../contexts/ThemeContext';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const getDaysInMonth = (month: number, year: number) =>
  new Date(year, month, 0).getDate();

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

const SUPPORTED_COUNTRIES = [
  'Argentina','Australia','Austria','Bangladesh','Belgium','Bolivia',
  'Brazil','Bulgaria','Canada','Chile','Colombia','Costa Rica','Croatia',
  'Cyprus','Czech Republic','Denmark','Ecuador','Egypt','Estonia',
  'Finland','France','Georgia','Germany','Ghana','Greece','Hong Kong',
  'Hungary','India','Indonesia','Ireland','Israel','Italy','Japan',
  'Kenya','Latvia','Lithuania','Luxembourg','Malaysia','Malta','Mexico',
  'Morocco','Nepal','Netherlands','New Zealand','Nigeria','Norway',
  'Pakistan','Peru','Philippines','Poland','Portugal','Romania',
  'Singapore','Slovakia','Slovenia','South Africa','South Korea','Spain',
  'Sri Lanka','Sweden','Switzerland','Tanzania','Thailand','Turkey',
  'Uganda','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uruguay','Vietnam','Zimbabwe',
];

// ── Phone OTP helpers (reusable for both user + parent) ───────────────────
interface PhoneVerifierState {
  phone: string;
  otpSent: boolean;
  otp: string;
  verified: boolean;
  loading: boolean;
}

const defaultVerifier = (): PhoneVerifierState => ({
  phone: '', otpSent: false, otp: '', verified: false, loading: false,
});

export const Signup = () => {
  const { isDark } = useTheme();
  const { navigateTo } = useNavigate();

  // Auth
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // DOB
  const [dobMonth, setDobMonth] = useState('');
  const [dobDay, setDobDay]     = useState('');
  const [dobYear, setDobYear]   = useState('');
  const [isMinor, setIsMinor]   = useState(false);

  // User phone verifier
  const [userPhone, setUserPhone] = useState<PhoneVerifierState>(defaultVerifier());

  // Parent phone verifier (minor only)
  const [parentPhone, setParentPhone] = useState<PhoneVerifierState>(defaultVerifier());
  const [consentTimestamp, setConsentTimestamp] = useState<string | null>(null);
  const [parentConsent, setParentConsent]       = useState(false);

  // Country + ToS
  const [country, setCountry]       = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);

  // UI
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent]     = useState(false);

  // ── Age calculation ────────────────────────────────────────────────────────
  const calculateAge = (month: number, day: number, year: number) => {
    const today = new Date();
    const dob   = new Date(year, month - 1, day);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  useEffect(() => {
    if (dobMonth && dobDay && dobYear) {
      const age = calculateAge(+dobMonth, +dobDay, +dobYear);
      setIsMinor(age >= 13 && age < 18);
    } else {
      setIsMinor(false);
    }
  }, [dobMonth, dobDay, dobYear]);

  // Reset parent phone if user is no longer minor
  useEffect(() => {
    if (!isMinor) {
      setParentPhone(defaultVerifier());
      setParentConsent(false);
      setConsentTimestamp(null);
    }
  }, [isMinor]);

  // Track consent timestamp
  useEffect(() => {
    if (parentConsent && !consentTimestamp) {
      setConsentTimestamp(new Date().toISOString());
    } else if (!parentConsent) {
      setConsentTimestamp(null);
    }
  }, [parentConsent]);

  // ── Generic OTP sender ─────────────────────────────────────────────────────
  const sendOtp = async (
    state: PhoneVerifierState,
    setState: React.Dispatch<React.SetStateAction<PhoneVerifierState>>
  ) => {
    if (!state.phone.trim()) { setError('Enter a phone number first.'); return; }
    setState((s) => ({ ...s, loading: true }));
    setError('');
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: state.phone.trim(),
    });
    if (otpError) {
      setError(otpError.message);
    } else {
      setState((s) => ({ ...s, otpSent: true }));
    }
    setState((s) => ({ ...s, loading: false }));
  };

  // ── Generic OTP verifier ───────────────────────────────────────────────────
  const verifyOtp = async (
    state: PhoneVerifierState,
    setState: React.Dispatch<React.SetStateAction<PhoneVerifierState>>
  ) => {
    if (!state.otp.trim()) { setError('Enter the code sent to your phone.'); return; }
    setState((s) => ({ ...s, loading: true }));
    setError('');
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: state.phone.trim(),
      token: state.otp.trim(),
      type: 'sms',
    });
    if (verifyError) {
      setError(verifyError.message);
    } else {
      setState((s) => ({ ...s, verified: true }));
    }
    setState((s) => ({ ...s, loading: false }));
  };

  // ── Main signup ────────────────────────────────────────────────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // DOB
    if (!dobMonth || !dobDay || !dobYear) {
      setError('Please enter your date of birth.');
      setLoading(false);
      return;
    }

    const age = calculateAge(+dobMonth, +dobDay, +dobYear);
    if (age < 13) {
      setError('You must be at least 13 years old to create an account.');
      setLoading(false);
      return;
    }

    // User phone
    if (!userPhone.verified) {
      setError('Please verify your phone number before continuing.');
      setLoading(false);
      return;
    }

    // Country
    if (!country) {
      setError('Please select your country.');
      setLoading(false);
      return;
    }
    if (!SUPPORTED_COUNTRIES.includes(country)) {
      setError('Your country is not currently supported for payouts. We only support Wise-eligible countries.');
      setLoading(false);
      return;
    }

    // ToS
    if (!tosAccepted) {
      setError('You must agree to the Terms of Service to continue.');
      setLoading(false);
      return;
    }

    // Minor checks
    if (isMinor) {
      // Parent phone must be provided and verified
      if (!parentPhone.verified) {
        setError('A parent or guardian must verify their phone number to complete signup.');
        setLoading(false);
        return;
      }
      // Parent phone must differ from user phone
      if (userPhone.phone.trim() === parentPhone.phone.trim()) {
        setError('Parent phone number must be different from your phone number.');
        setLoading(false);
        return;
      }
      // Parent consent checkbox
      if (!parentConsent) {
        setError('A parent or guardian must check the consent box to continue.');
        setLoading(false);
        return;
      }
    }

    // ── Create auth user ───────────────────────────────────────────────────
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setError('Signup failed. Please try again.');
      setLoading(false);
      return;
    }

    // ── Build profile payload ──────────────────────────────────────────────
    // NOTE: referral_code is NOT generated here.
    // It is generated when the user upgrades to a paid plan.
    // We only capture referred_by (who sent them) at signup.
    const urlParams  = new URLSearchParams(window.location.search);
    const referredBy = urlParams.get('ref') || null;

    const dob = `${dobYear}-${String(dobMonth).padStart(2, '0')}-${String(dobDay).padStart(2, '0')}`;

    const profilePayload: Record<string, any> = {
      date_of_birth:   dob,
      is_minor:        isMinor,
      phone:           userPhone.phone.trim(),
      country,
      tos_accepted_at: new Date().toISOString(),
    };

    if (referredBy) profilePayload.referred_by = referredBy;

    if (isMinor) {
      profilePayload.parent_phone      = parentPhone.phone.trim();
      profilePayload.parent_consent_at = consentTimestamp;
    }

    // ── Write profile ──────────────────────────────────────────────────────
    const { error: profileError } = await supabase
      .from('profiles')
      .update(profilePayload)
      .eq('id', userId);

    if (profileError) {
      console.error('Profile write failed after signup:', profileError);
      setError(
        'Account created but we had trouble saving your profile. ' +
        'Please contact support@readtoearn.com with your email address.'
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  const handleResend = async () => {
    setResendLoading(true);
    await supabase.auth.resend({ type: 'signup', email });
    setResendSent(true);
    setResendLoading(false);
  };

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputClass = `w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:border-[#D4A843] transition ${
    isDark
      ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
      : 'bg-white border-[#e8e0d5] text-[#1B2A4A] placeholder-gray-400'
  }`;

  const labelClass = `block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-[#6B7280]'}`;

  const daysInMonth = dobMonth && dobYear ? getDaysInMonth(+dobMonth, +dobYear) : 31;

  // ── Phone verifier block (reusable UI) ────────────────────────────────────
  const PhoneVerifierBlock = ({
    label,
    hint,
    state,
    setState,
  }: {
    label: string;
    hint?: string;
    state: PhoneVerifierState;
    setState: React.Dispatch<React.SetStateAction<PhoneVerifierState>>;
  }) => (
    <div>
      <label className={labelClass}>{label}</label>
      {hint && <p className={`text-xs mb-1.5 ${isDark ? 'text-gray-400' : 'text-[#6B7280]'}`}>{hint}</p>}
      <div className="flex gap-2">
        <input
          type="tel"
          value={state.phone}
          onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
          placeholder="+1 555 000 0000"
          disabled={state.verified}
          className={`${inputClass} flex-1`}
        />
        {!state.verified && (
          <button
            type="button"
            onClick={() => sendOtp(state, setState)}
            disabled={state.loading || state.otpSent}
            className="px-3 py-2 rounded-xl bg-[#1B2A4A] text-white text-xs font-medium hover:bg-[#243a5e] transition disabled:opacity-50 whitespace-nowrap"
          >
            {state.otpSent ? 'Resend' : state.loading ? '...' : 'Send Code'}
          </button>
        )}
        {state.verified && (
          <span className="px-3 py-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-medium flex items-center gap-1">
            ✓ Verified
          </span>
        )}
      </div>
      {state.otpSent && !state.verified && (
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={state.otp}
            onChange={(e) => setState((s) => ({ ...s, otp: e.target.value }))}
            placeholder="Enter 6-digit code"
            maxLength={6}
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={() => verifyOtp(state, setState)}
            disabled={state.loading}
            className="px-3 py-2 rounded-xl bg-[#D4A843] text-[#1B2A4A] text-xs font-medium hover:bg-[#c49a3a] transition disabled:opacity-50"
          >
            {state.loading ? '...' : 'Verify'}
          </button>
        </div>
      )}
    </div>
  );

  // ── Success screen ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
        <div className={`w-full max-w-md rounded-2xl p-8 text-center shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="text-4xl mb-4">📬</div>
          <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-[#1B2A4A]'}`}>Check your email</h2>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-300' : 'text-[#6B7280]'}`}>
            We sent a confirmation link to <strong>{email}</strong>.
          </p>
          {isMinor && (
            <p className={`text-sm mb-4 px-4 py-3 rounded-xl ${isDark ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
              Because you're under 18, your account requires parental approval. Your parent's verified number has been recorded.
            </p>
          )}
          <button
            onClick={() => navigateTo('/auth')}
            className="w-full py-2.5 rounded-xl bg-[#D4A843] text-[#1B2A4A] font-semibold text-sm hover:bg-[#c49a3a] transition mb-3"
          >
            Go to Sign In
          </button>
          <button
            onClick={handleResend}
            disabled={resendLoading || resendSent}
            className={`text-xs ${isDark ? 'text-gray-400 hover:text-white' : 'text-[#6B7280] hover:text-[#1B2A4A]'} transition`}
          >
            {resendSent ? '✓ Resent!' : resendLoading ? 'Sending...' : 'Resend confirmation email'}
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-10 ${isDark ? 'bg-[#1B2A4A]' : 'bg-[#F5F0E8]'}`}>
      <div className={`w-full max-w-md rounded-2xl p-8 shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>

        <h1 className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-[#1B2A4A]'}`}>Create your account</h1>
        <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-[#6B7280]'}`}>
          Read books. Take quizzes. Get paid.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">

          {/* Email */}
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className={inputClass}
            />
          </div>

          {/* Date of Birth */}
          <div>
            <label className={labelClass}>Date of Birth</label>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Day</option>
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
                className={inputClass}
                required
              >
                <option value="">Year</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* User phone */}
          <PhoneVerifierBlock
            label="Your Phone Number"
            hint="One account per number. Used for identity verification."
            state={userPhone}
            setState={setUserPhone}
          />

          {/* Country */}
          <div>
            <label className={labelClass}>Country</label>
            <p className={`text-xs mb-1.5 ${isDark ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              Payouts are available in Wise-supported countries only.
            </p>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className={inputClass}
            >
              <option value="">Select your country</option>
              {SUPPORTED_COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Minor: parent phone + consent */}
          {isMinor && (
            <div className={`rounded-xl border p-4 space-y-4 ${isDark ? 'border-yellow-700 bg-yellow-900/20' : 'border-yellow-300 bg-yellow-50'}`}>
              <div>
                <p className={`text-xs font-semibold mb-1 ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                  Parental verification required
                </p>
                <p className={`text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  Because you're under 18, a parent or guardian must verify their phone number. It must be different from yours.
                </p>
              </div>

              <PhoneVerifierBlock
                label="Parent / Guardian Phone Number"
                state={parentPhone}
                setState={setParentPhone}
              />

              {/* Same-number warning */}
              {parentPhone.phone.trim() &&
               userPhone.phone.trim() &&
               parentPhone.phone.trim() === userPhone.phone.trim() && (
                <p className="text-xs text-red-500">
                  Parent phone must be different from your phone number.
                </p>
              )}

              {/* Parent consent checkbox — only show after parent is verified */}
              {parentPhone.verified && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={parentConsent}
                    onChange={(e) => setParentConsent(e.target.checked)}
                    className="mt-0.5 accent-[#D4A843]"
                  />
                  <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-[#6B7280]'}`}>
                    I am the parent or legal guardian of this user. I consent to their participation in Read to Earn and agree to the{' '}
                    <a href="/terms" className="text-[#D4A843] hover:underline">Terms of Service</a>.
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Terms of Service */}
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-0.5 accent-[#D4A843]"
            />
            <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-[#6B7280]'}`}>
              I agree to the{' '}
              <a href="/terms" className="text-[#D4A843] hover:underline">Terms of Service</a>{' '}
              and confirm I am 13 or older.
            </span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !userPhone.verified}
            className="w-full py-3 rounded-xl bg-[#D4A843] text-[#1B2A4A] font-semibold text-sm hover:bg-[#c49a3a] transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className={`text-center text-xs ${isDark ? 'text-gray-400' : 'text-[#6B7280]'}`}>
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigateTo('/auth')}
              className="text-[#D4A843] hover:underline font-medium"
            >
              Sign in
            </button>
          </p>

        </form>
      </div>
    </div>
  );
};
