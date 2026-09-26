/**
 * Supabase client initialization and authentication helpers.
 * Reuses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment.
 * If credentials are not yet configured, provides honest status and diagnostics.
 */
import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zksrwnojdjfddhmvhpxm.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim().length > 0
);

// Fallback dummy key so createClient doesn't crash if env var is missing during initial setup
const safeKey = isSupabaseConfigured ? supabaseAnonKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase: SupabaseClient = createClient(supabaseUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) {
    // If not configured, check for local demo session in storage
    const local = localStorage.getItem('ideatobrand_demo_session');
    if (local) {
      try {
        return JSON.parse(local) as Session;
      } catch {
        return null;
      }
    }
    return null;
  }
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase Auth] Failed to fetch session:', error.message);
    return null;
  }
  return data.session;
}

export async function signOutUser(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured) {
    localStorage.removeItem('ideatobrand_demo_session');
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  return { error };
}
