/**
 * SignupPage — Supabase Account Registration.
 * Handles rate limits, account creation confirmation, and validation errors gracefully.
 * Never displays raw provider errors, internal error codes, or technical tokens.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isRateLimitError, RATE_LIMIT_CONTENT, SIGNUP_CONFIRMATION_CONTENT } from '../lib/authErrors';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide both your email and password.');
      setIsRateLimited(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setIsRateLimited(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setIsRateLimited(false);
      return;
    }

    setLoading(true);
    setError(null);
    setIsRateLimited(false);

    const cleanEmail = email.trim();
    const { error: authError, requiresVerification, session: newSession } = await signUp(
      cleanEmail,
      password,
      fullName.trim() || undefined
    );
    setLoading(false);

    if (authError) {
      if (isRateLimitError(authError)) {
        setIsRateLimited(true);
        setError(RATE_LIMIT_CONTENT.description);
      } else {
        setError(authError.message || 'Failed to create account.');
      }
    } else if (newSession?.user && newSession.user.email_confirmed_at) {
      navigate('/workspace');
    } else if (requiresVerification) {
      setRegisteredEmail(cleanEmail);
      setVerificationSent(true);
    } else {
      setRegisteredEmail(cleanEmail);
      setVerificationSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-paper-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-accent-100 selection:text-accent-700">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <span className="w-9 h-9 rounded-lg bg-gradient-to-tr from-accent-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-sm select-none">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </span>
          <span className="text-xl font-bold text-ink-950 tracking-tight">
            IdeaToBrand <span className="text-accent-600 font-extrabold">AI</span>
          </span>
        </Link>
        <h2 className="mt-4 text-2xl font-extrabold text-ink-950 tracking-tight">
          Create your brand building account
        </h2>
        <p className="mt-1.5 text-xs text-ink-500">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-accent-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card bg-white p-7 border-border shadow-card">
          {isRateLimited ? (
            <div
              role="alert"
              className="mb-5 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs select-none">
                  !
                </span>
                <h3 className="font-bold text-sm text-amber-950">{RATE_LIMIT_CONTENT.title}</h3>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed">
                {RATE_LIMIT_CONTENT.description}
              </p>
              <p className="text-[11px] text-amber-800 pt-0.5">
                {RATE_LIMIT_CONTENT.subtext}
              </p>
            </div>
          ) : error ? (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex flex-col gap-2">
              <div className="flex items-start gap-2">
                <span className="font-bold text-red-500 select-none">✕</span>
                <span>{error}</span>
              </div>
              {error.includes('already exists') && (
                <div className="flex items-center gap-3 pt-1 border-t border-red-200/60 mt-0.5">
                  <Link
                    to="/login"
                    className="font-bold text-accent-700 hover:underline"
                  >
                    Sign in with this email →
                  </Link>
                  <span className="text-red-300 select-none">•</span>
                  <Link
                    to="/forgot-password"
                    className="text-ink-600 hover:text-ink-900 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>
          ) : null}

          {verificationSent ? (
            <div className="text-center py-5 space-y-4">
              <div className="w-12 h-12 rounded-full bg-accent-50 text-accent-600 border border-accent-200 flex items-center justify-center mx-auto text-xl shadow-xs select-none">
                ✉
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink-950 tracking-tight">
                  {SIGNUP_CONFIRMATION_CONTENT.title}
                </h3>
                <p className="mt-2 text-xs text-ink-600">
                  {SIGNUP_CONFIRMATION_CONTENT.sentText}
                </p>
                <div className="mt-1.5 inline-block px-3 py-1 bg-ink-50 rounded-md font-mono text-xs text-ink-900 border border-ink-200 font-semibold select-all">
                  {registeredEmail || email}
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-paper-100 border border-border text-left space-y-1.5 text-xs text-ink-600">
                <p className="text-ink-700 font-medium">
                  {SIGNUP_CONFIRMATION_CONTENT.instruction}
                </p>
                <p className="text-ink-500 text-[11px]">
                  {SIGNUP_CONFIRMATION_CONTENT.warning}
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <Link
                  to={`/verify-email?email=${encodeURIComponent(registeredEmail || email)}`}
                  state={{ email: registeredEmail || email }}
                  className="btn-primary w-full py-2.5 text-xs font-semibold text-center block shadow-xs"
                >
                  Go to Verification Screen →
                </Link>
                <Link
                  to="/login"
                  className="btn-secondary w-full py-2 text-xs font-medium text-center block text-ink-600"
                >
                  Proceed to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="signup-name" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                  Full name (optional)
                </label>
                <input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Founder"
                  className="input-text text-sm"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@example.com"
                  className="input-text text-sm"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="signup-password" className="block text-xs font-bold text-ink-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-accent-600 hover:text-accent-700 font-medium cursor-pointer"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="input-text text-sm"
                />
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                  Confirm password
                </label>
                <input
                  id="signup-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-text text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-sm font-semibold tracking-wide disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
