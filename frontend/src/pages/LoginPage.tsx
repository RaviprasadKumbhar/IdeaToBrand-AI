/**
 * LoginPage — Supabase Email and Password Authentication.
 * Clean, accessible authentication view without demo bypasses.
 */
import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/workspace';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);

    if (authError) {
      setError(authError.message || 'Failed to sign in. Please verify your credentials.');
    } else {
      navigate(from, { replace: true });
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
          Sign in to your brand workspace
        </h2>
        <p className="mt-1.5 text-xs text-ink-500">
          New to IdeaToBrand AI?{' '}
          <Link to="/signup" className="font-semibold text-accent-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card bg-white p-7 border-border shadow-card">
          {error && (
            <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <span className="font-bold text-red-500">✕</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <input
                id="login-email"
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
                <label htmlFor="login-password" className="block text-xs font-bold text-ink-700 uppercase tracking-wider">
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
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-text text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-accent-600 hover:text-accent-700 hover:underline"
              >
                Forgot your password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm font-semibold tracking-wide disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
