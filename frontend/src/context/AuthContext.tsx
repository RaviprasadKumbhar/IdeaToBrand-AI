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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        if (!isSupabaseConfigured) {
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
      return {
        error: new Error(
          'Supabase environment is not configured. Please supply VITE_SUPABASE_ANON_KEY.'
        ),
      };
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
  ): Promise<{ error: AuthError | Error | null }> {
    if (!isSupabaseConfigured) {
      return {
        error: new Error(
          'Supabase environment is not configured. Please supply VITE_SUPABASE_ANON_KEY.'
        ),
      };
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
    return { error };
  }

  async function signOut(): Promise<void> {
    await signOutUser();
    setSession(null);
    setUser(null);
  }

  async function resetPassword(email: string): Promise<{ error: AuthError | Error | null }> {
    return await resetPasswordForEmail(email);
  }

  async function updatePassword(newPassword: string): Promise<{ error: AuthError | Error | null }> {
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
