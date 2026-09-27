/**
 * Auth Error Classification and User-Friendly Messaging.
 * Normalizes Supabase Auth errors, preventing exposure of internal codes,
 * stack traces, or technical details, while providing actionable, clear messages.
 */

export interface AuthErrorDetails {
  isRateLimit: boolean;
  isInvalidCredentials: boolean;
  isEmailNotConfirmed: boolean;
  isNetworkError: boolean;
  isAlreadyRegistered: boolean;
  title?: string;
  message: string;
  subtext?: string;
}

export const RATE_LIMIT_CONTENT = {
  title: 'Too many verification emails',
  description: "We've reached the email limit for this demo environment. Please wait a little before requesting another verification email.",
  subtext: 'Check your inbox and spam folder before trying again.',
} as const;

export const PASSWORD_RESET_RATE_LIMIT_CONTENT = {
  title: 'Too many password reset requests',
  description: "We've reached the email limit for this environment. Please wait at least 60 seconds before requesting another password reset link.",
  subtext: 'Check your inbox and spam folder before trying again, or sign in directly if your credentials are valid.',
} as const;

export const SIGNUP_CONFIRMATION_CONTENT = {
  title: 'Check your email',
  heading: 'Check your email',
  sentText: "We've sent a verification link to:",
  instruction: 'Please check your inbox and spam folder.',
  warning: 'If the email does not arrive, wait before requesting another one.',
} as const;

export class AuthFriendlyError extends Error {
  readonly isRateLimit: boolean;
  readonly isInvalidCredentials: boolean;
  readonly isEmailNotConfirmed: boolean;
  readonly isNetworkError: boolean;
  readonly isAlreadyRegistered: boolean;
  readonly title?: string;
  readonly subtext?: string;
  readonly rawCode?: string;

  constructor(details: AuthErrorDetails, rawCode?: string) {
    super(details.message);
    this.name = 'AuthFriendlyError';
    this.isRateLimit = details.isRateLimit;
    this.isInvalidCredentials = details.isInvalidCredentials;
    this.isEmailNotConfirmed = details.isEmailNotConfirmed;
    this.isNetworkError = details.isNetworkError;
    this.isAlreadyRegistered = details.isAlreadyRegistered;
    this.title = details.title;
    this.subtext = details.subtext;
    this.rawCode = rawCode;
  }
}

export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof AuthFriendlyError) {
    return err.isRateLimit;
  }

  if (typeof err === 'string') {
    const lower = err.toLowerCase();
    return (
      lower.includes('over_email_send_rate_limit') ||
      lower.includes('email rate limit exceeded') ||
      lower.includes('email_rate_limit_exceeded') ||
      lower.includes('rate_limit_exceeded') ||
      lower.includes('too many verification emails') ||
      lower.includes('too many requests') ||
      (lower.includes('rate') && lower.includes('limit'))
    );
  }

  if (typeof err === 'object') {
    const errorObj = err as Record<string, unknown>;
    if (errorObj.isRateLimit === true) return true;

    const code = String(errorObj.code || errorObj.error || '').toLowerCase();
    if (
      code === 'over_email_send_rate_limit' ||
      code === 'email_rate_limit_exceeded' ||
      code === 'rate_limit_exceeded' ||
      code === 'over_request_rate_limit' ||
      code === '429'
    ) {
      return true;
    }

    if (errorObj.status === 429 || errorObj.statusCode === 429) {
      return true;
    }

    const message = String(errorObj.message || errorObj.error_description || '').toLowerCase();
    if (
      message.includes('over_email_send_rate_limit') ||
      message.includes('email rate limit exceeded') ||
      message.includes('rate limit exceeded') ||
      message.includes('too many verification emails') ||
      message.includes('too many requests') ||
      (message.includes('too many') && message.includes('email')) ||
      (message.includes('rate') && message.includes('limit'))
    ) {
      return true;
    }
  }
  return false;
}

