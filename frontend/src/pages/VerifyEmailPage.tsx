/**
 * VerifyEmailPage — Dedicated Email Verification Experience.
 * Handles pending email confirmation, verification callbacks, resend cooldown,
 * and rate-limit error messaging without exposing raw provider details.
 */
import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isUserEmailConfirmed } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { isRateLimitError, RATE_LIMIT_CONTENT, SIGNUP_CONFIRMATION_CONTENT } from '../lib/authErrors';

export function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, resendVerification } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const emailFromQuery = queryParams.get('email');
  const emailFromState = (location.state as { email?: string })?.email;
  const initialEmail = emailFromState || emailFromQuery || user?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<{
    type: 'success' | 'error' | 'rate_limit';
    title?: string;
    message: string;
    subtext?: string;
  } | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  // Check if current user is already confirmed or just got confirmed via callback token
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    if (user && isUserEmailConfirmed(user)) {
      setIsVerified(true);
      return;
    }

    // 1. Check for error in hash or query parameters (e.g. invalid or expired token)
    const hash = window.location.hash;
    const search = window.location.search;
    const allParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : search);
    const errorDesc = allParams.get('error_description');
    if (errorDesc) {
      setLinkError(decodeURIComponent(errorDesc.replace(/\+/g, ' ')));
    }

    // 2. Check for PKCE flow query parameter (?code=...)
    const code = queryParams.get('code');
    if (code) {
      setVerifyingToken(true);
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        setVerifyingToken(false);
        if (!error && data?.session?.user && isUserEmailConfirmed(data.session.user)) {
          setIsVerified(true);
        } else if (error) {
          setLinkError(error.message || 'Verification link is invalid or has expired.');
        }
      });
      return;
    }

    // 3. Check for hash parameters from confirmation email link (e.g. #access_token=...&type=signup)
    if (hash && (hash.includes('access_token') || hash.includes('type=signup') || hash.includes('type=email_change'))) {
      setVerifyingToken(true);
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        setVerifyingToken(false);
        if (!error && session?.user && isUserEmailConfirmed(session.user)) {
          setIsVerified(true);
        } else if (error) {
          setLinkError(error.message || 'Verification link is invalid or has expired.');
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!email.trim() || cooldown > 0 || resending) return;

    setResending(true);
    setResendStatus(null);

    const { error } = await resendVerification(email.trim());
    setResending(false);

    if (error) {
      if (isRateLimitError(error)) {
        // Enforce frontend cooldown to prevent accidental repeated clicks
        setCooldown((prev) => (prev > 0 ? prev : 60));
        setResendStatus({
          type: 'rate_limit',
          title: RATE_LIMIT_CONTENT.title,
          message: RATE_LIMIT_CONTENT.description,
          subtext: RATE_LIMIT_CONTENT.subtext,
        });
      } else {
        setResendStatus({
          type: 'error',
          title: 'Unable to resend',
          message: error.message || "We couldn't complete that request right now. Please check your connection and try again.",
        });
      }
    } else {
      setCooldown(60);
      setResendStatus({
        type: 'success',
        title: 'Verification link sent',
        message: 'A fresh verification email has been requested. Please check your inbox and spam folder.',
      });
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
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="card bg-white p-8 border-border shadow-card text-center">
          {verifyingToken ? (
            <div className="py-8 space-y-4">
              <div className="w-10 h-10 rounded-full border-2 border-accent-600 border-t-transparent animate-spin mx-auto" />
              <h2 className="text-lg font-bold text-ink-950">Verifying your email...</h2>
              <p className="text-xs text-ink-500">Checking your verification link with Supabase.</p>
            </div>
          ) : isVerified ? (
            <div className="py-4 space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 border border-green-200 flex items-center justify-center mx-auto text-2xl shadow-sm select-none">
                ✓
              </div>
              <h2 className="text-xl font-extrabold text-ink-950 tracking-tight">
                Email Verified Successfully!
              </h2>
              <p className="text-xs text-ink-600 leading-relaxed max-w-sm mx-auto">
                Your email ownership has been verified with Supabase Auth. Your brand workspace is now unlocked and ready.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/workspace', { replace: true })}
                  className="btn-primary w-full py-3 text-sm font-semibold tracking-wide shadow-sm"
                >
                  Continue to Brand Workspace →
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="w-14 h-14 rounded-full bg-accent-50 text-accent-600 border border-accent-200 flex items-center justify-center mx-auto text-2xl shadow-sm select-none">
                ✉
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-ink-950 tracking-tight">
                  {SIGNUP_CONFIRMATION_CONTENT.title}
                </h2>
                <p className="mt-2 text-xs text-ink-600 leading-relaxed">
                  {SIGNUP_CONFIRMATION_CONTENT.sentText}
                </p>
                <div className="mt-1.5 inline-block px-3 py-1 bg-ink-50 rounded-md font-mono text-xs text-ink-900 border border-ink-200 font-semibold select-all">
                  {email || 'your registered email'}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-paper-100 border border-border text-left space-y-2 text-xs text-ink-600">
                <p className="font-semibold text-ink-800">
                  {SIGNUP_CONFIRMATION_CONTENT.instruction}
                </p>
                <p className="text-ink-500 text-[11px]">
                  {SIGNUP_CONFIRMATION_CONTENT.warning}
                </p>
              </div>

              {linkError && (
                <div role="alert" className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2 text-left">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-amber-600 select-none">Notice:</span>
                    <span>{linkError}</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    If your account was already confirmed previously, you can sign in directly with your password.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/login"
                      className="btn-primary w-full py-2 text-xs font-semibold text-center block"
                    >
                      Proceed to Sign In →
                    </Link>
                  </div>
                </div>
              )}

              {resendStatus && (
                <div
                  role="alert"
                  className={`p-3.5 rounded-lg text-xs text-left ${
                    resendStatus.type === 'rate_limit'
                      ? 'bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5'
                      : resendStatus.type === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800 flex items-start gap-2'
                      : 'bg-red-50 border border-red-200 text-red-700 flex items-start gap-2'
                  }`}
                >
                  {resendStatus.type === 'rate_limit' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs select-none">
                          !
                        </span>
                        <h3 className="font-bold text-sm text-amber-950">
                          {resendStatus.title || RATE_LIMIT_CONTENT.title}
                        </h3>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        {resendStatus.message}
                      </p>
                      {resendStatus.subtext && (
                        <p className="text-[11px] text-amber-800 pt-0.5">
                          {resendStatus.subtext}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="select-none font-bold">
                        {resendStatus.type === 'success' ? '✓' : '✕'}
                      </span>
                      <div className="space-y-0.5">
                        {resendStatus.title && (
                          <p className="font-semibold text-xs text-green-900">
                            {resendStatus.title}
                          </p>
                        )}
                        <span>{resendStatus.message}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="pt-2 space-y-2">
                {!email && (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="input-text text-xs mb-2"
                  />
                )}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending || !email.trim()}
                  className="btn-secondary w-full py-2.5 text-xs font-semibold tracking-wide disabled:opacity-50"
                >
                  {resending
                    ? 'Sending...'
                    : cooldown > 0
                    ? `Resend available in ${cooldown}s`
                    : 'Resend verification email'}
                </button>

                <div className="pt-3 border-t border-border mt-3 space-y-2 text-center">
                  <p className="text-[11px] text-ink-500">
                    Already confirmed your email?
                  </p>
                  <Link
                    to="/login"
                    className="btn-primary w-full py-2.5 text-xs font-semibold block text-center shadow-xs"
                  >
                    Sign In to Your Account →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
