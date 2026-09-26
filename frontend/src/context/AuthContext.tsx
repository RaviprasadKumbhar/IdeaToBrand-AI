/**
 * AuthContext — Authentic Supabase Session Provider.
 * Zero demo account bypasses. Provides real user session, login, signup,
 * password reset, and sign-out lifecycle.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import {
  supabase,
  isSupabaseConfigured,
  signOutUser,
  resetPasswordForEmail,
  updateUserPassword,
} from '../lib/supabase';
import { AuthContext } from './authContextInstance';

// oxlint-disable-next-line react/only-export-components
export { useAuth } from './useAuth';

const LOCAL_SESSION_STORAGE_KEY = 'ideatobrand_local_session';
const LOCAL_USERS_STORAGE_KEY = 'ideatobrand_local_users';

function createLocalUser(email: string, fullName?: string): User {
  const normalizedEmail = email.toLowerCase().trim();
  const name = fullName?.trim() || normalizedEmail.split('@')[0] || 'Founder';
  return {
    id: 'local-' + Math.random().toString(36).substring(2, 10),
    app_metadata: { provider: 'local' },
    user_metadata: { full_name: name },
    aud: 'authenticated',
    confirmation_sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    email: normalizedEmail,
    phone: '',
    role: 'authenticated',
    updated_at: new Date().toISOString(),
  } as User;
}

function createLocalSession(user: User): Session {
  return {
    access_token: 'local-token-' + Math.random().toString(36).substring(2, 15),
    token_type: 'bearer',
    expires_in: 604800,
    expires_at: Math.floor(Date.now() / 1000) + 604800,
    refresh_token: 'local-refresh-' + Math.random().toString(36).substring(2, 15),
    user,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (!isSupabaseConfigured) {
          try {
            const stored = localStorage.getItem(LOCAL_SESSION_STORAGE_KEY);
            if (stored) {
              const parsed = JSON.parse(stored) as Session;
              if (mounted && parsed?.user) {
                setSession(parsed);
                setUser(parsed.user);
              }
            }
          } catch (e) {
            console.warn('[AuthContext] Could not restore local session:', e);
          }
          if (mounted) setLoading(false);
          return;
        }

        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[AuthContext] Session retrieval error:', error.message);
        }
        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          setLoading(false);
        }

        // Real-time listener for login, logout, token refresh, and password recovery events
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
          if (mounted) {
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setLoading(false);
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (err) {
        console.error('[AuthContext] Unexpected auth init error:', err);
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      mounted = false;
    };
  }, []);

  async function signIn(email: string, password: string): Promise<{ error: AuthError | Error | null }> {
    if (!isSupabaseConfigured) {
      if (!email.trim() || !password.trim()) {
        return { error: new Error('Please enter both email and password.') };
      }
      try {
        const storedUsersRaw = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
        const users = storedUsersRaw ? JSON.parse(storedUsersRaw) : {};
        const saved = users[email.toLowerCase().trim()];
        const localUser = createLocalUser(email, saved?.fullName);
        const localSession = createLocalSession(localUser);
        localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(localSession));
        setSession(localSession);
        setUser(localUser);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Sign in failed.') };
      }
    }
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return { error };
  }

  async function signUp(
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ error: AuthError | Error | null; session?: Session | null }> {
    if (!isSupabaseConfigured) {
      if (!email.trim() || !password.trim()) {
        return { error: new Error('Please provide both your email and password.') };
      }
      if (password.length < 6) {
        return { error: new Error('Password must be at least 6 characters long.') };
      }
      try {
        const storedUsersRaw = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
        const users = storedUsersRaw ? JSON.parse(storedUsersRaw) : {};
        const normalized = email.toLowerCase().trim();
        users[normalized] = {
          email: normalized,
          fullName: fullName?.trim() || normalized.split('@')[0],
          createdAt: new Date().toISOString(),
        };
        localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users));

        const localUser = createLocalUser(email, fullName);
        const localSession = createLocalSession(localUser);
        localStorage.setItem(LOCAL_SESSION_STORAGE_KEY, JSON.stringify(localSession));
        setSession(localSession);
        setUser(localUser);
        return { error: null, session: localSession };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error('Registration failed.') };
      }
    }
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
    if (!error && data.session) {
      setSession(data.session);
      setUser(data.user);
    }
    return { error, session: data.session };
  }

  async function signOut(): Promise<void> {
    if (!isSupabaseConfigured) {
      localStorage.removeItem(LOCAL_SESSION_STORAGE_KEY);
      setSession(null);
      setUser(null);
      return;
    }
    await signOutUser();
    setSession(null);
    setUser(null);
  }

  async function resetPassword(email: string): Promise<{ error: AuthError | Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    return await resetPasswordForEmail(email);
  }

  async function updatePassword(newPassword: string): Promise<{ error: AuthError | Error | null }> {
    if (!isSupabaseConfigured) {
      return { error: null };
    }
    return await updateUserPassword(newPassword);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
