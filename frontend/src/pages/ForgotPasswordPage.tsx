/**
 * ForgotPasswordPage — Triggers Supabase password reset email.
 */
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: resetError } = await resetPassword(email.trim());
    setLoading(false);

    if (resetError) {
      setError(resetError.message || 'Unable to send password reset link.');
    } else {
      setSuccess(true);
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
          Reset your password
        </h2>
        <p className="mt-1.5 text-xs text-ink-500">
          Remember your credentials?{' '}
          <Link to="/login" className="font-semibold text-accent-600 hover:underline">
            Back to sign in
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

          {success ? (
            <div className="text-center py-4 space-y-3">
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center justify-center mx-auto text-lg">
                ✓
              </div>
              <h3 className="text-base font-bold text-ink-950">Reset Link Dispatched</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                If an account exists for <strong>{email}</strong>, you will receive an email containing a secure link to update your password.
              </p>
              <div className="pt-2">
                <Link to="/login" className="btn-secondary w-full py-2.5 text-xs font-semibold inline-block text-center">
                  ← Return to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-bold text-ink-700 uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@example.com"
                  className="input-text text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-2.5 text-sm font-semibold tracking-wide disabled:opacity-50 mt-2"
              >
                {loading ? 'Sending link...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
