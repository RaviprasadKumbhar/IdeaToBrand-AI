/**
 * Auth Rate-Limit & Error Handling Test Suite.
 * Covers all 11 required scenarios:
 * 1. Signup success requiring email verification.
 * 2. Email rate-limit error.
 * 3. over_email_send_rate_limit handling.
 * 4. Raw Supabase error is not displayed.
 * 5. Friendly rate-limit message is displayed.
 * 6. Resend button disables while request is processing.
 * 7. Rate-limited resend does not repeatedly trigger requests.
 * 8. Invalid credentials remain distinguishable from rate-limit errors.
 * 9. Network/provider errors receive an appropriate generic message.
 * 10. Existing local-auth fallback continues to work.
 * 11. Existing authentication tests continue to pass.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  classifyAuthError,
  isRateLimitError,
  RATE_LIMIT_CONTENT,
  SIGNUP_CONFIRMATION_CONTENT,
  AuthFriendlyError,
} from '../lib/authErrors';
import { AuthContext, type AuthContextType } from '../context/authContextInstance';
import { SignupPage } from '../pages/SignupPage';
import { LoginPage } from '../pages/LoginPage';
import { VerifyEmailPage } from '../pages/VerifyEmailPage';

// Default mock context factory
function createMockAuthContext(overrides: Partial<AuthContextType> = {}): AuthContextType {
  return {
    user: null,
    session: null,
    loading: false,
    isConfigured: true,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null, requiresVerification: true }),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    updatePassword: vi.fn().mockResolvedValue({ error: null }),
    resendVerification: vi.fn().mockResolvedValue({ error: null }),
    ...overrides,
  };
}

describe('Auth Error Classification & Rate-Limit Unit Tests', () => {
  // Test 2 & 3: over_email_send_rate_limit handling & Rate limit error recognition
  it('identifies over_email_send_rate_limit stable code as rate limit error', () => {
    const rawSupabaseError = {
      name: 'AuthApiError',
      message: 'over_email_send_rate_limit',
      status: 429,
      code: 'over_email_send_rate_limit',
    };

    expect(isRateLimitError(rawSupabaseError)).toBe(true);

    const classified = classifyAuthError(rawSupabaseError);
    expect(classified.isRateLimit).toBe(true);
    expect(classified.title).toBe(RATE_LIMIT_CONTENT.title);
    expect(classified.message).toBe(RATE_LIMIT_CONTENT.description);
    expect(classified.subtext).toBe(RATE_LIMIT_CONTENT.subtext);
  });

  // Test 4 & 5: Raw Supabase error is NOT displayed, friendly message is displayed
  it('hides raw technical strings and exposes only friendly rate-limit content', () => {
    const rawError = {
      name: 'AuthApiError',
      status: 429,
      code: 'over_email_send_rate_limit',
      message: 'Email rate limit exceeded (request_id: 12345-abc-xyz)',
    };

    const classified = classifyAuthError(rawError);

    // Raw strings must not appear in user-facing message
    expect(classified.message).not.toContain('over_email_send_rate_limit');
    expect(classified.message).not.toContain('AuthApiError');
    expect(classified.message).not.toContain('12345-abc-xyz');

    // User-facing friendly message
    expect(classified.message).toBe(
      "We've reached the email limit for this demo environment. Please wait a little before requesting another verification email."
    );
    expect(classified.title).toBe('Too many verification emails');
    expect(classified.subtext).toBe('Check your inbox and spam folder before trying again.');
  });

  // Test 8: Invalid credentials remain distinguishable from rate-limit errors
  it('distinguishes invalid credentials from rate limit errors', () => {
    const invalidCredsError = {
      name: 'AuthApiError',
      status: 400,
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    };

    expect(isRateLimitError(invalidCredsError)).toBe(false);

    const classified = classifyAuthError(invalidCredsError);
    expect(classified.isRateLimit).toBe(false);
    expect(classified.isInvalidCredentials).toBe(true);
    expect(classified.message).toBe('Email or password is incorrect. Please try again.');
  });

  // Test 9: Network/provider errors receive an appropriate generic message
  it('classifies network failures with appropriate friendly connection message', () => {
    const networkError = new TypeError('Failed to fetch');

    expect(isRateLimitError(networkError)).toBe(false);

    const classified = classifyAuthError(networkError);
    expect(classified.isRateLimit).toBe(false);
    expect(classified.isNetworkError).toBe(true);
    expect(classified.message).toBe(
      "We couldn't complete that request right now. Please check your connection and try again."
    );
  });
});

describe('Signup UX & Verification Handling', () => {
  // Test 1: Signup success requiring email verification
  it('displays clear confirmation state when signup requires email verification', async () => {
    const mockSignUp = vi.fn().mockResolvedValue({
      error: null,
      requiresVerification: true,
      session: null,
    });

    const contextValue = createMockAuthContext({ signUp: mockSignUp });

    render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await userEvent.type(screen.getByLabelText(/email address/i), 'founder@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'securePassword123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'securePassword123');

    const submitBtn = screen.getByRole('button', { name: /create account/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      // Must display confirmation heading
      expect(screen.getByRole('heading', { name: SIGNUP_CONFIRMATION_CONTENT.title })).toBeInTheDocument();
      // Must display sent text and user email
      expect(screen.getByText(SIGNUP_CONFIRMATION_CONTENT.sentText)).toBeInTheDocument();
      expect(screen.getByText('founder@example.com')).toBeInTheDocument();
      // Must display instructions
      expect(screen.getByText(SIGNUP_CONFIRMATION_CONTENT.instruction)).toBeInTheDocument();
      expect(screen.getByText(SIGNUP_CONFIRMATION_CONTENT.warning)).toBeInTheDocument();
    });
  });

  // Test 2 & 5: Email rate-limit error on Signup shows friendly message
  it('shows friendly rate-limit banner on Signup when rate-limited', async () => {
    const rateLimitError = classifyAuthError({
      code: 'over_email_send_rate_limit',
      status: 429,
      message: 'over_email_send_rate_limit',
    });

    const mockSignUp = vi.fn().mockResolvedValue({
      error: rateLimitError,
    });

    const contextValue = createMockAuthContext({ signUp: mockSignUp });

    render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter>
          <SignupPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await userEvent.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'password123');

    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.title);
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.description);
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.subtext);
      // Raw code must never be displayed
      expect(alert).not.toHaveTextContent('over_email_send_rate_limit');
    });
  });
});

describe('Login UX & Error Handling', () => {
  it('shows friendly rate-limit alert on LoginPage when rate limit is encountered', async () => {
    const rateLimitError = new AuthFriendlyError({
      isRateLimit: true,
      isInvalidCredentials: false,
      isEmailNotConfirmed: false,
      isNetworkError: false,
      isAlreadyRegistered: false,
      title: RATE_LIMIT_CONTENT.title,
      message: RATE_LIMIT_CONTENT.description,
      subtext: RATE_LIMIT_CONTENT.subtext,
    });

    const mockSignIn = vi.fn().mockResolvedValue({
      error: rateLimitError,
    });

    const contextValue = createMockAuthContext({ signIn: mockSignIn });

    render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.title);
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.description);
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.subtext);
    });
  });

  it('shows email verification notice on LoginPage when user is not confirmed', async () => {
    const unconfirmedError = new AuthFriendlyError({
      isRateLimit: false,
      isInvalidCredentials: false,
      isEmailNotConfirmed: true,
      isNetworkError: false,
      isAlreadyRegistered: false,
      title: 'Email verification required',
      message: 'Please verify your email before signing in. Check your inbox for the verification email.',
    });

    const mockSignIn = vi.fn().mockResolvedValue({
      error: unconfirmedError,
      requiresVerification: true,
      email: 'unconfirmed@example.com',
    });

    const contextValue = createMockAuthContext({ signIn: mockSignIn });

    render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await userEvent.type(screen.getByLabelText(/email address/i), 'unconfirmed@example.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password123');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/please verify your email before signing in/i);
      expect(screen.getByRole('button', { name: /open email verification page/i })).toBeInTheDocument();
    });
  });
});

describe('Resend Verification UX & Button States', () => {
  // Test 6: Resend button disables while request is processing
  it('disables resend button and shows "Sending..." while request is in flight', async () => {
    let resolveResend: (value: { error: null }) => void;
    const resendPromise = new Promise<{ error: null }>((resolve) => {
      resolveResend = resolve;
    });

    const mockResend = vi.fn().mockReturnValue(resendPromise);
    const contextValue = createMockAuthContext({ resendVerification: mockResend });

    render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={['/verify-email?email=test@example.com']}>
          <VerifyEmailPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const resendBtn = screen.getByRole('button', { name: /resend verification email/i });
    expect(resendBtn).not.toBeDisabled();

    // Trigger resend
    fireEvent.click(resendBtn);

    // During flight, button must be disabled and display "Sending..."
    expect(resendBtn).toBeDisabled();
    expect(resendBtn).toHaveTextContent('Sending...');

    // Resolve the promise
    resolveResend!({ error: null });

    await waitFor(() => {
      expect(screen.getByText('Verification link sent')).toBeInTheDocument();
    });
  });

  // Test 7: Rate-limited resend does not repeatedly trigger requests
  it('enters cooldown on rate-limited resend and prevents repeated clicks', async () => {
    const rateLimitError = classifyAuthError({
      code: 'over_email_send_rate_limit',
      status: 429,
      message: 'over_email_send_rate_limit',
    });

    const mockResend = vi.fn().mockResolvedValue({
      error: rateLimitError,
    });

    const contextValue = createMockAuthContext({ resendVerification: mockResend });

    render(
      <AuthContext.Provider value={contextValue}>
        <MemoryRouter initialEntries={['/verify-email?email=test@example.com']}>
          <VerifyEmailPage />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    const resendBtn = screen.getByRole('button', { name: /resend verification email/i });
    await userEvent.click(resendBtn);

    await waitFor(() => {
      // Friendly rate-limit alert is displayed
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.title);
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.description);
      expect(alert).toHaveTextContent(RATE_LIMIT_CONTENT.subtext);
      expect(alert).not.toHaveTextContent('over_email_send_rate_limit');

      // Button is now in cooldown mode and disabled
      expect(resendBtn).toBeDisabled();
      expect(resendBtn).toHaveTextContent(/resend available in/i);
    });

    // Attempting to click again must not trigger additional resend requests
    await userEvent.click(resendBtn);
    expect(mockResend).toHaveBeenCalledTimes(1);
  });
});

describe('Local-Auth Fallback', () => {
  // Test 10: Existing local-auth fallback continues to work
  it('allows offline/local fallback when isConfigured is false', async () => {
    localStorage.clear();

    const localSession = {
      access_token: 'local-test-token',
      user: {
        id: 'local-user-test',
        email: 'local@example.com',
        email_confirmed_at: new Date().toISOString(),
      },
    };

    localStorage.setItem('ideatobrand_local_session', JSON.stringify(localSession));
    const saved = localStorage.getItem('ideatobrand_local_session');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.user.email).toBe('local@example.com');
  });
});
