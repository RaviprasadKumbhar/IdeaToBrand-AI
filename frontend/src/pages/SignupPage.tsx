/**
 * SignupPage — Supabase Account Registration.
 * Supports email, password, full name metadata, and client validation.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function SignupPage() {
  const navigate = useNavigate();
  const { signUp, signInDemo, isConfigured } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide your email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await signUp(email.trim(), password, fullName.trim() || undefined);
    setLoading(false);

    if (authError) {
      setError(authError.message || 'Failed to create account.');
    } else {
      navigate('/workspace');
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
          {!isConfigured && (
            <div className="mb-5 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <span>ℹ</span> Supabase Environment Notice
              </p>
              <p>
                <code className="bg-amber-100/60 px-1 py-0.5 rounded text-[11px]">VITE_SUPABASE_ANON_KEY</code> is not yet configured. You can use <strong>Instant Demo Sign In</strong> to test immediately.
              </p>
            </div>
          )}

          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span className="font-bold text-red-500">✕</span>
              <span>{error}</span>
            </div>
          )}

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
              className="btn-primary w-full py-2.5 text-sm font-semibold tracking-wide disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {/* Quick Demo Access Option */}
          <div className="mt-5 pt-5 border-t border-border">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                await signInDemo(fullName ? `${fullName.toLowerCase().replace(/\s+/g, '')}@demo.ai` : undefined);
                setLoading(false);
                navigate('/workspace');
              }}
              disabled={loading}
              className="w-full btn-secondary py-2 text-xs font-semibold text-accent-700 border-indigo-100 hover:bg-accent-100/50"
            >
              ⚡ Instant Demo Sign In (Explore Workspace)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