export function classifyAuthError(
  err: unknown,
  context?: 'verification' | 'reset' | 'general'
): AuthFriendlyError {
  if (err instanceof AuthFriendlyError) {
    return err;
  }

  // 1. Rate-limit check (by stable code, HTTP status, or error message)
  if (isRateLimitError(err)) {
    const isReset = context === 'reset';
    return new AuthFriendlyError({
      isRateLimit: true,
      isInvalidCredentials: false,
      isEmailNotConfirmed: false,
      isNetworkError: false,
      isAlreadyRegistered: false,
      title: isReset ? PASSWORD_RESET_RATE_LIMIT_CONTENT.title : RATE_LIMIT_CONTENT.title,
      message: isReset ? PASSWORD_RESET_RATE_LIMIT_CONTENT.description : RATE_LIMIT_CONTENT.description,
      subtext: isReset ? PASSWORD_RESET_RATE_LIMIT_CONTENT.subtext : RATE_LIMIT_CONTENT.subtext,
    });
  }

  const rawObj = (typeof err === 'object' && err !== null ? err : {}) as Record<string, unknown>;
  const rawMsg = typeof rawObj.message === 'string' ? rawObj.message : (typeof err === 'string' ? err : '');
  const lowerMsg = rawMsg.toLowerCase();
  const rawCode = typeof rawObj.code === 'string' ? rawObj.code : (typeof rawObj.error === 'string' ? rawObj.error : '');
  const lowerCode = rawCode.toLowerCase();
  const status = typeof rawObj.status === 'number' ? rawObj.status : Number(rawObj.statusCode);

  // 2. Email not confirmed
  if (
    lowerCode === 'email_not_confirmed' ||
    lowerMsg.includes('email not confirmed') ||
    lowerMsg.includes('verify your email')
  ) {
    return new AuthFriendlyError({
      isRateLimit: false,
      isInvalidCredentials: false,
      isEmailNotConfirmed: true,
      isNetworkError: false,
      isAlreadyRegistered: false,
      title: 'Email verification required',
      message: 'Please verify your email before signing in. Check your inbox for the verification email.',
    });
  }

  // 3. Invalid credentials
  if (
    lowerCode === 'invalid_credentials' ||
    lowerCode === 'invalid_grant' ||
    lowerMsg.includes('invalid login credentials') ||
    lowerMsg.includes('invalid credentials') ||
    lowerMsg.includes('invalid email or password') ||
    lowerMsg.includes('email or password is incorrect') ||
    lowerMsg.includes('wrong password')
  ) {
    return new AuthFriendlyError({
      isRateLimit: false,
      isInvalidCredentials: true,
      isEmailNotConfirmed: false,
      isNetworkError: false,
      isAlreadyRegistered: false,
      title: 'Invalid credentials',
      message: 'Email or password is incorrect. Please try again.',
    });
  }

  // 4. User already exists / registered
  if (
    lowerMsg.includes('already exists') ||
    lowerMsg.includes('already registered') ||
    lowerCode === 'user_already_exists'
  ) {
    return new AuthFriendlyError({
      isRateLimit: false,
      isInvalidCredentials: false,
      isEmailNotConfirmed: false,
      isNetworkError: false,
      isAlreadyRegistered: true,
      title: 'Account already exists',
      message: 'An account with this email already exists. Please sign in with your password, or use "Forgot password" to reset it.',
    });
  }

  // 5. Network / provider connection problem
  if (
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('network') ||
    lowerMsg.includes('fetch failed') ||
    lowerMsg.includes('connection') ||
    lowerMsg.includes('timeout') ||
    lowerMsg.includes('aborterror') ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return new AuthFriendlyError({
      isRateLimit: false,
      isInvalidCredentials: false,
      isEmailNotConfirmed: false,
      isNetworkError: true,
      isAlreadyRegistered: false,
      title: 'Connection issue',
      message: "We couldn't complete that request right now. Please check your connection and try again.",
    });
  }

  // 6. Generic safe fallback — NEVER expose raw code or internal strings
  return new AuthFriendlyError({
    isRateLimit: false,
    isInvalidCredentials: false,
    isEmailNotConfirmed: false,
    isNetworkError: false,
    isAlreadyRegistered: false,
    title: 'Authentication notice',
    message: 'We were unable to complete this authentication request. Please verify your details and try again.',
  });
}
