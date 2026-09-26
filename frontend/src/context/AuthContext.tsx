/**
 * AuthContext — Provides Supabase authentication state and operations across the app.
 * Listens to onAuthStateChange and manages loading states gracefully.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, signOutUser } from '../lib/supabase';
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
          // Check for saved demo session
          const savedDemo = localStorage.getItem('ideatobrand_demo_session');
          if (savedDemo) {
            const parsed = JSON.parse(savedDemo);
            if (mounted) {
              setSession(parsed);
              setUser(parsed.user);
            }
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

        // Listen for auth state changes
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
          'Supabase credentials not configured in environment. Please provide VITE_SUPABASE_ANON_KEY or use Demo Sign In.'
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
          'Supabase credentials not configured in environment. Please set VITE_SUPABASE_ANON_KEY or use Demo Sign In.'
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

  async function signInDemo(email = 'founder@ideatobrand.ai'): Promise<void> {
    const demoUser = {
      id: 'demo-user-id-001',
      app_metadata: {},
      user_metadata: { full_name: 'Brand Strategist' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email,
    } as unknown as User;

    const demoSession = {
      access_token: 'demo-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'demo-refresh',
      user: demoUser,
    } as unknown as Session;

    localStorage.setItem('ideatobrand_demo_session', JSON.stringify(demoSession));
    setSession(demoSession);
    setUser(demoUser);
  }

  async function signOut(): Promise<void> {
    await signOutUser();
    localStorage.removeItem('ideatobrand_demo_session');
    setSession(null);
    setUser(null);
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
        signInDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

